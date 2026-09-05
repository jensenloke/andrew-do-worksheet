/**
 * The agent's research toolbox, as AI SDK tools.
 *  - fetch_market_data : Yahoo Finance for SGX tickers (Q1 market cap, Q3 price move)
 *  - fetch_page        : read a web page as markdown (IR pages, SGX, news)
 *  - read_pdf          : read an annual report / announcement PDF (search or page range)
 *  - search_web        : DuckDuckGo search to locate reports and adverse news
 *  - submit_proposal   : the final, fully-cited worksheet proposal (call exactly once)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { fetchPage, readPdf, searchWeb } from './research.js';
import { fetchSgxMarketData } from '../data/yahoo.js';
import { ProposalSchema } from './schema.js';

export function researchTools() {
  return {
    fetchMarketData: tool({
      description:
        'Get live market data for an SGX-listed stock from Yahoo Finance: market capitalisation, share price, shares outstanding, 52-week range, and trailing-12-month price movement. Input is the bare SGX ticker (e.g. "C52"). Use this FIRST for Q1 and Q3.',
      inputSchema: z.object({
        ticker: z.string().describe('SGX ticker code, e.g. "C52" or "5E2"'),
      }),
      execute: async ({ ticker }) => {
        const d = await fetchSgxMarketData(ticker);
        return [
          `Company: ${d.name} (${d.symbol}, ${d.exchange})`,
          `Market cap: S$${(d.marketCap / 1e6).toFixed(1)}m (price S$${d.regularMarketPrice} × ${d.sharesOutstanding.toLocaleString()} shares)`,
          `12-month price movement: ${(d.twelveMonthMove * 100).toFixed(1)}%`,
          `52-week range: S$${d.fiftyTwoWeekLow} – S$${d.fiftyTwoWeekHigh}`,
          `As of: ${d.asOf.toISOString()}`,
        ].join('\n');
      },
    }),

    fetchPage: tool({
      description:
        'Fetch a web page and read it as markdown. Use for the company investor-relations page, SGX pages, and news articles. Returns at most 40,000 characters.',
      inputSchema: z.object({
        url: z.string().describe('Full URL to fetch'),
      }),
      execute: async ({ url }) => fetchPage(url),
    }),

    readPdf: tool({
      description:
        'Read a PDF document — annual reports, SGX announcements, circulars. Without options, returns the page count and first pages. Use search="keyword" to find sections (e.g. "free float", "independent directors", "audit opinion", "substantial shareholder", "profit warning"). Use pages="N-M" to read specific pages. Documents are cached, so repeated calls on the same URL are cheap.',
      inputSchema: z.object({
        url: z.string().describe('URL of the PDF'),
        pages: z.string().optional().describe('Page range, e.g. "10-14" or "3,8,21"'),
        search: z.string().optional().describe('Case-insensitive keyword to search for across the document'),
      }),
      execute: async ({ url, pages, search }) =>
        readPdf(url, search !== undefined ? { search } : pages !== undefined ? { pages } : {}),
    }),

    searchWeb: tool({
      description:
        'Search the web (DuckDuckGo). Use to locate the latest annual report PDF, the investor-relations page, SGX announcements, and any adverse news (profit warnings, investigations, lawsuits) over the last 3–5 years.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
      }),
      execute: async ({ query }) => {
        const results = await searchWeb(query);
        if (results.length === 0) return 'No results.';
        return results
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
          .join('\n\n');
      },
    }),

    submitProposal: tool({
      description:
        'Submit the final worksheet proposal once research is complete. Every Part 1 answer must carry its value, rationale and source. Call this exactly once, at the end.',
      inputSchema: ProposalSchema,
      execute: async () => 'Proposal submitted.',
    }),
  };
}

export type ResearchTools = ReturnType<typeof researchTools>;

/** One-line human summary of a tool call, for the TUI activity log and traces. */
export function summariseToolCall(tool: string, input: unknown): string {
  const i = input as Record<string, unknown>;
  switch (tool) {
    case 'fetchMarketData':
      return `market data for ${String(i.ticker ?? '')}`;
    case 'fetchPage':
      return String(i.url ?? '');
    case 'readPdf': {
      const url = String(i.url ?? '');
      const tail = url.split('/').pop() ?? url;
      if (i.search) return `${tail} — search "${String(i.search)}"`;
      if (i.pages) return `${tail} — pages ${String(i.pages)}`;
      return tail;
    }
    case 'searchWeb':
      return `"${String(i.query ?? '')}"`;
    default:
      return JSON.stringify(input).slice(0, 80);
  }
}
