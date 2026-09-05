/** Live research view — five sub-agent lanes plus the streaming activity log. */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { runResearchAgent } from '../agent/agent.js';
import type { AgentEvent } from '../agent/events.js';
import type { Proposal } from '../agent/schema.js';
import { formatDuration, type RunLogger } from '../agent/logger.js';
import type { AppSettings } from '../agent/settings.js';
import { providerConfig } from '../agent/provider.js';
import { searchProvider } from '../agent/research.js';
import type { StockRef } from '../data/universe.js';

interface LogLine {
  kind: 'tool' | 'tool-result' | 'error';
  text: string;
  ok?: boolean;
}

interface Props {
  stock: StockRef;
  logger: RunLogger;
  teams: Array<{ id: string; label: string }>;
  settings: AppSettings;
  comments: string;
  onDone: (proposal: Proposal) => void;
  onError: (message: string) => void;
  onAbort: () => void;
}

const MAX_LINES = 12;
type LaneStatus = 'pending' | 'running' | 'done' | 'error';

export function ResearchScreen({ stock, logger, teams, settings, comments, onDone, onError, onAbort }: Props) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [lanes, setLanes] = useState<Record<string, LaneStatus>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, 'pending' as LaneStatus])),
  );
  const [synthesis, setSynthesis] = useState<'idle' | 'running' | 'done'>('idle');
  const [busy, setBusy] = useState(true);
  const doneRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // q / Esc aborts a stuck run and returns to the search screen.
  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      controllerRef.current?.abort();
      onAbort();
    }
  });

  // Run timer — ticks once per second for the whole research phase.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    const push = (line: LogLine) => setLines((prev) => [...prev, line].slice(-MAX_LINES));

    const onEvent = (event: AgentEvent) => {
      switch (event.type) {
        case 'tool-call':
          push({ kind: 'tool', text: `${event.tool} → ${event.summary}` });
          break;
        case 'tool-result':
          push({ kind: 'tool-result', text: event.tool, ok: event.ok });
          break;
        case 'subagent':
          setLanes((l) => ({
            ...l,
            [event.id]: event.status === 'start' ? 'running' : event.status === 'done' ? 'done' : 'error',
          }));
          break;
        case 'synthesis':
          setSynthesis(event.status === 'start' ? 'running' : 'done');
          break;
        case 'text':
          break;
        case 'error':
          push({ kind: 'error', text: event.message });
          break;
        case 'done':
          if (!doneRef.current) {
            doneRef.current = true;
            setBusy(false);
            onDone(event.proposal);
          }
          break;
      }
    };

    runResearchAgent({ stock, signal: controller.signal, onEvent, logger, settings, comments })
      .then((proposal) => {
        if (!doneRef.current) {
          doneRef.current = true;
          setBusy(false);
          onDone(proposal);
        }
      })
      .catch((err: unknown) => {
        if (!doneRef.current) {
          doneRef.current = true;
          setBusy(false);
          onError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold color="cyan">
          Researching {stock.name} ({stock.ticker})
        </Text>
        <Text dimColor>
          {' '}
          — {teams.length} researcher team{teams.length === 1 ? '' : 's'} fanning out · thinking{' '}
          {settings.thinking ? 'on' : 'off'}
        </Text>
        <Text color={elapsed > 360 ? 'yellow' : undefined}> ⏱ {formatDuration(elapsed * 1000)}</Text>
      </Box>


      <Box marginTop={1} flexDirection="column">
        {teams.map((spec) => {
          const status = lanes[spec.id] ?? 'pending';
          return (
            <Box key={spec.id}>
              <Text dimColor>{'  '}</Text>
              {status === 'pending' && <Text dimColor>· {spec.label}</Text>}
              {status === 'running' && (
                <Text color="cyan">
                  <Spinner type="dots" /> {spec.label}
                </Text>
              )}
              {status === 'done' && <Text color="green">✓ {spec.label}</Text>}
              {status === 'error' && <Text color="red">✗ {spec.label}</Text>}
            </Box>
          );
        })}
        <Box>
          <Text dimColor>{'  '}</Text>
          {synthesis === 'idle' && <Text dimColor>· synthesis (lead underwriter)</Text>}
          {synthesis === 'running' && (
            <Text color="yellow">
              <Spinner type="dots" /> synthesis (lead underwriter)
            </Text>
          )}
          {synthesis === 'done' && <Text color="green">✓ synthesis (lead underwriter)</Text>}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {lines.map((line, i) => {
          if (line.kind === 'tool')
            return (
              <Text key={i} wrap="truncate">
                <Text color="yellow">⚙ </Text>
                {line.text}
              </Text>
            );
          if (line.kind === 'tool-result')
            return (
              <Text key={i} dimColor wrap="truncate">
                {'   '}
                {line.ok ? '✓' : '✗'} {line.text}
              </Text>
            );
          return (
            <Text key={i} color="red">
              ✗ {line.text}
            </Text>
          );
        })}
      </Box>

      {busy ? (
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" /> agents working — reading public sources…
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
