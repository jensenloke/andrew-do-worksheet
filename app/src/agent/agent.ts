/**
 * Agent orchestration — fan-out research, then synthesis.
 *
 *   prepareContext        fetch market data once, locate annual-report PDFs once
 *        │
 *        ├─ market & securities ─┐
 *        ├─ financials ──────────┤   five specialist sub-agents in parallel,
 *        ├─ governance & audit ──┤   each with tools and a findings schema
 *        ├─ shareholding ────────┤
 *        ├─ adverse news ────────┘
 *        ▼
 *   synthesizer           merges findings, makes the judgement calls
 *        ▼                (structure, modifiers, exclusions), writes the
 *   Proposal              cited proposal + synthesis
 */

import { streamText, tool, stepCountIs } from 'ai';
import { createModel } from './provider.js';
import { ProposalSchema, type Proposal } from './schema.js';
import { buildTeams, describeModelError, prepareContext, runSubAgent, type SubAgentResult } from './subagents.js';
import type { AppSettings } from './settings.js';
import { DEFAULT_SETTINGS } from './settings.js';
import type { Emit } from './events.js';
import type { StockRef } from '../data/universe.js';
import type { RunLogger } from './logger.js';

export type { AgentEvent } from './events.js';

/**
 * Run tasks with at most `limit` in flight. Five parallel streaming
 * researchers can burst past the account's tokens-per-minute quota (429);
 * capping concurrency keeps the fan-out but lowers the peak.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

const SYNTHESIS_SYSTEM = `You are the lead D&O underwriter synthesising the research of five specialist colleagues into one worksheet proposal for an SGX-listed company.

You will receive their findings as JSON. Assemble the proposal and make the judgement calls. The rules:

## Structure (Part 2)
- Limit: default S$10m.
- Retention: SGD 250k is the SGX mid-cap benchmark; SGD 500k for caps above roughly S$1bn.
- Hazard class — classify on what the company ACTUALLY does, not what it calls itself:
  Class 1 REITs, business trusts, utilities, regulated infrastructure · Class 2 industrials, consumer staples, transport & logistics, telcos · Class 3 property developers, construction, agri-commodities, healthcare, hospitality · Class 4 banks/financial services, offshore & marine, oil & gas, mining, technology · Class 5 pre-revenue biotech, digital assets, distressed.

## Modifiers (Part 3) — start at 1.00, move only on a cited fact
1. Financial strength (0.85–1.50): credit for net cash and three profitable years; debit for gearing above 2.0x, a broken profit run, or a warning/restatement in the last year.
2. Governance & ownership (0.85–1.40): credit for a majority-independent board and clean audit history; debit for a dominant controller, auditor change, CFO churn.
3. Share price & float (0.90–1.50): flat or rising 0.90–1.00; down 15–35% 1.15–1.30; down >35% or a fall straight after upbeat guidance 1.30–1.50.
4. Regulatory, geography & transactions (1.00–2.00): 1.00 clean and Singapore-centric; debit for SGX queries, offshore operations, a recent raising, US exposure; watch-list or investigation 1.50–2.00.
5. Claims history (0.90–2.00): 0.90–0.95 for five clean years.
Do not stack the same fact under two modifiers.

## Exclusions (Part 4) — apply every exclusion the facts recommend
majorShareholder if Q9 > 15% · ipt if Q9 > 30% · specificMatter if Q7 yes · usSecurities if Q15 is not None · publicOffering if Q16 is IPO/RTO · territorial if Q4 > 75% · specificInvestigation if Q14 yes · insolvency if Q6 is None · specificPriorClaims if Q17/Q18 show history. Never apply an exclusion to reach a cheaper price.

## Consistency — the narrative calls MUST agree with the modifiers
Weak financial strength ⇒ modifier 1 ≥ 1.00 · High litigation exposure ⇒ modifier 4 ≥ 1.20 · flagged management/governance ⇒ modifier 2 ≥ 1.10.

## Leveling assumptions (fixed, non-negotiable)
Q17 claims = 0 · Q18 known circumstance = false · Q19 previously declined = false · Q20 expiring premium = 0 (new policy). Employee headcount = 200 if it matters.

Carry each researcher's rationale and source into the answer fields verbatim where you use them. Merge all dataGaps. Where researchers disagree, prefer the better-sourced finding and say so in the rationale. Finish with the synthesis: the underwriting view in 4-6 sentences.`;

export interface RunOptions {
  stock: StockRef;
  signal?: AbortSignal;
  onEvent: (event: Parameters<Emit>[0]) => void;
  logger?: RunLogger;
  settings?: AppSettings;
  /** Free-form underwriter notes to weigh during research and synthesis. */
  comments?: string;
}

export async function runResearchAgent({ stock, signal, onEvent, logger, settings, comments }: RunOptions): Promise<Proposal> {
  const cfg = settings ?? DEFAULT_SETTINGS;
  const model = createModel({ thinking: cfg.thinking });
  const emit: Emit = (event) => {
    logger?.event(event);
    onEvent(event);
  };

  // 1. Shared preparation — market data + candidate documents, fetched once.
  const context = await prepareContext(stock, emit);
  if (signal?.aborted) throw new Error('aborted');

  // 2. Fan out the researcher teams (count from settings), all in flight —
  // the team count itself is the concurrency control.
  const teams = buildTeams(cfg.maxSubAgents);
  for (const spec of teams) emit({ type: 'subagent', id: spec.id, label: spec.label, status: 'start' });
  const results = await mapWithConcurrency(teams, teams.length, async (spec) => {
    try {
      const r = await runSubAgent(spec, context, model, signal, emit, cfg.researchLimitSec * 1000, comments);
      emit({
        type: 'subagent',
        id: spec.id,
        label: spec.label,
        status: r.findings ? 'done' : 'error',
        ...(r.error ? { error: r.error } : {}),
      });
      return r;
    } catch (err) {
      const message = describeModelError(err);
      emit({ type: 'subagent', id: spec.id, label: spec.label, status: 'error', error: message });
      return {
        id: spec.id,
        label: spec.label,
        findings: null,
        error: message,
      } satisfies SubAgentResult;
    }
  });

  const usable = results.filter((r) => r.findings);
  if (usable.length === 0) {
    throw new Error('All research sub-agents failed — check connectivity and retry.');
  }

  // 3. Synthesis — merge findings into one cited proposal. Uses the same
  // streamText + tool pattern as the researchers (proven reliable on local
  // vLLM/DGX, where streamObject's structured-output streaming stalls).
  emit({ type: 'synthesis', status: 'start' });
  const findingsBlock = results
    .map((r) => `### ${r.label}\n${r.findings ? JSON.stringify(r.findings, null, 1) : `FAILED: ${r.error}`}`)
    .join('\n\n');

  const commentsBlock = comments?.trim()
    ? `\nThe underwriter's own notes on this company — weigh them alongside the research and reflect them in the rationale/synthesis:\n${comments.trim()}\n`
    : '';

  const synthesisController = new AbortController();
  const onOuterAbort = () => synthesisController.abort();
  signal?.addEventListener('abort', onOuterAbort, { once: true });
  const SYNTHESIS_WATCHDOG_MS = 8 * 60_000;
  const watchdog = setTimeout(() => synthesisController.abort(), SYNTHESIS_WATCHDOG_MS);

  let proposal: Proposal | undefined;
  try {
    const synthesisResult = streamText({
      model: createModel({ thinking: cfg.thinking }),
      system: SYNTHESIS_SYSTEM,
      prompt: `Company under review: ${stock.name} (SGX: ${stock.ticker})

Market data gathered in preparation:
${context.marketData}

The researchers' findings:

${findingsBlock}
${commentsBlock}
Assemble the complete proposal now and submit it with submitProposal. Be decisive and concise — do not over-deliberate.`,
      tools: {
        submitProposal: tool({
          description: 'Submit the complete worksheet proposal. Call exactly once, when ready.',
          inputSchema: ProposalSchema,
          execute: async () => 'Proposal submitted.',
        }),
      },
      stopWhen: stepCountIs(3),
      temperature: 0.2,
      maxRetries: 2,
      abortSignal: synthesisController.signal,
    });
    let pendingProposal: Proposal | null = null;
    for await (const part of synthesisResult.fullStream) {
      if (part.type === 'tool-call' && part.toolName === 'submitProposal') {
        pendingProposal = part.input as Proposal;
      }
      // Only accept the proposal once execute() ran — i.e. the input passed
      // schema validation. A rejected submission leaves `proposal` unset so the
      // model gets another step instead of a half-valid worksheet.
      if (part.type === 'tool-result' && part.toolName === 'submitProposal' && pendingProposal) {
        proposal = pendingProposal;
      }
    }
  } catch (err) {
    const userAborted = signal?.aborted;
    const message =
      !userAborted && synthesisController.signal.aborted
        ? `Synthesis hit the ${SYNTHESIS_WATCHDOG_MS / 60_000}-minute watchdog without finishing — retry, or check the model quota.`
        : describeModelError(err);
    emit({ type: 'error', message });
    throw new Error(message);
  } finally {
    clearTimeout(watchdog);
    signal?.removeEventListener('abort', onOuterAbort);
  }
  if (!proposal) {
    const message = 'Synthesis finished without submitting a proposal.';
    emit({ type: 'error', message });
    throw new Error(message);
  }
  emit({ type: 'synthesis', status: 'done' });

  // 4. Enforce the leveling assumptions deterministically — the model cannot drift.
  const fixed = {
    q17Claims: { value: 0, rationale: 'Session leveling rule: no claims.', source: 'leveling assumption' },
    q18KnownCircumstance: { value: false, rationale: 'Session leveling rule: new policy.', source: 'leveling assumption' },
    q19PreviouslyDeclined: { value: false, rationale: 'Session leveling rule: new policy.', source: 'leveling assumption' },
    q20ExpiringPremium: { value: 0, rationale: 'Session leveling rule: new policy, no current coverage.', source: 'leveling assumption' },
  } as const;

  const finalProposal: Proposal = {
    ...proposal,
    companyName: proposal.companyName || stock.name,
    sgxCode: proposal.sgxCode || stock.ticker,
    answers: { ...proposal.answers, ...fixed },
  };

  emit({ type: 'done', proposal: finalProposal });
  return finalProposal;
}
