/** App state machine — one company at a time:
 * search → research (fan-out) → review/override → results. */

import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StockSearchScreen } from './StockSearchScreen.js';
import { SplashScreen } from './SplashScreen.js';
import { CommentScreen } from './CommentScreen.js';
import { ResearchScreen } from './ResearchScreen.js';
import { ReviewScreen } from './ReviewScreen.js';
import { ResultsScreen } from './ResultsScreen.js';
import { SettingsScreen } from './SettingsScreen.js';
import { calculate } from '../engine/index.js';
import { EXCLUSIONS } from '../engine/exclusions.js';
import { buildTeams } from '../agent/subagents.js';
import { loadSettings, type AppSettings } from '../agent/settings.js';
import { startRun, type RunLogger } from '../agent/logger.js';
import type { Proposal } from '../agent/schema.js';
import type { StockRef } from '../data/universe.js';
import type { WorksheetInput } from '../engine/types.js';
import type { WorksheetOutput } from '../engine/index.js';

type Phase = 'splash' | 'select' | 'comment' | 'settings' | 'research' | 'review' | 'results' | 'error';

interface FinalResult {
  input: WorksheetInput;
  output: WorksheetOutput;
  appliedExclusionNames: string[];
}

export function App() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>('splash');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [stock, setStock] = useState<StockRef | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [logger, setLogger] = useState<RunLogger | null>(null);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [researchDurationMs, setResearchDurationMs] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onPick = (picked: StockRef) => {
    setStock(picked);
    setLogger(startRun(picked));
    setPhase('comment');
  };

  const onCommentSubmit = (text: string) => {
    setComments(text);
    if (text) logger?.note(`Underwriter notes:\n${text}`);
    setPhase('research');
  };

  const onResearchDone = (p: Proposal) => {
    logger?.saveProposal(p);
    if (logger) {
      setResearchDurationMs(Date.now() - logger.startedAt);
      logger.finish('done');
    }
    setProposal(p);
    setPhase('review');
  };

  const onResearchError = (message: string) => {
    logger?.event({ type: 'error', message });
    logger?.finish('error', message);
    setErrorMessage(message);
    setPhase('error');
  };

  const onAbortRun = () => {
    logger?.event({ type: 'error', message: 'run aborted by user (q/Esc)' });
    logger?.finish('error', 'aborted by user');
    restart();
  };

  const onCalculate = (input: WorksheetInput) => {
    const output = calculate(input);
    logger?.saveWorksheet(input, output);
    setResult({
      input,
      output,
      appliedExclusionNames: EXCLUSIONS.filter((e) => input.appliedExclusions.includes(e.id)).map((e) => e.name),
    });
    setPhase('results');
  };

  const restart = () => {
    setStock(null);
    setProposal(null);
    setLogger(null);
    setResult(null);
    setResearchDurationMs(null);
    setComments('');
    setErrorMessage('');
    setPhase('select');
  };

  const quit = () => exit();

  if (phase === 'splash') {
    // Draws its own full-screen frame — no banner above it.
    return <SplashScreen onContinue={() => setPhase('select')} />;
  }

  if (phase === 'select') {
    return (
      <Frame>
        <StockSearchScreen onPick={onPick} onSettings={() => setPhase('settings')} />
      </Frame>
    );
  }

  if (phase === 'settings') {
    return (
      <Frame>
        <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setPhase('select')} />
      </Frame>
    );
  }

  if (phase === 'comment' && stock && logger) {
    return (
      <Frame>
        <CommentScreen stock={stock} onSubmit={onCommentSubmit} />
      </Frame>
    );
  }

  if (phase === 'research' && stock && logger) {
    const teams = buildTeams(settings.maxSubAgents);
    return (
      <Frame>
        <ResearchScreen
          key={stock.ticker}
          stock={stock}
          logger={logger}
          teams={teams.map((t) => ({ id: t.id, label: t.label }))}
          settings={settings}
          comments={comments}
          onDone={onResearchDone}
          onError={onResearchError}
          onAbort={onAbortRun}
        />
      </Frame>
    );
  }

  if (phase === 'review' && stock && proposal) {
    return (
      <Frame>
        <ReviewScreen stock={stock} proposal={proposal} comments={comments} onCalculate={onCalculate} onQuit={quit} />
      </Frame>
    );
  }

  if (phase === 'results' && stock && proposal && result) {
    return (
      <Frame>
        <ResultsScreen
          companyName={proposal.companyName || stock.name}
          input={result.input}
          output={result.output}
          appliedExclusions={result.appliedExclusionNames}
          synthesis={proposal.synthesis}
          researchDurationMs={researchDurationMs}
          onQuit={quit}
          onRestart={restart}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="red">
          Research failed
        </Text>
        <Text>{errorMessage}</Text>
        <Text dimColor>Check the model provider config (.env: DO_AGENT_BASE_URL / DO_AGENT_MODEL / DO_AGENT_API_KEY) and network, then retry.</Text>
        <Text dimColor>n = try again · q = quit</Text>
        <ErrorHandler onRestart={restart} onQuit={quit} />
      </Box>
    </Frame>
  );
}

function ErrorHandler({ onRestart, onQuit }: { onRestart: () => void; onQuit: () => void }) {
  useInput((input) => {
    if (input === 'n') onRestart();
    if (input === 'q') onQuit();
  });
  return null;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold inverse> A.N.D.R.E.W — A Narrative D&amp;O Risk Evaluation Worksheet </Text>
      </Box>
      {children}
    </Box>
  );
}
