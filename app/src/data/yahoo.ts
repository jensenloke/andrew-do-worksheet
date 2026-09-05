/**
 * Yahoo Finance client for SGX-listed stocks — free, no API key.
 *
 * Two endpoints are used:
 *  - v8 chart  (no auth): price history, 52-week range, currency/exchange meta.
 *  - v7 quote  (cookie + crumb handshake): market cap, shares outstanding, name.
 *
 * Verified live against C52.SI (ComfortDelGro). Yahoo's unofficial API has no
 * SLA — failures must be surfaced loudly; never paper over with guesses.
 */

const UA = 'Mozilla/5.0 (prompt-fight-do-agent)';
const QUOTE_HOST = 'https://query1.finance.yahoo.com';

export interface SgxMarketData {
  /** SGX ticker with .SI suffix, e.g. C52.SI */
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  regularMarketPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  /** Close-to-close movement over the trailing 12 months (decimal; -0.18 = down 18%). */
  twelveMonthMove: number;
  asOf: Date;
}

/** Normalise a bare SGX code (C52) to Yahoo's Singapore suffix (C52.SI). */
export function toYahooSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  return t.endsWith('.SI') ? t : `${t}.SI`;
}

export interface StockSearchResult {
  /** Bare SGX ticker code, e.g. C52 */
  ticker: string;
  /** Yahoo symbol with .SI suffix */
  symbol: string;
  name: string;
}

/**
 * Search SGX-listed stocks via Yahoo's search API (no auth needed).
 * Filters to Singapore Exchange equities only.
 */
export async function searchSgxStocks(query: string): Promise<StockSearchResult[]> {
  const url =
    `${QUOTE_HOST}/v1/finance/search?q=${encodeURIComponent(query)}` +
    `&quotesCount=30&newsCount=0&enableFuzzyQuery=true`;
  const d = (await fetchJson(url)) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchDisp?: string;
      quoteType?: string;
    }>;
  };
  const results: StockSearchResult[] = [];
  for (const q of d.quotes ?? []) {
    if (!q.symbol || q.quoteType !== 'EQUITY') continue;
    const sgx = q.symbol.endsWith('.SI') || q.exchDisp === 'Singapore';
    if (!sgx) continue;
    results.push({
      ticker: q.symbol.replace(/\.SI$/, ''),
      symbol: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
    });
  }
  return results;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance ${res.status} for ${url}`);
  }
  return res.json();
}

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice: number;
        regularMarketTime: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string };
  };
}

interface QuoteResponse {
  quoteResponse: {
    result?: Array<{
      longName?: string;
      marketCap?: number;
      sharesOutstanding?: number;
      regularMarketPrice?: number;
    }>;
    error?: { description?: string };
  };
}

/** 12 months of closes → trailing-12-month price movement. */
function twelveMonthMove(chart: NonNullable<ChartResponse['chart']['result']>[number]): number {
  const closes = (chart.indicators?.quote?.[0]?.close ?? []).filter(
    (c): c is number => typeof c === 'number',
  );
  if (closes.length < 2) {
    throw new Error(`Yahoo chart returned no usable close prices for ${chart.meta.symbol}`);
  }
  const first = closes[0]!;
  const last = closes[closes.length - 1]!;
  return last / first - 1;
}

/** The v7 quote endpoint needs a cookie and a crumb; this handshake obtains both. */
async function obtainCrumb(): Promise<{ crumb: string; cookie: string }> {
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
  });
  const setCookie = cookieRes.headers.getSetCookie?.().join('; ') ?? '';
  const crumbRes = await fetch(`${QUOTE_HOST}/v1/test/getcrumb`, {
    headers: { 'User-Agent': UA, cookie: setCookie },
  });
  if (!crumbRes.ok) throw new Error(`Yahoo crumb request failed: ${crumbRes.status}`);
  const crumb = (await crumbRes.text()).trim();
  if (!crumb) throw new Error('Yahoo crumb request returned an empty crumb');
  return { crumb, cookie: setCookie };
}

export async function fetchSgxMarketData(ticker: string): Promise<SgxMarketData> {
  const symbol = toYahooSymbol(ticker);
  const chart = (await fetchJson(
    `${QUOTE_HOST}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
  )) as ChartResponse;
  const result = chart.chart.result?.[0];
  if (!result) {
    throw new Error(
      `Yahoo Finance has no chart data for ${symbol}: ${chart.chart.error?.description ?? 'unknown'}`,
    );
  }

  const { crumb, cookie } = await obtainCrumb();
  const quote = (await fetchJson(
    `${QUOTE_HOST}/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { cookie } },
  )) as QuoteResponse;
  const q = quote.quoteResponse.result?.[0];
  if (!q?.marketCap || !q.sharesOutstanding) {
    throw new Error(`Yahoo quote returned no market cap for ${symbol} — retry or research manually`);
  }

  return {
    symbol,
    name: q.longName ?? result.meta.longName ?? result.meta.shortName ?? symbol,
    currency: result.meta.currency,
    exchange: result.meta.exchangeName,
    regularMarketPrice: result.meta.regularMarketPrice,
    marketCap: q.marketCap,
    sharesOutstanding: q.sharesOutstanding,
    fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow ?? 0,
    twelveMonthMove: twelveMonthMove(result),
    asOf: new Date(result.meta.regularMarketTime * 1000),
  };
}
