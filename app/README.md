# D&O Underwriting Agent — SGX prompt fight

Terminal TUI app that underwrites D&O policies on SGX-listed companies, one
company at a time: search any SGX stock → five specialist sub-agents research
it in parallel from public sources (web pages + annual-report PDFs) → a lead
synthesizer merges their findings into a cited proposal → you review and
override the judgements → a deterministic engine prices the policy, runs the
referral check, and shows every formula it used.

See `../BRIEF.md` for the event brief and `../discussion-topics.html` for open decisions.

## Run it

```bash
npm install
npm run dev                          # launches the TUI
npm run check-model                  # verifies model connectivity
```

Model access lives in `.env` (copied from the ZCode Alibaba Model Studio
settings — international DashScope endpoint, model `qwen3.8-max-preview`).
Override `DO_AGENT_BASE_URL` / `DO_AGENT_MODEL` / `DO_AGENT_API_KEY` to use
any other OpenAI-compatible model.

## How a run works

```
search any SGX stock (Yahoo) — or pick a rehearsal name   [s = settings]
        │
        ▼
prepareContext      market data once + candidate annual-report PDFs once
        │
        ▼
N researcher teams (settings: 1–5, default 2) — the five specialist briefs
        │           are merged into N teams, run in parallel:
        │           market & securities · financials · governance & audit ·
        │           shareholding · adverse news & regulatory
        ▼
synthesizer         merges findings, decides structure + modifiers + exclusions,
        ▼           writes the synthesis (4-6 sentence underwriting view)
review & override   human re-sets modifiers, toggles exclusions
        ▼
engine              Tables A–E pricing + ~38 referral triggers;
                    results screen shows the formula waterfall (press f)
```

Settings (`s` on the search screen, persisted to `settings.json`):
- **Sub-agents** — how many researcher teams (1–5, default 2). Fewer teams =
  fewer parallel model streams = smaller quota bursts; briefs merge so
  coverage stays complete.
- **Thinking** — Qwen reasoning mode for researchers and synthesis (default
  off: faster and cheaper; on: deeper reasoning, more tokens).

The teams run in parallel (the team count is the concurrency control) and
share the PDF cache — the annual report is downloaded once. Leveling
assumptions (no claims, new policy, headcount 200) are enforced in code after
synthesis, not left to the model.

## Tests

```bash
npm test                 # engine + UI render tests (offline, no keys)
LIVE=1 npm test          # also hits Yahoo Finance + a real annual-report PDF
npm run typecheck
```

## Architecture

```
src/
├── engine/     deterministic pricing + Part 6 referral logic (zero deps)
│               — replicates the worksheet's own formulas; validated against
│               the Marina Logistics worked example (S$52,805.16 / clear)
│               explain.ts renders the pricing chain as a formula waterfall
├── data/       yahoo.ts   — SGX market data + stock search
│               universe.ts — rehearsal stocks across hazard classes 1–4
├── agent/      research.ts   — fetchPage (HTML→markdown), readPdf (keyword
│                              search / page ranges, disk cache), searchWeb
│                              (Brave API if BRAVE_API_KEY set, else DuckDuckGo)
│               subagents.ts  — the five specialist researchers + preparation
│               agent.ts      — fan-out orchestration + synthesizer
│               schema.ts     — Zod proposal schema (value+rationale+source
│                              per answer, plus synthesis)
│               logger.ts     — runs/<timestamp>_<ticker>/ trace per run
│               provider.ts   — OpenAI-compatible model factory (.env)
└── ui/         Ink (React-for-terminal) screens:
                Search → Research (sub-agent lanes) → Review/override → Results
```

**The design rule:** the LLM never touches pricing math. Sub-agents research,
the synthesizer proposes with citations, the human overrides, then the engine
calculates and the referral triggers arbitrate. Numbers in code, words in the
models, judgement with the human.

## Engine note

The engine was built from the worksheet's **live formulas** (extracted from the
xlsx XML), not its cached display values — those are stale in places, e.g. the
major-shareholder exclusion effect is really −0.025, not the −0.03 shown. With
the true formulas, the worked example reproduces to the cent.
