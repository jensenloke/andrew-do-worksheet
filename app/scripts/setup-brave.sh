#!/bin/zsh
# One-time: store your Brave Search key in app/.env (gitignored) and verify
# live search works. Run from anywhere:  zsh scripts/setup-brave.sh
# Your key is read interactively — it is NOT stored in this file.
set -e
APP="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$APP/.env"

read -s "KEY?Paste your Brave key (BSA…): "
print

# Sanity checks before writing anything.
if [[ -z "$KEY" ]]; then print "empty — nothing written."; exit 1; fi
if [[ "$KEY" == *"…"* ]]; then
  print "That paste contains a '…' ellipsis — it was truncated somewhere. Re-copy the FULL key from the Brave dashboard."; exit 1
fi
print "key length: ${#KEY} (Brave keys are ~30-38 chars)"

# Upsert into .env: drop any old BRAVE_API_KEY line, append the fresh one.
grep -v '^BRAVE_API_KEY=' "$ENV" > "$ENV.tmp" 2>/dev/null || true
mv "$ENV.tmp" "$ENV"
printf '%s=%s\n' BRAVE_API_KEY "$KEY" >> "$ENV"
print "wrote key to $ENV"
# Verify: a real search through the app's own searchWeb().
cat > "$APP/scripts/_verify-brave.ts" <<'TS'
import { searchWeb } from '../src/agent/research.js';
const qs = [
  'ComfortDelGro annual report 2025 pdf',
  'Singapore Airlines SGX unusual price movement query 2025',
  'Wilmar International net gearing FY2024',
];
for (const q of qs) {
  try {
    const r = await searchWeb(q);
    console.log(`\n"${q}" -> ${r.length} results`);
    r.slice(0, 3).forEach((x, i) => console.log(`  ${i + 1}. ${x.title.slice(0, 60)}\n     ${x.url.slice(0, 72)}`));
  } catch (e) {
    console.log(`"${q}" -> ERROR ${(e as Error).message.slice(0, 80)}`);
  }
}
TS

cd "$APP"
npx tsx scripts/_verify-brave.ts
rm -f "$APP/scripts/_verify-brave.ts"
print "\nIf each query returned >0 results, Brave search is live. ✓"
