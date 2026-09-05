# Prompt Fight — D&O Underwriting Agent for the PLUS Session

*Working brief. Created 29 Aug 2026 from the organizer's email and the two files in this folder.*

---

## 1. What this is

An on-stage session at **PLUS** (Professional Liability Underwriting Society — a major event for Singapore-based liability insurers). The point: show senior insurance managers what AI can do for underwriters, using a short case study of an AI agent / prompt underwriting a sample D&O client.

Three presenters with indirect insurance background and deep AI experience are taking part. **Confirmed: it is a head-to-head "prompt-fight" — each presenter builds their own agent/prompt and they are compared on stage. Jensen is one of the three.**

**Session format** (from the email):

1. Insurers in the audience pick a client on the spot.
2. Each presenter runs their agent and shows the outcome.
3. Each presenter summarizes how they designed their agent, including high-level thoughts on **risks, issues, and costs**.
4. Short Q&A with the insurers.

The sender will most likely host the session.

## 2. Who is who

| Party | Role | Status |
|---|---|---|
| Organizer / sender | Provided the worksheet + guide; hosting the session | Named contact, not yet written down here |
| Jensen | One of the 3 prompt-fight presenters (the AI side) | Confirmed |
| Other 2 presenters | The other two prompt-fight competitors | Names / firms not yet written down |
| Insurers (audience) | Singapore liability insurers; pick the client on the spot; ask the Q&A | — |

## 3. Leveling assumptions — bake these into the agent

The organizer says everyone should assume:

1. **No claims** → Part 1: Q17 = 0, Q18 = No, Q19 = No. No loss run needed.
2. **New policy, no current coverage** → Q20 (expiring premium) = 0; rate-change reading not meaningful.
3. **Employee headcount = 200** (if it matters) → Risk Narrative "approximate number of employees" = 200, regardless of what the real figure is.
4. **Everything else comes from the insured's website** — a listed company must publish its FS there. So the agent's input is *public research*, not a broker submission: annual report (3 years of assets/liabilities/revenue/net profit, audit opinion), share price / 12-month chart, shareholding structure, board composition, SGX announcements.

These assumptions remove the entire "claims and insurance history" dimension (modifier 5 gets the clean-history credit territory) and make the research step the core of the agent.

## 4. Folder inventory

| File | What it is |
|---|---|
| `How_to_use_the_DO_Worksheet.md` | Beginner's guide to the worksheet: what D&O (Side A/B/C) actually covers, how to fill every part, the discipline rules, ten common mistakes, glossary. Read once, ~15 min. |
| `DO_Worksheet_SGX_Simple.xlsx` | The underwriting sheet itself. Fill yellow cells only; grey is calculated. Contains a full worked example for a fictional company. |

### Worksheet structure (what the agent must produce)

- **Risk Narrative tab** (complete FIRST) — four sections: company overview; risk & adverse information (negative news, regulatory actions, class actions) + a **litigation exposure** call; 3-year financial analysis + **financial strength** call; governance/management table (chairman, CEO, CFO, AC chair, lead ID — tenure + capital-markets / finance / legal experience) + **management strength** and **governance concern** calls.
  - Rule: **"None identified" is a finding; a blank box is not.** Record where and when you looked.
  - The four dropdowns are cross-checked against the modifiers — contradictions fire referral triggers.
- **Part 1 — 20 questions** in six groups: size/market exposure (Q1–4), financial condition (Q5–7), governance & audit (Q8–12), regulatory & capital markets (Q13–16), claims & insurance history (Q17–19), expiring programme (Q20). Every question feeds a modifier or a referral trigger.
- **Part 2 — structure**: limit (Table B), retention (Table C), hazard class (Table D — classify on what the company *does*, not its label). Base loss cost comes from Table A by market-cap band.
- **Part 3 — five modifiers**, each with a stated range, start at 1.00, must cite a Part 1 fact: financial strength; governance & ownership; share price & float; regulatory/geography/transactions; claims history. Composite = product, floored 0.50 / capped 3.50, referral band 0.70–2.00.
- **Part 4 — coverage terms**: suggested sublimits (investigation costs = 25% of limit is the most-used extension in Asia) and risk-specific exclusions keyed to Q answers (major shareholder >15%, specific matter, IPT, etc.). Coverage-terms factor = 1 + sum of effects, floored 0.70 / capped 1.30. Never apply an exclusion to hit a price.
- **Part 5 — price**: technical loss cost × (1/permissible loss ratio 55%) = technical premium × market adjustment × participation. Sense-check premium per S$1m against similar SGX risks.
- **Part 6 — referral check**: ~40 automatic triggers; status line is either "clear to quote" or REFER to a named person. Clear to quote ≠ quote it.
- **Factors tab** — the rating tables (Tables A–E). This is the deterministic pricing engine; treat it as ground truth and don't touch it.

## 5. The worked example (calibration target)

The sheet ships filled in for fictional **Marina Logistics Holdings Ltd** (SGX M42, Mainboard, ports & logistics):

- Market cap S$680m → base loss cost S$25,000 (Table A band 500–1,000); S$10m limit; SGD 250k retention; Hazard Class 2.
- Modifiers: 1.05 / 1.10 / 1.10 / 1.10 / 0.95 → composite 1.33. Coverage-terms factor 0.88 (three exclusions applied: major shareholder, specific matter, IPT).
- Result: technical premium **S$52,805** (S$5,281 per S$1m), rate change −4% vs S$55k expiring, referral status **clear to quote**.

Use it as the smoke test: the agent's output on this company should land on the same numbers, because all inputs are already given.

## 6. Build plan (proposed default — confirm at the meetup)

**Target scope (recommended):** end-to-end — research the company → Risk Narrative → Part 1 → Parts 2–5 → Part 6 referral check → a quotable worksheet plus a written rationale. **Framing: "the agent underwrites, the human governs."**

Why full end-to-end rather than human-judgement-live:
- With ~12–15 minutes per presenter, doing the judgement parts manually on stage spends half the slot operating a spreadsheet — what the audience already does.
- It delivers the story insurers already believe (AI = research assistant). The organizer explicitly wants "a different perspective on how to use AI that the insurance industry in Singapore might not be aware about."
- In a three-way prompt fight it is the least ambitious entry.

Why not pure unattended automation:
- Senior underwriters spot a bad judgement call on a company they know within seconds; one wrong modifier can sink the whole premise. A wrong fact is forgivable, a wrong judgement is not.
- Pure automation invites the "you're saying AI replaces us" defensiveness — the wrong frame for this crowd.

The shape that gets both the wow and the credibility:
1. Agent produces the complete worksheet end-to-end, every modifier carrying a one-sentence rationale and the Part 1 fact that drove it (the sheet's own rule).
2. Agent runs the sheet's own governance on itself — the ~40 Part 6 referral triggers and the narrative-vs-modifier contradiction checks. When something fires it says REFER and explains why instead of bluffing a number. Self-referral is presented as a feature: the agent knows when it doesn't know.
3. Jensen's judgement minutes are spent in visible **adversarial review**, not in filling cells: checking the cited facts, pushing back where the agent got it subtly wrong, walking the exclusions it applied. Human oversight becomes a governance demonstration, not a crutch.
4. Graceful degradation: if the picked client has thin public data, the agent completes what it can, marks gaps, and refers — "a worksheet full of guesses is worse than no number." Rehearsed fallback company on standby if the live run fails or runs slow.

Build implications: modifier outputs carry value + rationale + source; exclusions follow the deterministic Q→recommendation mapping, never applied to hit a price; referral logic is code, not LLM opinion.

### Time budget (the session is 1 hour total)

Three presenters + host + Q&A means roughly **12–15 minutes per presenter**, something like: ~1 min framing your approach → **5–6 min agent run** (show progress and sources, not a spinner) → ~3 min walking the output (premium, referral status, two or three judgement calls) → ~3 min design + risks/issues/costs. Implication for the build: **the agent must complete a full run in under 6 minutes.** That means parallel research (annual report, share price, shareholding, SGX announcements fetched concurrently) and pre-baked factor tables. If live research on the picked client is too slow or thin, fall back to a rehearsed company so the demo still lands.

**Design split:**

- **Deterministic, in code — never in the LLM:** the Factors-table lookups, modifier multiplication, coverage-terms factor, premium math, referral-trigger evaluation. The sheet already does all of this; the agent's job is to fill yellow cells correctly, then read back Part 5/6.
- **LLM, with citations:** public research (SGXNet, company IR page, annual report, share-price data, press); drafting the narrative sections (with sources + dates checked); proposing each modifier with the specific Part 1 fact that justifies the move; recommending exclusions per the sheet's own logic; writing the "why this premium" summary.
- **Output contract:** every produced value maps 1:1 to a named yellow cell, so the result can be pasted straight into the sheet and Part 6 can arbitrate. Percentages must be entered in percent form (−18%, not −0.18).
- **Discipline to encode:** don't stack the same fact under two modifiers; don't let narrative dropdowns contradict modifiers; record search provenance ("None identified" needs where/when); if the number surprises you, don't send it.

**Testing:**

1. Smoke test on the Marina Logistics worked example — must reproduce ≈ S$52,805 / clear to quote.
2. Rehearse on real SGX-listed companies, since insurers will pick a real client and FS must be publicly available. Proposed shortlist (candidates — verify data availability and current status; hazard classes are our own calls to sanity-check):
   - **Class 2 baseline:** ComfortDelGro (C52) — transport, stable, large-ish cap.
   - **Class 3:** City Developments Ltd or UOL Group — property developer, cyclical estimate-heavy accounting.
   - **Class 4 stress:** Seatrium (5E2) — offshore/marine with a known 2024 CAD investigation into fake invoices; exercises Q14, the referral path, and how the agent handles adverse history.
   - **Class 1 cheap end:** CapitaLand Integrated Commercial Trust (C38U) — REIT, the low-drama floor case.
3. Edge cases to rehearse: company with US exposure (Q15 refers), recent IPO/RTO (Q16 refers), dominant >30% shareholder, hazard Class 4 tech company, a company that just fell 30%+ on a profit warning (pick whichever name has fallen hard at rehearsal time for modifier 3).

**Stage risks to have answers for (the email asks for risks/issues/costs):**

- Hallucinated facts about a real issuer — mitigate with source citations + the deterministic referral net.
- Data availability: FS, shareholding and board data are public but messy; the agent must fail loudly, not guess ("a worksheet filled with guesses produces a confident-looking number that is wrong").
- Costs: research calls, model spend per run, and the human-review time the referral check still requires.

## 7. Logistics & timeline

- **Meetup next week** to go through details: organizer is good for lunchtimes Mon–Thu (not Fri) or evenings except Tuesday — Google Meet or in person (drinks offered). Today is Fri 29 Aug 2026 → Mon 31 Aug – Thu 3 Sep lunches, or Mon/Wed/Thu evenings. **Jensen will settle the slot directly with the organizer.**
- Prep (agent design) is expected **before** the event; the session itself is mostly running the agent and talking through the process and output.
- PLUS event registration form — Jensen has the email from PLUS; confirm it's filled in.

## 8. Open questions

1. **Agent scope:** proposed full end-to-end (see §6) — to be discussed at the meetup / with the organizer.
2. **One client or three:** do all three agents run on the *same* insurer-picked client (cleanest comparison), or does each presenter get their own pick? Worth confirming with the organizer.
3. **Rehearsal shortlist:** the four candidates in §6 need a data-availability check before committing.
4. **Worksheet delivery format on the day:** does the insurer pick a real SGX company (agent researches it live) or hand over a proposal form? The email says "pick a client on the spot" — likely live research, worth confirming.
