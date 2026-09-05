import { describe, expect, it } from 'vitest';
import { calculate } from '../src/engine/index.js';
import type { WorksheetInput } from '../src/engine/types.js';

/**
 * The Marina Logistics Holdings Ltd worked example built into the sheet
 * (Identification + Parts 1–5, Risk Narrative). The engine must reproduce
 * the sheet's own numbers: loss cost 29,042.84 → premium 52,805.16 → clear.
 */
const marina: WorksheetInput = {
  risk: {
    q1MarketCap: 680,
    q2FreeFloat: 0.42,
    q3SharePriceMove: -0.18,
    q4ForeignPct: 0.55,
    q5NetGearing: 0.51,
    q6ProfitHistory: 'All three',
    q7AdverseAnnouncement: true,
    q8IndependentDirectors: 0.5,
    q9LargestShareholder: 0.38,
    q10AuditOpinion: 'Unqualified',
    q11AuditorChanged: false,
    q12CeoCfoChanged: false,
    q13SgxQueries: 1,
    q14WatchListOrInvestigation: false,
    q15UsSecurities: 'None',
    q16CapitalRaising: 'Placement or rights issue',
    q17Claims: 0,
    q18KnownCircumstance: false,
    q19PreviouslyDeclined: false,
    q20ExpiringPremium: 55_000,
  },
  structure: { limit: 'S$10m', retention: 'SGD 250k', hazardClass: 'Class 2' },
  modifiers: {
    financialStrength: 1.05,
    governanceAndOwnership: 1.1,
    sharePriceAndFloat: 1.1,
    regulatoryGeographyTransactions: 1.1,
    claimsAndInsuranceHistory: 0.95,
  },
  appliedExclusions: ['majorShareholder', 'specificMatter', 'ipt'],
  narrative: {
    complete: true,
    litigationExposure: 'Low',
    financialStrength: 'Adequate',
    managementStrength: 'Adequate',
    governanceConcern: 'Minor',
    keyOfficersEntered: true,
    keyOfficersWithFinanceExperience: 3,
    shareholdersEquity: 318,
    profitByYear: [21, 26, 31],
  },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('Marina Logistics worked example', () => {
  const out = calculate(marina);

  it('prices from the correct Table A band', () => {
    expect(out.price.baseCostLabel).toBe('500 to below 1,000');
    expect(out.price.baseCost).toBe(25_000);
  });

  it('applies structure factors of 1.00 across the board', () => {
    expect(out.price.limitFactorValue).toBe(1);
    expect(out.price.limitInMillions).toBe(10);
    expect(out.price.retentionFactorValue).toBe(1);
    expect(out.price.hazardFactorValue).toBe(1);
  });

  it('multiplies the five modifiers to the sheet composite', () => {
    expect(round2(out.price.composite.raw)).toBe(1.33);
    expect(round2(out.price.composite.applied)).toBe(1.33);
    expect(out.price.composite.floorOrCapBit).toBe(false);
  });

  it('computes the coverage terms factor from the applied exclusions', () => {
    // 1 + (-0.025 - 0.05 - 0.05) = 0.875, displayed 0.88
    expect(out.price.coverageTermsFactorValue).toBeCloseTo(0.875, 10);
  });

  it('reproduces the technical loss cost and premium to the cent', () => {
    expect(round2(out.price.technicalLossCost)).toBe(29_042.84);
    expect(round2(out.price.technicalPremium)).toBe(52_805.16);
    expect(round2(out.price.indicatedPremium)).toBe(52_805.16);
    expect(round2(out.price.premiumToQuote)).toBe(52_805.16);
  });

  it('reproduces rate change and premium per S$1m', () => {
    expect(round2(out.price.rateChange as number)).toBe(-0.04);
    expect(round2(out.price.premiumPerMillion)).toBe(5_280.52);
  });

  it('recommends exactly the exclusions the sheet applies', () => {
    expect([...out.price.recommendedExclusionIds].sort()).toEqual(
      ['majorShareholder', 'specificMatter', 'ipt'].sort(),
    );
  });

  it('is clear to quote', () => {
    expect(out.referral.kind).toBe('clear');
    expect(out.referral.message).toBe('Within junior underwriting authority — clear to quote');
  });

  it('suggests the sheet sublimits for a S$10m limit', () => {
    const byId = Object.fromEntries(out.price.sublimits.map((s) => [s.id, s.suggested]));
    expect(byId.emergencyLegal).toBe(1_000_000);
    expect(byId.investigation).toBe(2_500_000);
    expect(byId.epl).toBe(500_000);
    expect(byId.crisis).toBe(250_000);
    expect(byId.extradition).toBe(250_000);
    expect(byId.reputation).toBe(100_000);
    expect(byId.deprivation).toBe(100_000);
    expect(byId.sideC).toBe(10_000_000);
  });
});

describe('leveling assumptions (new business, no claims)', () => {
  const newBusiness: WorksheetInput = {
    ...marina,
    risk: { ...marina.risk, q20ExpiringPremium: 0 },
  };

  it('reports "New business" instead of a rate change', () => {
    expect(calculate(newBusiness).price.rateChange).toBe('New business');
  });
});

describe('referral triggers', () => {
  const cleanish: WorksheetInput = { ...marina };

  it('refers on any US securities exposure', () => {
    const out = calculate({
      ...cleanish,
      risk: { ...cleanish.risk, q15UsSecurities: 'NYSE ADR programme' },
    });
    expect(out.referral.kind).toBe('refer');
    expect(out.referral.fired.some((f) => f.cell === 'C119')).toBe(true);
    // US exposure also recommends the US securities exclusion
    expect(out.price.recommendedExclusionIds).toContain('usSecurities');
  });

  it('refers on net gearing above 3.00x and on the 999 negative-equity sentinel', () => {
    const high = calculate({ ...cleanish, risk: { ...cleanish.risk, q5NetGearing: 3.4 } });
    expect(high.referral.fired.some((f) => f.cell === 'C117')).toBe(true);
    const sentinel = calculate({ ...cleanish, risk: { ...cleanish.risk, q5NetGearing: 999 } });
    expect(sentinel.referral.fired.some((f) => f.cell === 'C117')).toBe(true);
  });

  it('refers when a recommended exclusion is not applied', () => {
    const out = calculate({ ...cleanish, appliedExclusions: [] });
    expect(out.referral.fired.some((f) => f.cell === 'C112')).toBe(true);
  });

  it('refers on a modifier outside 0.85 – 2.00', () => {
    const out = calculate({
      ...cleanish,
      modifiers: { ...cleanish.modifiers, sharePriceAndFloat: 2.2 },
    });
    expect(out.referral.fired.some((f) => f.cell === 'C111')).toBe(true);
  });

  it('flags a percentage mis-key (18 typed instead of 18%)', () => {
    const out = calculate({ ...cleanish, risk: { ...cleanish.risk, q3SharePriceMove: -18 } });
    expect(out.referral.fired.some((f) => f.cell === 'C110')).toBe(true);
  });

  it('fires the contradiction check when narrative says Weak but modifier 1 is a credit', () => {
    const out = calculate({
      ...cleanish,
      modifiers: { ...cleanish.modifiers, financialStrength: 0.95 },
      narrative: { ...cleanish.narrative!, financialStrength: 'Weak' },
    });
    expect(out.referral.fired.some((f) => f.cell === 'C141')).toBe(true);
    expect(out.referral.fired.some((f) => f.cell === 'C137')).toBe(true);
  });

  it('fires when narrative profit history disagrees with Q6', () => {
    const out = calculate({
      ...cleanish,
      narrative: { ...cleanish.narrative!, profitByYear: [21, -4, 31] },
    });
    expect(out.referral.fired.some((f) => f.cell === 'C144')).toBe(true);
  });

  it('floors tiny risks at the minimum premium and refers', () => {
    const out = calculate({
      ...cleanish,
      risk: { ...cleanish.risk, q1MarketCap: 60 },
      structure: { limit: 'S$5m', retention: 'SGD 1m', hazardClass: 'Class 1' },
      modifiers: {
        financialStrength: 0.85,
        governanceAndOwnership: 0.85,
        sharePriceAndFloat: 0.9,
        regulatoryGeographyTransactions: 1.0,
        claimsAndInsuranceHistory: 0.9,
      },
      appliedExclusions: ['majorShareholder', 'specificMatter', 'ipt'],
    });
    // 10,500 × 0.70 × 0.80 × 0.85 × composite × 0.875 stays below 7,500
    expect(out.price.premiumToQuote).toBe(7_500);
    expect(out.price.flooredAtMinimum).toBe(true);
    expect(out.referral.fired.some((f) => f.cell === 'C134')).toBe(true);
  });
});
