/**
 * Sub-agent fan-out — five specialist researchers work in parallel, each with
 * the same research tools but a narrow brief and a structured findings schema.
 * The lead synthesizer (in agent.ts) merges their findings into the proposal.
 */

import { streamText, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import type { AssistantModelMessage, LanguageModel, ModelMessage } from 'ai';
import { citedBoolean, citedEnum, citedNumber, citedString } from './schema.js';
import { getLastModelError } from './provider.js';
import { fetchPage, readPdf, searchWeb } from './research.js';
import { fetchSgxMarketData } from '../data/yahoo.js';
import { summariseToolCall } from './tools.js';
import type { Emit } from './events.js';
import type { StockRef } from '../data/universe.js';

const dataGapsField = z
  .array(z.string())
  .default([])
  .describe('Facts you could not establish from public sources — never guess; [] if none');

export interface BaseSpec {
  id: string;
  label: string;
  focus: string;
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}

export interface TeamSpec {
  id: string;
  label: string;
  focus: string;
  schema: z.ZodTypeAny;
  /** How many specialist briefs this team merges — scales the step budget. */
  size?: number;
}

export const SUBAGENT_SPECS: BaseSpec[] = [
  {
    id: 'market',
    label: 'market & securities',
    focus: `Establish: Q1 market capitalisation in S$m (use the provided market data; state the date), Q3 share price movement over 12 months as a decimal (negative for a fall), Q4 the higher of % assets or % revenue outside Singapore (segment note in the annual report), Q15 US securities exposure ("None" or describe: ADR programme, US listing — check the annual report's share information section and search the web), Q16 IPO/RTO/capital raising in the last 24 months (SGX announcements), and a 3-4 sentence business summary of what the company actually does, its segments and geography.`,
    schema: z.object({
      q1MarketCap: citedNumber('Market capitalisation in S$m'),
      q3SharePriceMove: citedNumber('12-month share price movement as a decimal; negative for a fall'),
      q4ForeignPct: citedNumber('Higher of % assets or revenue outside Singapore, as a decimal'),
      q15UsSecurities: citedString('"None" or a description of US securities exposure'),
      q16CapitalRaising: citedEnum(['None', 'Placement or rights issue', 'IPO or RTO'], 'Capital raising in last 24 months'),
      businessSummary: z.string().describe('3-4 sentences: what the company actually does, segments, geography'),
      dataGaps: dataGapsField,
    }),
  },
  {
    id: 'financials',
    label: 'financials',
    focus: `From the annual reports (financial highlights / financial statements), establish: net profit or loss for each of the last THREE financial years in S$m (most recent first) and Q6 whether the company was profitable in all three ("All three" / "Two of three" / "One of three" / "None"); total borrowings, cash and shareholders' equity for the most recent year, hence Q5 net gearing = (borrowings − cash) ÷ equity (use 999 if equity is negative); and the financial trend across the three years (revenue, margin, leverage) plus any red flags (margin compression, leverage, liquidity, going-concern language). Finish with a financial strength call: Strong / Adequate / Weak / Serious concern.`,
    schema: z.object({
      q5NetGearing: citedNumber('Net gearing (net debt ÷ equity); 999 if equity negative'),
      q6ProfitHistory: citedEnum(['All three', 'Two of three', 'One of three', 'None'], 'Profitable in each of last three FYs'),
      profitByYear: z.tuple([z.number(), z.number(), z.number()]).describe('Net profit S$m, most recent first'),
      shareholdersEquity: z.number().describe('Most recent shareholders equity, S$m'),
      financialTrend: z.string().describe('Direction of revenue, margin, leverage across the three years'),
      financialRedFlags: z.string().describe('Red flags found, or "None identified" with where you looked'),
      financialStrength: z.enum(['Strong', 'Adequate', 'Weak', 'Serious concern']),
      dataGaps: dataGapsField,
    }),
  },
  {
    id: 'governance',
    label: 'governance & audit',
    focus: `From the corporate governance section of the latest annual report, establish: Q8 independent directors as a fraction of the board; Q10 the most recent audit opinion (Unqualified / Qualified / Disclaimer / Adverse); Q11 any change of external auditor in the last 3 years; Q12 any CEO or CFO change in the last 24 months; and how many key officers (chairman, CEO, CFO, audit committee chair, lead independent director) have finance or accounting experience. Write a 3-4 sentence governance summary (board composition, chairman/CEO split, related-party dynamics, tenure), then call management strength (Strong / Adequate / Weak) and governance concern (None / Minor / Material).`,
    schema: z.object({
      q8IndependentDirectors: citedNumber('Independent directors as a fraction of the board'),
      q10AuditOpinion: citedEnum(['Unqualified', 'Qualified', 'Disclaimer', 'Adverse'], 'Most recent audit opinion'),
      q11AuditorChanged: citedBoolean('Change of external auditor in last 3 years?'),
      q12CeoCfoChanged: citedBoolean('CEO or CFO change in last 24 months?'),
      keyOfficersWithFinanceExperience: z.number().describe('Count of key officers with finance/accounting experience'),
      governanceSummary: z.string().describe('3-4 sentences on board composition, independence, related-party dynamics'),
      managementStrength: z.enum(['Strong', 'Adequate', 'Weak']),
      governanceConcern: z.enum(['None', 'Minor', 'Material']),
      dataGaps: dataGapsField,
    }),
  },
  {
    id: 'shareholding',
    label: 'shareholding',
    focus: `From the share information / substantial shareholders section of the latest annual report (and the SGX company page if helpful), establish: Q2 free float as a decimal (the % of shares held by the public; SGX requires ≥10%), and Q9 the largest shareholder's holding as a decimal — count a family, founder or holding company acting together as one holder, and name them. Note any interested-person transactions with that holder if you see them.`,
    schema: z.object({
      q2FreeFloat: citedNumber('Free float as a decimal'),
      q9LargestShareholder: citedNumber('Largest shareholder holding as a decimal, including concerted holders'),
      largestShareholderName: z.string().describe('Name of the largest shareholder'),
      iptObservations: z.string().describe('Any interested-person transactions observed, or "None identified"'),
      dataGaps: dataGapsField,
    }),
  },
  {
    id: 'adverse',
    label: 'adverse news & regulatory',
    focus: `Search the web thoroughly for the last 3-5 years: profit warnings, restatements or material adverse announcements (Q7 — last 12 months); SGX unusual-price-movement or trade-with-caution queries (Q13 — count over last 24 months); watch-list placement, trading suspension or any MAS / CAD / ACRA / SGX RegCo investigation (Q14); negative press, short-seller reports, class actions, securities litigation or minority-oppression disputes. For each finding give the date and source. Record where and when you looked — "None identified" needs provenance. Finish with a litigation exposure call: Low / Moderate / High. Do NOT fetch news.google.com or Google News RSS URLs — they block automated access; use the searchWeb tool instead.`,
    schema: z.object({
      q7AdverseAnnouncement: citedBoolean('Profit warning, restatement or material adverse announcement in last 12 months?'),
      q13SgxQueries: citedNumber('Count of SGX queries in last 24 months'),
      q14WatchListOrInvestigation: citedBoolean('Watch-list, suspension or regulatory investigation?'),
      adverseNews: z.string().describe('Negative news last 3-5 years with dates and sources, or "None identified" with provenance'),
      regulatoryActions: z.string().describe('Regulatory actions/investigations/fines with provenance'),
      litigation: z.string().describe('Class actions, securities litigation, shareholder disputes with provenance'),
      litigationExposure: z.enum(['Low', 'Moderate', 'High']),
      dataGaps: dataGapsField,
    }),
  },
];

export type SubAgentFindings = Partial<Record<string, unknown>>;

/**
 * Merge the five specialist briefs into `n` researcher teams (1–5). Fewer
 * teams = fewer parallel model streams = smaller quota bursts, while the
 * merged schemas keep every worksheet area covered.
 * Spec order: 0 market, 1 financials, 2 governance, 3 shareholding, 4 adverse.
 */
const TEAM_PARTITIONS: Record<number, number[][]> = {
  1: [[0, 1, 2, 3, 4]],
  2: [
    [0, 1, 3],
    [2, 4],
  ],
  3: [
    [0, 3],
    [1],
    [2, 4],
  ],
  4: [[0, 3], [1], [2], [4]],
  5: [[0], [1], [2], [3], [4]],
};

function mergeSpecs(specs: BaseSpec[]): TeamSpec {
  if (specs.length === 1) return { ...specs[0]!, size: 1 };
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const s of specs) Object.assign(shape, s.schema.shape);
  return {
    id: specs.map((s) => s.id).join('+'),
    label: specs.map((s) => s.label).join(' + '),
    focus: specs.map((s) => s.focus).join('\n\n'),
    schema: z.object(shape),
    size: specs.length,
  };
}

export function buildTeams(n: number): TeamSpec[] {
  const count = Math.min(5, Math.max(1, Math.round(n)));
  return TEAM_PARTITIONS[count]!.map((group) => mergeSpecs(group.map((i) => SUBAGENT_SPECS[i]!)));
}

export interface ResearchContext {
  stock: StockRef;
  /** Formatted live market data, fetched once during preparation. */
  marketData: string;
  /** Candidate annual report / announcement URLs located during preparation. */
  reportCandidates: Array<{ title: string; url: string }>;
}

/**
 * Preparation step (no LLM): fetch market data once and locate candidate
 * annual-report PDFs once, so all five sub-agents start from the same base.
 */
export async function prepareContext(stock: StockRef, emit: Emit): Promise<ResearchContext> {
  let marketData = 'Market data unavailable — fetchMarketData tool available if needed.';
  emit({ type: 'tool-call', tool: 'fetchMarketData', summary: `market data for ${stock.ticker}` });
  try {
    const d = await fetchSgxMarketData(stock.ticker);
    marketData = [
      `Company: ${d.name} (${d.symbol}, ${d.exchange})`,
      `Market cap: S$${(d.marketCap / 1e6).toFixed(1)}m (price S$${d.regularMarketPrice} × ${d.sharesOutstanding.toLocaleString()} shares)`,
      `12-month price movement: ${(d.twelveMonthMove * 100).toFixed(1)}%`,
      `52-week range: S$${d.fiftyTwoWeekLow} – S$${d.fiftyTwoWeekHigh}`,
      `As of: ${d.asOf.toISOString()}`,
    ].join('\n');
    emit({ type: 'tool-result', tool: 'fetchMarketData', ok: true });
  } catch (err) {
    emit({ type: 'tool-result', tool: 'fetchMarketData', ok: false });
    marketData = `Market data fetch failed (${err instanceof Error ? err.message : err}) — use the fetchMarketData tool yourself.`;
  }

  emit({ type: 'tool-call', tool: 'searchWeb', summary: `locating annual reports for ${stock.name}` });
  const reportCandidates: Array<{ title: string; url: string }> = [];
  try {
    const year = new Date().getUTCFullYear();
    const searches = await Promise.all([
      searchWeb(`${stock.name} annual report ${year} pdf`),
      searchWeb(`${stock.name} annual report ${year - 1} pdf`),
    ]);
    for (const results of searches) {
      for (const r of results) {
        const looksLikeReport = /\.pdf(\?|$)/i.test(r.url) || /links\.sgx\.com/.test(r.url) || /annual report/i.test(r.title);
        // Routify/OSS proxy links from search results expire fast and 403 — the
        // model burns steps discovering that. Keep canonical hosts only.
        const deadProxy = /routify-file-proxy|oss-[a-z0-9-]+\.aliyuncs\.com/i.test(r.url);
        if (looksLikeReport && !deadProxy && !reportCandidates.some((c) => c.url === r.url)) {
          reportCandidates.push({ title: r.title, url: r.url });
        }
      }
    }
    emit({ type: 'tool-result', tool: 'searchWeb', ok: reportCandidates.length > 0 });
  } catch {
    emit({ type: 'tool-result', tool: 'searchWeb', ok: false });
  }

  return { stock, marketData, reportCandidates: reportCandidates.slice(0, 8) };
}

/** The four research tools, as a fresh tool set for one sub-agent. */
function subAgentTools() {
  return {
    fetchMarketData: tool({
      description: 'Live market data for an SGX ticker from Yahoo Finance.',
      inputSchema: z.object({ ticker: z.string() }),
      execute: async ({ ticker }) => {
        const d = await fetchSgxMarketData(ticker);
        return `${d.name}: cap S$${(d.marketCap / 1e6).toFixed(1)}m, price S$${d.regularMarketPrice}, 12m ${(d.twelveMonthMove * 100).toFixed(1)}%`;
      },
    }),
    fetchPage: tool({
      description: 'Fetch a web page and read it as markdown.',
      inputSchema: z.object({ url: z.string() }),
      execute: async ({ url }) => fetchPage(url),
    }),
    readPdf: tool({
      description:
        'Read a PDF (annual report, announcement). Use search="keyword" to locate sections or pages="N-M" for specific pages. Cached — repeated calls are cheap.',
      inputSchema: z.object({
        url: z.string(),
        pages: z.string().optional(),
        search: z.string().optional(),
      }),
      execute: async ({ url, pages, search }) =>
        readPdf(url, search !== undefined ? { search } : pages !== undefined ? { pages } : {}),
    }),
    searchWeb: tool({
      description: 'Search the web (Brave, falling back to DuckDuckGo).',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const results = await searchWeb(query);
        if (results.length === 0) return 'No results.';
        return results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join('\n\n');
      },
    }),
  };
}

/** Turn a model API error into a message a human can act on. */
export function describeModelError(err: unknown): string {
  const anyErr = err as { statusCode?: number; lastError?: { statusCode?: number; message?: string }; message?: string };
  const status = anyErr?.statusCode ?? anyErr?.lastError?.statusCode;
  const text = anyErr?.lastError?.message ?? anyErr?.message ?? String(err);
  if (status === 429 || /quota|insufficient|token.?limit|rate.?limit/i.test(text)) {
    return (
      'Model API quota exceeded (429). The five parallel researchers can burst past the ' +
      'account token limit — wait a minute and retry, lower concurrency, or switch provider ' +
      '(DO_AGENT_BASE_URL / DO_AGENT_API_KEY). Detail: ' + text.slice(0, 160)
    );
  }
  return text.slice(0, 300);
}

export interface SubAgentResult {
  id: string;
  label: string;
  findings: Record<string, unknown> | null;
  error?: string;
}

/** Run one specialist sub-agent (or merged team) to completion and capture its findings. */
async function runSubAgentCore(
  spec: TeamSpec,
  context: ResearchContext,
  model: LanguageModel,
  signal: AbortSignal | undefined,
  emit: Emit,
  comments?: string,
): Promise<SubAgentResult> {
  const { stock } = context;
  const candidates =
    context.reportCandidates.length > 0
      ? context.reportCandidates.map((c) => `- ${c.title}: ${c.url}`).join('\n')
      : '(none located yet — search for them)';

  const commentsBlock = comments?.trim()
    ? `\nThe underwriter's own notes on this company — treat as prior knowledge to check and weigh:\n${comments.trim()}\n`
    : '';

  const prompt = `Company: ${stock.name} (SGX: ${stock.ticker})

Market data already gathered:
${context.marketData}

Candidate annual report / announcement documents already located:
${candidates}
${commentsBlock}

YOUR BRIEF — ${spec.focus}

Rules:
- Percentages are decimals: 42% = 0.42, an 18% decline = -0.18.
- Every value needs a rationale and a source (URL or "annual report FY2025 p.42").
- Use the candidate documents first; search only when they don't have the answer.
- Never guess. Anything you cannot establish goes in dataGaps.
When done, call reportFindings exactly once.`;

  let findings: Record<string, unknown> | null = null;

  const reportTool = tool({
    description: 'Report your structured findings. Call exactly once, when research is complete.',
    // Each spec carries its own schema; the union defeats the tool()
    // overload inference, so hand it a generic schema type here.
    inputSchema: spec.schema as z.ZodTypeAny,
    execute: async () => 'Findings reported.',
  });

  // A merged team covers several briefs — scale the step budget with team size.
  const maxSteps = Math.min(72, 18 + 12 * ((spec.size ?? 1) - 1));

  try {
    const result = streamText({
      model,
      system: `You are the ${spec.label} researcher on a D&O underwriting team studying ${stock.name}, an SGX-listed company. You research public sources only: annual reports (PDFs on the company website), SGX announcements, and the press. Other researchers cover other areas — stay in your brief.

WORK EFFICIENTLY AND FINISH: you have a limited number of steps. Target the specific facts in your brief, then call reportFindings as soon as every field is answerable. A few well-sourced answers plus honest dataGaps is far better than running out of steps with nothing reported. Do not keep searching once you can fill your fields; never call reportFindings more than once.`,
      prompt,
      tools: {
        ...subAgentTools(),
        reportFindings: reportTool,
      },
      stopWhen: stepCountIs(maxSteps),
      temperature: 0.1,
      maxRetries: 2,
      ...(signal ? { abortSignal: signal } : {}),
    });

    let pendingFindings: Record<string, unknown> | null = null;
    // Transcript for the forced-report rescue below (AI SDK v6 dropped
    // `result.messages`, so rebuild the model messages from the stream).
    const transcript: ModelMessage[] = [{ role: 'user', content: prompt }];
    let assistantParts: Extract<AssistantModelMessage['content'], unknown[]> = [];
    const flushAssistant = () => {
      if (assistantParts.length > 0) {
        transcript.push({ role: 'assistant', content: assistantParts } as ModelMessage);
        assistantParts = [];
      }
    };
    for await (const part of result.fullStream) {
      if (signal?.aborted) break;
      const prefix = `[${spec.id}]`;
      switch (part.type) {
        case 'text-delta':
          flushAssistant();
          transcript.push({ role: 'assistant', content: part.text });
          break;
        case 'tool-call':
          assistantParts.push({ type: 'tool-call', toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
          emit({ type: 'tool-call', tool: part.toolName, summary: `${prefix} ${summariseToolCall(part.toolName, part.input)}` });
          if (part.toolName === 'reportFindings') {
            pendingFindings = part.input as Record<string, unknown>;
          }
          break;
        case 'tool-result':
          flushAssistant();
          transcript.push({
            role: 'tool',
            content: [{ type: 'tool-result', toolCallId: part.toolCallId, toolName: part.toolName, output: { type: 'text', value: typeof part.output === 'string' ? part.output : JSON.stringify(part.output) } }],
          } satisfies ModelMessage);
          emit({ type: 'tool-result', tool: part.toolName, ok: true });
          // A reportFindings result means execute() ran — the input passed
          // schema validation. That is the authoritative "done" signal.
          if (part.toolName === 'reportFindings' && pendingFindings) {
            findings = pendingFindings;
          }
          break;
        case 'tool-error':
          flushAssistant();
          transcript.push({
            role: 'tool',
            content: [{
              type: 'tool-result',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output: { type: 'text', value: `Tool input rejected: ${part.error instanceof Error ? part.error.message : String(part.error)}` },
            }],
          } as ModelMessage);
          emit({
            type: 'tool-result',
            tool: part.toolName,
            ok: false,
            error: part.error instanceof Error ? part.error.message : String(part.error),
          });
          break;
        default:
          break;
      }
      if (findings) break;
    }

    // Ran out of steps without a valid report (schema errors fed back, or the
    // model kept researching). Force a final report from the work already done
    // — reuse the full message history so the researcher answers from what it
    // found and lists the rest in dataGaps. Far better than losing the team.
    if (!findings && !signal?.aborted) {
      try {
        flushAssistant();
        const rescue = streamText({
          model,
          system: `You are the ${spec.label} researcher. Your research steps are exhausted. Do NOT call any research tools. Call reportFindings exactly once now with your best-supported answers from the research already done; list anything unestablished in dataGaps.`,
          messages: [
            ...transcript,
            {
              role: 'user',
              content:
                'Stop researching. Call reportFindings now with your best answers from everything so far. Use dataGaps for anything you could not establish. Do not call any other tool.',
            },
          ],
          tools: { reportFindings: reportTool },
          stopWhen: stepCountIs(2),
          temperature: 0.1,
          maxRetries: 1,
          ...(signal ? { abortSignal: signal } : {}),
        });
        for await (const part of rescue.fullStream) {
          if (part.type === 'tool-call' && part.toolName === 'reportFindings') {
            findings = part.input as Record<string, unknown>;
          }
        }
        if (findings) emit({ type: 'tool-result', tool: 'reportFindings', ok: true });
      } catch {
        // rescue failed — fall through to the error return
      }
    }
  } catch (err) {
    return { id: spec.id, label: spec.label, findings: null, error: describeModelError(err) };
  }

  if (!findings) {
    return { id: spec.id, label: spec.label, findings: null, error: 'finished without reporting findings' };
  }
  return { id: spec.id, label: spec.label, findings };
}

const SUBAGENT_TIMEOUT_MS = Number(process.env.DO_AGENT_SUBAGENT_TIMEOUT_MS ?? 900_000);

/**
 * Hard cap on one researcher. The AI SDK can leave a stream promise unsettled
 * after a burst of retryable HTTP errors (429 quota) — pooled sockets are
 * unref'd, so the process then exits 13 or the TUI hangs. This race timer is
 * ref'd, so recovery is guaranteed either way.
 */
export function runSubAgent(
  spec: TeamSpec,
  context: ResearchContext,
  model: LanguageModel,
  signal: AbortSignal | undefined,
  emit: Emit,
  timeoutMs?: number,
  comments?: string,
): Promise<SubAgentResult> {
  const limit = timeoutMs ?? SUBAGENT_TIMEOUT_MS;
  let timerHandle: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<SubAgentResult>((resolve) => {
    timerHandle = setTimeout(() => {
      const m = getLastModelError();
      const hint =
        m && Date.now() - m.at < 120_000
          ? ` Last model HTTP ${m.status} — likely quota or rate limit; check billing or switch provider.`
          : '';
      resolve({
        id: spec.id,
        label: spec.label,
        findings: null,
        error: `timed out after ${Math.round(limit / 1000)}s.${hint}`,
      });
    }, limit);
  });
  const work = runSubAgentCore(spec, context, model, signal, emit, comments);
  return Promise.race([work, timer]).finally(() => clearTimeout(timerHandle));
}
