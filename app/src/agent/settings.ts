/**
 * Persisted TUI settings — written to app/settings.json so choices survive
 * restarts. Edited from the settings screen (s on the search screen).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AppSettings {
  /** How many researcher teams to fan out (1–5). Default 2. */
  maxSubAgents: number;
  /** Enable Qwen reasoning mode for researchers and synthesis. Default off. */
  thinking: boolean;
  /** Hard cap on each researcher's wall time, in seconds. Default 900 (15 min). */
  researchLimitSec: number;
}

export const SETTINGS_LIMITS = {
  minSubAgents: 1,
  maxSubAgentsCap: 5,
  minResearchLimitSec: 60,
  maxResearchLimitSec: 1800,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  maxSubAgents: 2,
  thinking: false,
  researchLimitSec: 900,
};

const settingsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'settings.json');

export function settingsFile(): string {
  return settingsPath;
}

export function loadSettings(): AppSettings {
  try {
    if (!existsSync(settingsPath)) return { ...DEFAULT_SETTINGS };
    const raw = JSON.parse(readFileSync(settingsPath, 'utf8')) as Partial<AppSettings>;
    return {
      maxSubAgents: clampSubAgents(typeof raw.maxSubAgents === 'number' ? raw.maxSubAgents : DEFAULT_SETTINGS.maxSubAgents),
      thinking: typeof raw.thinking === 'boolean' ? raw.thinking : DEFAULT_SETTINGS.thinking,
      researchLimitSec: clampResearchLimit(
        typeof raw.researchLimitSec === 'number' ? raw.researchLimitSec : DEFAULT_SETTINGS.researchLimitSec,
      ),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  } catch {
    // Settings are a convenience; never let a write failure break a run.
  }
}

export function clampSubAgents(n: number): number {
  return Math.min(SETTINGS_LIMITS.maxSubAgentsCap, Math.max(SETTINGS_LIMITS.minSubAgents, Math.round(n)));
}

export function clampResearchLimit(n: number): number {
  return Math.min(SETTINGS_LIMITS.maxResearchLimitSec, Math.max(SETTINGS_LIMITS.minResearchLimitSec, Math.round(n)));
}
