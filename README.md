# A.N.D.R.E.W

**A Narrative D&O Risk Evaluation Worksheet** — an AI-assisted Directors & Officers
underwriting agent for SGX-listed companies, built with Anapi Insurance Brokers.

ANDREW reads a listed company's public sources (annual reports, SGX announcements,
press), drafts the full D&O underwriting worksheet with citations, and prices the
policy through a deterministic rating engine — then a human underwriter reviews,
overrides, and signs off.

> Numbers in code, words in the model, judgement with the human.

## Quick start

```bash
cd app
npm install
npm run dev          # animated splash → search a stock → research → review → results
```

Configure your own LLM in `app/.env` (see [docs/README.md](docs/README.md#bring-your-own-llm)).

## What it does

1. **Search** any SGX-listed stock (live Yahoo Finance data) or pick a rehearsal name.
2. **Research** — parallel specialist sub-agents read annual reports / SGX filings and
   report cited findings (market & securities, financials, governance & audit,
   shareholding, adverse news & regulatory).
3. **Synthesise** — a lead underwriter merges findings into one cited proposal.
4. **Review & override** — you adjust modifiers and exclusions; the engine re-prices.
5. **Price & refer** — a deterministic engine (Tables A–E + ~38 referral triggers)
   produces the premium and a CLEAR / REFER verdict, with the formula waterfall shown.

## Docs

- [docs/README.md](docs/README.md) — overview, architecture, bring-your-own-LLM, settings
- [docs/ROADMAP.md](docs/ROADMAP.md) — where it's headed
- [docs/BACKLOG.md](docs/BACKLOG.md) — concrete backlog items
- [docs/RELEASES.md](docs/RELEASES.md) — version release notes

## Disclaimer

Illustrative rating logic, not actuarially derived and not a rate filing. Not investment,
legal, or underwriting advice. A human underwriter must always sign off.
