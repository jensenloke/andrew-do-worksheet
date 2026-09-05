/**
 * Pinned bottom status bar — always present on every screen.
 * Top line: the active global config (model · search · teams · thinking).
 * Bottom line: the keys available on the current screen.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TEAL, MUTED } from './brand.js';
import { providerConfig } from '../agent/provider.js';
import { searchProvider } from '../agent/research.js';
import type { AppSettings } from '../agent/settings.js';

interface Props {
  settings: AppSettings;
  /** Key hints for the current screen, e.g. "↑↓ move · ⏎ underwrite · s settings · q quit". */
  keys: string;
}

export function StatusBar({ settings, keys }: Props) {
  const cfg = providerConfig();
  const host = cfg.baseURL.replace(/^https?:\/\//, '').split('/')[0];
  const search = searchProvider();

  return (
    <Box borderStyle="round" borderColor={TEAL} borderLeft={false} borderRight={false} borderBottom={false} paddingX={1} flexDirection="column">
      <Text dimColor>
        <Text color={TEAL}>config </Text>
        model {cfg.modelId} @ {host} · search {search === 'brave' ? 'Brave' : 'DuckDuckGo'} · teams {settings.maxSubAgents} ·
        thinking {settings.thinking ? 'on' : 'off'} · limit {settings.researchLimitSec}s
      </Text>
      <Text color={MUTED}>
        <Text color={TEAL}>keys  </Text>
        {keys}
      </Text>
    </Box>
  );
}
