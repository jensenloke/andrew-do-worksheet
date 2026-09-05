/**
 * Factor tables — transcribed from the Factors tab of DO_Worksheet_SGX_Simple.xlsx.
 * In production these must be replaced with the actuary's indicated rates.
 */

import type { HazardClass, LimitOption, RetentionOption } from './types.js';

/** Table A — base expected loss cost (S$) by market-cap band, lookup on lower bound. */
const TABLE_A: ReadonlyArray<{ lower: number; upper: number; lossCost: number; label: string }> = [
  { lower: 0, upper: 50, lossCost: 8_000, label: 'Below 50' },
  { lower: 50, upper: 100, lossCost: 10_500, label: '50 to below 100' },
  { lower: 100, upper: 250, lossCost: 14_000, label: '100 to below 250' },
  { lower: 250, upper: 500, lossCost: 18_500, label: '250 to below 500' },
  { lower: 500, upper: 1_000, lossCost: 25_000, label: '500 to below 1,000' },
  { lower: 1_000, upper: 2_500, lossCost: 34_000, label: '1,000 to below 2,500' },
  { lower: 2_500, upper: 5_000, lossCost: 46_000, label: '2,500 to below 5,000' },
  { lower: 5_000, upper: 10_000, lossCost: 62_000, label: '5,000 to below 10,000' },
  { lower: 10_000, upper: Number.POSITIVE_INFINITY, lossCost: 82_000, label: '10,000 and above' },
];

export interface BaseCostBand {
  label: string;
  lossCost: number;
}

/** MATCH(C13, lowerBounds, 1) — largest lower bound <= market cap. */
export function baseLossCost(marketCapS$m: number): BaseCostBand {
  let band = TABLE_A[0]!;
  for (const row of TABLE_A) {
    if (marketCapS$m >= row.lower) band = row;
  }
  return { label: band.label, lossCost: band.lossCost };
}

/** Table B — increased limit factor, relative to S$10m = 1.00. */
const TABLE_B: Record<LimitOption, { factor: number; limitInMillions: number }> = {
  'S$5m': { factor: 0.7, limitInMillions: 5 },
  'S$10m': { factor: 1.0, limitInMillions: 10 },
  'S$15m': { factor: 1.22, limitInMillions: 15 },
  'S$20m': { factor: 1.4, limitInMillions: 20 },
  'S$25m': { factor: 1.55, limitInMillions: 25 },
  'S$30m': { factor: 1.68, limitInMillions: 30 },
  'S$50m': { factor: 2.05, limitInMillions: 50 },
};

export function limitFactor(option: LimitOption): { factor: number; limitInMillions: number } {
  return TABLE_B[option];
}

/** Table C — corporate (Side B/C) retention factor. Side A always attaches at nil. */
const TABLE_C: Record<RetentionOption, number> = {
  'SGD 100k': 1.15,
  'SGD 250k': 1.0,
  'SGD 500k': 0.9,
  'SGD 1m': 0.8,
  'SGD 2.5m': 0.68,
};

export function retentionFactor(option: RetentionOption): number {
  return TABLE_C[option];
}

/** Table D — industry hazard class factor. Classify on the actual business, not the label. */
const TABLE_D: Record<HazardClass, number> = {
  'Class 1': 0.85,
  'Class 2': 1.0,
  'Class 3': 1.2,
  'Class 4': 1.45,
  'Class 5': 1.75,
};

export function hazardFactor(hazard: HazardClass): number {
  return TABLE_D[hazard];
}

/** Table E — parameters. */
export const MINIMUM_PREMIUM = 7_500;
export const COMPOSITE_FLOOR = 0.5;
export const COMPOSITE_CAP = 3.5;
