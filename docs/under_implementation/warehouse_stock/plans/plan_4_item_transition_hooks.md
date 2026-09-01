# P4 — `applyItemStockChange` + the Four Hook Sites

## Goal
Implement the single stock-mutation primitive (§0.7) and invoke it from the four ratified call sites (§0.10): location command, products/update webhook job, orders-paid, orders-create. **Not in this phase:** any edit to `scan-history.repository.ts` (hard perimeter rule), any new WS event (§0.9 — none exists in V1), the report.

## Read first
Master plan §5, §6.4, §6.6, §9 (esp. §9.6), §10 · intention §7–§8, §10–§13 · context §0.7, §0.9, §0.10, §0.15, §0.16, §9 (sold lifecycle), §10.1–§10.2, §11.3 · `src/modules/shopify/commands/update-item-location.command.ts` · `src/modules/shopify/jobs/process-products-update-webhook.job.ts` · `src/modules/shopify/commands/handle-orders-paid-webhook.command.ts` · `src/modules/shopify/commands/handle-orders-create-webhook.command.ts` · P2 repository/service.

## Dependencies (gate)
P2 APPROVED. (Parallel with P3 allowed — perimeters are disjoint.)

## Files expected to change
New `src/modules/stock/services/apply-item-stock-change.service.ts` · `src/modules/shopify/commands/update-item-location.command.ts` · `src/modules/shopify/jobs/process-products-update-webhook.job.ts` · `src/modules/shopify/commands/handle-orders-paid-webhook.command.ts` · `src/modules/shopify/commands/handle-orders-create-webhook.command.ts`. **Explicitly NOT:** `src/modules/scanner/repositories/scan-history.repository.ts`, `src/modules/ws/*`.

## Tasks (ordered)
1. `applyItemStockChange({ shopId, before, after, operation, itemIdentifiers })` — `before`/`after`: `{ location, itemCategory, properties, quantity, isSold } | null`. Resolve each side's best-matching config (side eligible iff non-null, `isSold === false`, location non-null; then `resolveBestMatch` over the group's configs). Same config on both sides: apply the net quantity delta (guarded if negative). Different: guarded decrement on source (§0.15, never blocking), increment on destination. Either side unresolved: single-sided. Recalculate state after every mutation. Return `{ changed: boolean }`. Errors are caught and logged — a stock failure never fails the parent operation (§0.15).
2. Hook `updateItemLocationCommand` (§0.10): hoist a `scanHistoryRepository.findByShopAndProduct` read (the existing `returnToStore`-branch call, made unconditional) → `before`; the returned `historyItem` → `after`; call once after `appendLocationEvent` returns; `operation`: `"return_to_store"` when returnToStore else `"location_move"`.
3. Hook `processProductsUpdateWebhookJob` (§0.7): `before` captured once from `existingHistory` (already loaded before mutations); apply once after BOTH `syncProductSnapshotIfHistoryExists` and `appendLocationEvent` have run, with `after` from a fresh repository read; `operation: "products_update_sync"`. The already-sold quantity-sync branch stays a stock no-op (before.isSold && after.isSold → primitive resolves neither side).
4. Hook both orders commands (§0.10): `after` = the post-sale row, `before` = `{...after, isSold: false}`; `operation: "sold"`. Place the call so the idempotent short-circuit paths (context §9.1: same-orderId replay, already-terminal branch) do NOT reach it — hook only the outcome where `isSold` actually transitioned false→true (the command result / repository return exposes enough to decide; if it does not, derive from the pre-call `before.isSold` read).
5. Structured logging at each site per the existing command logging convention (context §3.7).

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Primitive resolution matrix: (a) both sides same config, same quantity → no mutation, `changed:false`; (b) same config, quantity 4→6 → net +2, one mutation; (c) different configs → source −q, destination +q, both states recalculated; (d) source resolves only → decrement only; (e) destination resolves only → increment only; (f) neither → no-op `changed:false`; (g) before.isSold=true & after.isSold=true → no-op; (h) source guard refusal still applies the destination increment (§0.15) | M3/M4, §0.7/§0.15 |
| C2 | Scan move (API): scanning an item between two configured locations moves exactly `item.quantity` units source→destination; same-location rescan (repository short-circuit) produces `changed:false` and no counter movement | M3, §0.10/§10.2 |
| C3 | Return to store: sold item returned via `returnToStore` → destination config gains the item; `before` (isSold:true) resolves no source | M3, §0.7/§9.2 |
| C4 | Webhook move: a location edit in Shopify admin (products/update path, worker process) moves stock identically to C2; property/category/quantity sync via the same webhook reallocates when the winning config changes; before-capture is single (no half-updated-row deltas) | M3, §0.7 |
| C5 | Sale: orders-paid (and orders-create) on an allocated item decrements its config once; replaying the same webhook (same orderId) decrements nothing further | M3, §0.10/§9.1 |
| C6 | Failure isolation: with a config quantity manually drifted to 0, a scan-out logs the §0.15 error and the scan itself still succeeds (HTTP 200, ScanHistory updated) | M4, §0.15 |
| C7 | Perimeter: `git diff --name-only` for the phase = exactly the five files listed; `scan-history.repository.ts` and `ws/*` untouched | §0.10/§0.9 |

Phase-close instruments: typecheck green; purity grep empty; perimeter diff (C7).

## Manual scenarios (executed against the running app + worker; expected quantity/state stated per step; configs seeded via P3 endpoints)
Seed: `LC1 + Dining Chairs + {}` and `H1 + Dining Chairs + {}`, thresholds 10/15/20 each. Record starting quantities Q_LC1, Q_H1.
1. Scan a qty-1 unsold Dining Chair from LC1 to H1 → Q_LC1−1 / Q_H1+1; states per boundaries. (M3)
2. Rescan same item to H1 → no change (`changed:false`). (M3)
3. Edit the same item's location LC1←H1 in **Shopify admin**; wait for products/update → counters return to start. Requires Redis + webhook worker running (master plan §10). (M3)
4. Mark item sold via an orders webhook (or replay a captured payload) → its config −qty; replay same payload → no further change. (M3/M5)
5. Return it to store via scanner UI → config +qty, `restockedAt` set. (M3)
6. Drift test: set a config quantity to 0 via sqlite on the scratch copy → scan out → error log with full §0.15 context, scan succeeds. (M4)
7. Scan an item in a location with NO configs → no stock change, no errors. (M1 fall-through)
8. Group-total note (M8): totals in these scenarios reconcile exactly because `{}` catch-alls are present; without them a shortfall is expected, not drift.

## Notes
- **Reviewer planted-defect probe (master plan §11.1.4):** temporarily swap the source/destination resolution in `applyItemStockChange` (decrement destination, increment source) → manual scenario 1 must show inverted counters; revert. Proves the scenario checklist can fail.
- The primitive lives in the stock module and imports only the stock repository + domain; call sites import the service (layering per architecture contract — commands may call services).
- Worker-process sites must not import `broadcastToShop` (no event work exists in this phase at all — §0.9).
- `itemIdentifiers` (`productId`, `scanHistoryId`) ride along solely for §0.15 log context.

## Review log
(append-only)
