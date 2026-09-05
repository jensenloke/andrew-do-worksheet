/**
 * Research primitives — web browsing for the agent. Pure functions, no AI SDK,
 * so they are testable and reusable outside the agent loop.
 *
 *  - fetchPage:  URL → readable markdown (scripts/nav stripped)
 *  - readPdf:    URL → text, with page selection or keyword search over the doc
 *  - searchWeb:  DuckDuckGo HTML search (no API key needed)
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { extractText, getDocumentProxy } from 'unpdf';
import { loadDotEnv } from '../env.js';
import { loadSettings } from './settings.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 prompt-fight-do-agent';

const PAGE_CHAR_LIMIT = 20_000;
const PDF_DEFAULT_PAGES = 5;
const EXCERPT_CHARS = 600;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cacheDir = path.join(projectRoot, '.cache');

function truncationNote(limit: number): string {
  return `\n\n[TRUNCATED to ${limit} characters — use a more specific tool call (search or page range) to read the rest.]`;
}

async function fetchWithUa(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res;
}

/** Fetch a web page and convert it to readable markdown. */
export async function fetchPage(url: string): Promise<string> {
  const res = await fetchWithUa(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  $(
    'script, style, noscript, iframe, svg, nav, footer, header, aside, form, button, [role="navigation"], [aria-hidden="true"]',
  ).remove();
  const title = $('title').first().text().trim();
  const bodyHtml = $('body').html() ?? '';
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  let md = turndown.turndown(bodyHtml).replace(/\n{3,}/g, '\n\n').trim();
  if (title) md = `# ${title}\n\n${md}`;
  const source = `Source: ${url}`;
  if (md.length > PAGE_CHAR_LIMIT) {
    return `${source}\n\n${md.slice(0, PAGE_CHAR_LIMIT)}${truncationNote(PAGE_CHAR_LIMIT)}`;
  }
  return `${source}\n\n${md}`;
}

function cachePathFor(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return path.join(cacheDir, `${hash}.pdf`);
}

/** Download (and cache) a PDF, returning its bytes. */
async function pdfBuffer(url: string): Promise<Uint8Array> {
  const cached = cachePathFor(url);
  try {
    // unpdf rejects Node Buffers — copy into a plain Uint8Array
    return new Uint8Array(await readFile(cached));
  } catch {
    // not cached yet
  }
  const res = await fetchWithUa(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length < 1024) throw new Error(`Downloaded file from ${url} is too small to be a PDF`);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cached, bytes);
  return bytes;
}

export interface ReadPdfOptions {
  /** 1-based pages to extract, e.g. [1,2,3] or a range string "10-14". */
  pages?: string;
  /** Case-insensitive keyword; returns excerpts around every match instead of page text. */
  search?: string;
}

function parsePageSpec(spec: string, totalPages: number): number[] {
  const pages = new Set<number>();
  for (const part of spec.split(/[,\s]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Math.max(1, Number(range[1]));
      const to = Math.min(totalPages, Number(range[2]));
      for (let p = from; p <= to; p++) pages.add(p);
    } else if (/^\d+$/.test(part)) {
      const p = Number(part);
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

function excerpts(pages: string[], needle: string): string {
  const lower = needle.toLowerCase();
  const hits: string[] = [];
  pages.forEach((text, idx) => {
    const t = text.toLowerCase();
    let pos = 0;
    while ((pos = t.indexOf(lower, pos)) !== -1 && hits.length < 8) {
      const start = Math.max(0, pos - EXCERPT_CHARS / 2);
      const end = Math.min(text.length, pos + needle.length + EXCERPT_CHARS / 2);
      hits.push(`[page ${idx + 1}] …${text.slice(start, end).replace(/\s+/g, ' ').trim()}…`);
      pos += needle.length;
    }
  });
  return hits.join('\n\n---\n\n');
}

/**
 * Fetch a PDF (typically an annual report) and extract text.
 * With `search`: keyword excerpts across the whole document.
 * With `pages`: text of the requested pages.
 * Otherwise: page count + the first few pages, with guidance to drill in.
 */
export async function readPdf(url: string, options: ReadPdfOptions = {}): Promise<string> {
  const bytes = await pdfBuffer(url);
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const header = `Source: ${url}\nPDF pages: ${totalPages}`;

  if (options.search) {
    const found = excerpts(pages, options.search);
    if (!found) {
      return `${header}\n\nNo matches for "${options.search}" in this document. Try a different term (e.g. "free float", "independent directors", "audit opinion", "largest shareholder").`;
    }
    return `${header}\nExcerpts matching "${options.search}":\n\n${found}`;
  }

  if (options.pages) {
    const wanted = parsePageSpec(options.pages, totalPages);
    if (wanted.length === 0) return `${header}\n\nNo valid pages in "${options.pages}" (document has ${totalPages} pages).`;
    const body = wanted.map((p) => `--- page ${p} ---\n${(pages[p - 1] ?? '').replace(/\n{3,}/g, '\n\n').trim()}`).join('\n\n');
    const capped = body.length > PAGE_CHAR_LIMIT ? body.slice(0, PAGE_CHAR_LIMIT) + truncationNote(PAGE_CHAR_LIMIT) : body;
    return `${header}\n\n${capped}`;
  }

  const preview = pages.slice(0, PDF_DEFAULT_PAGES).join('\n\n');
  const capped = preview.length > PAGE_CHAR_LIMIT ? preview.slice(0, PAGE_CHAR_LIMIT) + truncationNote(PAGE_CHAR_LIMIT) : preview;
  return `${header}\nFirst ${Math.min(PDF_DEFAULT_PAGES, totalPages)} pages below. For the rest, call read_pdf again with pages="N-M" (financial statements are usually in the first third; corporate governance and shareholding in the annual report body) or search="keyword".\n\n${capped}`;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Search the web. Uses the Brave Search API when BRAVE_API_KEY is set (official,
 * quota-backed, no bot-blocking — a Brave success is authoritative, including an
 * empty result set). Falls back to DuckDuckGo scraping (html, then lite) when no
 * key is configured or Brave errors out (quota / network). DuckDuckGo needs no
 * key but is rate/CAPTCHA-limited and can be IP-blocked.
 */
export async function searchWeb(query: string): Promise<WebResult[]> {
  if (braveApiKey()) {
    try {
      return await searchBrave(query);
    } catch {
      // Brave errored (quota / network) — fall through to DuckDuckGo.
    }
  }
  try {
    const results = await searchDdgHtml(query);
    if (results.length > 0) return results;
  } catch {
    // fall through to lite
  }
  return searchDdgLite(query);
}

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

/** Brave key, if configured: the in-app settings-screen key wins, then the
 * BRAVE_API_KEY env var. Empty means web search falls back to DuckDuckGo. */
function braveApiKey(): string | undefined {
  loadDotEnv();
  const fromSettings = loadSettings().braveApiKey?.trim();
  if (fromSettings) return fromSettings;
  const fromEnv = process.env.BRAVE_API_KEY?.trim();
  return fromEnv ? fromEnv : undefined;
}
/** Where the active Brave key comes from (for display). */
export function braveKeySource(): 'settings' | 'env' | 'none' {
  loadDotEnv();
  if (loadSettings().braveApiKey?.trim()) return 'settings';
  if (process.env.BRAVE_API_KEY?.trim()) return 'env';
  return 'none';
}

/** Which search backend searchWeb() will use right now (for display). */
export function searchProvider(): 'brave' | 'duckduckgo' {
  return braveKeySource() === 'none' ? 'duckduckgo' : 'brave';
}
/** Brave Search API. Resolves (possibly empty) on success; throws on any error
 * so the caller can fall back. Empty means Brave genuinely has no hits. */
async function searchBrave(query: string): Promise<WebResult[]> {
  const key = braveApiKey();
  if (!key) throw new Error('BRAVE_API_KEY not set');
  const params = new URLSearchParams({ q: query, count: '10' });
  const res = await fetch(`${BRAVE_ENDPOINT}?${params}`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Brave search failed: HTTP ${res.status}`);
  const json = (await res.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  const results: WebResult[] = [];
  for (const r of json.web?.results ?? []) {
    if (r.url && r.title) results.push({ title: r.title, url: r.url, snippet: r.description ?? '' });
  }
  return results.slice(0, 10);
}

async function searchDdgHtml(query: string): Promise<WebResult[]> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`DuckDuckGo search failed: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const results: WebResult[] = [];
  $('.result').each((_i, el) => {
    const link = $(el).find('a.result__a').first();
    const snippet = $(el).find('.result__snippet').first().text().trim();
    const url = decodeDdgHref(link.attr('href') ?? '');
    const title = link.text().trim();
    if (title && url.startsWith('http')) results.push({ title, url, snippet });
  });
  return results.slice(0, 10);
}

async function searchDdgLite(query: string): Promise<WebResult[]> {
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`DuckDuckGo lite search failed: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const results: WebResult[] = [];
  // lite layout: result links are <a rel="nofollow"> inside table rows;
  // the snippet follows in the next row's cell.
  const links = $('a[rel="nofollow"]').toArray();
  for (const el of links) {
    const url = decodeDdgHref($(el).attr('href') ?? '');
    const title = $(el).text().trim();
    if (!title || !url.startsWith('http')) continue;
    const snippetRow = $(el).closest('tr').next('tr');
    const snippet = snippetRow.find('td').first().text().replace(/^\s*\|?\s*/, '').trim();
    results.push({ title, url, snippet });
    if (results.length >= 10) break;
  }
  return results;
}

/** DuckDuckGo wraps result URLs in a redirect: //duckduckgo.com/l/?uddg=<encoded>. */
function decodeDdgHref(href: string): string {
  const uddg = href.match(/[?&]uddg=([^&]+)/);
  return uddg ? decodeURIComponent(uddg[1]!) : href;
}
