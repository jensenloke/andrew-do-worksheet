/**
 * Debug one sub-agent in isolation with verbose event printing.
 *   npx tsx scripts/debug-subagent.ts governance
 *   npx tsx scripts/debug-subagent.ts adverse
 */

import { createModel } from '../src/agent/provider.js';
import { prepareContext, runSubAgent, SUBAGENT_SPECS } from '../src/agent/subagents.js';
import type { AgentEvent } from '../src/agent/events.js';

const id = process.argv[2] ?? 'governance';
const spec = SUBAGENT_SPECS.find((s) => s.id === id);
if (!spec) {
  console.error(`Unknown sub-agent "${id}". Valid: ${SUBAGENT_SPECS.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const stock = { ticker: process.argv[3] ?? 'C52', name: process.argv[4] ?? 'ComfortDelGro Corporation' };

const printer = (e: AgentEvent) => {
  switch (e.type) {
    case 'tool-call':
      console.log(`\n⚙ ${e.tool} → ${e.summary}`);
      break;
    case 'tool-result':
      console.log(`  ${e.ok ? '✓' : `✗ ERROR: ${e.error ?? '(no message)'}`}`);
      break;
    default:
      break;
  }
};

const model = createModel();
const context = await prepareContext(stock, printer);
console.log(`\n=== running sub-agent: ${spec.label} ===\n`);
const result = await runSubAgent(spec, context, model, undefined, printer);

console.log('\n=== outcome ===');
if (result.findings) {
  console.log(JSON.stringify(result.findings, null, 2));
} else {
  console.log('NO FINDINGS:', result.error);
}
