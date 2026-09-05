/**
 * Part 6 — referral check. Replicates the ~38 automatic triggers (C107:C144)
 * and the status line (C146). "Clear to quote" does not mean "quote it".
 */

import type { WorksheetInput } from './types.js';
import { recommendedExclusions, EXCLUSIONS } from './exclusions.js';
import type { PriceResult } from './pricing.js';

export type ReferTo = 'Complete before quoting' | 'Senior underwriter' | 'Head of Financial Lines';

export interface FiredReferral {
  /** Worksheet row reference, for traceability back to the sheet. */
  cell: string;
  trigger: string;
  referTo: ReferTo;
}

const MONEY = (n: number) => `S$${n.toLocaleString('en-SG')}`;

export function evaluateReferrals(input: WorksheetInput, priceResult: PriceResult): FiredReferral[] {
  const fired: FiredReferral[] = [];
  const add = (cell: string, trigger: string, referTo: ReferTo) => fired.push({ cell, trigger, referTo });

  const { risk, structure, modifiers, narrative } = input;
  const mods = [
    modifiers.financialStrength,
    modifiers.governanceAndOwnership,
    modifiers.sharePriceAndFloat,
    modifiers.regulatoryGeographyTransactions,
    modifiers.claimsAndInsuranceHistory,
  ];
  const permissibleLossRatio = input.permissibleLossRatio ?? 0.55;
  const marketAdjustment = input.marketAdjustment ?? 1;
  const participation = input.participation ?? 1;

  // C107 — sheet incomplete, or an input is out of bounds
  if (
    !(risk.q1MarketCap > 0) ||
    participation <= 0 || participation > 1 ||
    permissibleLossRatio <= 0.2 || permissibleLossRatio >= 0.9
  ) {
    add('C107', 'Sheet incomplete, or an input is out of bounds', 'Complete before quoting');
  }

  // C110 — a percentage answer looks mis-keyed
  const miskeyed =
    risk.q2FreeFloat > 1 || risk.q4ForeignPct > 1 || risk.q8IndependentDirectors > 1 || risk.q9LargestShareholder > 1 ||
    risk.q3SharePriceMove < -1 || risk.q3SharePriceMove > 3 ||
    (risk.q2FreeFloat > 0 && risk.q2FreeFloat < 0.05) ||
    (risk.q8IndependentDirectors > 0 && risk.q8IndependentDirectors < 0.05) ||
    (risk.q9LargestShareholder > 0 && risk.q9LargestShareholder < 0.01);
  if (miskeyed) add('C110', 'A percentage answer looks mis-keyed — check Q2, Q3, Q4, Q8, Q9', 'Complete before quoting');

  // C111 — a modifier is outside its stated range (0.85 – 2.00)
  if (mods.every((m) => typeof m === 'number') && (Math.min(...mods) < 0.85 || Math.max(...mods) > 2)) {
    add('C111', 'A modifier is outside its stated range (0.85 – 2.00)', 'Senior underwriter');
  }

  // C112 — a recommended exclusion has not been applied
  const recommended = recommendedExclusions(risk);
  const notApplied = recommended.filter((id) => !input.appliedExclusions.includes(id));
  if (notApplied.length > 0) {
    const names = notApplied
      .map((id) => EXCLUSIONS.find((e) => e.id === id)?.name ?? id)
      .join('; ');
    add('C112', `A recommended exclusion has not been applied: ${names}`, 'Senior underwriter');
  }

  // C113 — market capitalisation below S$50m or at/above S$10bn
  if (risk.q1MarketCap < 50 || risk.q1MarketCap >= 10_000) {
    add('C113', `Market capitalisation ${MONEY(risk.q1MarketCap * 1e6)} outside the S$50m – S$10bn band`, 'Senior underwriter');
  }

  // C114 — audit opinion is not unqualified
  if (risk.q10AuditOpinion !== 'Unqualified') {
    add('C114', `Audit opinion is ${risk.q10AuditOpinion.toLowerCase()} (Q10)`, 'Senior underwriter');
  }

  // C115 — auditor change together with a non-unqualified opinion
  if (risk.q11AuditorChanged && risk.q10AuditOpinion !== 'Unqualified') {
    add('C115', 'Auditor change together with a non-unqualified opinion (Q10, Q11)', 'Head of Financial Lines');
  }

  // C116 — loss-making in all of the last three financial years
  if (risk.q6ProfitHistory === 'None') {
    add('C116', 'Loss-making in all of the last three financial years (Q6)', 'Head of Financial Lines');
  }

  // C117 — net gearing above 3.00x (999 is the negative-equity sentinel)
  if (risk.q5NetGearing > 3) {
    add('C117', risk.q5NetGearing >= 999
      ? 'Negative shareholders\' equity — net gearing not computable (Q5)'
      : `Net gearing ${risk.q5NetGearing.toFixed(2)}x above 3.00x (Q5)`, 'Head of Financial Lines');
  }

  // C118 — more than 75% of assets or revenue outside Singapore
  if (risk.q4ForeignPct > 0.75) {
    add('C118', `More than 75% of assets or revenue outside Singapore (Q4: ${(risk.q4ForeignPct * 100).toFixed(0)}%)`, 'Senior underwriter');
  }

  // C119 — any US securities exposure
  if (risk.q15UsSecurities !== 'None') {
    add('C119', `US securities exposure: ${risk.q15UsSecurities} (Q15)`, 'Head of Financial Lines');
  }

  // C120 — hazard Class 5
  if (structure.hazardClass === 'Class 5') {
    add('C120', 'Hazard Class 5', 'Head of Financial Lines');
  }

  // C121 — watch-list, suspension or regulatory investigation
  if (risk.q14WatchListOrInvestigation) {
    add('C121', 'Watch-list, suspension or regulatory investigation (Q14)', 'Head of Financial Lines');
  }

  // C122 — three or more SGX queries in the last 24 months
  if (risk.q13SgxQueries >= 3) {
    add('C122', `${risk.q13SgxQueries} SGX queries in the last 24 months (Q13)`, 'Senior underwriter');
  }

  // C123 — IPO or RTO completed in the last 24 months
  if (risk.q16CapitalRaising === 'IPO or RTO') {
    add('C123', 'IPO or RTO completed in the last 24 months (Q16)', 'Senior underwriter');
  }

  // C124 — claims or notifications in the last 5 years
  if (risk.q17Claims > 0) {
    add('C124', `${risk.q17Claims} claim(s)/notification(s) in the last 5 years (Q17)`, 'Senior underwriter');
  }

  // C125 — undisclosed or un-notified known circumstance
  if (risk.q18KnownCircumstance) {
    add('C125', 'Undisclosed or un-notified known circumstance (Q18)', 'Head of Financial Lines');
  }

  // C126 — D&O cover previously declined, cancelled or non-renewed
  if (risk.q19PreviouslyDeclined) {
    add('C126', 'D&O cover previously declined, cancelled or non-renewed (Q19)', 'Head of Financial Lines');
  }

  // C127 — composite modifier outside 0.70 – 2.00
  if (priceResult.composite.applied < 0.7 || priceResult.composite.applied > 2) {
    add('C127', `Composite modifier ${priceResult.composite.applied.toFixed(2)} outside 0.70 – 2.00`, 'Senior underwriter');
  }

  // C128 — Table E floor or cap has bitten the composite modifier
  if (priceResult.composite.floorOrCapBit) {
    add('C128', 'Table E floor or cap has bitten the composite modifier', 'Head of Financial Lines');
  }

  // C129 — coverage terms factor outside 0.80 – 1.20
  if (priceResult.coverageTermsFactorValue < 0.8 || priceResult.coverageTermsFactorValue > 1.2) {
    add('C129', `Coverage terms factor ${priceResult.coverageTermsFactorValue.toFixed(3)} outside 0.80 – 1.20`, 'Senior underwriter');
  }

  // C130 — a sublimit has been agreed above the suggested level
  if (input.agreedSublimits) {
    const over = priceResult.sublimits.filter((s) => {
      const agreed = input.agreedSublimits?.[s.id];
      return agreed !== undefined && agreed > s.suggested;
    });
    if (over.length > 0) {
      add('C130', `Sublimit agreed above the suggested level: ${over.map((s) => s.label).join('; ')}`, 'Senior underwriter');
    }
  }

  // C131 — market adjustment factor outside 0.95 – 1.05
  if (marketAdjustment < 0.95 || marketAdjustment > 1.05) {
    add('C131', `Market adjustment factor ${marketAdjustment} outside 0.95 – 1.05`, 'Senior underwriter');
  }

  // C132 — premium reduction greater than 10% against expiring
  if (risk.q20ExpiringPremium > 0 && priceResult.premiumToQuote / risk.q20ExpiringPremium - 1 < -0.1) {
    const pct = ((priceResult.premiumToQuote / risk.q20ExpiringPremium - 1) * 100).toFixed(1);
    add('C132', `Premium reduction ${pct}% against expiring (greater than 10%)`, 'Senior underwriter');
  }

  // C133 — limit above S$25m
  if (priceResult.limitInMillions > 25) {
    add('C133', `Limit S$${priceResult.limitInMillions}m above S$25m`, 'Senior underwriter');
  }

  // C134 — quote floored at the minimum premium
  if (priceResult.flooredAtMinimum) {
    add('C134', 'Quote floored at the minimum premium', 'Senior underwriter');
  }

  // --- NARRATIVE checks (only when a narrative assessment is supplied) ---
  if (narrative) {
    // C135 — a section of the Risk Narrative tab is blank
    if (!narrative.complete) {
      add('C135', 'NARRATIVE — a section of the Risk Narrative tab is blank', 'Complete before quoting');
    }

    // C136 — litigation exposure assessed as High
    if (narrative.litigationExposure === 'High') {
      add('C136', 'NARRATIVE — litigation exposure assessed as High', 'Head of Financial Lines');
    }

    // C137 — financial strength assessed as Weak or Serious concern
    if (narrative.financialStrength === 'Weak' || narrative.financialStrength === 'Serious concern') {
      add('C137', `NARRATIVE — financial strength assessed as ${narrative.financialStrength}`, 'Head of Financial Lines');
    }

    // C138 — management assessed as Weak, or a Material governance concern
    if (narrative.managementStrength === 'Weak' || narrative.governanceConcern === 'Material') {
      add('C138', 'NARRATIVE — management assessed as Weak, or a Material governance concern', 'Senior underwriter');
    }

    // C139 — officers entered but none with finance or accounting experience
    if (narrative.keyOfficersEntered && narrative.keyOfficersWithFinanceExperience === 0) {
      add('C139', 'NARRATIVE — no key officer has finance or accounting experience', 'Senior underwriter');
    }

    // C140 — shareholders' equity is negative
    if (narrative.shareholdersEquity <= 0) {
      add('C140', 'NARRATIVE — shareholders\' equity is negative', 'Head of Financial Lines');
    }

    // C141 — CONTRADICTION: financial strength weak, but modifier 1 is a credit
    if ((narrative.financialStrength === 'Weak' || narrative.financialStrength === 'Serious concern') &&
        modifiers.financialStrength < 1) {
      add('C141', 'CONTRADICTION — narrative says financial strength is weak, but modifier 1 is a credit', 'Senior underwriter');
    }

    // C142 — CONTRADICTION: litigation High, but modifier 4 below 1.20
    if (narrative.litigationExposure === 'High' && modifiers.regulatoryGeographyTransactions < 1.2) {
      add('C142', 'CONTRADICTION — narrative says litigation exposure is High, but modifier 4 is below 1.20', 'Senior underwriter');
    }

    // C143 — CONTRADICTION: management/governance flagged, but modifier 2 below 1.10
    if ((narrative.managementStrength === 'Weak' || narrative.governanceConcern === 'Material') &&
        modifiers.governanceAndOwnership < 1.1) {
      add('C143', 'CONTRADICTION — narrative flags management or governance, but modifier 2 is below 1.10', 'Senior underwriter');
    }

    // C144 — CONTRADICTION: narrative profit history does not agree with Q6
    const profitableYears = narrative.profitByYear.filter((p) => p > 0).length;
    const expected =
      risk.q6ProfitHistory === 'All three' ? 3 :
      risk.q6ProfitHistory === 'Two of three' ? 2 :
      risk.q6ProfitHistory === 'One of three' ? 1 : 0;
    if (profitableYears !== expected) {
      add('C144', `CONTRADICTION — narrative profit history (${profitableYears} profitable year(s)) does not agree with Q6 (${risk.q6ProfitHistory})`, 'Complete before quoting');
    }
  }

  return fired;
}

export interface ReferralStatus {
  kind: 'clear' | 'refer';
  message: string;
  fired: FiredReferral[];
}

/** C146 — the status line. */
export function referralStatus(input: WorksheetInput, priceResult: PriceResult): ReferralStatus {
  const fired = evaluateReferrals(input, priceResult);
  if (fired.length > 0) {
    return {
      kind: 'refer',
      message: `REFER — ${fired.length} trigger(s). Do not release terms until signed off.`,
      fired,
    };
  }
  return {
    kind: 'clear',
    message: 'Within junior underwriting authority — clear to quote',
    fired: [],
  };
}
