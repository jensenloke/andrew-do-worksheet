# How to fill in the D&O worksheet and arrive at a premium

*A guide for someone who has never underwritten before. Read this once before your first submission. It takes about fifteen minutes.*

---

## 1. What you are actually insuring

A Directors and Officers policy pays when someone sues the **people who run a company** — or sues the company itself over its shares — and it pays their legal defence costs, which is usually the largest part of the bill.

It has three parts, and you will see them referred to constantly:

- **Side A** — pays the director personally, when the company cannot or will not indemnify them. This is the part that matters when the company is insolvent or when the company itself is the one suing the director. It carries **no retention**: the director pays nothing before cover starts.
- **Side B** — reimburses the *company* for money it has properly spent indemnifying its directors. The retention bites here.
- **Side C** — covers the *company itself* for claims about its securities. This is the part that responds to a shareholder action after the share price falls.

Almost everything in the worksheet is about one question: **how likely is it that this company's share price falls sharply, or that a regulator comes knocking, and how expensive would the resulting fight be?**

## 2. What you need before you start

Do not open the spreadsheet until you have:

1. The **broker submission** and completed proposal form.
2. The **last three annual reports** — you need the audit opinion and the balance sheet.
3. A **share price chart** for the last twelve months.
4. The **loss run**: a statement of D&O claims and notifications for the last five years.
5. The **expiring policy schedule**, if it is a renewal.

If any of these is missing, ask the broker. Do not estimate. A worksheet filled with guesses produces a confident-looking number that is wrong, which is worse than no number at all.

## 3. The colour code

| Colour | Meaning |
|---|---|
| **Yellow cell, blue text** | You type or select here |
| **Grey cell** | The sheet calculates it — do not overwrite |
| **Blue cell, bold** | A key calculated output |
| **Yellow cell, red text** | The final premium, and the referral status |

If you ever find yourself typing into a grey cell, stop. You are about to break the sheet.

---

## 4. Working through it

### The Risk Narrative tab — do this first

Numbers tell you *how much*. The narrative tells you *whether you want the risk at all*. Fill this tab before you touch the pricing sheet, in four sections:

1. **Company overview** — what the business actually does, its segments, where its assets are, when it listed.
2. **Risk and adverse information** — negative news over the last three to five years, regulatory actions and investigations, class actions and shareholder disputes. Then a **litigation exposure** call: Low, Moderate or High.
3. **Financial analysis** — total assets, total liabilities, revenue and net profit for three years. Equity, leverage and margin calculate themselves. Then trend commentary, red flags, and an **overall financial strength** call.
4. **Governance and management** — the chairman, CEO, CFO, audit committee chair and lead independent director, with tenure and whether each has capital markets, finance/accounting and legal/regulatory experience. Then a **management strength** and a **governance concern** call.

Two habits:

> **"None identified" is a finding. A blank box is not.** Write where you looked and on what date — SGXNet, the business press, regulator registers. An empty box means the work was not done, and the sheet will refer it.

> **The four assessment dropdowns are cross-checked against your modifiers.** If you assess financial strength as Weak but give modifier 1 a credit, or call litigation exposure High but leave modifier 4 below 1.20, a CONTRADICTION trigger fires. Resolve the disagreement — do not just overwrite one side to silence it. Usually the narrative is right and the modifier was lazy.

The tab also checks the arithmetic against Part 1: if the three-year profit history you enter disagrees with your answer to Q6, or if liabilities exceed assets, it says so.

### Part 1 — the 20 questions

Answer them in order. Every one either feeds a modifier in Part 3, or fires a referral in Part 6 — the "Feeds" column tells you which. Notes on the ones people get wrong:

**Q1 Market capitalisation.** Shares in issue × current share price. Not total assets, not revenue, not the value at IPO. This single number sets the base cost, so get it right and note the date you took it.

**Q3 Share price movement.** Enter as a negative for a fall: an 18% decline is `-18%`. This is the most predictive question on the sheet.

> **Type the percent sign.** Percentage cells are a trap in both directions: type `18` and Excel may read it as 1800%, while `0.18` may come out as 0.18%. Always type `-18%` in full, then look at what the cell displays. Part 6 now flags impossible percentages, but it cannot catch 30% typed where you meant 40%.

**Q4 Assets or revenue outside Singapore.** Whichever is higher. A company listed here but operating entirely elsewhere is harder to investigate and harder to recover from.

**Q5 Net gearing.** (Total borrowings − cash) ÷ shareholders' equity. If equity is negative, do not try to compute it — write 999 and refer immediately.

**Q9 Largest shareholder.** The biggest single holder, including a family or holding company acting together. This drives two exclusion recommendations later.

**Q17 Claims.** Count notifications, not just paid claims. A notification is someone telling the insurer that something *might* become a claim. Underwriters care about both.

**Q20 Expiring premium.** This must be **like-for-like**. If we wrote half the limit last year and are being asked for all of it this year, the two numbers are not comparable — gross the expiring figure up before entering it, or the rate-change reading is meaningless.

### Part 2 — the structure

Three dropdowns: how much cover, how much the company pays before we do, and what kind of business it is.

**Hazard class** is the one that needs thought. Classify on what the company *actually does*, not what it calls itself. A "technology" company whose earnings come from selling apartments is a property developer — Class 3, not Class 4.

### Part 3 — the five modifiers

This is the judgement part, and it is where new underwriters go wrong. The discipline is simple:

> **Start every modifier at 1.00. Move it only when you can point at a specific fact in Part 1. Then write down the fact.**

1.00 means "typical for a company like this". It does not mean "I don't know" — if you do not know, go back to the broker.

A worked example, for modifier 2 (governance and ownership):

- Board is 50% independent, not a majority → mild debit
- Chairman and CEO are separate people → good, offsets some of it
- One shareholder holds 38% and transacts with the company → material debit
- Auditor unchanged, Big Four, no restatement → credit
- **Net: 1.10.** Not 1.35 — nothing here is alarming, it is just not best-in-class.

Two habits worth forming early:

- **Do not stack the same fact twice.** A share price fall caused by a profit warning is one event. Debit it under modifier 3 *or* modifier 1, not fully under both, or you will double-charge.
- **Watch the multiplication.** Five modifiers of 1.20 each look modest individually but multiply to 2.49 — you have just charged two and a half times the base rate. Look at the composite before you accept it.

The sheet shows both the raw product and the applied figure. If they differ, a floor or cap has bitten and the risk is outside normal appetite.

### Part 4 — sublimits and exclusions

**Sublimits** are caps inside the limit. If the limit is S$10m and investigation costs are sublimited to S$2.5m, the insured has S$10m in total, of which no more than S$2.5m can be spent on investigations. The sheet suggests a level for each; you enter what was actually agreed. Agreeing *more* than the suggestion fires a referral.

**Exclusions** are the things the policy does not cover. The sheet reads your Part 1 answers and recommends the risk-specific ones. If it says "Apply" and you have set it to "No", Part 6 will catch you — that is deliberate.

The rule that matters most:

> **Decide the cover first, then look at the price. Never apply an exclusion because you want a cheaper number.**

An exclusion is a promise withdrawn from a customer. It has to be justified by the risk, and it has to appear in the quotation you send the broker. A restriction the broker only discovers at binding is a complaint, and sometimes a regulatory problem.

### Part 5 — the price

Read this part rather than filling it in. Only three cells are yours:

- **Permissible loss ratio** — leave at 55% unless told otherwise. It is what remains after brokerage, expenses and profit margin, and it converts a loss cost into a premium.
- **Market adjustment factor** — start at 1.00. Move it only with evidence, such as written competing terms. Outside 0.95–1.05 it refers.
- **Our participation** — 100% if we are writing the whole limit.

One idea to hold on to: the sheet works in **loss cost** first — the expected claims bill — and only converts to premium at the end. That is why the base figure looks too small to be a premium. It is not a premium yet.

### Part 6 — the referral check

Everything here calculates itself. Read the status line at the bottom.

**"Clear to quote"** does not mean "quote it". It means nothing has tripped a rule. You still have to believe the number.

**"REFER"** means stop. Take the sheet to whoever is named in the "Refer to" column and talk it through. Referral is not a mark against you — it is the system working. The mistake that gets people into trouble is quoting first and referring afterwards.

---

## 5. Before you send the quote

Five checks, every time:

1. Every yellow cell is filled.
2. The referral status is clear, or the referral has been signed off in writing.
3. You can explain every modifier above 1.10 or below 0.90 in one sentence each.
4. The "premium per S$1m" is in the same range as other SGX risks of similar size and sector you have seen. If it is double or half, find out why before quoting.
5. Every exclusion and sublimit from Part 4 is written into the quotation.

**If the number surprises you, do not send it.** Work out why first. An underwriter who cannot explain their own price has not underwritten anything — they have operated a spreadsheet.

---

## 6. Ten mistakes beginners make

1. Using total assets or revenue instead of market capitalisation in Q1.
2. Entering a share price fall as a positive number.
3. Leaving a modifier blank — the sheet now catches this, but check anyway.
4. Debiting the same fact under three different modifiers.
5. Treating 1.00 as "no information" rather than "typical".
6. Comparing our 50% share premium to the whole expiring programme premium.
7. Applying an exclusion to hit a target price.
8. Quoting a sublimit in the working file but forgetting it in the quotation letter.
9. Accepting a loss run summarised by the broker instead of the insurer's own statement.
10. Ignoring the referral status because "it is only a small risk".

## 7. Glossary

| Term | Meaning |
|---|---|
| **Retention** | What the insured pays before cover starts. Called a deductible in other classes. |
| **Loss cost** | The expected claims bill, before expenses and profit are added. |
| **Permissible loss ratio** | The share of premium available to pay claims. 55% means 45% goes to brokerage, expenses and margin. |
| **Increased limit factor (ILF)** | How much more a bigger limit costs. Doubling the limit never doubles the price. |
| **Side A / B / C** | Cover for the director personally / the company's reimbursement / the company's own securities claims. |
| **POSI** | Public Offering of Securities Insurance — a separate policy for prospectus liability. |
| **Notification** | Telling the insurer of something that might become a claim. |
| **Run-off** | Cover continuing after a policy ends, for acts committed before it ended. |
| **IPT** | Interested Person Transaction — an SGX term for a deal between the listed company and a controlling shareholder or their associates. |
| **Rate on line** | Premium divided by limit — a quick comparison measure. |

---

*The numbers in the worksheet are illustrative and built on conventional D&O rating logic. They are not actuarially derived. Before live use, the Factors tab must be replaced with your actuary's indicated rates and the Part 4 percentages agreed with your wordings team.*
