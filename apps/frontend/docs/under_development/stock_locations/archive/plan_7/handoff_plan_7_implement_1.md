---
plan: 7
role: implementer
round: 1
verdict: IMPLEMENTED
date: 2026-09-02
actor: Claude (Fable 5)
---

# Handoff — Plan 7 implement, round 1

## Opening (owner-readable)

The stock report is on screen now. *Settings → Stock report* opens the compacted list with the
four counter tiles, the *Compact | By location* switch flips to the grouped view with its
"n to fix" badges, the filter button opens the bottom sheet whose *Show N entries* button
counts live as you tap, and tapping any row opens the entry detail with its contributing
locations. The row itself had been dead since the settings phase — the button fired but no page
was registered — and it is fixed and proven through the real Settings screen. Everything the
plan asked for is proven by automated checks, the required sabotage test failed exactly where
it should, and I walked all four screens in a browser against the mockups. On your real data
every definition still sits at zero stock, so the tiles and the grouping will look flat until
something is scanned in — that is the data, not a defect.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner beyond the visual pass (§ "How to see it").

## How to see it (the S5 gate — acceptance only; polish is deferred, §7D)

`apps/frontend/.env` is on `VITE_STOCK_API_MODE=live` on this machine, so this runs against
the real backend (`prisma:generate` + migration already applied, §7B/§7C). `npm run dev`, log
in, **Settings** → **Stock report**.

1. **Screen 01 (compacted):** title, `All locations · N entries`, the segmented control with
   *Compact* active, the filter button (a number badge appears only when a state filter is on),
   the Out/Low/Medium/Rest tiles, one card per compacted entry (thumbnail placeholder, type, chips,
   quantity + `unit(s)`, tinted bar with the state left and the location codes right), the
   disabled *Generate PDF* pill (P9 wires it).
2. **Screen 02 (grouped):** tap *By location* → subtitle `N locations · by severity`, one section
   per location with a mono code, hairline and `n to fix` badge tinted by the worst state; rows
   with the solid rail, quantity and state label.
3. **Screen 03 (filters):** tap the filter button → sheet over the dimmed report: five state rows
   with dots and counts, `All` + one chip per location, the *Group by location* toggle, *Reset*,
   and the green CTA whose count changes as you tap. Tapping the dim area closes without
   applying.
4. **Screen 04 (entry detail):** tap any row → header card (type, chips, State tile, Total tile),
   the *Contributing locations* list with `Config: …` labels, and the blue note **only** when more
   than one location contributes. There are **no** *Scanned items* / *Add task* buttons (D4).
   The back chevron returns to the report.

**What the real data will show today (§7C).** All three definitions are `quantity 0` /
`out_of_stock`: every row wears the red OUT bar with `0 units`, the tiles read `3 · 0 · 0 · 0`
(or whatever the definition count is), and grouped mode ranks locations only by their
out-of-stock counts. Nothing is wrong with that; scan stock into one definition (backend
runbook §2) and the bands, tiles and ranking come alive. If you want a fuller demo first,
switch `.env` to `mock` — the fixture has one multi-location row, one zero row and a state
split.

## Coverage map (Task 0 — row → test → shape)

| row | test | assertion shape |
|---|---|---|
| C1(a) full rendered order = domain order, both computed | `C1` | rendered `data-row-key` list `toEqual` `compactEntries(fixture).toSorted(makeCompactRowComparator(keyOrder))` keys — exact list equality |
| C1(b) fixture's composed order ≠ raw order (S10) | `C1` | `rawOrder not.toEqual composedOrder`, same length — the input is asserted to discriminate |
| C1 M1 named mutation | ledger row M1 | run, observed red, reverted |
| C2(a) groups in `compareGroups` order | `C2` | `data-location` list `toEqual` `buildReportView(payload, grouped).groups.map(location)`; plus raw order **and** sum-rule order asserted ≠ expected |
| C2(b) `n to fix` = out+low+medium | `C2` | badge `toHaveTextContent("N to fix")` with N from `countByStateBucket`; the three groups' N asserted pairwise distinct |
| C2(c) badge tinted by worst state's meta | `C2` | `toHaveStyle` backgroundColor = tint, color = text of the worst state computed by `toSorted(compareByStateIndex)[0]`; worst states asserted pairwise distinct |
| C2 entries within a group in MC3 order | `C2` | `data-entry-key` list equality per group |
| C3(a) toggle 1 → `Show N entries`, N = `countPendingRows` | `C3` | CTA `toHaveTextContent(ctaLabel(firstCount))` |
| C3(b) toggle 2 → different N | `C3` | second CTA label; `secondCount ≠ firstCount ≠ defaultCount` asserted |
| C3(c) Apply renders exactly N rows | `C3` | rendered rows `toHaveLength(secondCount)`; badge shows `states.size` |
| C3(d) Reset restores defaults | `C3` | after selecting a location + toggling grouping: all five checkboxes checked, `All` pressed, location chip unpressed, toggle unchecked, CTA = default count; applied → default row count, no badge |
| C4 location chip re-quantifies to that location's contribution | `C4` | multi-location row's quantity before = full sum, after = `applyStockFilters(compactEntries, filter)` row quantity; asserted ≠; locations text = filtered `locations`; subtitle names the location |
| C5(a) tiles = `computeCounterTiles` | `C5` | `tileValues() toEqual computeCounterTiles(entries, default)` |
| C5(b) state filter leaves tiles alone (D13) | `C5` | row count asserted to change while tiles `toEqual` default |
| C5(c) location filter moves tiles (D13) | `C5` | tiles `toEqual computeCounterTiles(entries, locationFilter)`, asserted ≠ default |
| C6(a) detail shows chips, state tile, total | `C6` | chips list `toEqual renderCriteriaChips(row.properties, options)`; state tile text = label; total = `N units` |
| C6(b) contributing rows match `deriveEntryDetail` | `C6` | count, and per row location / configLabel / quantity / state label in order; eyebrow count |
| C6(c) note present for the multi-location row | `C6` | `stock-detail-note` present (row asserted `isMultiLocation === true`) |
| C6(d) note absent for the single-location row | `C6` | different row (asserted ≠), note `toBeNull` |
| C6(e) D4 guard: `Scanned items` / `Add task` nowhere | `C6` | `queryByText` and `queryByRole(button)` null, on both detail renders |
| C7 quantity-0 row renders with OUT badge, never dropped | `C7` | zero row's key in rendered keys, rendered length = `countPendingRows`, quantity text `0`, OUT label present |
| C8(01) no band labels on screen 01 | `C8` | no `stock-threshold-band`, no `Threshold bands` label, no `/^\d+–\d+$\|^\d+\+$/` text |
| C8(02) same on screen 02 | `C8` | same, after switching to *By location* |
| C8(04) same on screen 04 | `C8` | same, after opening a row |
| C9 Settings row reaches a rendered page | `C9` | real `HomeFeature` + `RoleContextProvider`, `selectNavigationPage("settings")`, click the real *Stock report* row, `findByRole("heading", {name: "Stock report"})`, then rows render |

Reverse map: every test in the two new files appears above. No orphan tests.

## Red baseline (before the first production edit)

`npx vitest run` on the two test files: `StockReportPage.test.tsx` — 0 collected
(`Failed to resolve import "./StockReportPage"`, 8 cases uncollected); `stock-report-registration.test.tsx`
— 1 failed, `Unable to find role="heading" and name "Stock report"` after clicking the real
Settings row (the dead-row symptom, observed through the user's own path).

## Criterion evidence

All nine rows green on the closing stamp. Test ids: `C1`…`C8` in `ui/StockReportPage.test.tsx`
(lines 134, 152, 212, 263, 295, 331, 384, 399), `C9` in `ui/stock-report-registration.test.tsx:27`.

Row inputs, per the plan's S10 list: C1/C3–C8 run the page's own path against the mock report
fixture (the vocabulary is loaded by the report controller, nothing seeded). C2 needs three
groups with distinct problem counts **and** distinct worst states, which the five-entry fixture
cannot give (both its groups are "2 to fix"), so C2 delivers a test-local six-entry payload
through `vi.spyOn(stockApi, "getStockReport")` — the P4 idiom; the flow → controller → domain path
is untouched and the options still load on their own. The payload is asserted to discriminate
(raw order L2,L3,L1 ≠ ranked L1,L2,L3 ≠ sum-rule L2,L1,L3).

## Mutation ledger — executed 1 / declared 1

| # | mutation | site | scope / command | result |
|---|---|---|---|---|
| M1 (C1) | read `store.entries` instead of the composed `store.view` | `ui/StockReportPage.tsx:100`, the render site (`const view = { rows: entries } …`) | full suite, `npx vitest run`, tree = checkpoint + working-tree digest below | **red: C1–C8** (8 failed / 125 passed). C1's observed assertion: `expected [ …(5) ] to deeply equal [ …(4) ]`, received `report-walnut-chairs\|low_in_stock, report-state-split\|low_in_stock, …` (the raw entry order, one row per entry). Reverted, green. |

Summands: C1 names 1 mutation; C2–C9 name none. 1 = 1.

## Guard proofs and argument probes (all applied, observed, reverted; full suite each)

| # | planted defect | file:line | rows reddened | observed |
|---|---|---|---|---|
| P1 | D4 action row (`Scanned items` + `Add task` buttons) rendered in the detail | `ui/StockEntryDetailView.tsx:143` (before the note) | **C6** | `expected <button> to be null` at `queryByText(/scanned items/i)` |
| P2 | `view.rows.filter((row) => row.quantity > 0)` at the compact render | `ui/StockReportPage.tsx:242` | **C7**, C1, C3, C5 | C7: `expected [ …(3) ] to have a length of 4 but got 3` |
| P3a | `StockThresholdStrip` (P5's band strip, thresholds 4/9/20) rendered in the compact row | `ui/StockReportEntryRows.tsx:72` (after the locations span) | **C8** at `StockReportPage.test.tsx:408` (screen 01) | `stock-threshold-band` found |
| P3b | same strip in the grouped row | `ui/StockReportEntryRows.tsx:120` | **C8** at `:412` (screen 02) | same |
| P3c | same strip in the contributing-location row | `ui/StockEntryDetailView.tsx:122` | **C8** at `:418` (screen 04) | same |
| P4 (S10) | tiles counted from the visible view (`countByStateBucket` over `view.rows`/groups) instead of the store's `counterTiles` | `ui/StockReportPage.tsx:101` | **C5** | `expected {…} to deeply equal { out: 1, low: 2, medium: 0, rest: 1 }` at test line 314 (the state-filter direction) |
| P5 (S10) | CTA counts `appliedFilter` instead of the pending copy | `ui/StockFilterSheet.tsx:57` | **C3** | CTA text mismatch at test line 226 (first toggle) |

Each probe was run twice: once during the round, and once more on the final tree after the one
test-file edit (a `?? ""` typing fix at `StockReportPage.test.tsx:47`), with identical rows
reddened. The second run happened while another session was editing the tree (below); failures
were attributed per test file and none fell outside the two new test files.

## Write perimeter

**Created (7):** `src/features/stock/ui/StockReportPage.tsx`, `StockCounterTiles.tsx`,
`StockReportEntryRows.tsx`, `StockFilterSheet.tsx`, `StockEntryDetailView.tsx`,
`StockReportPage.test.tsx`, `stock-report-registration.test.tsx`.
**Modified (2, C9 authorization):** `src/features/home/HomeFeature.tsx` (+7: the
`settings-stock-report` plain-page entry and its import), `src/features/home/lazy-pages.tsx`
(+12: `LazyStockReportPage`).
**Documents (2):** `plans/plan_7_report_ui.md` (Review log entry), this handoff.
**Probe-touched, all reverted, byte-verified by the probe script:** `StockReportPage.tsx`,
`StockEntryDetailView.tsx`, `StockReportEntryRows.tsx`, `StockFilterSheet.tsx`.
**Throwaway, deleted before commit:** `__stock_preview.html`, `src/__stock_preview.tsx` (the
browser harness); `ui/zz-probe.test.tsx` (a shell-rendering feasibility probe).
**Not touched:** `stock-allowlist.test.ts` (still passes untouched), api, fixtures, any P1–P6
domain/store/controller/flow/action/UI file, `index.css`, `apps/backend/`. The tracker.

## Closing L4 stamp

Tree: HEAD `bab2e19`, dirty; my files as committed in the checkpoint; foreign uncommitted diff
present (see below). Digest of `git diff` + untracked files at the stamp: `1e6c33fc135cb55f`.

- `npm test` → **21 files, 133 tests, all passed** (baseline 19 / 124 → +2 files, +9 tests;
  failure-ID delta ∅ → ∅)
- `npm run typecheck` → `tsc -b` exit 0 (a first take found one error in my test file —
  `getAttribute` is `string | null` — fixed and re-taken; that re-take is this stamp)
- `npm run lint` → **48 errors / 14 warnings** = baseline, totals unchanged. 0 problems in every
  file I created and in `HomeFeature.tsx`; `lazy-pages.tsx` carries its **2 pre-existing**
  problems inside `createLazyFeaturePage` (lines 67/100, counted in the baseline, recorded the
  same way by P5).

Browser pass (throwaway harness, mock mode, 430px): all four screens screenshotted and compared
to `01–04.png`; no console errors.

## Found and not changed

1. **Another session was editing this working tree throughout the round.** When I started, only
   `StockLocationsPage.tsx` was modified; by the close, `index.css`, `HomeLayout.tsx`,
   `StockLocationDetailView.tsx`, `StockThresholdLadder.tsx`, `StockWizardChrome.tsx`,
   `StockWizardPicker.tsx`, `StockWizardStep1View.tsx` + its test, `StockWizardStep2View.tsx`,
   `stock-wizard-entry-points.test.tsx` and a new `StockSelectSheet.tsx` were also dirty — a
   visual-polish stream (white page, `stock-card-surface`). None of it is staged in my
   checkpoint (explicit paths, S11). Two consequences: the L4 stamp was taken on a tree that
   contains that diff, and my components use the *committed* card idiom, so the polish pass
   will need to sweep them too. One of those edits (`.stock-area-font { position: relative;
   z-index: 0 }`) is what pushed the filter sheet under the tab bar in the browser; I portaled
   the sheet to `document.body`, which is correct on either tree.
2. **Candidate P2 gap** — `n to fix` is not precomputed. `compareGroups` derives the three
   problem counts internally; exposing them on `ReportLocationGroup` would let the UI stop
   summing buckets. Judgment call 1 in the Review log; no code change.
3. **Tab bar on screen 04** — visible, design hides it; same shape as P6 F4, parked for §7D.
4. **Report entries arrive unordered from the backend** (`get-stock-report.query.ts` has no
   `orderBy`), so the filter sheet's location-chip order is payload order. Harmless; noted so the
   polish pass does not read it as a sort bug.
5. `lazy-pages.tsx` lint baseline, as above.
