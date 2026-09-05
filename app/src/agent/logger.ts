/**
 * Run logging — every agent run writes to runs/<timestamp>_<ticker>/:
 *   trace.md       human-readable timeline (tool calls, agent text)
 *   events.jsonl   raw event stream, one JSON object per line
 *   proposal.json  the agent's final cited proposal
 *   worksheet.json the engine input (after human review) and its output
 *
 * Writes are fire-and-forget but serialized per run; a logging failure can
 * never take down the run itself.
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentEvent } from './events.js';
import type { Proposal } from './schema.js';
import type { StockRef } from '../data/universe.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface RunLogger {
  dir: string;
  startedAt: number;
  event: (e: AgentEvent) => void;
  /** Append a free-form note (e.g. underwriter comments) to the trace. */
  note: (text: string) => void;
  saveProposal: (p: Proposal) => void;
  saveWorksheet: (input: unknown, output: unknown) => void;
  /** Record the end of the run (with elapsed duration) in the trace. */
  finish: (status: 'done' | 'error', note?: string) => void;
}

const stamp = (d: Date) =>
  d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const clock = (d: Date) => d.toISOString().slice(11, 19);

/** Format a millisecond duration as m:ss. */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function startRun(stock: StockRef): RunLogger {
  const dir = path.join(projectRoot, 'runs', `${stamp(new Date())}_${stock.ticker}`);
  const startedAt = Date.now();

  let chain: Promise<unknown> = mkdir(dir, { recursive: true }).then(() =>
    writeFile(
      path.join(dir, 'trace.md'),
      `# D&O run — ${stock.name} (${stock.ticker})\n\nStarted: ${new Date().toISOString()}\n\n## Timeline\n\n`,
    ),
  );
  const md = (line: string) => {
    chain = chain.then(() => appendFile(path.join(dir, 'trace.md'), line + '\n'));
  };
  const jsonl = (obj: Record<string, unknown>) => {
    chain = chain.then(() =>
      appendFile(path.join(dir, 'events.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...obj }) + '\n'),
    );
  };
  const save = (name: string, data: unknown) => {
    chain = chain.then(() => writeFile(path.join(dir, name), JSON.stringify(data, null, 2)));
  };

  return {
    dir,
    startedAt,
    event: (e: AgentEvent) => {
      jsonl(e as unknown as Record<string, unknown>);
      const t = clock(new Date());
      switch (e.type) {
        case 'tool-call':
          md(`- ${t} **${e.tool}** → ${e.summary}`);
          break;
        case 'tool-result':
          md(`- ${t} ${e.ok ? '✓' : '✗'} ${e.tool}${e.error ? ` — ${e.error.slice(0, 300)}` : ''}`);
          break;
        case 'text':
          md(e.text.replace(/\n+/g, ' ').slice(0, 400));
          break;
        case 'subagent':
          md(`- ${t} **sub-agent ${e.id} (${e.label})**: ${e.status}${e.error ? ` — ${e.error}` : ''}`);
          break;
        case 'synthesis':
          md(`- ${t} **synthesis**: ${e.status}`);
          break;
        case 'error':
          md(`- ${t} **ERROR** ${e.message}`);
          break;
        case 'done':
          md(`- ${t} proposal submitted`);
          break;
      }
    },
    note: (text: string) => {
      md(`\n> ${text.split('\n').join('\n> ')}\n`);
    },
    saveProposal: (p: Proposal) => {
      save('proposal.json', p);
      md('\n## Proposal\n');
      md(`- Company: ${p.companyName} (${p.sgxCode})`);
      md(`- Business: ${p.businessSummary}`);
      md('\n### Part 1 answers\n');
      for (const [key, answer] of Object.entries(p.answers)) {
        const a = answer as { value: unknown; rationale: string; source: string };
        md(`- **${key}** = ${JSON.stringify(a.value)} — ${a.rationale} [${a.source}]`);
      }
      md('\n### Structure\n');
      md(`- ${p.structure.limit} limit, ${p.structure.retention} retention, ${p.structure.hazardClass}`);
      md(`- Hazard rationale: ${p.structure.hazardRationale}`);
      md('\n### Modifiers\n');
      for (const [key, m] of Object.entries(p.modifiers)) {
        md(`- **${key}** = ${m.value} — ${m.rationale}`);
        for (const f of m.facts) md(`    - fact: ${f}`);
      }
      md('\n### Exclusions applied\n');
      for (const id of p.proposedExclusions) md(`- ${id}`);
      if (p.proposedExclusions.length === 0) md('- none');
      md('\n### Narrative calls\n');
      md(
        `- litigation ${p.narrative.litigationExposure} · financial ${p.narrative.financialStrength} · management ${p.narrative.managementStrength} · governance ${p.narrative.governanceConcern}`,
      );
      md(`- adverse news: ${p.narrative.adverseNews}`);
      md(`- regulatory: ${p.narrative.regulatoryActions}`);
      md(`- litigation: ${p.narrative.litigation}`);
      md(`- trend: ${p.narrative.financialTrend}`);
      md(`- red flags: ${p.narrative.financialRedFlags}`);
      md(`- governance summary: ${p.narrative.governanceSummary}`);
      md(`- equity S$${p.narrative.shareholdersEquity}m · 3y profit ${JSON.stringify(p.narrative.profitByYear)} · finance-experienced officers: ${p.narrative.keyOfficersWithFinanceExperience}`);
      if (p.dataGaps.length > 0) {
        md('\n### Data gaps\n');
        for (const g of p.dataGaps) md(`- ${g}`);
      }
    },
    saveWorksheet: (input: unknown, output: unknown) => {
      save('worksheet.json', { input, output });
      md('\n## Engine output (after human review)\n');
      md('```json\n' + JSON.stringify(output, null, 2) + '\n```');
    },
    finish: (status: 'done' | 'error', note?: string) => {
      const elapsed = formatDuration(Date.now() - startedAt);
      jsonl({ type: 'finish', status, elapsedMs: Date.now() - startedAt });
      md(`\n## Run ${status === 'done' ? 'complete' : 'FAILED'}\n\nFinished: ${new Date().toISOString()} · elapsed ${elapsed}${note ? ` · ${note}` : ''}`);
    },
  };
}
