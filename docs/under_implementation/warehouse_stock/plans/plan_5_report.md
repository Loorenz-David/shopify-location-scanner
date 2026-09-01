# P5 — Stock Report

## Goal
Implement the report query and endpoint: cross-location compaction, state filtering, group-by-location with severity ranking (§19, §0.19). **Not in this phase:** any mutation path, any new files outside the query/controller/routes/contract additions.

## Read first
Master plan §5, §6.4–§6.5, §9, §10 · intention §19 · context §0.19, §0.20, §0.21 · P1 domain (`STOCK_STATES`, `canonicalCriteriaString`) · P3's controller/routes/contract files.

## Dependencies (gate)
P3 APPROVED (shares `stock.controller.ts`, `stock.routes.ts`, `stock.contract.ts`).

## Files expected to change
New `src/modules/stock/queries/get-stock-report.query.ts` · `src/modules/stock/{contracts/stock.contract.ts, controllers/stock.controller.ts, routes/stock.routes.ts}` (additions only).

## Tasks (ordered)
1. Query: load all shop configs; optional `states` filter; default mode compacts on `itemCategory + canonicalCriteriaString(properties) + stockState` (sum quantities, merge sorted `locations[]`); grouped mode skips compaction, groups by location, orders entries severity-ascending, ranks locations per §0.19 (out_of_stock desc → low desc → medium desc → location asc). All ordering via `STOCK_STATES.indexOf` — no rank map (§0.20).
2. Contract: `states` = CSV of valid StockState values (400 on unknown), `groupByLocation` boolean. Response per master plan §6.5 `StockReportDto`.
3. Controller + route (`GET /stock/report`), both mounts already covered by the router.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Compaction: (a) same category+criteria+state at two locations → one row, summed quantity, `locations` sorted with both; (b) same category+criteria, DIFFERENT state → two rows; (c) single-location row still has `locations` as a one-element array; (d) criteria compared canonically (scalar-created vs array-created configs compact together) | M7, §0.19/§23.1 |
| C2 | Default ordering severity-ascending: out_of_stock rows first, then low, medium, normal, high (one row per adjacent pair present in the fixture) | M7, §0.19/§0.20 |
| C3 | out_of_stock rows included by default (a zero-quantity config appears) | M7, §0.19 |
| C4 | `states` filter: (a) `states=out_of_stock,low_in_stock` returns only those rows; (b) unknown state value → 400 | M7, §19 |
| C5 | Grouped mode: (a) no compaction (the C1(a) pair appears once per location); (b) entries within each location severity-ascending; (c) location ranking — enumerate one fixture per adjacent comparator: more out_of_stock first; equal out → more low first; equal out+low → more medium first; all equal → location string ascending | M7, §0.19 |
| C6 | Report `properties` is the configuration's canonical criteria (not an item bag); `type` field is the config's `itemCategory` | M7, §0.19 |

Phase-close instruments: typecheck green; purity grep empty; perimeter diff (4 files, additions only in the three shared ones).

## Manual scenarios (curl; fixture = configs seeded via P3 across ≥2 locations with quantities engineered to hit each state)
1. Default report → verify C1–C3 against the seeded expectations (each expected row written down before the call).
2. `?states=out_of_stock,low_in_stock` → only those.
3. `?groupByLocation=true` → per-location groups; verify the C5(c) ranking rows with the seeded counts.

## Notes
- **Reviewer planted-defect probe (master plan §11.1.4):** temporarily include `stockState` comparison via string sort instead of `STOCK_STATES.indexOf` → C2's ordering fixture must break (alphabetical ≠ severity order); revert.
- Pure aggregation over ≤ dozens of config rows — in-memory, no new indexes (context §0.6).
- Keep the aggregation logic in the query file (read use-case), reusing domain helpers; no repository changes expected.

## Review log
(append-only)
