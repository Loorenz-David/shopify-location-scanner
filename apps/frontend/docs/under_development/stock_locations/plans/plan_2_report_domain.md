# Plan 2 — Report domain (compaction, ordering, filters, detail)

**Implementer:** Codex · **Depends on:** P1 APPROVED · **Projection: mandatory** (MC2–MC5, MC9)

## Goal
Pure domain functions for the whole report area: compaction, both total orderings, the
filter model with its counts, and entry-detail derivation. NOT in this phase: stores,
flows, UI, PDF assembly.

## Read first
Master plan §6 (Domain) · intention §4A MC2, MC3, MC4, MC5, MC9 + §5 + §8 (M2, **M2A**) ·
contract v1.2 §4.7 · `backend_handoff/handoff_report_contract_v1_2_notice.md` §3.

## Files expected to change
`src/features/stock/domain/stock-report.domain.ts` (+ `.test.ts`),
`src/features/stock/types/stock.types.ts` (view types it returns).

## Tasks
1. `compactEntries` per MC4 (group `(mergeKey, stockState)`; sum; locations deduped,
   code-point sorted). 2. `compareCompactRows` per MC2 (5 tiebreak levels). 3.
`compareGroups` + within-group ordering per MC3. 4. `applyStockFilters`,
`countPendingRows`, `computeCounterTiles` per MC5 (D12/D13 as ratified). 5.
`deriveEntryDetail` per MC9. All functions take/return the P1 types — no IO.

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Compaction: (a) two same-key same-state entries merge — quantity summed, locations `["H1","LC1"]` sorted, rendered `H1 · LC1`; (b) per-state quantity conservation on a mixed fixture; (c) no `(mergeKey,state)` pair twice in output; (d) single-entry group passes through unchanged. | MC4, M2 |
| C2 | **Compaction key integrity:** same-key entries in *different* states (low 2 @LC1, normal 18 @H1) yield two rows (2/low, 18/normal), never 20. **Named mutation:** remove `stockState` from the grouping key at the `compactEntries` definition → this test reds. | **M2A**, MC4 |
| C3 | Row ordering — one row per adjacent tiebreak level (enumerate, never sample): (a) state beats quantity (out/q9 before low/q1); (b) equal state → quantity asc; (c) equal both → category code-point asc; (d) equal through category → properties-string asc; (e) equal through properties → location-list asc. Comparator returns 0 only for identical rows. | MC2, M2 |
| C4 | Group ordering — adjacent pairs: (a) out-count 3/low 0 before out 1/low 4 (D11); (b) equal out → low desc; (c) equal out+low → medium desc; (d) all equal → location asc. Within-group order reuses C3(a–d) semantics (one witness row). | MC3, M2 |
| C5 | Filters: (a) state-subset excludes non-selected states; (b) location-subset in grouped mode drops other locations' entries; (c) location-subset in compact mode: row with locations {LC1,H1} filtered to {LC1} keeps the row with quantity = LC1's contribution only; (d) row with no selected location disappears; (e) empty location set = all. | MC5, M2 |
| C6 | Counts: for every grouping × filter combination in a 4-case table, `countPendingRows` equals the length of the rendered list from the same inputs (computed both sides, not typed). | MC5 (D12), M2 |
| C7 | Tiles: Out/Low/Medium/Rest where Rest = normal+high; state filter ignored; location filter respected (D13); computed in current grouping mode (one case each mode). | MC5 (D13), M2 |
| C8 | Entry detail: contributing rows = group members ordered by location; config label per MC9 incl. catch-all (`Config: Side Table`) and wildcard (`UPHOLSTERY · any`) renderings; multi-location flag true only when >1 location. | MC9, M2 |

## Notes
Quantity-0 entries are data, never filtered as empty (v1.2 notice). `mergeKey` is
opaque — no test may construct semantic keys (use fixture strings like `"k1"`).

## Review log
(empty)
