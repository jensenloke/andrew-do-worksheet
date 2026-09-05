/** Results — one company: premium, referral verdict, exclusions, and the
 * full pricing formula behind every number (press f). */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { explainPrice } from '../engine/explain.js';
import { formatDuration } from '../agent/logger.js';
import type { WorksheetInput } from '../engine/types.js';
import type { WorksheetOutput } from '../engine/index.js';

interface Props {
  companyName: string;
  input: WorksheetInput;
  output: WorksheetOutput;
  appliedExclusions: string[];
  synthesis: string;
  researchDurationMs: number | null;
  onQuit: () => void;
  onRestart: () => void;
}

const sgd = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`;

export function ResultsScreen({ companyName, input, output, appliedExclusions, synthesis, researchDurationMs, onQuit, onRestart }: Props) {
  const [showFormulas, setShowFormulas] = useState(false);

  useInput((inputChar) => {
    if (inputChar === 'q' || inputChar === 'x') onQuit();
    if (inputChar === 'f') setShowFormulas((v) => !v);
    if (inputChar === 'n') onRestart();
  });

  const clear = output.referral.kind === 'clear';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        D&amp;O indicated premium — {companyName}
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text dimColor>Premium to quote   </Text>
          <Text bold color="green">
            {sgd(output.price.premiumToQuote)}
          </Text>
          <Text dimColor> ({sgd(output.price.premiumPerMillion)} per S$1m of our share)</Text>
        </Text>
        <Text>
          <Text dimColor>Limit / retention  </Text>
          {input.structure.limit} · {input.structure.retention} · {input.structure.hazardClass}
        </Text>
        <Text>
          <Text dimColor>Status             </Text>
          {clear ? (
            <Text color="green" bold>
              CLEAR — {output.referral.message}
            </Text>
          ) : (
            <Text color="red" bold>
              REFER — {output.referral.fired.length} trigger(s)
            </Text>
          )}
        </Text>
        {researchDurationMs !== null ? (
          <Text dimColor>Research time      {formatDuration(researchDurationMs)}</Text>
        ) : null}
      </Box>

      {output.referral.kind === 'refer' ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">
            Referral triggers:
          </Text>
          {output.referral.fired.map((f) => (
            <Text key={f.cell}>
              {'  '}
              <Text dimColor>[{f.cell}]</Text> {f.trigger} → <Text bold>{f.referTo}</Text>
            </Text>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          technical loss cost {sgd(output.price.technicalLossCost)} · composite{' '}
          {output.price.composite.applied.toFixed(3)} · coverage terms {output.price.coverageTermsFactorValue.toFixed(3)}
          {output.price.rateChange === 'New business'
            ? ' · new business'
            : ` · rate change ${(output.price.rateChange * 100).toFixed(1)}%`}
        </Text>
        <Text dimColor>
          {appliedExclusions.length > 0 ? `exclusions: ${appliedExclusions.join(' · ')}` : 'exclusions: none applied'}
        </Text>
      </Box>

      {showFormulas ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline>
            How the premium was calculated
          </Text>
          {explainPrice(input, output.price).map((line, i) => (
            <Text key={i}>
              {line.op.padEnd(34)}
              <Text bold>{line.value.padEnd(16)}</Text>
              <Text dimColor>{line.basis}</Text>
            </Text>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text bold underline>
          Underwriting synthesis
        </Text>
        <Text wrap="wrap">{synthesis}</Text>
      </Box>

    </Box>
  );
}
