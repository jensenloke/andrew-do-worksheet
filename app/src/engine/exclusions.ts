/**
 * Part 4C — risk-specific exclusions and extensions.
 * Effects are transcribed from the LIVE FORMULAS in column F of the worksheet
 * (the displayed "Premium effect" column in the file's cached values is stale
 * for some rows — e.g. major shareholder is -0.025, not the displayed -0.03).
 */

import type { ExclusionId, ExtensionId, RiskAnswers } from './types.js';

export interface ExclusionDef {
  id: ExclusionId;
  name: string;
  /** Premium effect applied when the exclusion is agreed (negative = cheaper). */
  effect: number;
  /** Sheet logic for when the exclusion is recommended ("Apply"). */
  recommended: (risk: RiskAnswers) => boolean;
  rationale: string;
}

export const EXCLUSIONS: readonly ExclusionDef[] = [
  {
    id: 'majorShareholder',
    name: 'Major shareholder exclusion (holders above 15%)',
    effect: -0.025,
    recommended: (r) => r.q9LargestShareholder > 0.15,
    rationale: 'Q9. Bars claims by a large shareholder who is effectively suing itself.',
  },
  {
    id: 'usSecurities',
    name: 'US securities claims exclusion',
    effect: -0.1,
    recommended: (r) => r.q15UsSecurities !== 'None',
    rationale: 'Q15. Removes the single largest severity driver.',
  },
  {
    id: 'publicOffering',
    name: 'Public offering / prospectus liability exclusion',
    effect: -0.05,
    recommended: (r) => r.q16CapitalRaising === 'IPO or RTO',
    rationale: 'Q16. Excludes prospectus claims unless a separate POSI policy is bought.',
  },
  {
    id: 'specificMatter',
    name: 'Specific matter exclusion (the announced adverse event)',
    effect: -0.05,
    recommended: (r) => r.q7AdverseAnnouncement,
    rationale: 'Q7. Carves out the warning or restatement already in the market.',
  },
  {
    id: 'specificInvestigation',
    name: 'Specific investigation exclusion',
    effect: -0.05,
    recommended: (r) => r.q14WatchListOrInvestigation,
    rationale: 'Q14. Carves out a live regulatory matter. Refer before relying on it.',
  },
  {
    id: 'ipt',
    name: 'Interested-person / related-party transaction exclusion',
    effect: -0.05,
    recommended: (r) => r.q9LargestShareholder > 0.3,
    rationale: 'Q9. Where a controlling family transacts with the listed entity, IPT claims are the likeliest loss.',
  },
  {
    id: 'territorial',
    name: 'Territorial limitation to Singapore and named territories',
    effect: -0.075,
    recommended: (r) => r.q4ForeignPct > 0.75,
    rationale: 'Q4. Confines cover to where you can actually defend a claim.',
  },
  {
    id: 'insolvency',
    name: 'Insolvency and creditor claims exclusion',
    effect: -0.05,
    recommended: (r) => r.q6ProfitHistory === 'None',
    rationale: 'Q6. Rare and contentious — removes cover exactly when directors need it. Refer before offering.',
  },
  {
    id: 'specificPriorClaims',
    name: 'Specific prior claims and circumstances exclusion',
    effect: -0.025,
    recommended: (r) => r.q17Claims > 0 || r.q18KnownCircumstance,
    rationale: 'Q17, Q18. Names the known matters so there is no argument later.',
  },
];

export interface ExtensionDef {
  id: ExtensionId;
  name: string;
  /** Premium effect when the extension is bought (positive = more expensive). */
  effect: number;
}

export const EXTENSIONS: readonly ExtensionDef[] = [
  { id: 'fullInvestigationCosts', name: 'Full-limit entity investigation costs', effect: 0.05 },
  { id: 'broadEpl', name: 'Broad-form entity employment practices liability', effect: 0.075 },
  { id: 'extendedReportingPeriod', name: '12-month extended reporting period', effect: 0.05 },
  { id: 'runOffBeyondSixYears', name: 'Run-off for retired directors beyond six years', effect: 0.025 },
];

/** Which exclusions the sheet recommends ("Apply") for this risk. */
export function recommendedExclusions(risk: RiskAnswers): ExclusionId[] {
  return EXCLUSIONS.filter((e) => e.recommended(risk)).map((e) => e.id);
}

/**
 * Coverage terms factor = 1 + sum of effects of applied exclusions/extensions,
 * floored at 0.70 and capped at 1.30. (Worksheet cell D89.)
 */
export function coverageTermsFactor(
  appliedExclusions: readonly ExclusionId[],
  appliedExtensions: readonly ExtensionId[] = [],
): number {
  const sum =
    EXCLUSIONS.filter((e) => appliedExclusions.includes(e.id)).reduce((acc, e) => acc + e.effect, 0) +
    EXTENSIONS.filter((x) => appliedExtensions.includes(x.id)).reduce((acc, x) => acc + x.effect, 0);
  return Math.max(0.7, Math.min(1.3, 1 + sum));
}
