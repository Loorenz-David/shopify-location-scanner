# P5 — Stock Report

> **Rewritten 2026-09-01** against intention **§26** (report-contract amendment, owner-approved
> round 3). The previous version built server-side compaction, state filtering, severity
> ordering and location ranking. Those moved to the client; this phase is correspondingly
> smaller. Its old criteria are preserved in the Review log below, not deleted silently.

## Goal
Implement the report query and endpoint per intention §26: **one unparameterized read returning every stock definition, uncompacted**, each entry carrying a `mergeKey` the client groups on. **Not in this phase:** compaction, state filtering, ordering, location ranking (all client-side per §26.3 — implementing any of them is a defect, not a bonus); any mutation path; any file outside the list below.

## Read first
Master plan §5, §6.4–§6.5, §9, §10 · intention **§26** (the contract — wins over §19 and context §0.19), **§19** (still the authority for what compaction/ordering *mean*, now performed by the client), §23.1 (canonical form), §24 M7 (as amended) · context §0.19 (read its superseded marker first), §0.20, §0.21 · P1 domain (`STOCK_STATES`, `canonicalCriteriaString`) · P2's repository (`listByShop`, and the stored `propertiesCanonical` column) · P3's controller/routes/contract files.

## Dependencies (gate)
P3 APPROVED (shares `stock.controller.ts`, `stock.routes.ts`, `stock.contract.ts`). **Also gated on the intention header reading `RATIFIED`** — §26 re-opened it; do not start against a header that still says READY_FOR_RATIFICATION.

## Files expected to change
New `src/modules/stock/queries/get-stock-report.query.ts` · `src/modules/stock/{contracts/stock.contract.ts, controllers/stock.controller.ts, routes/stock.routes.ts}` (additions only) · new `scripts/verify-stock-report.ts` (committed criterion instrument, master plan §9.1b/§6.4; scratch DB copy only).

## Tasks (ordered)
1. Query — load every `LocationStock` for the shop (P2's `listByShop`) and map one entry per row: `{ location, itemCategory, properties, mergeKey, quantity, stockState }`. `properties` is the configuration's **canonical criteria** (§23.1), never an item bag. **No filtering, no compaction, no grouping, no ordering guarantee** (§26.1).
2. `mergeKey` — `` `${itemCategory}|${propertiesCanonical}` ``, where `propertiesCanonical` is **read from the stored column** (master plan §6.1), not recomputed from `properties` in the query. The column is already the §23.1 identity and is kept in sync by the repository on every write; recomputing it here would create a second implementation of canonicalization, which §21/§0.5 forbid, and would silently diverge if the two ever disagreed. Treat the key as opaque downstream: nothing in this codebase parses it.
3. Contract — response DTO per master plan §6.5. **No query-parameter schema.** Parameters that arrive are ignored, not rejected (§26.1) — so no 400 path exists for them.
4. Controller + route (`GET /stock/report`), both mounts already covered by P3's router.
5. `scripts/verify-stock-report.ts` — seeds a scratch copy of dev.db (`SHOP_ID` env) with a fixture set of configurations hitting every lettered row below, calls `getStockReportQuery` directly (not over HTTP — these rows assert the data, not the transport), prints one PASS/FAIL line per row, exits non-zero on any FAIL. **Refuses to run when `DATABASE_URL` points at the configured dev.db**, and that refusal is a non-zero exit (master plan §9.1d).

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Completeness — one entry per definition, no more, no fewer: (a) every `LocationStock` for the shop appears **exactly once**; (b) a definition matching zero items appears with `quantity: 0` / `out_of_stock` — never omitted, since a definition that fell to zero is the report's most urgent signal; (c) definitions spanning several locations and several categories all appear; (d) no definition belonging to another `shopId` appears | M7, §26.1, §0.19 |
| C2 | `mergeKey` identity — equal **iff** `itemCategory` and canonical `properties` are equal: (a) same category + same criteria at two different locations → **equal** keys; (b) one config created with scalar `{wood_type:"Teak"}` and one with `{wood_type:["Teak"]}` → **equal** keys (§23.1 unifies them); (c) same category, different criteria → **different**; (d) different category, identical criteria → **different**; (e) two `{}` catch-alls, same category, different locations → **equal**; (f) `{wood_type:["Teak","Oak"]}` and `{wood_type:["Oak","Teak"]}` → **equal** (member order is not semantic) | M7, §26.2, §23.1 |
| C3 | Entry shape and the absence of server-side processing: (a) each entry carries exactly `location`, `itemCategory`, `properties`, `mergeKey`, `quantity`, `stockState` — no `locations[]`, no `rows`, no `groups`; (b) `properties` is the configuration's canonical criteria, not an item's property bag; (c) `?states=out_of_stock&groupByLocation=true` returns **the same complete payload** as no parameters — ignored, not rejected, no 400; (d) reachable at both `/stock/report` and `/api/stock/report` | M7, §26.1/§26.3, §0.19 |

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — chaining P1's, P2's and this phase's scripts), output in the Review log; perimeter diff (5 files, additions only in the three shared ones).

## Manual scenarios

**C1–C3 are discharged by `scripts/verify-stock-report.ts`**, not by eye. The curl steps below prove only that the **HTTP transport** delivers what the script already proved about the data.

1. `GET /api/stock/report` against the fixture → entry count and three spot-checked entries match the script's PASS set, including one zero-quantity definition.
2. `GET /api/stock/report?states=out_of_stock&groupByLocation=true` → byte-identical payload to step 1 (C3(c)).
3. Both mounts reachable.

## Notes
- **Reviewer planted-defect probe (master plan §11.1.4):** temporarily derive `mergeKey` from `JSON.stringify(properties)` instead of the stored `propertiesCanonical` column → **C2(b) must FAIL** (a scalar-created and an array-created config would get different keys while being the same criterion). This probe is aimed at the phase's one real silent-failure mode: a `mergeKey` that looks fine in every hand-inspection and quietly splits or merges the client's groups. Revert after observing red.
- **Do not implement compaction, filtering, ordering or ranking** (§26.3). They are the client's, and adding them here would be scope this phase does not own — a reviewer finding, not a nicety.
- **The safety property that crossed the wire (§26.4):** the client must group on `mergeKey + stockState`, never `mergeKey` alone, or low stock in one location is hidden by healthy stock elsewhere. No criterion here can observe that — it belongs to the frontend's ledger. Recorded so nobody later mistakes its absence from this plan for an oversight.
- Pure projection over ≤ dozens of definition rows — in-memory, no new indexes, no aggregation (context §0.6).

## Review log
(append-only)

### 2026-09-01 — plan rewritten under intention §26 (owner-approved amendment)

The frontend track's request (`frontend_handoffs/frontend-report-endpoint-request.md`, its
decision D7) was approved by the owner in session and folded as intention §26, which wins
over §19 and context §0.19. This plan was rewritten rather than patched: patching would have
left criteria asserting server-side behaviour the contract no longer has.

**What this phase lost** (recorded so the change is auditable, and so a later reader does not
think these were forgotten): the previous C1 cross-location compaction on
`itemCategory + properties + stockState`; C2 default severity ordering; C4 the `states` CSV
filter and its 400 path; C5 grouped-by-location mode with the four-comparator location
ranking. All four moved to the client under §26.3.

**What it gained:** the `mergeKey` contract (§26.2) and its identity criterion, which is the
only genuinely new backend behaviour in the amendment — and it is not new machinery, since
`propertiesCanonical` already stores the §23.1 identity the key is built from.

**Net:** six criteria to three; one endpoint shape instead of two; the verify script added
earlier the same day narrows with it, from compaction-and-ranking rows to identity-and-
completeness rows. The phase gets smaller, which is why the amendment was worth taking.
