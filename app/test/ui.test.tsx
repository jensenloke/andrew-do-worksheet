import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { StockSearchScreen } from '../src/ui/StockSearchScreen.js';
import { SplashScreen } from '../src/ui/SplashScreen.js';
import { ResultsScreen } from '../src/ui/ResultsScreen.js';
import { calculate } from '../src/engine/index.js';
import { toWorksheetInput } from '../src/agent/schema.js';
import type { Proposal } from '../src/agent/schema.js';

// Minimal valid proposal to drive the engine for a results render.
const sampleProposal = {
  companyName: 'ComfortDelGro Corporation',
  sgxCode: 'C52',
  businessSummary: 'Transport and logistics',
  answers: {
    q1MarketCap: { value: 2794, rationale: 'Yahoo', source: 'yahoo' },
    q2FreeFloat: { value: 0.7, rationale: '', source: 'AR' },
    q3SharePriceMove: { value: -0.122, rationale: '', source: 'yahoo' },
    q4ForeignPct: { value: 0.3, rationale: '', source: 'AR' },
    q5NetGearing: { value: 0.5, rationale: '', source: 'AR' },
    q6ProfitHistory: { value: 'All three', rationale: '', source: 'AR' },
    q7AdverseAnnouncement: { value: false, rationale: '', source: 'news' },
    q8IndependentDirectors: { value: 0.6, rationale: '', source: 'AR' },
    q9LargestShareholder: { value: 0.28, rationale: '', source: 'AR' },
    q10AuditOpinion: { value: 'Unqualified', rationale: '', source: 'AR' },
    q11AuditorChanged: { value: false, rationale: '', source: 'AR' },
    q12CeoCfoChanged: { value: false, rationale: '', source: 'AR' },
    q13SgxQueries: { value: 0, rationale: '', source: 'SGX' },
    q14WatchListOrInvestigation: { value: false, rationale: '', source: 'news' },
    q15UsSecurities: { value: 'None', rationale: '', source: 'AR' },
    q16CapitalRaising: { value: 'None', rationale: '', source: 'SGX' },
    q17Claims: { value: 0, rationale: '', source: 'assumption' },
    q18KnownCircumstance: { value: false, rationale: '', source: 'assumption' },
    q19PreviouslyDeclined: { value: false, rationale: '', source: 'assumption' },
    q20ExpiringPremium: { value: 0, rationale: '', source: 'assumption' },
  },
  structure: { limit: 'S$10m', retention: 'SGD 250k', hazardClass: 'Class 2', hazardRationale: 'transport' },
  modifiers: {
    financialStrength: { value: 1.0, rationale: '', facts: [] },
    governanceAndOwnership: { value: 1.0, rationale: '', facts: [] },
    sharePriceAndFloat: { value: 1.1, rationale: '', facts: [] },
    regulatoryGeographyTransactions: { value: 1.0, rationale: '', facts: [] },
    claimsAndInsuranceHistory: { value: 0.95, rationale: '', facts: [] },
  },
  proposedExclusions: ['majorShareholder'],
  narrative: {
    adverseNews: 'None identified',
    regulatoryActions: 'None identified',
    litigation: 'None identified',
    litigationExposure: 'Low',
    financialTrend: 'stable',
    financialRedFlags: 'none',
    financialStrength: 'Strong',
    governanceSummary: 'ok',
    managementStrength: 'Strong',
    governanceConcern: 'None',
    shareholdersEquity: 3000,
    profitByYear: [300, 310, 320],
    keyOfficersWithFinanceExperience: 2,
  },
  dataGaps: [],
  synthesis: 'A clean blue-chip risk with modest share price drift.',
} as unknown as Proposal;

describe('TUI renders', () => {
  it('renders the splash with the acronym and credit', () => {
    const { lastFrame } = render(<SplashScreen onContinue={() => {}} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('A');
    expect(frame).toContain('W');
    expect(frame).toContain('Anapi Insurance Brokers');
  });

  it('renders the stock search screen with the rehearsal universe', () => {
    const { lastFrame } = render(<StockSearchScreen onPick={() => {}} onSettings={() => {}} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Search SGX-listed stocks');
    expect(frame).toContain('Rehearsal universe (23)');
    // index 0 — always visible regardless of terminal height
    expect(frame).toContain('CapitaLand Integrated Commercial Trust');
    // index 8 — visible at any terminal of 18+ rows
    expect(frame).toContain('ComfortDelGro');
  });

  it('renders the results screen with premium, exclusions and formula toggle hint', () => {
    const input = toWorksheetInput(sampleProposal);
    const output = calculate(input);
    const { lastFrame } = render(
      <ResultsScreen
        companyName="ComfortDelGro Corporation"
        input={input}
        output={output}
        appliedExclusions={['Major shareholder exclusion (holders above 15%)']}
        synthesis={sampleProposal.synthesis}
        researchDurationMs={123000}
        onQuit={() => {}}
        onRestart={() => {}}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ComfortDelGro Corporation');
    expect(frame).toContain('Premium to quote');
    expect(frame).toContain('Major shareholder exclusion');
    expect(frame).toContain('show the formulas');
    expect(frame).toContain('clean blue-chip risk');
    expect(frame).toContain('Research time');
    expect(frame).toMatch(/CLEAR|REFER/);
  });
});
