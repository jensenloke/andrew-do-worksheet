/**
 * ANDREW brand block — slab wordmark in the app's own teal family (the
 * original v0.1 splash colours), laid out Fan Monitor / Agentic Builders
 * Collective style: five horizontal slab rows per letter, upper-half blocks
 * so rows read as slices, light-mint → deep-teal gradient top to bottom,
 * italic lean toward the top, dotted rule in dark teal.
 */

// --- palette -----------------------------------------------------------------
export const INK = '#0B0A12'; // background: near-black navy
export const MINT = '#A8EFE0'; // lightest brand colour
export const TEAL = '#34BE9B'; // darkest brand colour, box border
export const DEEP = '#1C4F45'; // pre-reveal slab outline
export const RULE_COLOR = '#2C6E60'; // dotted rule
export const MUTED = '#8B9AA0'; // cool gray captions
export const PRODUCT = '#56E0C0'; // product line
export const AMBER = '#F2C96B'; // continue prompt accent (was v0.1 cream/yellow)

// Wordmark slab gradient, top → bottom (one stop per slab row).
export const SLABS = ['#A8EFE0', '#86E6D2', '#63DCBF', '#45CEAB', '#34BE9B'];

// --- wordmark ----------------------------------------------------------------
// Each letter is five slab rows of five cells; '▀' keeps each row a crisp
// slice, gap of two cells between letters. Top rows are indented right to
// give the italic lean.
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

/** Lowercase text with a per-character mint → teal sweep. */
export function sweepColors(text: string): Array<{ ch: string; color: string }> {
  const n = Math.max(1, text.length - 1);
  return [...text].map((ch, i) => ({ ch, color: lerp(MINT, TEAL, i / n) }));
}
