# Backlog

Concrete, ordered work items. See [ROADMAP.md](ROADMAP.md) for the higher-level direction.

## Bring-your-own-LLM config area (in-app)

- [x] Search-provider config in the settings screen: paste a Brave API key (masked
      edit), persisted to `settings.json` (gitignored), taking precedence over the
      `BRAVE_API_KEY` env var; the active backend shows on the settings + research
      screens. (Other providers' keys/models in-app are still open below.)
- [ ] A settings screen section for the **LLM** key / provider (OpenRouter,
      DashScope, OpenAI, local Ollama/vLLM/DGX) and model, stored to `settings.json`
      (keys to OS keychain where available), instead of editing `.env` by hand.
- [ ] Provider presets with sensible defaults (baseURL + recommended model).
- [ ] `check-model` runnable from the settings screen with a pass/fail indicator.

## Hard research timer under app configs

- [x] `researchLimitSec` setting (60–1800s) that caps each researcher; surfaced on the
      research screen.
- [ ] A *global* research-phase countdown (whole fan-out + synthesis) with a visible
      progress bar, separate from the per-researcher cap.
- [x] When the hard timer trips, auto-degrade gracefully: synthesize from whatever
      findings arrived instead of failing the run.

## Research quality

- [x] Make the governance/adverse team reliably submit (it over-researches on smaller
      models); "final warning" rescue injects once steps/timer are exhausted, forcing
      a best-effort report from the work already done instead of discarding the team.
- [ ] Cache annual-report PDF text per document+year so repeat runs are instant.
- [ ] SGX announcements via a dedicated parser (SGXNet blocks bots; use mirrors).

## Product

- [ ] Export the quotation as a broker-ready PDF/DOCX letter.
- [ ] Save/reload past underwrites; compare runs for the same company.
- [ ] Multi-company portfolio screen (screen a book, rank by referral risk).
