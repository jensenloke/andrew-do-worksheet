/**
 * Part 2/3/4A/5 — deterministic pricing. Replicates the worksheet's calculated
 * (grey) cells. Verified against the Marina Logistics worked example:
 * base 25,000 × limit 1 × retention 1 × hazard 1 × composite 1.3276725 ×
 * coverage 0.875 = loss cost 29,042.84 → premium 52,805.16.
 */

import type { SublimitId, WorksheetInput } from './types.js';
import {
  baseLossCost,
  limitFactor,
  retentionFactor,
  hazardFactor,
  MINIMUM_PREMIUM,
  COMPOSITE_FLOOR,
  COMPOSITE_CAP,
} from './factors.js';
import { coverageTermsFactor, recommendedExclusions } from './exclusions.js';
import type { Modifiers } from './types.js';

export interface SublimitSuggestion {
  id: SublimitId;
  label: string;
  suggested: number;
}

/** Part 4A — suggested sublimits, computed from the limit (D60:D67). */
export function suggestedSublimits(limitInMillions: number): SublimitSuggestion[] {
  const limit = limitInMillions * 1_000_000;
  return [
    { id: 'emergencyLegal', label: 'Emergency legal costs (no prior consent)', suggested: limit * 0.1 },
    { id: 'investigation', label: 'Entity investigation and pre-claim inquiry costs', suggested: Math.min(limit * 0.25, 5_000_000) },
    { id: 'epl', label: 'Entity employment practices liability', suggested: Math.min(limit * 0.1, 500_000) },
    { id: 'crisis', label: 'Crisis and public relations costs', suggested: Math.min(limit * 0.05, 250_000) },
    { id: 'extradition', label: 'Extradition, bail and civil bond costs', suggested: Math.min(limit * 0.05, 250_000) },
    { id: 'reputation', label: 'Reputation protection expenses', suggested: Math.min(limit * 0.02, 100_000) },
    { id: 'deprivation', label: 'Deprivation of assets costs', suggested: Math.min(limit * 0.02, 100_000) },
    { id: 'sideC', label: 'Side C entity securities cover', suggested: limit },
  ];
}

export interface CompositeResult {
  modifiers: number[];
  /** Raw product of the five modifiers (D54). */
  raw: number;
  /** After Table E floor/cap (D55). */
  applied: number;
  /** True when the floor or cap changed the number (D54 <> D55). */
  floorOrCapBit: boolean;
}

export function compositeModifier(m: Modifiers): CompositeResult {
  const list = [
    m.financialStrength,
    m.governanceAndOwnership,
    m.sharePriceAndFloat,
    m.regulatoryGeographyTransactions,
    m.claimsAndInsuranceHistory,
  ];
  const raw = list.reduce((acc, x) => acc * x, 1);
  const applied = Math.max(COMPOSITE_FLOOR, Math.min(COMPOSITE_CAP, raw));
  return {
    modifiers: list,
    raw,
    applied,
    floorOrCapBit: Math.round(raw * 10_000) !== Math.round(applied * 10_000),
  };
}

export interface PriceResult {
  baseCostLabel: string;
  baseCost: number;
  limitFactorValue: number;
  limitInMillions: number;
  retentionFactorValue: number;
  hazardFactorValue: number;
  composite: CompositeResult;
  coverageTermsFactorValue: number;
  /** Technical loss cost (D94). */
  technicalLossCost: number;
  permissibleLossRatio: number;
  /** Technical premium (D96). */
  technicalPremium: number;
  marketAdjustment: number;
  participation: number;
  /** Indicated premium, our share (D99). */
  indicatedPremium: number;
  minimumPremium: number;
  /** Premium to quote (D101). */
  premiumToQuote: number;
  flooredAtMinimum: boolean;
  /** Rate change against expiring (D102), or 'New business' when Q20 = 0. */
  rateChange: number | 'New business';
  /** Premium per S$1m of our share (D103). */
  premiumPerMillion: number;
  sublimits: SublimitSuggestion[];
  recommendedExclusionIds: ReturnType<typeof recommendedExclusions>;
}

export function price(input: WorksheetInput): PriceResult {
  const { risk, structure, modifiers } = input;

  const band = baseLossCost(risk.q1MarketCap);
  const lim = limitFactor(structure.limit);
  const retention = retentionFactor(structure.retention);
  const hazard = hazardFactor(structure.hazardClass);
  const composite = compositeModifier(modifiers);
  const coverage = coverageTermsFactor(input.appliedExclusions, input.appliedExtensions ?? []);

  const permissibleLossRatio = input.permissibleLossRatio ?? 0.55;
  const marketAdjustment = input.marketAdjustment ?? 1;
  const participation = input.participation ?? 1;

  const technicalLossCost =
    band.lossCost * lim.factor * retention * hazard * composite.applied * coverage;
  const technicalPremium = technicalLossCost / permissibleLossRatio;
  const indicatedPremium = technicalPremium * marketAdjustment * participation;
  const premiumToQuote = Math.max(indicatedPremium, MINIMUM_PREMIUM);
  const flooredAtMinimum = indicatedPremium < MINIMUM_PREMIUM;

  const rateChange: number | 'New business' =
    risk.q20ExpiringPremium === 0 ? 'New business' : premiumToQuote / risk.q20ExpiringPremium - 1;

  const premiumPerMillion = premiumToQuote / (lim.limitInMillions * participation);

  return {
    baseCostLabel: band.label,
    baseCost: band.lossCost,
    limitFactorValue: lim.factor,
    limitInMillions: lim.limitInMillions,
    retentionFactorValue: retention,
    hazardFactorValue: hazard,
    composite,
    coverageTermsFactorValue: coverage,
    technicalLossCost,
    permissibleLossRatio,
    technicalPremium,
    marketAdjustment,
    participation,
    indicatedPremium,
    minimumPremium: MINIMUM_PREMIUM,
    premiumToQuote,
    flooredAtMinimum,
    rateChange,
    premiumPerMillion,
    sublimits: suggestedSublimits(lim.limitInMillions),
    recommendedExclusionIds: recommendedExclusions(risk),
  };
}
