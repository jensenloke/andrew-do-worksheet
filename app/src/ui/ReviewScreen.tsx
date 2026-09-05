/**
 * Review & override — the "human governs" screen.
 * Shows the agent's full proposal; the user can re-set any modifier value and
 * toggle exclusions before the deterministic engine calculates.
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

export function ReviewScreen({ stock, proposal, comments, onCalculate, onQuit }: Props) {
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
      } else if (/^[0-9.]$/.test(input)) {
        setDraft((d) => (d ?? '') + input);
      }
      return;
    }

    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setCursor((c) => Math.min(itemCount - 1, c + 1));

    const isModifier = cursor < MODIFIER_LABELS.length;
    if (isModifier && key.return) setDraft(String(overrides[cursor]));
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

  const rows = answerRows(proposal);
  const left = rows.slice(0, 10);
  const right = rows.slice(10);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold color="cyan">
          Review &amp; override — {proposal.companyName} ({stock.ticker})
        </Text>
      </Box>
      <Text dimColor>{proposal.businessSummary.slice(0, 160)}</Text>

      {comments.trim() ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            Your notes (fed to the researchers)
          </Text>
          {comments
            .trim()
            .split('\n')
            .map((l, i) => (
              <Text key={i} dimColor>
                {'  '}{l}
              </Text>
            ))}
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text bold underline>
          Synthesis
        </Text>
        <Text wrap="wrap">{proposal.synthesis}</Text>
      </Box>

      <Box marginTop={1}>
        <Box flexDirection="column" width="50%">
          {left.map((r) => (
            <Text key={r.label}>
              <Text dimColor>{r.label.padEnd(26)}</Text>
              <Text bold>{r.value}</Text>
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          {right.map((r) => (
            <Text key={r.label}>
              <Text dimColor>{r.label.padEnd(26)}</Text>
              <Text bold>{r.value}</Text>
            </Text>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold underline>
          Modifiers — enter to re-set a value
        </Text>
        {MODIFIER_LABELS.map((label, i) => {
          const active = cursor === i;
          const overridden = overrides[i] !== modifierValues[i];
          const editing = draft !== null && cursor === i;
          return (
            <Box key={label} flexDirection="column">
              <Text color={active ? 'cyan' : undefined}>
                {active ? '❯ ' : '  '}
                {label.padEnd(42)}
                {editing ? (
                  <Text inverse>{(draft ?? '') + ' '}</Text>
                ) : (
                  <Text bold color={overridden ? 'yellow' : undefined}>
                    {overrides[i]!.toFixed(2)}
                  </Text>
                )}
                {overridden && !editing ? <Text color="yellow"> (agent: {modifierValues[i]!.toFixed(2)})</Text> : null}
              </Text>
              {active ? <Text dimColor>   {modifierRationales[i]}</Text> : null}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold underline>
          Exclusions — space to toggle
        </Text>
        {EXCLUSIONS.map((excl, i) => {
          const idx = MODIFIER_LABELS.length + i;
          const active = cursor === idx;
          const on = applied.has(excl.id);
          const recommended = proposal.proposedExclusions.includes(excl.id as (typeof proposal.proposedExclusions)[number]);
          return (
            <Text key={excl.id} color={active ? 'cyan' : undefined}>
              {active ? '❯ ' : '  '}
              {on ? '[x] ' : '[ ] '}
              {excl.name}
              {on ? <Text color="green"> ({(excl.effect * 100).toFixed(1)}%)</Text> : null}
              {!on && recommended ? <Text color="yellow"> — agent recommends</Text> : null}
            </Text>
          );
        })}
      </Box>

      {proposal.dataGaps.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow" bold>
            Data gaps (agent could not establish):
          </Text>
          {proposal.dataGaps.map((g, i) => (
            <Text key={i} color="yellow">
              {'  '}- {g}
            </Text>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text dimColor>
          structure: {proposal.structure.limit} limit · {proposal.structure.retention} retention ·{' '}
          {proposal.structure.hazardClass} ({proposal.structure.hazardRationale.slice(0, 60)})
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="green">
          c = calculate
        </Text>
        <Text dimColor> · q = quit</Text>
      </Box>
    </Box>
  );
}
