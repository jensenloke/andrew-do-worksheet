/**
 * Engine entry point — one call takes a filled worksheet and returns the full
 * calculated output: structure factors, composite modifier, coverage terms,
 * price, suggested sublimits, and the referral verdict.
 */

import type { WorksheetInput } from './types.js';
import { price, type PriceResult } from './pricing.js';
import { referralStatus, type ReferralStatus } from './referral.js';

export interface WorksheetOutput {
  price: PriceResult;
  referral: ReferralStatus;
}

export function calculate(input: WorksheetInput): WorksheetOutput {
  const priceResult = price(input);
  return {
    price: priceResult,
    referral: referralStatus(input, priceResult),
  };
}

export * from './types.js';
export * from './factors.js';
export * from './exclusions.js';
export { price, suggestedSublimits, compositeModifier } from './pricing.js';
export type { PriceResult, CompositeResult, SublimitSuggestion } from './pricing.js';
export { evaluateReferrals, referralStatus } from './referral.js';
export type { FiredReferral, ReferralStatus, ReferTo } from './referral.js';
export { explainPrice } from './explain.js';
export type { ExplainLine } from './explain.js';
