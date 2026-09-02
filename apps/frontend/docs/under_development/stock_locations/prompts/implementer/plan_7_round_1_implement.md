---
plan: 7
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 7 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P7 of the stock-locations frontend build — the
third and last UI phase before the PDF work. You build exactly what the plan's acceptance
criteria require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_7_report_ui.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

The settings half of the feature is done and the owner has used it against the **real backend** —
the repo now contains both apps and the merge is complete (master plan §7A–§7C). This phase
builds the half the feature exists for: the report the user actually reads. Screens 01
(compacted), 02 (grouped), 03 (filter sheet) and 04 (entry detail).

**Almost none of this is your logic.** P2 owns compaction, ordering, filtering, re-quantification,
counters and entry detail; P4's report controller already composes them through `buildReportView`
and already fetches the GET 4.1 vocabulary alongside the report. Your job is to render what the
store hands you. The plan says it plainly: *the UI never sorts and never counts*. If you find
yourself reaching for `.sort()` or `.filter()` on report data, stop — that is a routed finding.

Two rows carry the weight:

- **C1's named mutation** — render `store.entries` instead of the composed `store.view` and the
  report lists every entry uncompacted and unsorted, with plausible-looking numbers and nothing
  erroring. That is the single most dangerous defect available in this phase.
- **C9** — the Settings *Stock report* row has been **dead since P5**: the row exists, P4's
  navigation call fires, and `HomeFeature`'s registry has no entry for `settings-stock-report`, so
  tapping it does nothing at all. P5's C1 passed while the row was dead, because it asserted the
  facade call rather than a rendered page. Close it, and assert the page.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**–**P6** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P7**'s **state cell** reads `PROMPT_READY` — not `IMPLEMENTING`, `IMPLEMENTED` or `APPROVED`. Read the state cell, not the whole row | `master_plan.md` §4 |
| G4 | `ui/StockReportPage.tsx` does not exist yet | `ls src/features/stock/ui/` |
| G5 | `domain/stock-report.domain.ts` exports `buildReportView`, `countPendingRows`, `computeCounterTiles`, `deriveEntryDetail`, `applyStockFilters`, `compareGroups` — you consume all of these | the file |
| G6 | `HomeFeature.tsx` has **no** `settings-stock-report` registry entry — that is C9's premise. If it already has one, C9 is satisfied differently and you must say so | `HomeFeature.tsx` |

All were re-tested against the committed tree at dispatch. **Do not gate on a clean working
tree.** The coordinator owns every tracker transition; **do not edit the tracker**.

## 3. Read order

1. `plans/plan_7_report_ui.md` — the phase, **including its Notes**, which carry this phase's
   main trap and a live-data caveat that affects what the owner will see
2. `master_plan.md` §3 (labor), §6 (UI registry; the report pipeline's three structural notes and
   "the report controller owns the `buildReportView` call"), §7C (**what the real backend actually
   returns** — casing, `mergeKey`, key order, all verified), §7D (visual polish is deferred), §9
   (**S2** allowlists, **S5** the visual gate, **S6** lint baseline, **S10** discriminating inputs)
3. `intention/raw_intention.md` §3 **W2**, §4A **MC2–MC5, MC9** (consume, do not reimplement),
   §4B **MC2a, MC3a**, §7 (**mockup corrections — read before the screenshots**), §9A **D4, D11,
   D12, D13**
4. `design_handoff/01-report-compacted/`, `02-report-grouped/`, `03-filter-sheet/`,
   `04-entry-detail/` — `.md` **and** screenshots; plus `00-global/00-global.md`
5. `context/design-language.md`, `context/frontend-architecture.md` §3
6. **The shipped P1–P6 code**, especially `ui/StockLocationsPage.tsx` and
   `ui/StockLocationDetailView.tsx` (idiom the owner has already accepted) and
   `controllers/stock-report.controller.ts` (what the store actually holds). Reality outranks
   every document above; a disagreement is a finding you report.

## 4. Things that are easy to get wrong here

- **Never sort, never count.** Order comes from `buildReportView`; counts from
  `countPendingRows` and `computeCounterTiles`; detail rows from `deriveEntryDetail`.
- **D13 is a deliberate asymmetry.** The counter tiles respect the **location** filter and ignore
  the **state** filter. This looks like a bug and is not; C5 asserts both directions.
- **D12 counts entries, not groups.** The filter CTA reads `Show N entries` where N is
  `countPendingRows` — in grouped mode that is the sum over groups, not the number of groups.
- **D4: screen 04 has no action buttons.** `Scanned items` and `Add task` were removed from the
  mockups; C6 asserts those strings appear nowhere.
- **No threshold numbers anywhere in the report area** (C8). Bands belong to settings.
- **A quantity-0 row is a real row** (C7) and must never be dropped as empty. Against the real
  backend this is currently the *common* case, not an edge case — every definition the owner has
  created sits at `quantity 0` / `out_of_stock` until something is scanned in.
- **The `Generate PDF` pill is a structurally-held stub** until P9. Ship it disabled and flagged,
  not wired.
- **S2 still applies**: no state name, order index or hex outside the state domain. The shipped
  `stock-allowlist.test.ts` guard must keep passing untouched.

## 5. The trap this phase is most likely to fall into

Six of these rows (C1–C6) compare something rendered against a domain function the test computes.
**That proves the call site, not the argument** — and proves nothing at all if the test seeds
state the user's own path never loads. Both sub-shapes have already shipped green in this project
(master plan **S10**): plan 4's C9 passed with the controller ignoring its vocabulary entirely, and
plan 5's C4 passed while screen 07 rendered wire casing to real users.

The plan's Notes list what each row's input must be able to discriminate. Read that list and build
fixtures to it. In particular **C1's fixture must have a composed order that differs from the raw
entry order** — otherwise a page rendering `store.entries` passes, which is precisely M1.

And do not seed options in a test helper to make chips render: the report controller loads the
vocabulary on its own path, so let it.

## 6. Named mutations — the protocol

The plan names **exactly 1**: **C1 / M1** — read `store.entries` instead of the composed
`store.view` at the report page's render site; C1 must red. Apply it, run, **observe C1 red**,
restore, re-run green.

A mutation that reds nothing is a **finding** — report it, and fix the criterion's input rather
than the production code. **Run the probe unfiltered** (whole suite, no `-t`) and report every row
it reddens.

**Absence rows ship with guard proofs.** C6's D4 guard, C7's never-dropped row and C8's
no-thresholds rule are all absence assertions: plant the thing each one forbids, record the red,
revert. P5 and P6 both did this well — four probes in P6 — and it is the reason their absence rows
mean anything.

## 7. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree.

**Baseline: 124 tests, 19 files, all passing. Typecheck clean.**
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
Required: **zero** problems in any file you create or touch. Do not fix unrelated files.

## 8. Hard constraints

- **Perimeter.** `src/features/stock/ui/StockReportPage.tsx`, `StockCounterTiles.tsx`, entry-row
  components (compact + grouped), `StockFilterSheet.tsx`, `StockEntryDetailView.tsx` (+ RTL
  tests), and — **narrowly authorized for C9 only** — `src/features/home/HomeFeature.tsx` and
  `src/features/home/lazy-pages.tsx` to register `settings-stock-report`.
- **Do not touch `stock-allowlist.test.ts`, the API layer, fixtures, or any P1–P6 domain, store,
  controller, flow, actions or UI file.** If one needs a change, **stop and report**. In
  particular: if the report store does not expose what a screen needs, that is a P4 finding, not
  an edit.
- **Do not touch `apps/backend/`.** It is in this repo now; it is not in this phase.
- **Enumerate, never sample** (charter rule 2). C5 wants both D13 directions; C6 wants both the
  multi- and single-location cases; C3 wants two toggles.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Every previous phase did this at least once, and every time it was right.

## 9. Closing

Handoff at `handoffs/implementer/handoff_plan_7_implement_1.md`, frontmatter `plan: 7`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the mutation and every absence-guard probe, with file, line,
received value and every row reddened → your full write perimeter → the closing L4 stamp with all
three numbers → anything you found and did not change.

**Because this phase ends at the owner's eyes:** say how to reach each of the four screens and
what to tap. Note that on the owner's real data every definition is currently `quantity 0` /
`out_of_stock`, so bands, counter tiles and group ranking will look degenerate until stock is
scanned in — say so plainly rather than letting it read as a bug.

**Visual polish is deferred** (§7D): the owner is collecting appearance changes for a single pass
after implementation. Get the screens genuinely close to the mockups, list what you approximated,
and do not round-trip on styling.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1–P6, no extra abstraction, no
hardening nobody asked for. If you notice something worth knowing, write it in the handoff rather
than fixing it.
