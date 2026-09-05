# ANDREW — documentation

A.N.D.R.E.W = **A Narrative D&O Risk Evaluation Worksheet**.

A terminal (TUI) app that underwrites Directors & Officers policies for SGX-listed
companies using parallel AI researchers + a deterministic pricing engine.

## Architecture

```
app/src/
├── engine/     deterministic pricing + ~38 referral triggers (zero deps, unit-tested)
│               explain.ts renders the formula waterfall
├── data/       yahoo.ts (live SGX market data + stock search), universe.ts (rehearsal names)
├── agent/      research tools (fetchPage / readPdf / searchWeb), sub-agent fan-out,
│               synthesis, provider (OpenAI-compatible), settings, run logging
└── ui/         Ink screens: Splash → Search → Settings → Research → Review → Results
```

Design rule: **numbers in code, words in the model, judgement with the human.**
The LLM researches and proposes with citations; the engine calculates; a human signs off.

## Bring your own LLM

ANDREW talks to any **OpenAI-compatible** endpoint. Configure `app/.env`:

```bash
# Any OpenAI-compatible provider:
DO_AGENT_BASE_URL=https://api.openai.com/v1          # or OpenRouter, DashScope,
DO_AGENT_MODEL=gpt-4o                                 # vLLM, Ollama, DGX, etc.
DO_AGENT_API_KEY=sk-...

# Examples:
# OpenRouter:   https://openrouter.ai/api/v1            + openrouter key
# DashScope:    https://dashscope-intl.aliyuncs.com/compatible-mode/v1
# Local Ollama: http://localhost:11434/v1               (key can be anything)
# Local vLLM:   http://localhost:8000/v1

# Web search (optional): with a Brave key ANDREW uses the Brave Search API
# (no bot/CAPTCHA/IP blocking); without one it falls back to DuckDuckGo.
BRAVE_API_KEY=***
```

`npm run check-model` verifies connectivity. Thinking/reasoning models are supported;
if a model burns its budget on reasoning, set `thinking` off in the settings screen.

## Settings (press `s` on the search screen, persisted to `app/settings.json`)

| setting | what it does | default |
|---|---|---|
| Sub-agents | researcher teams (1–5); briefs merge so coverage stays complete | 2 |
| Thinking | Qwen-style reasoning on/off | off |
| Hard research limit | per-researcher wall-time cap; shown on the research screen | 900s |
| Search · Brave API key | paste a Brave Search key (`press e`); with one, web search uses the Brave API — no bot/CAPTCHA/IP blocking, and an empty result is trustworthy. None = free DuckDuckGo (rate-limited, can be IP-blocked) | none |

The active config (teams · thinking · hard limit · model · search) is displayed on the research screen.
The Brave key is stored in `app/settings.json` (gitignored); it takes precedence over the `BRAVE_API_KEY` env var.

## Run logs

Every run writes to `app/runs/<timestamp>_<ticker>/`: `trace.md` (readable timeline +
proposal + engine output), `events.jsonl` (raw), `proposal.json`, `worksheet.json`.

## Keyboard

- Splash: `space`/`enter` to continue
- Search: `↑↓` move, `pgup/pgdn` scroll, `enter` underwrite, `s` settings
- Research: `q`/`Esc` abort
- Review: adjust modifiers / toggle exclusions, `c` calculate
- Results: `f` formula waterfall, `n` new company, `q` quit
