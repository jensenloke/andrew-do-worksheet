/**
 * The agent's final deliverable: a fully-cited worksheet proposal.
 * Every Part 1 answer carries its value, a one-sentence rationale, and the
 * source it came from — the review screen shows all three, and the engine
 * arbitrates the numbers.
 */

import { z } from 'zod';

export const citedNumber = (description: string) =>
  z.object({
    value: z.number().describe(description),
    rationale: z.string().describe('One sentence: why this value'),
    source: z.string().describe('Where it was found: URL, or "annual report FY2025 p.42"'),
  });

export const citedBoolean = (description: string) =>
  z.object({
    value: z.boolean().describe(description),
    rationale: z.string(),
    source: z.string(),
  });

export const citedEnum = <T extends [string, ...string[]]>(values: T, description: string) =>
  z.object({
    value: z.enum(values).describe(description),
    rationale: z.string(),
    source: z.string(),
  });

export const citedString = (description: string) =>
  z.object({
    value: z.string().describe(description),
    rationale: z.string(),
    source: z.string(),
  });

const modifierProposal = z.object({
  value: z.number().describe('The modifier (1.00 = typical; move only with a cited fact)'),
  rationale: z.string().describe('The specific Part 1 facts that justify the move, in one or two sentences'),
  facts: z.array(z.string()).default([]).describe('The concrete facts cited, one per entry'),
});

export const ProposalSchema = z.object({
  companyName: z.string(),
  sgxCode: z.string(),
  businessSummary: z
    .string()
    .describe('Narrative section 1: what the company actually does, segments, geography, listing history'),

  answers: z.object({
    q1MarketCap: citedNumber('Market capitalisation in S$m at a stated date'),
    q2FreeFloat: citedNumber('Free float as a fraction (0.42 = 42%)'),
    q3SharePriceMove: citedNumber('12-month share price movement as a fraction; negative for a fall (-0.18 = down 18%)'),
    q4ForeignPct: citedNumber('Assets or revenue outside Singapore, whichever is higher, as a fraction'),
    q5NetGearing: citedNumber('Net gearing (net debt / equity); 999 if equity is negative'),
    q6ProfitHistory: citedEnum(
      ['All three', 'Two of three', 'One of three', 'None'],
      'Profitable in each of the last three financial years?',
    ),
    q7AdverseAnnouncement: citedBoolean('Profit warning, restatement or material adverse announcement in last 12 months?'),
    q8IndependentDirectors: citedNumber('Independent directors as a fraction of the board'),
    q9LargestShareholder: citedNumber('Largest shareholder holding as a fraction, including family/holding companies acting together'),
    q10AuditOpinion: citedEnum(['Unqualified', 'Qualified', 'Disclaimer', 'Adverse'], 'Audit opinion, most recent'),
    q11AuditorChanged: citedBoolean('Change of external auditor in the last 3 years?'),
    q12CeoCfoChanged: citedBoolean('CEO or CFO change in the last 24 months?'),
    q13SgxQueries: citedNumber('SGX queries received in the last 24 months (count)'),
    q14WatchListOrInvestigation: citedBoolean('Watch-list, trading suspension or regulatory investigation?'),
    q15UsSecurities: citedString('US securities exposure — "None" or a description (ADR, US listing, etc.)'),
    q16CapitalRaising: citedEnum(
      ['None', 'Placement or rights issue', 'IPO or RTO'],
      'IPO, RTO or capital raising in the last 24 months?',
    ),
    q17Claims: citedNumber('D&O claims or notifications in last 5 years — ASSUMED 0 by the session leveling rules'),
    q18KnownCircumstance: citedBoolean('Known circumstance disclosed but not notified — ASSUMED false by leveling rules'),
    q19PreviouslyDeclined: citedBoolean('Any insurer declined/cancelled/non-renewed D&O — ASSUMED false by leveling rules'),
    q20ExpiringPremium: citedNumber('Expiring premium — ASSUMED 0 (new policy) by leveling rules'),
  }),

  structure: z.object({
    limit: z.enum(['S$5m', 'S$10m', 'S$15m', 'S$20m', 'S$25m', 'S$30m', 'S$50m']),
    retention: z.enum(['SGD 100k', 'SGD 250k', 'SGD 500k', 'SGD 1m', 'SGD 2.5m']),
    hazardClass: z.enum(['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5']),
    hazardRationale: z
      .string()
      .describe('Why this hazard class — classify on what the company actually does, not what it calls itself'),
  }),

  modifiers: z.object({
    financialStrength: modifierProposal,
    governanceAndOwnership: modifierProposal,
    sharePriceAndFloat: modifierProposal,
    regulatoryGeographyTransactions: modifierProposal,
    claimsAndInsuranceHistory: modifierProposal,
  }),

  proposedExclusions: z
    .array(
      z.enum([
        'majorShareholder',
        'usSecurities',
        'publicOffering',
        'specificMatter',
        'specificInvestigation',
        'ipt',
        'territorial',
        'insolvency',
        'specificPriorClaims',
      ]),
    )
    .describe('Exclusion ids to apply. Must include every exclusion the facts recommend; never apply one to hit a price'),

  narrative: z.object({
    adverseNews: z.string().describe('Negative news last 3-5 years, with where and when you looked — "None identified" needs provenance'),
    regulatoryActions: z.string().describe('Regulatory actions, investigations or fines — with provenance'),
    litigation: z.string().describe('Class actions, securities litigation, shareholder disputes — with provenance'),
    litigationExposure: z.enum(['Low', 'Moderate', 'High']),
    financialTrend: z.string().describe('Direction of revenue, margin, leverage across the three years'),
    financialRedFlags: z.string().describe('Margin compression, leverage, liquidity, covenants, going-concern language'),
    financialStrength: z.enum(['Strong', 'Adequate', 'Weak', 'Serious concern']),
    governanceSummary: z.string().describe('Board composition, chairman/CEO split, related-party dynamics, tenure'),
    managementStrength: z.enum(['Strong', 'Adequate', 'Weak']),
    governanceConcern: z.enum(['None', 'Minor', 'Material']),
    shareholdersEquity: z.number().describe('Most recent shareholders equity, S$m'),
    profitByYear: z.tuple([z.number(), z.number(), z.number()]).describe('Net profit S$m for the last three FYs, most recent first'),
    keyOfficersWithFinanceExperience: z.number().describe('Count of key officers with finance or accounting experience'),
  }),

  dataGaps: z
    .array(z.string())
    .default([]).describe('Anything that could not be established from public sources — never paper over with a guess; [] if none'),

  synthesis: z
    .string()
    .describe(
      'The closing underwriting view in 4-6 sentences: the risk at a glance, the two or three things that most influence the price, the judgement calls made, and what a senior underwriter should look at before signing',
    ),
});

export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * The synthesis model often answers Q15 as a sentence like "None — no ADR/GDR
 * programme…". The engine treats any value other than exactly "None" as a US
 * securities exposure (which refers), so normalise a leading "None" to "None".
 * A genuine exposure never starts with "None", so this is safe.
 */
function normaliseUsSecurities(value: string): string {
  return /^\s*none\b/i.test(value) ? 'None' : value;
}

/** Convert an accepted proposal into the engine's WorksheetInput. */
export function toWorksheetInput(p: Proposal) {
  return {
    risk: {
      q1MarketCap: p.answers.q1MarketCap.value,
      q2FreeFloat: p.answers.q2FreeFloat.value,
      q3SharePriceMove: p.answers.q3SharePriceMove.value,
      q4ForeignPct: p.answers.q4ForeignPct.value,
      q5NetGearing: p.answers.q5NetGearing.value,
      q6ProfitHistory: p.answers.q6ProfitHistory.value,
      q7AdverseAnnouncement: p.answers.q7AdverseAnnouncement.value,
      q8IndependentDirectors: p.answers.q8IndependentDirectors.value,
      q9LargestShareholder: p.answers.q9LargestShareholder.value,
      q10AuditOpinion: p.answers.q10AuditOpinion.value,
      q11AuditorChanged: p.answers.q11AuditorChanged.value,
      q12CeoCfoChanged: p.answers.q12CeoCfoChanged.value,
      q13SgxQueries: p.answers.q13SgxQueries.value,
      q14WatchListOrInvestigation: p.answers.q14WatchListOrInvestigation.value,
      q15UsSecurities: normaliseUsSecurities(p.answers.q15UsSecurities.value),
      q16CapitalRaising: p.answers.q16CapitalRaising.value,
      q17Claims: p.answers.q17Claims.value,
      q18KnownCircumstance: p.answers.q18KnownCircumstance.value,
      q19PreviouslyDeclined: p.answers.q19PreviouslyDeclined.value,
      q20ExpiringPremium: p.answers.q20ExpiringPremium.value,
    },
    structure: {
      limit: p.structure.limit,
      retention: p.structure.retention,
      hazardClass: p.structure.hazardClass,
    },
    modifiers: {
      financialStrength: p.modifiers.financialStrength.value,
      governanceAndOwnership: p.modifiers.governanceAndOwnership.value,
      sharePriceAndFloat: p.modifiers.sharePriceAndFloat.value,
      regulatoryGeographyTransactions: p.modifiers.regulatoryGeographyTransactions.value,
      claimsAndInsuranceHistory: p.modifiers.claimsAndInsuranceHistory.value,
    },
    appliedExclusions: p.proposedExclusions,
    narrative: {
      complete: true,
      litigationExposure: p.narrative.litigationExposure,
      financialStrength: p.narrative.financialStrength,
      managementStrength: p.narrative.managementStrength,
      governanceConcern: p.narrative.governanceConcern,
      keyOfficersEntered: true,
      keyOfficersWithFinanceExperience: p.narrative.keyOfficersWithFinanceExperience,
      shareholdersEquity: p.narrative.shareholdersEquity,
      profitByYear: p.narrative.profitByYear,
    },
  } as const;
}
