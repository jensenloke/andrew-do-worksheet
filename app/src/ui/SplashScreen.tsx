/**
 * Animated splash — reveals A.N.D.R.E.W letter by letter, then what it stands
 * for, then a blinking "press space or enter to continue". Space/enter skips
 * the animation on first press and continues on the second.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

const LETTERS = ['A', 'N', 'D', 'R', 'E', 'W'] as const;
const MEANING = 'A Narrative D&O Risk Evaluation Worksheet';
const REVEAL_MS = 140;

interface Props {
  onContinue: () => void;
}

export function SplashScreen({ onContinue }: Props) {
  const [revealed, setRevealed] = useState(0);
  const [blink, setBlink] = useState(true);

  const done = revealed >= LETTERS.length;

  // Letter-by-letter reveal.
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setRevealed((r) => Math.min(LETTERS.length, r + 1)), REVEAL_MS);
    return () => clearInterval(t);
  }, [done]);

  // Blinking prompt once revealed.
  useEffect(() => {
    if (!done) return;
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, [done]);

  useInput((input, key) => {
    if (input === ' ' || key.return) {
      if (!done) setRevealed(LETTERS.length);
      else onContinue();
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box>
        {LETTERS.map((letter, i) => (
          <Text key={letter}>
            <Text bold color={i < revealed ? 'cyan' : undefined} dimColor={i >= revealed}>
              {letter}
            </Text>
            {i < LETTERS.length - 1 ? <Text dimColor>.</Text> : null}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        {done ? <Text color="green">{MEANING}</Text> : <Text dimColor>{' '.repeat(MEANING.length)}</Text>}
      </Box>

      <Box>
        <Text dimColor>with Anapi Insurance Brokers</Text>
      </Box>

      <Box marginTop={1}>
        {done ? (
          <Text bold inverse={blink} color="yellow">
            PRESS SPACE OR ENTER TO CONTINUE
          </Text>
        ) : (
          <Text dimColor>loading…</Text>
        )}
      </Box>
    </Box>
  );
}
