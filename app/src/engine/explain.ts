/**
 * Formula transparency — renders the pricing chain as a readable waterfall
 * with the actual numbers plugged in, mirroring the sheet's grey cells.
 */

import type { WorksheetInput } from './types.js';
import type { PriceResult } from './pricing.js';
import { EXCLUSIONS, EXTENSIONS } from './exclusions.js';

export interface ExplainLine {
  /** Left-hand label, e.g. "× hazard factor" */
  op: string;
  /** The value or operation, e.g. "× 1.20" or "= S$29,042.84" */
  value: string;
  /** Where it comes from, e.g. "Table D: Class 3" */
  basis: string;
}

const sgd = (n: number) => `S$${n.toLocaleString('en-SG', { maximumFractionDigits: 2 })}`;

export function explainPrice(input: WorksheetInput, r: PriceResult): ExplainLine[] {
  const lines: ExplainLine[] = [];
  const { structure, modifiers } = input;

  lines.push({
    op: 'Base loss cost',
    value: sgd(r.baseCost),
    basis: `Table A: market cap S$${input.risk.q1MarketCap.toLocaleString('en-SG')}m → band ${r.baseCostLabel}`,
  });
  lines.push({
    op: '× limit factor',
    value: `× ${r.limitFactorValue.toFixed(2)}`,
    basis: `Table B: ${structure.limit} (S$${r.limitInMillions}m)`,
  });
  lines.push({
    op: '× retention factor',
    value: `× ${r.retentionFactorValue.toFixed(2)}`,
    basis: `Table C: ${structure.retention}`,
  });
  lines.push({
    op: '× hazard factor',
    value: `× ${r.hazardFactorValue.toFixed(2)}`,
    basis: `Table D: ${structure.hazardClass}`,
  });

  const m = [
    modifiers.financialStrength,
    modifiers.governanceAndOwnership,
    modifiers.sharePriceAndFloat,
    modifiers.regulatoryGeographyTransactions,
    modifiers.claimsAndInsuranceHistory,
  ];
  lines.push({
    op: '× composite modifier',
    value: `× ${r.composite.applied.toFixed(4)}`,
    basis: `${m.map((x) => x.toFixed(2)).join(' × ')} = ${r.composite.raw.toFixed(4)}` +
      (r.composite.floorOrCapBit ? ' (floor/cap applied)' : ''),
  });

  const effects: string[] = [];
  for (const id of input.appliedExclusions) {
    const e = EXCLUSIONS.find((x) => x.id === id);
    if (e) effects.push(`${e.effect > 0 ? '+' : ''}${(e.effect * 100).toFixed(1)}%`);
  }
  for (const id of input.appliedExtensions ?? []) {
    const x = EXTENSIONS.find((y) => y.id === id);
    if (x) effects.push(`+${(x.effect * 100).toFixed(1)}%`);
  }
  lines.push({
    op: '× coverage terms factor',
    value: `× ${r.coverageTermsFactorValue.toFixed(3)}`,
    basis: effects.length > 0 ? `1 + (${effects.join(' ')}) , floored 0.70 / capped 1.30` : 'no exclusions applied',
  });

  lines.push({
    op: '= technical loss cost',
    value: sgd(r.technicalLossCost),
    basis: 'the expected claims bill — not yet a premium',
  });
  lines.push({
    op: '÷ permissible loss ratio',
    value: `÷ ${r.permissibleLossRatio}`,
    basis: 'what remains after brokerage, expenses and margin',
  });
  lines.push({
    op: '= technical premium',
    value: sgd(r.technicalPremium),
    basis: 'the technically indicated price at 100% participation',
  });
  lines.push({
    op: '× market adjustment × participation',
    value: `× ${r.marketAdjustment} × ${r.participation}`,
    basis: 'commercial judgement, evidence required outside 0.95–1.05',
  });
  lines.push({
    op: '= indicated premium (our share)',
    value: sgd(r.indicatedPremium),
    basis: '',
  });
  lines.push({
    op: 'max(minimum premium)',
    value: `max(·, ${sgd(r.minimumPremium)})`,
    basis: 'Table E minimum',
  });
  lines.push({
    op: 'PREMIUM TO QUOTE',
    value: sgd(r.premiumToQuote),
    basis: `subject to the referral check · ${sgd(r.premiumPerMillion)} per S$1m of our share`,
  });

  return lines;
}
