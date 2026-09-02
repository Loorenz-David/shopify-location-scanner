# Plan 7 — Report UI: screens 01–04

**Implementer:** Claude (UI phase; owner visual gate) · **Depends on:** P6 APPROVED

## Goal
The report area: compacted list (01), grouped list (02), filter sheet (03), entry
detail (04). NOT here: PDF sheet/document (P8/P9); any domain/store change.

## Read first
Master plan §3, §6 · intention §3 W2 (action-row removal D4!), §4A MC2–MC5, MC9
(consume only) · design `01-…`–`04-…` folders (md + screenshots).

## Files expected to change
`src/features/stock/ui/`: `StockReportPage.tsx`, `StockCounterTiles.tsx`, entry-row
components (compact + grouped variants), `StockFilterSheet.tsx`,
`StockEntryDetailView.tsx` (+ RTL tests) · shell registration of
`settings-stock-report` (if not already from P5's lazy-pages edit).

## Tasks
1. Screen 01: header + scope subtitle, segmented `Compact | By location`, filter pill
   (badge per MC5), counter tiles, compacted rows (thumbnail placeholder, chips,
   quantity + unit/units, state-tinted bar with location codes), floating
   `Generate PDF` (opens P9's sheet — until P9, a disabled stub flagged
   `structurally held: enabled when P9 lands`).
2. Screen 02: group headers (code, hairline, `n to fix` badge tinted by group's worst
   state), compact-variant rows (solid rail, right-aligned qty + state label).
3. Screen 03: bottom sheet over dimmed report — state rows with dots/counts,
   location chips (`All` + per-location), group toggle, Reset, live CTA.
4. Screen 04: header card (chips, state tile, total), contributing-location rows,
   conditional info note, **no action buttons** (D4).
5. All data through the report store/selectors; ordering/counters arrive
   pre-computed from P2 functions — the UI never sorts or counts.

## Acceptance criteria (RTL)
| id | criterion | trace |
|---|---|---|
| C1 | Compacted list renders rows in exactly the order `compareCompactRows` yields for the fixture (assert full rendered order equals domain-computed order — computed both sides). **The fixture must be one whose composed order differs from the store's raw entry order**, or a page that renders `entries` instead of `view` passes (S10). **Named mutation M1:** at the report page's render site, read `store.entries` instead of the composed `store.view` → this row reds. Without it the report lists every entry uncompacted and unsorted, with plausible-looking numbers and nothing erroring. | MC2, M2 |
| C2 | Segmented switch to By-location renders groups in `compareGroups` order with `n to fix` = the group's out+low+medium count, badge tinted by its worst state's meta. | MC3, MC1, M2 |
| C3 | Filter sheet: toggling a state updates the CTA to `Show N entries` where N = `countPendingRows` of the pending selection (two toggles asserted); Apply renders exactly N rows; Reset restores defaults. | MC5, M2 |
| C4 | Location chips: selecting `L1` in compact mode shows quantities recomputed to L1 contributions (one fixture row asserted against `applyStockFilters` output). | MC5, M2 |
| C5 | Counter tiles show Out/Low/Medium/Rest from `computeCounterTiles` (state filter active does not change them; location filter does — one case each, D13). | MC5, M2 |
| C6 | Entry-detail: tapping a row opens detail with the row's chips, state tile and total; contributing rows match `deriveEntryDetail`; info note present for the multi-location fixture, absent for single-location; the strings `Scanned items` and `Add task` appear nowhere (D4 guard). | MC9, M2 |
| C7 | A quantity-0 row renders (OUT badge) and is never dropped as empty (v1.2 notice). | M2A, M2 |
| C8 | No threshold numbers anywhere in the report area (assert absence of band labels in 01/02/04 renders — design rule). | M2 |
| C9 | **The Settings `Stock report` row reaches a rendered page.** P5 shipped the row and P4 the navigation call, but `settings-stock-report` has **no entry in `HomeFeature`'s registry** — verified on the tree 2026-09-02 — so tapping it currently does nothing at all and nothing errors. Assert that selecting it renders the report page's own heading, not merely that the facade was called (P5's C1 already proves the call, and proved it while the row was dead). | M2 (enabler for W2) |

## Notes
Owner visual pass against `01–04.png` (S5). Tab bar visible on 01/02 (plain page);
03 sheet + 04 pushed view hide it. Refine at prompt time.

**Mutation count 1** — C1 (M1, the report page's render site).

**S10 governs six of these rows** *(coordinator lint, 2026-09-02)*. C1–C6 each compare something
rendered against a domain function the test computes. That proves the call site and says nothing
about the argument unless a wrong argument changes the output, and it says nothing at all if the
test seeds state the user's own path never loads — the two sub-shapes recorded in master plan
**S10**, both of which shipped green in earlier phases. Concretely, each row needs an input that
can tell right from wrong:
- **C1** — composed order must differ from raw entry order (see the row).
- **C2** — at least two groups whose `out+low+medium` counts differ, and whose worst states differ,
  or the ranking and the badge tint prove nothing.
- **C3** — two toggles that yield *different* N; a toggle that changes no count is not a test.
- **C4** — a row with contributions from more than one location, so re-quantification is visible.
- **C5** — D13 needs both directions: a state filter that leaves the tiles alone **and** a location
  filter that moves them. Same-numbers-either-way fixtures prove neither.
- **C6** — the multi-location and single-location cases must be different rows, not the same row
  filtered.

**The vocabulary must be loaded by this screen's own path.** The report controller already fetches
GET 4.1 options alongside the report (plan 4 C9), so this is satisfied — but do not seed options in
a test helper to make chips render. That is exactly how P5's casing defect stayed green (S10, and
plan 5's `C4(cold)`).

**Live data note** *(2026-09-02)*: against the real backend every definition currently sits at
`quantity 0` / `out_of_stock`, so the owner's visual pass will show no bands, degenerate counter
tiles and no meaningful group ranking until something is scanned in (§7C). C7's quantity-0 row is
therefore the *common* case on a fresh install, not an edge case.

## Review log
- **2026-09-02 · round 1 consumption · coordinator · APPROVED.** The owner's visual pass is this
  phase's gate (S5) and the owner has accepted it; polish is deferred to the single later pass
  (§7D). No independent review session ran (§3A).

  Verified by hand: the checkpoint perimeter is exactly the declared 11 files (7 created, 2
  modified under C9's authorization, 2 documents); tracker, allowlist, api, fixtures and every
  P1–P6 domain/store/controller/flow/actions/UI file untouched. Stamp re-ran green — 21 files /
  133 tests, typecheck clean, lint unchanged at 48/14, and 0 problems across all five new
  components plus `HomeFeature.tsx`. All 9 test names enumerated with no orphans and every
  criterion C1–C9 present.

  **C1's named mutation re-planted unfiltered** (render `store.entries` instead of the composed
  `store.view`): reddened **C1–C8**, 8 failed / 125 passed — the same blast radius the handoff
  reported, confirmed independently. The seven guard proofs and S10 argument probes are recorded
  with their reds, including two the plan did not require (P4: tiles counted from the visible view
  instead of the store's; P5: the CTA counting the applied rather than the pending filter).

  **The coordinator's own adversarial probe closed the loop on C9.** Deleting the
  `settings-stock-report` entry from `HomeFeature`'s registry — reproducing the defect P5 shipped —
  reds `C9` and only `C9`. That is the probe P5's C1 could not have caught, because it asserted the
  facade call rather than a rendered page. The dead-row class is now guarded by a criterion that
  fails for the right reason.

  **This round ran on a shared working tree** and handled it correctly. The owner was making
  visual-polish changes in parallel throughout; the session staged explicit paths (**S11**), kept
  its checkpoint free of that diff, recorded the digest of the foreign changes at its stamp, and
  attributed every probe red per test file. It also portaled the filter sheet to `document.body`
  after one of those edits (`.stock-area-font { z-index: 0 }`) pushed it under the tab bar — a fix
  correct on either tree. The coordinator likewise touched only files outside the owner's dirty
  set, restored from byte copies rather than `git checkout`, and verified the owner's uncommitted
  work intact afterwards.

  Findings routed, none blocking: the **candidate P2 gap** — `n to fix` is not precomputed, so the
  UI sums buckets that `compareGroups` already derives internally; exposing the three counts on
  `ReportLocationGroup` would remove the duplication, recorded for whoever revisits the report
  domain rather than actioned here. The tab bar on screen 04 joins §7D's polish list. And **the
  backend returns report entries unordered** (`get-stock-report.query.ts` has no `orderBy`), which
  is harmless because the client owns ordering (D7) — noted so the polish pass does not read the
  filter sheet's payload-order location chips as a sort bug.

### 2026-09-02 — implement round 1 (Claude, Fable 5) → IMPLEMENTED (pending coordinator)

**Built.** `ui/StockReportPage.tsx` (screens 01/02, owns the internal view switch: root →
`report-filter-sheet` overlay → `report-entry-detail` pushed view), `ui/StockCounterTiles.tsx`,
`ui/StockReportEntryRows.tsx` (compact + grouped row variants and the striped thumbnail
placeholder), `ui/StockFilterSheet.tsx` (screen 03), `ui/StockEntryDetailView.tsx` (screen 04);
`settings-stock-report` registered as a plain page in `HomeFeature.tsx` via `LazyStockReportPage`
in `lazy-pages.tsx` (C9). Tests: `ui/StockReportPage.test.tsx` (C1–C8, 8 tests) and
`ui/stock-report-registration.test.tsx` (C9, 1 test, renders the real `HomeFeature` shell and
clicks the real Settings row). 124 → 133 tests, no orphans. Mutation ledger 1/1 (M1) plus seven
guard/argument probes — see the handoff.

**Judgment calls.**
1. *Grouped `n to fix` count.* Neither P2 nor the store precomputes it; the UI sums the three
   problem buckets of `countByStateBucket` (the one place that knows which states are problems).
   The UI still never decides which states count. **Candidate P2 gap:** `compareGroups` computes
   the same three numbers internally and could expose them on `ReportLocationGroup`.
2. *Group worst state* = `group.entries[0].stockState`, because `buildReportView` hands groups
   with entries already in MC3 order (worst first). No sort in the UI.
3. *Filter-sheet per-state counts* (design 03 "entry count" per row) = `countPendingRows` with
   that single state under the pending locations and grouping — so the five rows sum to the CTA
   count when all are selected, in every mode.
4. *Location chips* are multi-select (MC5 models `locations` as a set; `All` clears). Chip order
   = first appearance in the payload; the UI does not sort report data and the backend query has
   no `orderBy`.
5. *Screen 02 row → screen 04:* the tapped per-location entry is wrapped by
   `compactEntries([entry])[0]` (MC4 invariant c) so the detail shows that one location. Opening
   the full cross-location entry from a grouped row would contradict the "compaction off" mode.
6. *CTA wording* pluralises: `Show 1 entry` / `Show N entries`.
7. *`Generate PDF` pill* reuses `StockFloatingPill`, disabled, commented `structurally held:
   enabled when P9 lands`. Its `+` icon is P5's; the design shows a document icon (polish).
8. *The filter sheet is portaled to `document.body`.* Discovered in the browser: a concurrent
   polish session's uncommitted `index.css` gives `.stock-area-font` `position: relative;
   z-index: 0`, which trapped the sheet's `z-50` below the tab bar. The portal is correct on
   either tree.
9. *Subtitle:* compact `All locations · N entries` (or the selected codes joined ` · `), grouped
   `N locations · by severity`. N is the length of the domain-composed list.
10. *Empty states* (intention §7): "Nothing to report yet" when the payload is empty; a dashed
    "No entries match these filters" when the filter empties the composed view.

**Approximations for the polish pass (§7D).** Tab bar still visible on 04 (same shape as P6 F4;
03 now covers it via the portal). `Generate PDF` icon is `+`. No slide-up animation on the sheet
(no `index.css` edit in this phase's perimeter). Card surfaces use the committed P5/P6 idiom
(`--stock-surface` + shadow); the concurrent polish session is converting P5/P6 cards to a new
`stock-card-surface` class on a white page — these five components will need the same sweep.

**Observed, not changed.** (a) A concurrent session was editing this working tree during the
whole round (P5/P6 UI files, `index.css`, `HomeLayout.tsx`, two P6 test files, a new
`StockSelectSheet.tsx`); none of it is in this round's checkpoint. (b) `lazy-pages.tsx` carries
two pre-existing lint problems inside `createLazyFeaturePage` (baseline, as P5 recorded).
