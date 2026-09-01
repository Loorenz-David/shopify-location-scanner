# P2 — Stock Repository + Reconciliation Service

## Goal
Implement `locationStockRepository` (all Prisma access for the two tables, including the §0.15 guarded decrement) and the group reconciliation service with the §23.6 double-pass. **Not in this phase:** HTTP endpoints, commands, item-flow hooks, `applyItemStockChange`.

## Read first
Master plan §5, §6.2, §6.4, §6.6, §9, §10 · intention §8–§9, §23.6, §24 · context §0.6, §0.15, §0.16, §0.17, §0.21 (persistence requirement), §3.3, §3.6, §12.4 · `.github/instructions/backend-contracts.instructions.md` · `src/modules/zones/repositories/zone.repository.ts` (repository idiom) · `src/modules/scanner/repositories/scan-history.repository.ts:79-82` (`normalizeLocation` — read only) · P1's domain modules.

## Dependencies (gate)
P1 APPROVED.

## Files expected to change
New `src/modules/stock/repositories/location-stock.repository.ts` · new `src/modules/stock/services/stock-reconciliation.service.ts` · new `scripts/verify-stock-reconciliation.ts` (committed manual instrument; operates only on a **copy** of dev.db via `DATABASE_URL` override).

## Tasks (ordered)
1. Repository: `createMany` (tx-aware), `updateConfig`, `deleteById`, `listByGroup(shopId, location, itemCategory)`, `listByShop`, `findById`, `listGroupSummaries`, `applyGuardedDecrement(id, shopId, delta)` (§0.15 `updateMany` + `gte`), `applyIncrement`, `writeAbsolute(id, quantity, stockState, updatedByUsername, tx)`, `recalculateState(id)` (read-back + shared `calculateStockState`). `toDomain` maps `properties` through `normalizeCriteria` defensively and **round-trips `{}` as `{}`** — never `Prisma.JsonNull`, never `toPropertiesUpdateValue` (master plan §9.4). `propertiesCanonical` is written by the repository from `canonicalCriteriaString` on every create/update.
2. Eligible-items read: `listEligibleItems(shopId, location, itemCategory)` → `prisma.scanHistory.findMany({ where: { shopId, latestLocation: location, itemCategory, isSold: false } })` projected to `{ id, productId, quantity, properties }`. Lives in the stock repository (read-only touch of another module's table is the `stats` precedent; do NOT edit scanner files).
3. `reconcileGroup(shopId, location, itemCategory)` — pass 1 per §0.17 (configs + eligible items, `resolveBestMatch` per item, tally by **item quantity**, one transaction writing every config's absolute quantity + recomputed state, sentinel username `"system:stock-reconciliation"`); pass 2 per §23.6 (fresh recompute post-commit; write again only on difference; `logger.warn` with group + per-config delta when it differs; exactly two passes). Returns pass-2 values keyed by config id.
4. `reconcileAllGroups(shopId)` — distinct groups from `listByShop`, sequential `reconcileGroup` calls.
5. `scripts/verify-stock-reconciliation.ts` — seeds a scratch copy of dev.db (`SHOP_ID` env) with temporary configs across the C3/C4 rows below, runs reconciliation, prints PASS/FAIL per row, exits non-zero on FAIL. It must refuse to run when `DATABASE_URL` points at the default dev.db path.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Persistence round-trip: (a) config created with `{}` reads back `properties = {}` (not null); (b) `propertiesCanonical` equals `canonicalCriteriaString(properties)` after every create and update; (c) DB unique constraint rejects a second identical `(shopId, location, itemCategory, propertiesCanonical)` | M6/M8, §0.21/§23.1 |
| C2 | Guarded decrement: (a) quantity 5, delta 3 → 2, state recalculated; (b) quantity 2, delta 3 → refused, quantity stays 2, no exception thrown to caller; (c) refusal logs `logger.error` with ALL §0.15 context fields (locationStockId, location, shopId, productId/scanHistoryId, itemCategory, requestedDecrement, currentQuantity, locationFrom/locationTo where applicable, operation); (d) increment path has no guard and recalculates state | M4, §0.15 |
| C3 | reconcileGroup pass 1: (a) only unsold items at exact location+category are loaded; (b) each item allocated to its `resolveBestMatch` winner only; (c) quantities tally item `quantity`, not row count (seed one qty-4 row); (d) all configs in the group written in one transaction — a config matching zero items gets quantity 0 / out_of_stock; (e) an item matching no config contributes nowhere and causes no error | M1/M5/M8, §0.17 |
| C4 | Double-pass: (a) with no interleaved write, pass 2 computes identical values and performs no second write; (b) with a simulated interleaved item write between passes (script mutates between pass boundaries via injected callback), pass 2 writes corrected values and logs `logger.warn` naming group + delta; (c) exactly two passes — no loop; (d) return value reflects pass 2 | M5, §23.6 |
| C5 | Reconciliation writes are absolute: seed a drifted quantity (manually set 99), reconcile → correct value restored without any guard refusal | M5, §0.15/§0.17 |
| C6 | `reconcileAllGroups` reconciles every distinct group exactly once for the shop | M5, §0.17 |

Phase-close instruments: typecheck green; purity grep empty (domain untouched or still pure); verify script all-PASS on a scratch copy, output + the copy's path in Review log; `git diff` perimeter = the three files above (+ no scanner/shopify files).

## Manual scenarios
Covered by `scripts/verify-stock-reconciliation.ts` (this phase's behavior is not reachable from the UI yet). Reviewer re-runs on a fresh scratch copy and plants one defect (e.g. temporarily tally row count instead of quantity → C3(c) must FAIL; revert).

## Notes
- `$transaction` default timeout is fine at this data size (context §0.6).
- The injected between-pass callback for C4(b) is a test seam on the service (optional param, default no-op) — document it in a block comment; it is the §23.6 instrument, not scaffolding (it has a required caller: the verify script).
- Repository methods accept an optional `tx` (Prisma transaction client) per the architecture contract.

## Review log
(append-only)
