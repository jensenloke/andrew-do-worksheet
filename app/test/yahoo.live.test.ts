import { describe, expect, it } from 'vitest';
import { fetchSgxMarketData, searchSgxStocks, toYahooSymbol } from '../src/data/yahoo.js';

/**
 * Opt-in live test against Yahoo Finance (network-dependent).
 * Run with: LIVE=1 npx vitest run test/yahoo.live.test.ts
 */
describe.runIf(process.env.LIVE === '1')('Yahoo Finance live (SGX)', () => {
  it('fetches market data for ComfortDelGro (C52.SI)', async () => {
    const data = await fetchSgxMarketData('C52');
    expect(data.symbol).toBe('C52.SI');
    expect(data.exchange).toBe('SES');
    expect(data.currency).toBe('SGD');
    expect(data.marketCap).toBeGreaterThan(1_000_000_000);
    expect(data.sharesOutstanding).toBeGreaterThan(0);
    expect(data.regularMarketPrice).toBeGreaterThan(0);
    expect(Math.abs(data.twelveMonthMove)).toBeLessThan(1);
    console.log(
      `  ${data.name}: cap S$${(data.marketCap / 1e6).toFixed(0)}m, ` +
        `price S$${data.regularMarketPrice}, 12m move ${(data.twelveMonthMove * 100).toFixed(1)}%`,
    );
  }, 30_000);

  it('searches SGX stocks by name', async () => {
    const results = await searchSgxStocks('capitaLand integrated commercial trust');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.ticker === 'C38U')).toBe(true);
    for (const r of results) expect(r.symbol.endsWith('.SI')).toBe(true);
    console.log(`  search returned ${results.length} SGX result(s), first: ${results[0]!.ticker} ${results[0]!.name}`);
  }, 30_000);
});

describe('symbol normalisation (offline)', () => {
  it('appends .SI to bare SGX codes', () => {
    expect(toYahooSymbol('C52')).toBe('C52.SI');
    expect(toYahooSymbol('c38u')).toBe('C38U.SI');
    expect(toYahooSymbol('5E2.SI')).toBe('5E2.SI');
  });
});
