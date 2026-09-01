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
| C1 | Compacted list renders rows in exactly the order `compareCompactRows` yields for the fixture (assert full rendered order equals domain-computed order — computed both sides). | MC2, M2 |
| C2 | Segmented switch to By-location renders groups in `compareGroups` order with `n to fix` = the group's out+low+medium count, badge tinted by its worst state's meta. | MC3, MC1, M2 |
| C3 | Filter sheet: toggling a state updates the CTA to `Show N entries` where N = `countPendingRows` of the pending selection (two toggles asserted); Apply renders exactly N rows; Reset restores defaults. | MC5, M2 |
| C4 | Location chips: selecting `L1` in compact mode shows quantities recomputed to L1 contributions (one fixture row asserted against `applyStockFilters` output). | MC5, M2 |
| C5 | Counter tiles show Out/Low/Medium/Rest from `computeCounterTiles` (state filter active does not change them; location filter does — one case each, D13). | MC5, M2 |
| C6 | Entry-detail: tapping a row opens detail with the row's chips, state tile and total; contributing rows match `deriveEntryDetail`; info note present for the multi-location fixture, absent for single-location; the strings `Scanned items` and `Add task` appear nowhere (D4 guard). | MC9, M2 |
| C7 | A quantity-0 row renders (OUT badge) and is never dropped as empty (v1.2 notice). | M2A, M2 |
| C8 | No threshold numbers anywhere in the report area (assert absence of band labels in 01/02/04 renders — design rule). | M2 |

## Notes
Owner visual pass against `01–04.png` (S5). Tab bar visible on 01/02 (plain page);
03 sheet + 04 pushed view hide it. Refine at prompt time.

## Review log
(empty)
