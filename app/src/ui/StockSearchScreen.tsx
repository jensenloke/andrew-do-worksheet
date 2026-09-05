/**
 * Stock search — type to search any SGX-listed stock via Yahoo Finance,
 * or browse the full rehearsal universe. One company at a time. The list
 * fills the terminal height and scrolls with the cursor.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { searchSgxStocks, type StockSearchResult } from '../data/yahoo.js';
import { DEMO_UNIVERSE, type StockRef } from '../data/universe.js';

interface Props {
  onPick: (stock: StockRef) => void;
  onSettings: () => void;
}

type Item = StockRef & { hint?: string };

// Terminal rows reserved for the frame title, search title, input, hint and spacing.
const CHROME_ROWS = 9;

export function StockSearchScreen({ onPick, onSettings }: Props) {
  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 30;
  const viewport = Math.max(5, termRows - CHROME_ROWS);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StockSearchResult[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const items: Item[] =
    results !== null
      ? results.map((r) => ({ ticker: r.ticker, name: r.name }))
      : DEMO_UNIVERSE.map((u) => ({ ticker: u.ticker, name: u.name, hint: `${u.expectedHazardClass} — ${u.purpose}` }));

  // Keep the cursor inside the visible window.
  useEffect(() => {
    setScroll((s) => {
      if (cursor < s) return cursor;
      if (cursor >= s + viewport) return cursor - viewport + 1;
      return s;
    });
  }, [cursor, viewport]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults(null);
      setSearching(false);
      setCursor(0);
      setScroll(0);
      return;
    }
    setSearching(true);
    const seq = ++seqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchSgxStocks(trimmed);
        if (seq === seqRef.current) {
          setResults(found);
          setCursor(0);
          setScroll(0);
        }
      } catch {
        if (seq === seqRef.current) setResults([]);
      } finally {
        if (seq === seqRef.current) setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useInput((input, key) => {
    if (input === 's' && query.trim().length === 0) {
      onSettings();
      return;
    }
    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setCursor((c) => Math.min(Math.max(items.length - 1, 0), c + 1));
    if (key.pageUp) setCursor((c) => Math.max(0, c - viewport));
    if (key.pageDown) setCursor((c) => Math.min(Math.max(items.length - 1, 0), c + viewport));
    if (key.return && items[cursor]) {
      const picked = items[cursor]!;
      onPick({ ticker: picked.ticker, name: picked.name });
    }
  });

  const isSearchMode = results !== null;
  const visible = items.slice(scroll, scroll + viewport);
  const rangeLabel =
    items.length > viewport
      ? `  ${scroll + 1}–${Math.min(scroll + viewport, items.length)} of ${items.length}`
      : items.length > 0
        ? `  ${items.length} result${items.length === 1 ? '' : 's'}`
        : '';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Search SGX-listed stocks
      </Text>
      <Box marginTop={1}>
        <Text bold color="cyan">
          ⌕{' '}
        </Text>
        <TextInput value={query} onChange={setQuery} placeholder="type a company name or ticker…" />
      </Box>
      <Text dimColor>↑↓ move · pgup/pgdn scroll · enter to underwrite · s = settings · one company at a time</Text>

      <Box marginTop={1} flexDirection="column">
        {isSearchMode ? (
          searching ? (
            <Text color="cyan">
              <Spinner type="dots" /> searching Yahoo Finance…
            </Text>
          ) : results.length === 0 ? (
            <Text dimColor>No SGX stocks matched "{query}".</Text>
          ) : (
            visible.map((r, i) => {
              const abs = scroll + i;
              return (
                <Box key={r.ticker}>
                  <Text color={abs === cursor ? 'cyan' : undefined}>
                    {abs === cursor ? '❯ ' : '  '}
                    <Text bold>{r.ticker.padEnd(8)}</Text>
                    {r.name}
                  </Text>
                </Box>
              );
            })
          )
        ) : (
          <>
            <Text dimColor>
              Rehearsal universe ({DEMO_UNIVERSE.length}) — or type above to search any SGX stock:
            </Text>
            {visible.map((u, i) => {
              const abs = scroll + i;
              return (
                <Box key={u.ticker}>
                  <Text color={abs === cursor ? 'cyan' : undefined}>
                    {abs === cursor ? '❯ ' : '  '}
                    <Text bold>{u.ticker.padEnd(8)}</Text>
                    {u.name.padEnd(40)}
                    <Text dimColor>{u.hint}</Text>
                  </Text>
                </Box>
              );
            })}
          </>
        )}
        {items.length > 0 ? <Text dimColor>{rangeLabel}</Text> : null}
      </Box>
    </Box>
  );
}
