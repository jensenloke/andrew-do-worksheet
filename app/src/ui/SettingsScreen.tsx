/**
 * Settings screen — tune the research fan-out and model behaviour.
 * Changes persist to settings.json immediately.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { clampSubAgents, clampResearchLimit, SETTINGS_LIMITS, saveSettings, type AppSettings } from '../agent/settings.js';
import { providerConfig } from '../agent/provider.js';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const [row, setRow] = useState(0);
  const cfg = providerConfig();

  const update = (next: AppSettings) => {
    saveSettings(next);
    onChange(next);
  };

  useInput((input, key) => {
    if (key.upArrow) setRow((r) => Math.max(0, r - 1));
    if (key.downArrow) setRow((r) => Math.min(2, r + 1));
    if (row === 0) {
      if (key.leftArrow) update({ ...settings, maxSubAgents: clampSubAgents(settings.maxSubAgents - 1) });
      if (key.rightArrow) update({ ...settings, maxSubAgents: clampSubAgents(settings.maxSubAgents + 1) });
    }
    if (row === 1 && (input === ' ' || input === 't')) update({ ...settings, thinking: !settings.thinking });
    if (row === 2) {
      if (key.leftArrow) update({ ...settings, researchLimitSec: clampResearchLimit(settings.researchLimitSec - 60) });
      if (key.rightArrow) update({ ...settings, researchLimitSec: clampResearchLimit(settings.researchLimitSec + 60) });
    }
    if (key.return || key.escape) onBack();
  });

  const rowMark = (i: number) => (row === i ? '❯ ' : '  ');

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Settings
      </Text>
      <Text dimColor>saved automatically · enter/esc to go back</Text>

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
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          model: {cfg.modelId} · {cfg.baseURL.replace('https://', '').split('/')[0]}
        </Text>
      </Box>
    </Box>
  );
}
