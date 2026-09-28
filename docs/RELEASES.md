# Releases

## v0.2.3 — 2026-09-28

Point-form synthesis + review-screen rework.

### Changed

- **The underwriting synthesis is now point form, not a prose paragraph.**
  The synthesizer is prompted (system prompt + tool schema) to emit one bullet
  per line, each starting with `- `, in a fixed order: risk at a glance →
  the two or three facts that move the price (naming the modifier/exclusion
  each drives) → judgement calls → what a senior underwriter should check
  before signing. Review and Results screens render the bullets line by line.
  Rationale: the paragraph form buried the judgement calls mid-block on stage;
  bullets are scannable in a 6-minute demo slot.
- **Review & override screen rebuilt around a fixed-height viewport.** It was
  composed as one tall Ink column and clipped by the frame, so on a normal
  laptop the modifiers/exclusions checklist scrolled off the bottom and the
  ragged terminal wrapping made rows misalign. The screen now composes itself
  into pre-wrapped, one-terminal-row lines and windows them:
  - **Pinned-list mode** (terminal tall enough): the interactive modifiers +
    exclusions `[x]` checklist stay fully visible at the bottom; the read-only
    context (structure, notes, synthesis, Part 1 answers, data gaps) scrolls
    above it with **pgup/pgdn**.
  - **Scrolling-doc mode** (short terminal): the whole document becomes one
    window that follows the cursor.
  Every row is exactly one line — wrapped or clipped at compose time, never
  left to terminal wrapping. The whole screen is point form: `- ` bullets for
  notes/synthesis/data-gaps, an aligned two-column grid for the Part 1 answers.

### Fixed

- **Modifier re-set no longer prepends the old value.** The edit draft used to
  pre-fill with the current modifier (e.g. `0.85`), so typing a replacement
  produced `0.85` + `0.90` and parsed back to the original — you had to
  backspace first. The draft now starts empty with a live hint
  (`⏎ set · esc cancel · was 0.85 · range 0.50–3.50`), and digit input accepts
  a run of characters so pasting a value works too.
- **Synthesis watchdog raised 8 → 12 minutes, and its error is no longer
  misreported.** A slow local-model synthesis that tripped the 8-minute
  watchdog aborted the stream cleanly (no throw), so the run failed with the
  generic "Synthesis finished without submitting a proposal" — hiding that the
  real cause was a timeout. The watchdog now sets an explicit flag and both the
  catch and post-stream paths report "hit the N-minute watchdog", with retry /
  reduce-teams / `npm run check-model` guidance. Observed on a Sheng Siong
  (OV8) run where synthesis took 8+ min on the merged single-team findings
  block; local synthesis is variable (3–6 min typical), so the old ceiling was
  too tight.

## v0.2.2 — 2026-09-28

Search-box input fix.

### Fixed

- **`s`/`q` no longer hijack typing in the search box.** The old gating was
  "query is empty → letters are hotkeys", so the first `s` of "singtel" opened
  settings instead of searching. The search screen now has two explicit input
  modes: **browse** (list navigation, `s`/`q` hotkeys) and **search** (`/`
  focuses the query box; every keystroke is text; `esc` returns to browse,
  keeping results and cursor). Status-bar hints track the active mode.

## v0.2.1 — 2026-09-06

TUI usability pass.

### Changed

- **Pinned bottom status bar on every screen**: a live config line (model ·
  search backend · teams · thinking · research limit) plus the current screen's
  key hints, drawn in the teal brand colour. Key hints are no longer scattered
  per-screen and no longer scroll away on tall screens.
- The whole UI is a fixed full-height frame: title on top, content in the middle
  (long screens clipped instead of pushing the bar off-screen), status bar pinned
  at the bottom.
- Quit is now discoverable everywhere: `q` works on the search screen too.
- Settings keeps only its Brave-key source note (the rest is in the status bar).

## v0.2.0 — 2026-09-06

In-app search-provider configuration.

### Added

- **Search · Brave API key** row in the settings screen (press `e` to edit, type
  the key — shown masked, `enter` saves, `esc` cancels). Persisted to
  `app/settings.json` (gitignored), so users add their own Brave key without
  touching `.env`.
- Resolution order: in-app key → `BRAVE_API_KEY` env var → DuckDuckGo (keyless
  fallback). The active backend is shown on both the settings screen ("search:
  Brave Search API") and the research screen config line, with the key source
  when it comes from the env var.
- Only Brave is supported as a search provider for now; DuckDuckGo remains the
  automatic no-key fallback (free, but rate/CAPTCHA-limited and can be IP-blocked,
  where an empty result is not trustworthy).

## v0.1.1 — 2026-09-05

Reliability pass: fixes the "all research sub-agents failed" run failure on
small / open models (observed on a local DGX vLLM endpoint).

### Fixed

- `reportFindings` / `submitProposal` no longer reject a report that omits an
  empty `dataGaps` array — open models drop empty arrays, zod rejected the tool
  input, and the SDK fed the error back until the whole team burned its step
  budget with complete research in hand. `dataGaps` / `facts` now default to `[]`.
- A rejected tool submission no longer counts as "done": a report is accepted only
  once `execute()` runs (input passed schema validation).
- Forced-report rescue: when a team exhausts its steps or hard timer, its full
  transcript is replayed with a final instruction to report best-effort findings
  (dataGaps for the rest) instead of discarding the team.
- Filtered expiring Routify/OSS proxy PDF links from annual-report candidates —
  they 403 and wasted researcher steps; canonical hosts are kept.
- Larger step budget for merged teams (scales with briefs merged).
- Default hard research limit raised 420s → 900s (governance/adverse over-researches
  on smaller models at 420s).
- Error screen points at the real provider config (`DO_AGENT_*`) instead of the
  legacy `DASHSCOPE_API_KEY`.

### Changed

- Web search now prefers the **Brave Search API** when `BRAVE_API_KEY` is set
  (official, quota-backed, no bot/CAPTCHA/IP blocking — and an empty Brave
  result is authoritative, unlike a silent DDG block). Falls back to the
  existing DuckDuckGo scraping (html → lite) when no key is set or Brave errors,
  so the app still runs keyless.
- Splash rebuilt in a Fan Monitor-style layout using ANDREW's own teal palette:
  teal rounded frame on near-black, A.N.D.R.E.W slab wordmark filling
  top-to-bottom in a mint → teal gradient, dotted rule, lowercase sweep
  tagline, animated status dots, amber continue prompt. The `andrew` shell
  command launches tsx directly — no more `npm run dev` banner above the splash.

## v0.1.0 — 2026-09-05

First public build, prepared for the PLUS on-stage session.

### Added

- Animated splash: A.N.D.R.E.W — *A Narrative D&O Risk Evaluation Worksheet*.
- SGX stock search (live Yahoo Finance) + curated rehearsal universe (24 names).
- Parallel specialist research sub-agents (1–5 teams) reading annual reports / SGX
  filings / press, each reporting cited structured findings.
- Lead-underwriter synthesis into one cited proposal (market, financials, governance,
  shareholding, adverse news).
- Review & override screen (modifiers, exclusions) — the human-governs step.
- Deterministic pricing engine replicating the D&O worksheet (Tables A–E) with a
  formula waterfall (`f` on the results screen).
- ~38 automatic referral triggers with CLEAR / REFER verdicts and refer-to routing.
- Settings screen (`s`): sub-agent teams, model thinking, hard research limit —
  persisted to `settings.json` and shown on the research screen.
- Bring-your-own-LLM: any OpenAI-compatible endpoint via `app/.env`.
- Run logging to `app/runs/<ts>_<ticker>/` (trace.md, events.jsonl, proposal.json,
  worksheet.json).

### Fixed (during hardening)

- Silent hangs: AI SDK can leave a stream unsettled after retryable-error bursts;
  added stall watchdog + inner retry, per-researcher hard timeout, keep-alive disabled,
  synthesis switched from `streamObject` to the tool-call pattern (vLLM-friendly).
- Q15 "None — …" prose no longer false-triggers the US-securities referral.

### Known limitations

- Rating factors are illustrative, not actuarially derived.
- SGXNet blocks bots; some regulatory history relies on mirrors/press.
- Small open models may over-research; use more/smaller teams or the hard timer.
