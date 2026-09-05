import { describe, expect, it } from 'vitest';
import { fetchPage, readPdf, searchWeb } from '../src/agent/research.js';

/**
 * Opt-in live tests for the agent's research tools against real SGX sources.
 * Run with: LIVE=1 npx vitest run test/research.live.test.ts
 */
const CDG_REPORTS_PAGE = 'https://www.comfortdelgro.com/investor-relation/annual-reports/';
const CDG_AR_2024 = 'https://www.comfortdelgro.com/wp-content/uploads/2025/03/ComfortDelGro-AR-2024-20mb-1.pdf';

describe.runIf(process.env.LIVE === '1')('research tools live', () => {
  it('searchWeb finds ComfortDelGro annual report pages', async () => {
    const results = await searchWeb('ComfortDelGro annual report 2024');
    expect(results.length).toBeGreaterThan(0);
    console.log(`  top result: ${results[0]!.title} → ${results[0]!.url}`);
  }, 30_000);

  it('fetchPage reads the IR page as markdown', async () => {
    const md = await fetchPage(CDG_REPORTS_PAGE);
    expect(md).toContain('Source:');
    expect(md.length).toBeGreaterThan(500);
    console.log(`  IR page markdown: ${md.length} chars`);
  }, 30_000);

  it('readPdf reads the real 2024 annual report (page count + preview)', async () => {
    const out = await readPdf(CDG_AR_2024);
    expect(out).toMatch(/PDF pages: \d+/);
    console.log(`  ${out.split('\n').slice(0, 2).join(' | ')}`);
  }, 180_000);

  it('readPdf keyword search finds governance data in the annual report', async () => {
    const out = await readPdf(CDG_AR_2024, { search: 'independent directors' });
    expect(out).toContain('[page');
    console.log(`  search "independent directors": ${out.length} chars of excerpts`);
  }, 120_000);

  it('readPdf page range returns specific pages', async () => {
    const out = await readPdf(CDG_AR_2024, { pages: '2-3' });
    expect(out).toContain('page 2');
  }, 120_000);
});
