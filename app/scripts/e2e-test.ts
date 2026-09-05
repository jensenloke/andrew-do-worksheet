/**
 * End-to-end pipeline test (the TUI path minus the human override step):
 *   npx tsx scripts/e2e-test.ts [TICKER] [COMPANY NAME]
 */

import { runResearchAgent } from '../src/agent/agent.js';
import { loadSettings } from '../src/agent/settings.js';
import { toWorksheetInput } from '../src/agent/schema.js';
import { calculate } from '../src/engine/index.js';
import { startRun } from '../src/agent/logger.js';

process.on('unhandledRejection', (reason) => {
  console.error('\nUNHANDLED REJECTION:', reason instanceof Error ? `${reason.message}\n${reason.stack}` : reason);
});
process.on('uncaughtException', (err) => {
  console.error('\nUNCAUGHT EXCEPTION:', `${err.message}\n${err.stack}`);
  process.exit(13);
});

const stock = { ticker: process.argv[2] ?? 'C52', name: process.argv[3] ?? 'ComfortDelGro Corporation' };
const settings = loadSettings();
console.log(`settings: ${JSON.stringify(settings)}\n`);

const logger = startRun(stock);
const started = Date.now();
const sec = () => `${Math.round((Date.now() - started) / 1000)}s`;

try {
  const proposal = await runResearchAgent({
    stock,
    settings,
    logger,
    onEvent: (e) => {
      switch (e.type) {
        case 'subagent':
          console.log(`[${sec()}] subagent ${e.id}: ${e.status}${e.error ? ` — ${e.error}` : ''}`);
          break;
        case 'synthesis':
          console.log(`[${sec()}] synthesis: ${e.status}`);
          break;
        case 'tool-call':
          console.log(`  ⚙ ${e.summary.slice(0, 110)}`);
          break;
        case 'error':
          console.log(`[${sec()}] ERROR: ${e.message}`);
          break;
        default:
          break;
      }
    },
  });

  logger.saveProposal(proposal);
  const input = toWorksheetInput(proposal);
  const output = calculate(input);
  logger.saveWorksheet(input, output);
  logger.finish('done');

  console.log('\n=== PROPOSAL ===');
  console.log(`company: ${proposal.companyName} (${proposal.sgxCode})`);
  console.log(`business: ${proposal.businessSummary.slice(0, 200)}`);
  console.log(`Q1 mcap: S$${proposal.answers.q1MarketCap.value}m · Q3 move: ${(proposal.answers.q3SharePriceMove.value * 100).toFixed(1)}% · Q9 largest: ${(proposal.answers.q9LargestShareholder.value * 100).toFixed(1)}%`);
  console.log(`Q6: ${proposal.answers.q6ProfitHistory.value} · Q10: ${proposal.answers.q10AuditOpinion.value} · Q15: ${proposal.answers.q15UsSecurities.value}`);
  console.log(`structure: ${input.structure.limit} / ${input.structure.retention} / ${input.structure.hazardClass}`);
  console.log(`modifiers: ${JSON.stringify(input.modifiers)}`);
  console.log(`exclusions: ${input.appliedExclusions.join(', ') || 'none'}`);
  console.log(`narrative: litigation ${proposal.narrative.litigationExposure} · financial ${proposal.narrative.financialStrength} · mgmt ${proposal.narrative.managementStrength} · gov ${proposal.narrative.governanceConcern}`);
  console.log(`synthesis: ${proposal.synthesis}`);
  console.log(`data gaps: ${proposal.dataGaps.length ? proposal.dataGaps.join(' | ') : 'none'}`);

  console.log('\n=== ENGINE ===');
  console.log(`premium to quote: S$${Math.round(output.price.premiumToQuote).toLocaleString('en-SG')}`);
  console.log(`per S$1m: S$${Math.round(output.price.premiumPerMillion).toLocaleString('en-SG')}`);
  console.log(`status: ${output.referral.kind} — ${output.referral.message}`);
  for (const f of output.referral.fired) console.log(`  [${f.cell}] ${f.trigger} → ${f.referTo}`);
  console.log(`\nrun dir: ${logger.dir}`);
} catch (err) {
  logger.finish('error', err instanceof Error ? err.message : String(err));
  console.error(`\nE2E FAILED: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
}
