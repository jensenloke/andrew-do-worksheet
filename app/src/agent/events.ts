/** Shared event stream type — emitted by the orchestrator, consumed by the TUI and logger. */

import type { Proposal } from './schema.js';

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; tool: string; summary: string }
  | { type: 'tool-result'; tool: string; ok: boolean; error?: string }
  | { type: 'subagent'; id: string; label: string; status: 'start' | 'done' | 'error'; error?: string }
  | { type: 'synthesis'; status: 'start' | 'done' }
  | { type: 'done'; proposal: Proposal }
  | { type: 'error'; message: string };

export type Emit = (event: AgentEvent) => void;
