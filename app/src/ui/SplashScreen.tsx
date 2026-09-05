/**
 * Boot splash: ANDREW's teal brand in a Fan Monitor-style layout — a teal
 * rounded box on near-black, the slab wordmark filling top → bottom in the
 * mint → teal gradient, a dotted rule, the acronym meaning, then a pulsing
 * continue prompt. Space/enter completes the reveal on the first press and
 * continues on the second.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import {
  AMBER,
  DEEP,
  INK,
  MUTED,
  PRODUCT,
  RULE,
  RULE_COLOR,
  SLABS,
  TEAL,
  WORDMARK_ROWS,
  sweepColors,
} from './brand.js';

const MEANING = 'a narrative d&o risk evaluation worksheet';
const REVEAL_MS = 150;
const STEPS = WORDMARK_ROWS.length + 2; // slabs fill, then rule, then meaning

interface Props {
  onContinue: () => void;
}

export function SplashScreen({ onContinue }: Props) {
  const { stdout } = useStdout();
  const [step, setStep] = useState(0);
  const [blink, setBlink] = useState(true);
  const [dotStep, setDotStep] = useState(0);

  const done = step >= STEPS;

  // Top-to-bottom slab fill, then rule, then meaning — Fan Monitor's reveal.
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setStep((s) => s + 1), REVEAL_MS);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (!done) return;
    const t = setInterval(() => {
      setBlink((b) => !b);
      setDotStep((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(t);
  }, [done]);

  useInput((input, key) => {
    if (input === ' ' || key.return) {
      if (!done) setStep(STEPS);
      else onContinue();
    }
  });

  const status = `with Anapi Insurance Brokers${' ·'.repeat(dotStep)}`;

  const cols = stdout.columns || 80;
  const rows = stdout.rows || 24;
  return (
    <Box
      backgroundColor={INK}
      width={cols}
      height={rows}
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={TEAL}
        backgroundColor={INK}
        paddingX={2}
        paddingY={1}
        alignItems="center"
        width={WORDMARK_ROWS.reduce((m, r) => Math.max(m, r.length), 0) + 6}
      >
        {WORDMARK_ROWS.map((row, i) => (
          <Text key={i} color={step > i ? SLABS[i] : DEEP}>
            {row}
          </Text>
        ))}

        <Box height={1} />

        {step >= WORDMARK_ROWS.length ? (
          <Text color={RULE_COLOR}>{RULE}</Text>
        ) : (
          <Text color={INK}>{RULE}</Text>
        )}

        {step >= STEPS - 1 ? (
          <Text>
            {sweepColors(MEANING).map((c, i) => (
              <Text key={i} color={c.color}>
                {c.ch}
              </Text>
            ))}
          </Text>
        ) : (
          <Text color={INK}>{' '.repeat(MEANING.length)}</Text>
        )}

        <Box height={1} />
        <Text bold color={PRODUCT}>
          D&amp;O UNDERWRITING AGENT
        </Text>
        <Box height={1} />
        <Text color={MUTED}>{status}</Text>

        <Box height={1} />
        {done ? (
          <Text bold color={AMBER} dimColor={!blink}>
            PRESS SPACE OR ENTER TO CONTINUE
          </Text>
        ) : (
          <Text color={INK}>{' '.repeat(29)}</Text>
        )}
      </Box>
    </Box>
  );
}
