/**
 * Stock search — type to search any SGX-listed stock via Yahoo Finance,
 * or browse the full rehearsal universe. One company at a time. The list
 * fills the terminal height and scrolls with the cursor.
 *
 * Two input modes: browse (list navigation; s/q hotkeys, / to focus the
 * search box) and search (typing goes to the query box; esc returns to
 * browse, keeping results). Hotkeys are gated on mode, never on the query
 * text, so a search for "singtel" can start with 's'.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { searchSgxStocks, type StockSearchResult } from '../data/yahoo.js';
import { DEMO_UNIVERSE, type StockRef } from '../data/universe.js';

interface Props {
  onPick: (stock: StockRef) => void;
  onSettings: () => void;
  onQuit: () => void;
  /** Rows available to this screen (terminal height minus frame chrome). */
  rows: number;
  /** Notified when the search box gains/loses focus (drives the status-bar hints). */
  onFocusChange?: (focused: boolean) => void;
}

type Item = StockRef & { hint?: string };

// Rows reserved for the search title, input, and spacing (keys are in the status bar).
const CHROME_ROWS = 6;

export function StockSearchScreen({ onPick, onSettings, onQuit, rows, onFocusChange }: Props) {
  const viewport = Math.max(5, rows - CHROME_ROWS);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StockSearchResult[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const seqRef = useRef(0);

  const focusInput = () => {
    setFocused(true);
    onFocusChange?.(true);
  };
  const blurInput = () => {
    setFocused(false);
    onFocusChange?.(false);
  };

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
    if (!focused) {
      // Browse mode: hotkeys and list navigation; typing is not captured here.
      if (input === 's') return onSettings();
      if (input === 'q') return onQuit();
      if (input === '/') return focusInput();
    } else {
      // Search mode: characters go to the input; esc returns to browse.
      if (key.escape) return blurInput();
    }
    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setCursor((c) => Math.min(Math.max(items.length - 1, 0), c + 1));
    if (key.pageUp) setCursor((c) => Math.max(0, c - viewport));
    if (key.pageDown) setCursor((c) => Math.min(Math.max(items.length - 1, 0), c + viewport));
    if (key.return) {
      const picked = items[cursor];
      if (picked) onPick({ ticker: picked.ticker, name: picked.name });
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
        <TextInput
          value={query}
          onChange={setQuery}
          focus={focused}
          placeholder={focused ? 'type a company name or ticker…' : 'press / to search any SGX stock…'}
        />
      </Box>

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
