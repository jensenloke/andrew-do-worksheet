/**
 * ANDREW brand block — palette + slab wordmark, styled after the Agentic
 * Builders Collective / Fan Monitor aesthetic: five horizontal slab rows per
 * letter, upper-half blocks so rows read as slices, peach → coral gradient
 * top to bottom, italic lean toward the top, dotted rust rule.
 * (Palette sampled from fanmon/brand.py.)
 */

// --- palette -----------------------------------------------------------------
export const INK = '#0B0A12'; // background: near-black navy
export const SALMON = '#EF8E64'; // box border, middle slab
export const PEACH = '#F5A86B'; // lightest brand colour
export const CORAL = '#E86F5E'; // darkest brand colour
export const RUST = '#6B3226'; // pre-reveal slabs / dotted rule
export const MUTED = '#8E8489'; // captions

// Wordmark slab gradient, top → bottom (one stop per slab row).
export const SLABS = ['#F6AD70', '#F39E6A', '#EF8E64', '#EB7E60', '#E86F5E'];

// --- wordmark ----------------------------------------------------------------
// Each letter is five slab rows of five cells; '▀' keeps each row a crisp
// slice, gap of two cells between letters. Top rows are indented right to
// give the logo's italic lean.
const LETTERS: Record<string, string[]> = {
  A: [' ▀▀▀ ', '▀   ▀', '▀▀▀▀▀', '▀   ▀', '▀   ▀'],
  N: ['▀   ▀', '▀▀  ▀', '▀ ▀ ▀', '▀  ▀▀', '▀   ▀'],
  D: ['▀▀▀▀ ', '▀   ▀', '▀   ▀', '▀   ▀', '▀▀▀▀ '],
  R: ['▀▀▀▀ ', '▀   ▀', '▀▀▀▀ ', '▀ ▀  ', '▀  ▀▀'],
  E: ['▀▀▀▀▀', '▀    ', '▀▀▀▀ ', '▀    ', '▀▀▀▀▀'],
  W: ['▀   ▀', '▀   ▀', '▀ ▀ ▀', '▀ ▀ ▀', ' ▀ ▀ '],
};

const GAP = '  ';

/** The five wordmark rows, top first. */
export const WORDMARK_ROWS: string[] = [0, 1, 2, 3, 4].map((row) => {
  const indent = ' '.repeat(4 - row);
  return indent + 'ANDREW'.split('').map((c) => LETTERS[c]![row]).join(GAP);
});

export const WORDMARK_WIDTH = Math.max(...WORDMARK_ROWS.map((r) => r.length)); // 44
export const RULE = '┈'.repeat(41);

/** Linear hex colour mix — the brand gradient is a series of these. */
export function lerp(a: string, b: string, t: number): string {
  const [ar, ag, ab] = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const [br, bg, bb] = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(ar!, br!), mix(ag!, bg!), mix(ab!, bb!)].map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/** Lowercase text with a per-character peach → coral sweep. */
export function sweepColors(text: string): Array<{ ch: string; color: string }> {
  const n = Math.max(1, text.length - 1);
  return [...text].map((ch, i) => ({ ch, color: lerp(PEACH, CORAL, i / n) }));
}
