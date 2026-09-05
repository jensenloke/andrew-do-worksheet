/**
 * Comment screen — after selecting a stock, the underwriter can add free-form
 * notes ("they just lost a major contract", "watch the Indonesia segment") that
 * are threaded into the research and synthesis prompts so the AI weighs them.
 *
 * Multiline editor: type = add char, enter = new line, backspace = delete,
 * ctrl-d (or esc) = done & continue. Empty = skip.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { StockRef } from '../data/universe.js';

interface Props {
  stock: StockRef;
  onSubmit: (comments: string) => void;
}

export function CommentScreen({ stock, onSubmit }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [current, setCurrent] = useState('');

  const submit = () => {
    const all = [...lines, current].map((l) => l.trim()).filter(Boolean).join('\n');
    onSubmit(all);
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'd') return submit();
    if (key.escape) return submit();
    if (key.return) return setLines((l) => [...l, current]), setCurrent('');
    if (key.backspace || (key.delete && input === '')) {
      if (current.length > 0) return setCurrent((c) => c.slice(0, -1));
      return setLines((l) => l.slice(0, -1)); // merge previous line back? simple: drop newline
    }
    if (input && !key.ctrl && !key.meta) return setCurrent((c) => c + input);
  }, { isActive: true });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Notes on {stock.name} ({stock.ticker})
      </Text>
      <Text dimColor>
        Anything the underwriter knows that public sources won't show. These are fed to the
        researchers and the synthesizer.
      </Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        {lines.map((l, i) => (
          <Text key={i}>{l}</Text>
        ))}
        <Text>
          {current}
          <Text inverse> </Text>
        </Text>
        {lines.length === 0 && current === '' ? (
          <Text dimColor>(optional) type a note…</Text>
        ) : null}
      </Box>

    </Box>
  );
}
