/**
 * Review & override — the "human governs" screen.
 *
 * The proposal is composed into a point-form document of pre-wrapped,
 * one-terminal-row display lines. On a terminal tall enough for the
 * interactive list (modifiers + exclusions checklist), that list is pinned
 * fully visible at the bottom and the read-only context (structure, notes,
 * synthesis, Part 1 answers, data gaps) scrolls above it with pgup/pgdn.
 * On shorter terminals the whole document becomes one cursor-following
 * window. Every row is exactly one line: text is wrapped or clipped at
 * compose time, never left to ragged terminal wrapping or frame clipping.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Proposal } from '../agent/schema.js';
import { toWorksheetInput } from '../agent/schema.js';
import { EXCLUSIONS } from '../engine/exclusions.js';
import type { StockRef } from '../data/universe.js';
import type { WorksheetInput } from '../engine/types.js';

interface Props {
  stock: StockRef;
  proposal: Proposal;
  comments: string;
  /** Content rows available to this screen (terminal height minus frame chrome). */
  rows: number;
  /** Terminal width in columns. */
  columns: number;
  onCalculate: (input: WorksheetInput) => void;
  onQuit: () => void;
}

const MODIFIER_LABELS = [
  '1. Financial strength',
  '2. Governance & ownership',
  '3. Share price & float',
  '4. Regulatory, geography & transactions',
  '5. Claims & insurance history',
] as const;

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Clip a string to a display width, marking the truncation. */
const clip = (s: string, w: number) => (s.length > w ? `${s.slice(0, Math.max(1, w - 1))}…` : s);

/** Word-wrap to a display width; over-long words are hard-broken. */
function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (cur && cur.length + 1 + word.length > width) {
      out.push(cur);
      cur = '';
    }
    cur = cur ? `${cur} ${word}` : word;
    while (cur.length > width) {
      out.push(cur.slice(0, width));
      cur = cur.slice(width);
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function answerRows(p: Proposal): Array<{ label: string; value: string; source: string }> {
  const a = p.answers;
  return [
    { label: 'Q1 Market cap', value: `S$${a.q1MarketCap.value.toFixed(0)}m`, source: a.q1MarketCap.source },
    { label: 'Q2 Free float', value: pct(a.q2FreeFloat.value), source: a.q2FreeFloat.source },
    { label: 'Q3 Price move 12m', value: pct(a.q3SharePriceMove.value), source: a.q3SharePriceMove.source },
    { label: 'Q4 Foreign %', value: pct(a.q4ForeignPct.value), source: a.q4ForeignPct.source },
    { label: 'Q5 Net gearing', value: `${a.q5NetGearing.value.toFixed(2)}x`, source: a.q5NetGearing.source },
    { label: 'Q6 Profit history', value: a.q6ProfitHistory.value, source: a.q6ProfitHistory.source },
    { label: 'Q7 Adverse announcement', value: a.q7AdverseAnnouncement.value ? 'Yes' : 'No', source: a.q7AdverseAnnouncement.source },
    { label: 'Q8 Independent directors', value: pct(a.q8IndependentDirectors.value), source: a.q8IndependentDirectors.source },
    { label: 'Q9 Largest shareholder', value: pct(a.q9LargestShareholder.value), source: a.q9LargestShareholder.source },
    { label: 'Q10 Audit opinion', value: a.q10AuditOpinion.value, source: a.q10AuditOpinion.source },
    { label: 'Q11 Auditor change', value: a.q11AuditorChanged.value ? 'Yes' : 'No', source: a.q11AuditorChanged.source },
    { label: 'Q12 CEO/CFO change', value: a.q12CeoCfoChanged.value ? 'Yes' : 'No', source: a.q12CeoCfoChanged.source },
    { label: 'Q13 SGX queries', value: String(a.q13SgxQueries.value), source: a.q13SgxQueries.source },
    { label: 'Q14 Watch-list/investigation', value: a.q14WatchListOrInvestigation.value ? 'Yes' : 'No', source: a.q14WatchListOrInvestigation.source },
    { label: 'Q15 US securities', value: a.q15UsSecurities.value, source: a.q15UsSecurities.source },
    { label: 'Q16 Capital raising', value: a.q16CapitalRaising.value, source: a.q16CapitalRaising.source },
    { label: 'Q17 Claims 5yr', value: String(a.q17Claims.value), source: 'leveling assumption' },
    { label: 'Q18 Known circumstance', value: a.q18KnownCircumstance.value ? 'Yes' : 'No', source: 'leveling assumption' },
    { label: 'Q19 Previously declined', value: a.q19PreviouslyDeclined.value ? 'Yes' : 'No', source: 'leveling assumption' },
    { label: 'Q20 Expiring premium', value: a.q20ExpiringPremium.value === 0 ? '0 (new business)' : `S$${a.q20ExpiringPremium.value.toLocaleString()}`, source: 'leveling assumption' },
  ];
}

/** One styled run of text within a display line. */
interface Seg {
  t: string;
  dim?: boolean;
  bold?: boolean;
  color?: string;
  inverse?: boolean;
  underline?: boolean;
}

/** One terminal row of the document; `item` marks cursor-targetable rows. */
interface Line {
  segs: Seg[];
  item?: number;
}

/** Max rows the active modifier's rationale may occupy (bounds the pinned list). */
const RATIONALE_ROWS = 2;
/** Context rows kept visible above the pinned list before falling back to one scrolling doc. */
const MIN_CONTEXT_ROWS = 4;

export function ReviewScreen({ stock, proposal, comments, rows, columns, onCalculate, onQuit }: Props) {
  const width = Math.max(40, columns - 2); // the screen's own paddingX={1}
  const viewport = Math.max(5, rows);

  const modifierValues = [
    proposal.modifiers.financialStrength.value,
    proposal.modifiers.governanceAndOwnership.value,
    proposal.modifiers.sharePriceAndFloat.value,
    proposal.modifiers.regulatoryGeographyTransactions.value,
    proposal.modifiers.claimsAndInsuranceHistory.value,
  ];
  const modifierRationales = [
    proposal.modifiers.financialStrength.rationale,
    proposal.modifiers.governanceAndOwnership.rationale,
    proposal.modifiers.sharePriceAndFloat.rationale,
    proposal.modifiers.regulatoryGeographyTransactions.rationale,
    proposal.modifiers.claimsAndInsuranceHistory.rationale,
  ];

  const [overrides, setOverrides] = useState<number[]>(modifierValues);
  const [applied, setApplied] = useState<Set<string>>(new Set(proposal.proposedExclusions));
  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [contextScroll, setContextScroll] = useState(0);

  const itemCount = MODIFIER_LABELS.length + EXCLUSIONS.length;

  const buildInput = (): WorksheetInput => {
    const base = toWorksheetInput(proposal);
    return {
      ...base,
      modifiers: {
        financialStrength: overrides[0]!,
        governanceAndOwnership: overrides[1]!,
        sharePriceAndFloat: overrides[2]!,
        regulatoryGeographyTransactions: overrides[3]!,
        claimsAndInsuranceHistory: overrides[4]!,
      },
      appliedExclusions: EXCLUSIONS.filter((e) => applied.has(e.id)).map((e) => e.id),
    };
  };

  // ── Compose: context lines (read-only) + list lines (cursor targets) ─
  const contextLines: Line[] = [];
  const listLines: Line[] = [];
  const to = (sink: Line[]) => ({
    push: (segs: Seg[], item?: number) => sink.push({ segs, item }),
    pushWrapped: (text: string, style: Omit<Seg, 't'>, indent: string) => {
      for (const l of wrapText(text, width - indent.length)) sink.push({ segs: [{ ...style, t: indent + l }] });
    },
  });
  const ctx = to(contextLines);
  const lst = to(listLines);

  ctx.push([{ t: clip(`Review & override — ${proposal.companyName || stock.name} (${stock.ticker})`, width), bold: true, color: 'cyan' }]);
  ctx.push([{ t: clip(`- structure: ${proposal.structure.limit} limit · ${proposal.structure.retention} retention · ${proposal.structure.hazardClass} — ${proposal.structure.hazardRationale}`, width), dim: true }]);

  if (comments.trim()) {
    ctx.push([{ t: ' ' }]);
    ctx.push([{ t: 'Your notes (fed to the researchers)', bold: true, color: 'yellow' }]);
    for (const note of comments.trim().split('\n')) ctx.pushWrapped(note, { dim: true }, '- ');
  }

  ctx.push([{ t: ' ' }]);
  ctx.push([{ t: 'Synthesis', bold: true, underline: true }]);
  for (const raw of proposal.synthesis.split('\n')) {
    const text = raw.trim();
    if (!text) continue;
    ctx.pushWrapped(text.replace(/^[-•*]\s*/, ''), {}, '- ');
  }

  ctx.push([{ t: ' ' }]);
  ctx.push([{ t: 'Part 1 answers', bold: true, underline: true }]);
  const grid = answerRows(proposal);
  const gridLines = Math.ceil(grid.length / 2);
  const labelW = 29;
  const half = Math.floor(width / 2);
  for (let i = 0; i < gridLines; i++) {
    const l = grid[i]!;
    const r = grid[i + gridLines];
    const lValue = clip(l.value, Math.max(6, half - labelW - 1));
    const segs: Seg[] = [
      { t: l.label.padEnd(labelW), dim: true },
      { t: lValue, bold: true },
    ];
    if (r) {
      segs.push({ t: ' '.repeat(Math.max(2, half - labelW - lValue.length)) });
      segs.push({ t: r.label.padEnd(labelW), dim: true });
      segs.push({ t: clip(r.value, Math.max(6, width - half - labelW - 1)), bold: true });
    }
    ctx.push(segs);
  }

  if (proposal.dataGaps.length > 0) {
    ctx.push([{ t: ' ' }]);
    ctx.push([{ t: 'Data gaps (agent could not establish)', bold: true, color: 'yellow' }]);
    for (const g of proposal.dataGaps) ctx.pushWrapped(g, { color: 'yellow', dim: true }, '- ');
  }

  lst.push([{ t: 'Modifiers — ⏎ re-set a value', bold: true, underline: true }]);
  MODIFIER_LABELS.forEach((label, i) => {
    const active = cursor === i;
    const overridden = overrides[i] !== modifierValues[i];
    const editing = draft !== null && cursor === i;
    const segs: Seg[] = [
      { t: active ? '❯ ' : '  ', color: active ? 'cyan' : undefined },
      { t: label.padEnd(40), color: active ? 'cyan' : undefined },
      editing
        ? { t: `[${draft ?? ''} `, inverse: true }
        : { t: overrides[i]!.toFixed(2), bold: true, color: overridden ? 'yellow' : active ? 'cyan' : undefined },
    ];
    if (editing) {
      segs.push({ t: `] `, inverse: true });
      segs.push({ t: ` ⏎ set · esc cancel · was ${modifierValues[i]!.toFixed(2)} · range 0.50–3.50`, dim: true });
    } else if (overridden) {
      segs.push({ t: ` (agent: ${modifierValues[i]!.toFixed(2)})`, color: 'yellow' });
    }
    lst.push(segs, i);
    if (active && modifierRationales[i]) {
      const wrapped = wrapText(modifierRationales[i], width - 6).slice(0, RATIONALE_ROWS);
      wrapped.forEach((l, j) =>
        lst.push([{ t: '    ' + (j === wrapped.length - 1 ? clip(l, width - 4) : l), dim: true }]),
      );
    }
  });

  lst.push([{ t: ' ' }]);
  lst.push([{ t: 'Exclusions — space marks [x]', bold: true, underline: true }]);
  EXCLUSIONS.forEach((excl, i) => {
    const item = MODIFIER_LABELS.length + i;
    const active = cursor === item;
    const on = applied.has(excl.id);
    const recommended = proposal.proposedExclusions.includes(excl.id as (typeof proposal.proposedExclusions)[number]);
    const effect = ` (${(excl.effect * 100).toFixed(1)}%)`;
    const marker = !on && recommended ? ' — agent recommends' : '';
    const prefix = `${active ? '❯' : ' '} ${on ? '[x]' : '[ ]'} `;
    const nameW = Math.max(12, width - prefix.length - effect.length - marker.length);
    lst.push(
      [
        { t: prefix, color: active ? 'cyan' : undefined },
        { t: clip(excl.name, nameW), bold: on, color: active ? 'cyan' : undefined },
        { t: effect, dim: !on, color: on ? 'green' : undefined },
        ...(marker ? [{ t: marker, color: 'yellow' }] : []),
      ],
      item,
    );
  });

  // ── Layout: pinned list + scrolling context, or one cursor-following doc ─
  const splitMode = viewport >= listLines.length + MIN_CONTEXT_ROWS;
  const contextViewport = splitMode ? viewport - listLines.length : 0;
  const contextMax = Math.max(0, contextLines.length - contextViewport);
  const clampedContextScroll = Math.min(contextScroll, contextMax);

  let visible: Line[];
  if (splitMode) {
    visible = [...contextLines.slice(clampedContextScroll, clampedContextScroll + contextViewport), ...listLines];
  } else {
    const all = [...contextLines, ...listLines];
    const cursorLine = Math.max(0, all.findIndex((l) => l.item === cursor));
    const margin = 2;
    let scroll = 0;
    if (cursorLine + margin + 1 > viewport) scroll = cursorLine + margin + 1 - viewport;
    scroll = Math.max(0, Math.min(scroll, Math.max(0, cursorLine - margin)));
    visible = all.slice(scroll, scroll + viewport);
  }

  useInput((input, key) => {
    if (draft !== null) {
      if (key.return) {
        const parsed = Number.parseFloat(draft);
        if (!Number.isNaN(parsed) && parsed >= 0.5 && parsed <= 3.5) {
          setOverrides((o) => o.map((v, i) => (i === cursor ? parsed : v)));
        }
        setDraft(null);
      } else if (key.escape) {
        setDraft(null);
      } else if (key.delete || input === '\b' || input === '\u007f') {
        setDraft((d) => (d ?? '').slice(0, -1));
      } else if (/^[0-9.]+$/.test(input) && (draft ?? '').length + input.length <= 8) {
        setDraft((d) => (d ?? '') + input);
      }
      return;
    }

    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setCursor((c) => Math.min(itemCount - 1, c + 1));
    if (splitMode && key.pageUp) setContextScroll((s) => Math.max(0, s - contextViewport));
    if (splitMode && key.pageDown) setContextScroll((s) => Math.min(contextMax, s + contextViewport));

    const isModifier = cursor < MODIFIER_LABELS.length;
    if (isModifier && key.return) setDraft('');
    if (!isModifier && (input === ' ' || key.return)) {
      const excl = EXCLUSIONS[cursor - MODIFIER_LABELS.length]!;
      setApplied((s) => {
        const next = new Set(s);
        if (next.has(excl.id)) next.delete(excl.id);
        else next.add(excl.id);
        return next;
      });
    }
    if (input === 'c') onCalculate(buildInput());
    if (input === 'q') onQuit();
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      {visible.map((ln, i) => (
        <Text key={i} wrap="truncate">
          {ln.segs.map((s, j) => (
            <Text key={j} dimColor={s.dim} bold={s.bold} color={s.color} inverse={s.inverse} underline={s.underline}>
              {s.t}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}
