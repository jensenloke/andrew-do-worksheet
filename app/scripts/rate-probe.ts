/**
 * Throwaway benchmark: how often can ANDREW's DuckDuckGo search run before
 * useful results degrade? Classifies each response and escalates the rate.
 * Not part of the app — run with:  npx tsx scripts/rate-probe.ts
 */
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 prompt-fight-do-agent';

type Kind = 'populated' | 'empty' | 'blocked' | 'http-error' | 'net-error';
interface Outcome { kind: Kind; count: number; ms: number; status: number }

// Real SGX-ish queries so result counts reflect actual research usefulness.
const QUERIES = [
  'ComfortDelGro annual report 2025 pdf',
  'Singapore Airlines SGX announcement placement rights issue 2025',
  'DBS Group shareholders equity borrowings annual report',
  'SIA Engineering board independent directors governance',
  'Genting Singapore profit warning restatement 2024',
  'Sea Limited SGX securities litigation class action',
  'Wilmar International net gearing FY2024',
  'Keppel Corp watch list regulatory investigation SGX',
  'Yangzijiang Shipbuilding substantial shareholders',
  'Nimbus Group adverse news audit opinion',
];

function looksBlocked(html: string): boolean {
  const h = html.toLowerCase();
  return (
    /anomaly|captcha|challenge|are you a robot|unusual traffic|bot detection/.test(h) ||
    /class="[^"]*(captcha|challenge)[^"]*"/.test(h)
  );
}

async function search(query: string): Promise<Outcome> {
  const t0 = Date.now();
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `q=${encodeURIComponent(query)}`,
    });
    const html = await res.text();
    const ms = Date.now() - t0;
    if (!res.ok) return { kind: 'http-error', count: 0, ms, status: res.status };
    if (looksBlocked(html)) return { kind: 'blocked', count: 0, ms, status: res.status };
    const $ = cheerio.load(html);
    const count = $('.result').find('a.result__a').filter((_, el) => {
      const href = $(el).attr('href') ?? '';
      return href.includes('uddg=') || href.startsWith('http');
    }).length;
    return { kind: count > 0 ? 'populated' : 'empty', count, ms, status: res.status };
  } catch (e) {
    return { kind: 'net-error', count: 0, ms: Date.now() - t0, status: 0 };
  }
}

async function burst(n: number, concurrency: number, staggerMs: number, qi0: number): Promise<Outcome[]> {
  const out: Outcome[] = [];
  let launched = 0;
  let active = 0;
  return new Promise((resolve) => {
    const launch = () => {
      while (active < concurrency && launched < n) {
        const i = launched++;
        active++;
        search(QUERIES[(qi0 + i) % QUERIES.length]!).then((o) => {
          out.push(o);
          active--;
          if (launched >= n && active === 0) resolve(out);
          else if (launched < n) setTimeout(launch, staggerMs);
        });
      }
    };
    launch();
  });
}

const summarize = (label: string, o: Outcome[]) => {
  const c = { populated: 0, empty: 0, blocked: 0, 'http-error': 0, 'net-error': 0 } as Record<Kind, number>;
  for (const x of o) c[x.kind]++;
  const counts = o.filter((x) => x.kind === 'populated').map((x) => x.count);
  const avg = counts.length ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : '-';
  const medMs = o.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(o.length / 2)];
  const useful = c.populated;
  console.log(
    `${label.padEnd(30)} n=${o.length}  populated=${useful} (${Math.round((useful / o.length) * 100)}%)  ` +
      `empty=${c.empty}  blocked=${c.blocked}  err=${c['http-error'] + c['net-error']}  ` +
      `avgHits=${avg}  medMs=${medMs}`,
  );
  return c.populated / o.length;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('DuckDuckGo rate probe — classifies each response, escalates rate.\n');
  let qi = 0;
  const levels: Array<{ label: string; n: number; conc: number; stagger: number }> = [
    { label: 'baseline (serial, 1.5s gap)', n: 5, conc: 1, stagger: 1500 },
    { label: 'gentle (2 parallel)', n: 6, conc: 2, stagger: 600 },
    { label: 'ANDREW default (2 teams)', n: 6, conc: 2, stagger: 120 },
    { label: 'aggressive (4 parallel)', n: 8, conc: 4, stagger: 60 },
    { label: 'stress (6 parallel, no gap)', n: 12, conc: 6, stagger: 0 },
    { label: 'recovery (serial, 1.5s gap)', n: 5, conc: 1, stagger: 1500 },
  ];
  for (const lv of levels) {
    const o = await burst(lv.n, lv.conc, lv.stagger, qi);
    qi += lv.n;
    summarize(lv.label, o);
    await sleep(2000); // breather between levels
  }
  console.log('\n"ANDREW default" row is the realistic on-stage load. If recovery row recovers,');
  console.log('degradation was transient throttling; if it stays blocked, the IP got flagged.');
}

main();
