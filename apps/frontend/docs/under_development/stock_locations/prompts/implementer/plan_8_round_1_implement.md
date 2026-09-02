---
plan: 8
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 8 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P8 of the stock-locations frontend build. You build
exactly what the plan's acceptance criteria require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_8_pdf_assembly.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

All three UI phases are approved and the feature runs against the real backend. What remains is
the PDF. This phase builds **everything about it that is not visual**: the document data model,
the filename, the export-sheet state, and the delivery mechanics. P9 builds the react-pdf
document and the sheet UI on top of what you produce.

**Keep react-pdf out of your production files** — only the *type* of the render handle may
reference it. The heavy chunk belongs to P9.

Two rows carry the weight:

- **C5's named mutation.** The export sheet's state must be a **copy** of the active report query.
  Hand out the query itself and toggling anything in the export sheet silently rewrites the report
  the user is looking at behind it — no error, just different numbers than a moment ago. Note the
  plan's addition: assert the `states` and `locations` **Sets** too, because a shallow copy aliases
  them and a location toggle still reaches through.
- **C7(c), the cancelled share.** `navigator.share` **rejects when the user dismisses the share
  sheet**. That is not a failure and must not surface as an error, nor silently fall back to a
  download the user did not ask for.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**–**P7** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P8**'s **state cell** reads `PROMPT_READY` | `master_plan.md` §4 |
| G4 | `domain/stock-pdf.domain.ts` does not exist yet | `ls src/features/stock/domain/` |
| G5 | `domain/stock-report.domain.ts` exports `compactEntries`, `makeCompactRowComparator`, `applyStockFilters`, `computeCounterTiles` — C2/C3 consume them | the file |
| G6 | `@react-pdf/renderer` is in `package.json` dependencies (P9 needs it; you only type against it) | `package.json` |

**Do not gate on a clean working tree** — see §3 below, and `package.json`/`package-lock.json` are
legitimately dirty here. The coordinator owns every tracker transition; **do not edit the tracker**.

## 3. You may be sharing this working tree

The owner has been making a parallel stream of **visual changes** to the stock UI, and intended to
commit them before this phase runs — but verify rather than assume. Run `git status` at the start
and record what is already dirty. If foreign changes are present:

- **Stage explicit paths only. Never `git add -A`** (master plan **S11**, written after the
  coordinator swept a live session's files into an unrelated commit).
- Record the digest of the foreign diff at your stamp, as P7 did, so your numbers are attributable.
- **Never `git checkout` a file you did not write** to undo a probe — restore from a byte copy you
  made yourself. A `git checkout` on a file the owner is editing destroys their work permanently.
- Attribute probe reds per test file, and say plainly if anything red falls outside your own files.

Your perimeter is domain, controller, store and actions — the owner's stream is UI — so overlap
should be nil. Report it if it is not.

## 4. Read order

1. `plans/plan_8_pdf_assembly.md` — the phase, **including its Notes**, which carry the S10
   discrimination list, a fonts note for P9, and an instruction to measure your own baseline
2. `master_plan.md` §6 (Domain: `stock-pdf`; the Fonts note; the report pipeline's structural
   notes), §7C (**what the real backend returns**), §9 (**S2**, **S6** lint baseline, **S10**
   discriminating inputs, **S11** staging)
3. `intention/raw_intention.md` §3 **W3**, §4A **MC10** (the document model — this is the phase's
   specification), §8 **M6**, §4B **MC2a**
4. `context/pdf-library.md` — **Delivery mechanics**, which is where the share/download contract
   lives
5. `design_handoff/10-pdf-a4/10-pdf-a4.md` — sections and settings-box **content only**; the
   layout is P9's
6. **The shipped P1–P7 code**, especially `domain/stock-report.domain.ts` (you compose its
   functions, never reimplement them) and `controllers/stock-report.controller.ts` +
   `stores/stock-report.store.ts`, which you extend. Reality outranks every document above.

## 5. Things that are easy to get wrong here

- **Compose, never reimplement.** Section rows come from `compactEntries` +
  `makeCompactRowComparator`; counts from the same functions the app uses. A second ordering or
  counting implementation here is exactly the defect MC2a's single-owner rule exists to prevent.
- **`produce first` marks the first *non-empty* section**, not the first section. C1's second case
  exists to prove it moves.
- **Sections skip empties**, and the state order is MC1's, taken from the state domain — **no state
  names, order indices or hexes outside the state domain** (S2; the shipped
  `stock-allowlist.test.ts` must keep passing untouched).
- **The filename uses the user-local date**, not UTC. A `Date` at 23:30 local on the 1st must not
  render the 2nd. Zero-pad month and day (C6).
- **The source line's entry count is derived from the model**, not passed in and not the raw
  fixture length (C4).
- **`navigator.share` needs a feature check**, and `canShare({files})` is the honest one where
  available — a browser can expose `share` and still refuse files.

## 6. The trap this phase is most likely to fall into

C1–C4 each compare the model against a domain function or a count the test computes. **That proves
the call site, not the argument** — the shape recorded as **S10**, which has now shipped green
three times in this project (plan 4's C9, plan 5's C4, and plan 7 caught it only because the plan
named it). The plan's Notes list what each row's fixture must be able to discriminate. Build to
that list, and where a row's input cannot tell right from wrong, fix the input rather than the
assertion.

## 7. Named mutations — the protocol

The plan names **exactly 1**: **C5 / M1** — at the export-state initializer, hand out the report
query itself instead of a copy; C5 must red. Apply it, run, **observe C5 red**, restore, re-run
green.

A mutation that reds nothing is a **finding** — report it and fix the criterion's input. **Run the
probe unfiltered** (whole suite, no `-t`) and report every row it reddens.

**Absence and branch rows ship with proofs.** C7 has three branches; exercise all three. The
recent UI phases planted guard probes for every absence assertion and it is the reason their rows
mean anything — do the same for C7(c): prove the cancelled-share path fails if it is not handled.

## 8. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree.

**Measure the baseline yourself.** At P7's approval it was 21 files / 133 tests, typecheck clean —
but the owner's visual stream lands between then and now, so that number will have moved. Record
the baseline you actually observe and the delta you cause.
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
Required: **zero** problems in any file you create or touch. Do not fix unrelated files.

## 9. Hard constraints

- **Perimeter.** `src/features/stock/domain/stock-pdf.domain.ts` (+ test), and — **narrowly
  authorized, additive only** — `controllers/stock-report.controller.ts` (the export slice),
  `stores/stock-report.store.ts` (export sub-state) and `actions/stock.actions.ts` (facade keys).
  **Do not change existing behavior in those three**: P4's criteria and P7's C1–C8 are proven
  against them and must keep passing. If existing behavior needs to change, **stop and report**.
- **No react-pdf import in production files** except the render handle's type.
- **Do not touch** `stock-allowlist.test.ts`, the api layer, fixtures, any P1–P7 UI file, or
  `apps/backend/`.
- **Enumerate, never sample** (charter rule 2). C1 wants both section cases; C3 wants the filtered
  and the grouped case; C7 wants all three delivery branches.
- The page-count read-back is **structurally held** until P9's document exists — ship the interface,
  flag it, do not fake a number.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Every previous phase did this at least once, and every time it was right.

## 10. Closing

Handoff at `handoffs/implementer/handoff_plan_8_implement_1.md`, frontmatter `plan: 8`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each row
naming the test that proves it → the mutation and every guard probe, with file, line, received
value and every row reddened → your full write perimeter, plus any foreign diff present at your
stamp → the closing L4 stamp with the baseline you measured and all three numbers → anything you
found and did not change.

**This phase has no owner visual gate** — it is coordinator consumption (§3A). What the owner needs
from you instead is a plain statement of what the PDF will contain and what P9 still has to supply.

Commit your own checkpoint(s) with **explicit paths**; the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1–P7, no extra abstraction, no
hardening nobody asked for. If you notice something worth knowing, write it in the handoff rather
than fixing it.
