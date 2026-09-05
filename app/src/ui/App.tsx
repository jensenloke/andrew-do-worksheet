/** App state machine — one company at a time:
 * search → research (fan-out) → review/override → results.
 * Every screen renders inside a full-height Frame with a pinned bottom status
 * bar (global config + the current screen's keys) so it never scrolls away. */

import React, { useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { StockSearchScreen } from './StockSearchScreen.js';
import { SplashScreen } from './SplashScreen.js';
import { CommentScreen } from './CommentScreen.js';
import { ResearchScreen } from './ResearchScreen.js';
import { ReviewScreen } from './ReviewScreen.js';
import { ResultsScreen } from './ResultsScreen.js';
import { SettingsScreen } from './SettingsScreen.js';
import { StatusBar } from './StatusBar.js';
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

/** Bottom status bar (2 rows) + top banner (1 row) the screen content shares. */
const FRAME_CHROME_ROWS = 3;

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 30;
  const [phase, setPhase] = useState<Phase>('splash');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [stock, setStock] = useState<StockRef | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [logger, setLogger] = useState<RunLogger | null>(null);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [researchDurationMs, setResearchDurationMs] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Error screen: n = try again, q = quit (the only phase without its own screen).
  // Registered here, before the splash early-return, so the hook order is stable.
  useInput(
    (input) => {
      if (phase !== 'error') return;
      if (input === 'n') restart();
      if (input === 'q') exit();
    },
    { isActive: phase === 'error' },
  );


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
    // Draws its own full-screen frame — no banner or status bar above it.
    return <SplashScreen onContinue={() => setPhase('select')} />;
  }

  // Per-screen key hints shown in the pinned status bar.
  const keys =
    phase === 'select'
      ? '↑↓ move · pgup/pgdn scroll · ⏎ underwrite · s settings · q quit'
      : phase === 'settings'
        ? '←→ / space adjust · e edit Brave key · ⏎ or esc back to search'
        : phase === 'comment'
          ? 'type notes · ⏎ new line · ⏎⏎ or ctrl-d continue · esc skip notes'
          : phase === 'research'
            ? 'watching…   q abort run & return to search'
            : phase === 'review'
              ? '↑↓ move · ⏎ re-set value · space toggle exclusion · c calculate · q quit'
              : phase === 'results'
                ? 'f toggle formulas · n underwrite another · q quit'
                : 'n try again · q quit';

  let content: React.ReactNode;
  if (phase === 'select') {
    content = <StockSearchScreen onPick={onPick} onSettings={() => setPhase('settings')} onQuit={quit} rows={termRows - FRAME_CHROME_ROWS} />;
  } else if (phase === 'settings') {
    content = <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setPhase('select')} />;
  } else if (phase === 'comment' && stock && logger) {
    content = <CommentScreen stock={stock} onSubmit={onCommentSubmit} />;
  } else if (phase === 'research' && stock && logger) {
    const teams = buildTeams(settings.maxSubAgents);
    content = (
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
    );
  } else if (phase === 'review' && stock && proposal) {
    content = <ReviewScreen stock={stock} proposal={proposal} comments={comments} onCalculate={onCalculate} onQuit={quit} />;
  } else if (phase === 'results' && stock && proposal && result) {
    content = (
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
    );
  } else {
    content = (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="red">
          Research failed
        </Text>
        <Text>{errorMessage}</Text>
        <Text dimColor>Check the model provider config (.env: DO_AGENT_BASE_URL / DO_AGENT_MODEL / DO_AGENT_API_KEY) and network, then retry.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" height={termRows}>
      <Box paddingX={1}>
        <Text bold inverse> A.N.D.R.E.W — A Narrative D&amp;O Risk Evaluation Worksheet </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" minHeight={0} overflowY="hidden">
        {content}
      </Box>
      <StatusBar settings={settings} keys={keys} />
    </Box>
  );
}
