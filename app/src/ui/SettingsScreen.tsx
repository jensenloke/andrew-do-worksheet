/**
 * Settings screen — tune the research fan-out, model behaviour, and search
 * provider. Changes persist to settings.json immediately.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { clampSubAgents, clampResearchLimit, SETTINGS_LIMITS, saveSettings, type AppSettings } from '../agent/settings.js';
import { braveKeySource } from '../agent/research.js';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onBack: () => void;
}

const ROWS = 4;

/** Show that a key is set without exposing it: first 6 + last 3 chars. */
function maskKey(k: string): string {
  if (!k) return 'not set';
  if (k.length <= 9) return `${'•'.repeat(k.length)}`;
  return `${k.slice(0, 6)}${'•'.repeat(6)}${k.slice(-3)}`;
}

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const [row, setRow] = useState(0);
  const [editingKey, setEditingKey] = useState(false);
  const [keyBuf, setKeyBuf] = useState('');
  const source = braveKeySource();

  const update = (next: AppSettings) => {
    saveSettings(next);
    onChange(next);
  };

  useInput((input, key) => {
    // In-key-edit mode: capture raw input, don't touch navigation.
    if (editingKey) {
      if (key.return) {
        update({ ...settings, braveApiKey: keyBuf.trim() });
        setEditingKey(false);
        return;
      }
      if (key.escape) {
        setEditingKey(false);
        return;
      }
      if (key.backspace || key.delete) {
        setKeyBuf((b) => b.slice(0, -1));
        return;
      }
      // printable chars only (avoid pastes-with-newlines sneaking control chars)
      if (input && !key.ctrl && !key.meta && input >= ' ') setKeyBuf((b) => b + input);
      return;
    }

    if (key.upArrow) setRow((r) => Math.max(0, r - 1));
    if (key.downArrow) setRow((r) => Math.min(ROWS - 1, r + 1));
    if (row === 0) {
      if (key.leftArrow) update({ ...settings, maxSubAgents: clampSubAgents(settings.maxSubAgents - 1) });
      if (key.rightArrow) update({ ...settings, maxSubAgents: clampSubAgents(settings.maxSubAgents + 1) });
    }
    if (row === 1 && (input === ' ' || input === 't')) update({ ...settings, thinking: !settings.thinking });
    if (row === 2) {
      if (key.leftArrow) update({ ...settings, researchLimitSec: clampResearchLimit(settings.researchLimitSec - 60) });
      if (key.rightArrow) update({ ...settings, researchLimitSec: clampResearchLimit(settings.researchLimitSec + 60) });
    }
    if (row === 3 && (input === 'e' || input === ' ')) {
      setKeyBuf('');
      setEditingKey(true);
    }
    if (key.return || key.escape) onBack();
  });

  const rowMark = (i: number) => (row === i ? '❯ ' : '  ');

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Settings
      </Text>
      <Text dimColor>saved automatically</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color={row === 0 ? 'cyan' : undefined}>
          {rowMark(0)}
          {'Sub-agents (researcher teams)'.padEnd(32)}
          <Text bold>‹ {settings.maxSubAgents} ›</Text>
          <Text dimColor>  ←/→ to change ({SETTINGS_LIMITS.minSubAgents}–{SETTINGS_LIMITS.maxSubAgentsCap})</Text>
        </Text>
        <Text dimColor>
          {'   '}fewer teams = fewer parallel model calls; briefs are merged so coverage stays complete
        </Text>

        <Text color={row === 1 ? 'cyan' : undefined}>
          {rowMark(1)}
          {'Model thinking (Qwen reasoning)'.padEnd(32)}
          <Text bold>{settings.thinking ? 'on' : 'off'}</Text>
          <Text dimColor>  space/t to toggle</Text>
        </Text>
        <Text dimColor>{'   '}on = deeper reasoning, slower and more tokens · off = faster, cheaper (default)</Text>

        <Text color={row === 2 ? 'cyan' : undefined}>
          {rowMark(2)}
          {'Hard research limit (per researcher)'.padEnd(32)}
          <Text bold>{settings.researchLimitSec}s</Text>
          <Text dimColor>  ←/→ ±60s ({SETTINGS_LIMITS.minResearchLimitSec}–{SETTINGS_LIMITS.maxResearchLimitSec})</Text>
        </Text>
        <Text dimColor>{'   '}a researcher that exceeds this is cut off and reported as timed out</Text>

        <Text color={row === 3 ? 'cyan' : undefined}>
          {rowMark(3)}
          {'Search · Brave API key'.padEnd(32)}
          {editingKey ? <Text bold>{keyBuf ? '•'.repeat(keyBuf.length) : '(typing…)'}</Text> : <Text bold>{maskKey(settings.braveApiKey)}</Text>}
          <Text dimColor>  {editingKey ? 'type key · enter to save · esc to cancel' : 'press e to edit'}</Text>
        </Text>
        <Text dimColor>
          {'   '}with a Brave key, web search uses the Brave API; none = free DuckDuckGo (rate-limited)
        </Text>
      </Box>

      {source === 'env' ? (
        <Box marginTop={1}>
          <Text dimColor>search is using the BRAVE_API_KEY env var (overrides the field above)</Text>
        </Box>
      ) : null}
    </Box>
  );
}
