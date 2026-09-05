/** Verify model connectivity with the configured provider: npx tsx scripts/smoke-model.ts */

import { generateText } from 'ai';
import { createModel, providerConfig } from '../src/agent/provider.js';

const cfg = providerConfig();
console.log('provider:', cfg.name);
console.log('baseURL: ', cfg.baseURL);
console.log('model:   ', cfg.modelId);
console.log('apiKey:  ', cfg.apiKey ? `<set, ${cfg.apiKey.length} chars>` : 'MISSING');

const { text } = await generateText({
  model: createModel(),
  prompt: 'Reply with exactly: ENGINE-CONNECTED',
  maxOutputTokens: 30,
});
console.log('model replied:', text.trim());
