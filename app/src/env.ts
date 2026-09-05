/**
 * Minimal .env loader (no dependency). Reads app/.env (and cwd/.env) and sets
 * variables that are not already in the environment — real env vars win.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let loaded = false;

export function loadDotEnv(): void {
  if (loaded) return;
  loaded = true;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(here, '..', '..', '.env'), path.resolve(process.cwd(), '.env')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1]! in process.env)) {
        process.env[m[1]!] = m[2]!;
      }
    }
  }
}
