# P2 — Stock Repository + Reconciliation Service

## Goal
Implement `locationStockRepository` (all Prisma access for the two tables, including the §0.15 guarded decrement) and the group reconciliation service with the §23.6 double-pass. **Not in this phase:** HTTP endpoints, commands, item-flow hooks, `applyItemStockChange`.

## Read first
Master plan §5, §6.2, §6.4, §6.6, §9, §10 · intention §8–§9, §23.6, §24 · context §0.6, §0.15, §0.16, §0.17, §0.21 (persistence requirement), §3.3, §3.6, §12.4 · `.github/instructions/backend-contracts.instructions.md` · `src/modules/zones/repositories/zone.repository.ts` (repository idiom) · `src/modules/scanner/repositories/scan-history.repository.ts:79-82` (`normalizeLocation` — read only) · P1's domain modules.

## Dependencies (gate)
P1 APPROVED.

## Files expected to change
New `src/modules/stock/repositories/location-stock.repository.ts` · new `src/modules/stock/services/stock-reconciliation.service.ts` · new `scripts/verify-stock-reconciliation.ts` (committed manual instrument; operates only on a **copy** of dev.db via `DATABASE_URL` override) · new `scripts/verify-all.ts` (the §9.1d regression seam).

## Tasks (ordered)
1. Repository: `createMany` (tx-aware), `updateConfig`, `deleteById`, `listByGroup(shopId, location, itemCategory)`, `listByShop`, `findById`, `listGroupSummaries`, `applyGuardedDecrement(id, shopId, delta)` (§0.15 `updateMany` + `gte`), `applyIncrement`, `writeAbsolute(id, quantity, stockState, updatedByUsername, tx)`, `recalculateState(id)` (read-back + shared `calculateStockState`). `toDomain` maps `properties` through `normalizeCriteria` defensively and **round-trips `{}` as `{}`** — never `Prisma.JsonNull`, never `toPropertiesUpdateValue` (master plan §9.4). `propertiesCanonical` is written by the repository from `canonicalCriteriaString` on every create/update.
2. Eligible-items read: `listEligibleItems(shopId, location, itemCategory)` → `prisma.scanHistory.findMany({ where: { shopId, latestLocation: location, itemCategory, isSold: false } })` projected to `{ id, productId, quantity, properties }`. Lives in the stock repository (read-only touch of another module's table is the `stats` precedent; do NOT edit scanner files).
3. `reconcileGroup(shopId, location, itemCategory)` — pass 1 per §0.17 (configs + eligible items, `resolveBestMatch` per item, tally by **item quantity**, one transaction writing every config's absolute quantity + recomputed state, sentinel username `"system:stock-reconciliation"`); pass 2 per §23.6 (fresh recompute post-commit; write again only on difference; `logger.warn` with group + per-config delta when it differs; exactly two passes). Returns pass-2 values keyed by config id.
4. `reconcileAllGroups(shopId)` — distinct groups from `listByShop`, sequential `reconcileGroup` calls.
5. `scripts/verify-stock-reconciliation.ts` — seeds a scratch copy of dev.db (`SHOP_ID` env) with temporary configs across the C3/C4 rows below, runs reconciliation, prints PASS/FAIL per row, exits non-zero on FAIL. It must refuse to run when `DATABASE_URL` points at the default dev.db path.
6. `scripts/verify-all.ts` (master plan §9.1d) — discovers every `scripts/verify-*.ts` except itself, runs each as a child process passing the environment through, and prints one status line per script plus a summary. Status vocabulary is exactly `PASS` · `FAIL` · `REFUSED` (child exited on its own dev.db guard) · `MISSING` (a script named in the master plan §6.4 table is absent). **Exit 0 only when every script in that table is present, ran, and passed** — `REFUSED` and `MISSING` are non-zero, because a script that did not run must never read as green. Do not parse child stdout for correctness; the child's exit code is the verdict, and its output is echoed verbatim under its heading.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Persistence round-trip: (a) config created with `{}` reads back `properties = {}` (not null); (b) `propertiesCanonical` equals `canonicalCriteriaString(properties)` after every create and update; (c) DB unique constraint rejects a second identical `(shopId, location, itemCategory, propertiesCanonical)` | M6/M8, §0.21/§23.1 |
| C2 | Guarded decrement: (a) quantity 5, delta 3 → 2, state recalculated; (b) quantity 2, delta 3 → refused, quantity stays 2, no exception thrown to caller; (c) refusal logs `logger.error` with ALL §0.15 context fields (locationStockId, location, shopId, productId/scanHistoryId, itemCategory, requestedDecrement, currentQuantity, locationFrom/locationTo where applicable, operation); (d) increment path has no guard and recalculates state | M4, §0.15 |
| C3 | reconcileGroup pass 1: (a) only unsold items at exact location+category are loaded; (b) each item allocated to its `resolveBestMatch` winner only; (c) quantities tally item `quantity`, not row count (seed one qty-4 row); (d) all configs in the group written in one transaction — a config matching zero items gets quantity 0 / out_of_stock; (e) an item matching no config contributes nowhere and causes no error | M1/M5/M8, §0.17 |
| C4 | Double-pass: (a) with no interleaved write, pass 2 computes identical values and performs no second write; (b) with a simulated interleaved item write between passes (script mutates between pass boundaries via injected callback), pass 2 writes corrected values and logs `logger.warn` naming group + delta; (c) exactly two passes — no loop; (d) return value reflects pass 2 | M5, §23.6 |
| C5 | Reconciliation writes are absolute: seed a drifted quantity (manually set 99), reconcile → correct value restored without any guard refusal | M5, §0.15/§0.17 |
| C6 | `reconcileAllGroups` reconciles every distinct group exactly once for the shop | M5, §0.17 |
| C7 | `verify-all.ts` (master plan §9.1d): (a) with both verify scripts passing on a scratch copy, it exits 0 and prints one PASS line per script; (b) when any child script exits non-zero it prints FAIL for that script and exits non-zero; (c) run against the configured dev.db (no scratch override) it prints REFUSED for the reconciliation script and exits non-zero — an unrun script never reads as green; (d) a script named in master plan §6.4 but absent from disk prints MISSING and exits non-zero | §9.1d |

Phase-close instruments: typecheck green; purity grep empty (domain untouched or still pure); **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (this is the §9.1d seam's first run — it must chain P1's `verify-stock-domain.ts` as well as this phase's script), output + the copy's path in Review log; `git diff` perimeter = the four files above (+ no scanner/shopify files).

## Manual scenarios
Covered by `scripts/verify-stock-reconciliation.ts` (this phase's behavior is not reachable from the UI yet). Reviewer re-runs `verify-all.ts` on a fresh scratch copy and plants **two** defects, reverting each:

1. Temporarily tally row count instead of item quantity → C3(c) must FAIL, and `verify-all.ts` must exit non-zero (proves the reconciliation instrument bites and that the seam propagates a child failure).
2. Temporarily break a P1 domain rule the *reconciliation* script never touches (e.g. make `-` a separator in `tokenizePropertyValue`) → `verify-stock-domain.ts` must FAIL **through `verify-all.ts`**. This is the seam's own reason to exist: it proves a P1 regression is caught at a later phase's close rather than surviving to P6.

## Notes
- **`toDomain`'s `normalizeCriteria` pass is load-bearing, not defensive (P1 review N3).** `canonicalCriteriaString` sorts *keys* but not *values*, and assumes its input already came through `normalizeCriteria` — given `{wood:["teak","oak"]}` it emits `{"wood":["teak","oak"]}`, where the canonical form is `{"wood":["oak","teak"]}`. `propertiesCanonical` is written from it and the four-column unique index depends on it, and P5's `mergeKey` (intention §26.2) is built on that stored column. A path that reaches `canonicalCriteriaString` without normalizing first silently produces a row identity that neither dedupes nor merges correctly. Normalize on every write path, not just the obvious one.
- `$transaction` default timeout is fine at this data size (context §0.6).
- The injected between-pass callback for C4(b) is a test seam on the service (optional param, default no-op) — document it in a block comment; it is the §23.6 instrument, not scaffolding (it has a required caller: the verify script).
- Repository methods accept an optional `tx` (Prisma transaction client) per the architecture contract.

## Review log
(append-only)
