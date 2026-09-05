/**
 * Model provider — OpenAI-compatible, so any open model works.
 * Defaults to Alibaba Model Studio (DashScope international) for Qwen;
 * point DO_AGENT_BASE_URL / DO_AGENT_MODEL anywhere else (OpenRouter, vLLM,
 * Ollama) without code changes.
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from 'undici';
import { loadDotEnv } from '../env.js';

export interface ProviderConfig {
  baseURL: string;
  apiKey: string | undefined;
  modelId: string;
  name: string;
}

export function providerConfig(): ProviderConfig {
  loadDotEnv();
  return {
    name: process.env.DO_AGENT_PROVIDER_NAME ?? 'qwen',
    baseURL:
      process.env.DO_AGENT_BASE_URL ??
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKey:
      process.env.DO_AGENT_API_KEY ??
      process.env.DASHSCOPE_API_KEY ??
      process.env.OPENROUTER_API_KEY,
    modelId: process.env.DO_AGENT_MODEL ?? 'qwen3.8-max-preview',
  };
}

export function createModel(options?: { thinking?: boolean }) {
  const cfg = providerConfig();
  if (!cfg.apiKey) {
    throw new Error(
      'No API key found. Set DASHSCOPE_API_KEY (or DO_AGENT_API_KEY / OPENROUTER_API_KEY).',
    );
  }
  const provider = createOpenAICompatible({
    name: cfg.name,
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
    // Big structured outputs (the synthesis) can take minutes before the first
    // headers arrive; undici's defaults (~5 min headers, less in practice on
    // some paths) cut them off. Give every model call long, generous timeouts.
    fetch: options?.thinking ? longTimeoutFetch : noThinkingFetch,
  });
  return provider.chatModel(cfg.modelId);
}

/** Long-timeout fetch that also sets enable_thinking=false on the request body. */
const noThinkingFetch: typeof fetch = (input, init) => {
  let next = init;
  if (init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      body.enable_thinking = false;
      next = { ...init, body: JSON.stringify(body) };
    } catch {
      next = init;
    }
  }
  return longTimeoutFetch(input, next);
};

/**
 * A fetch whose undici dispatcher allows 10-minute header/body waits, and
 * which aborts a request if no response headers arrive within the stall
 * window. The stall watchdog matters: with a shared keep-alive pool a
 * request can occasionally be sent on a half-dead connection and vanish —
 * no error, no data, and (worse) no live handle, which empties the event
 * loop and hangs the run. Aborting on stall lets the SDK retry on a fresh
 * connection. Override with DO_AGENT_STALL_TIMEOUT_MS.
 */
const STALL_TIMEOUT_MS = Number(process.env.DO_AGENT_STALL_TIMEOUT_MS ?? 240_000);

/**
 * The AI SDK can swallow a burst of retryable HTTP errors (e.g. 429 quota)
 * and leave the caller's promise unsettled forever. Record the last model
 * error so timeouts elsewhere can name the likely cause.
 */
let lastModelError: { status: number; at: number } | null = null;
export function getLastModelError(): { status: number; at: number } | null {
  return lastModelError;
}

/**
 * Connections to the model endpoint are deliberately NOT kept alive: the local
 * proxy half-closes idle sockets, and a request reusing one vanishes without
 * error or data (the hang behind several "stuck" runs). The endpoint is
 * plain HTTP on localhost, so a fresh connection per request is nearly free.
 */
const modelAgent = new Agent({
  headersTimeout: 600_000,
  bodyTimeout: 600_000,
  keepAliveTimeout: 500,
  keepAliveMaxTimeout: 500,
  connect: { timeout: 30_000 },
});

const longTimeoutFetch: typeof fetch = async (input, init) => {
  const outer = init?.signal;
  const dbg = process.env.DO_AGENT_FETCH_DEBUG === '1';
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort();
    outer?.addEventListener('abort', onOuterAbort, { once: true });
    const stall = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
    const t0 = Date.now();
    if (dbg) console.error(`[fetch] → ${url} (attempt ${attempt})`);
    try {
      const res = await fetch(
        input,
        // The installed undici's Agent type and Node's bundled undici-types
        // disagree; the cast is structural and safe at runtime.
        { ...init, signal: controller.signal, dispatcher: modelAgent } as unknown as RequestInit,
      );
      if (res.status === 429 || res.status >= 500) lastModelError = { status: res.status, at: Date.now() };
      if (dbg) console.error(`[fetch] ← ${res.status} ${url} after ${Date.now() - t0}ms`);
      return res;
    } catch (err) {
      if (dbg) console.error(`[fetch] ✗ ${url} after ${Date.now() - t0}ms: ${err instanceof Error ? err.message : err}`);
      // A stall abort (not a user abort) means the request vanished on a dead
      // connection — the SDK would treat an abort as non-retryable, so retry
      // here on a fresh connection instead.
      const stalled = !outer?.aborted && controller.signal.aborted;
      if (stalled && attempt < 2) continue;
      throw err;
    } finally {
      clearTimeout(stall);
      outer?.removeEventListener('abort', onOuterAbort);
    }
  }
};
