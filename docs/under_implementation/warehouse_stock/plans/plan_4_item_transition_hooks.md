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
2. Hook `updateItemLocationCommand` (§0.10): hoist a `scanHistoryRepository.findByShopAndProduct` read (the call the command already makes inside its `returnToStore` branch, made unconditional) → `before`; **locate it by symbol, not line — context §0.10's `:53-70` citation has drifted, the branch now opens at `update-item-location.command.ts:48`**; the returned `historyItem` → `after`; call once after `appendLocationEvent` returns; `operation`: `"return_to_store"` when returnToStore else `"location_move"`.
3. Hook `processProductsUpdateWebhookJob` (§0.7): `before` captured once from `existingHistory` (already loaded before mutations); apply once after BOTH `syncProductSnapshotIfHistoryExists` and `appendLocationEvent` have run, with `after` from a fresh repository read; `operation: "products_update_sync"`. The already-sold quantity-sync branch stays a stock no-op (before.isSold && after.isSold → primitive resolves neither side).
4. Hook both orders commands (§0.10) — **amended 2026-09-01 (owner, projection card 1): read the stored row first.** `before` is a real `scanHistoryRepository.findByShopAndProduct` read taken **before** the sold write, **not** the fabricated `{...after, isSold: false}` of §0.10's call-site table. `after` = the post-sale row. `operation: "sold"`.

   **Why the fabricated `before` is wrong, recorded because the owner's question was the right one and the answer is not the obvious one.** The owner asked whether Shopify's own idempotency already prevents a double sale from affecting an already-sold item. **It does, at the item level** — verified at source: `appendSoldTerminalEventWithFallback` looks for an existing `sold_terminal` event with the same `orderId` and, on a match, `return`s the row **without writing `isSold` again**. The item is marked sold exactly once, as expected.

   The stock counter is not protected by that guard, because **the hook sits above it**. Option A (§0.10) places the call in the command layer, after the repository returns — and the repository returns a `ScanHistoryRecord`, the row's *state*, with no signal saying whether this call changed it. A replayed delivery returns `isSold: true` indistinguishably from the first. Fabricating `before` as `isSold: false` then asserts a false→true transition on **every** delivery, so the primitive decrements again on a sale that already decremented.

   Reading the row makes `before.isSold` true on the replay, which lands on the primitive's existing `before.isSold && after.isSold` no-op row (C1(g)) — no new mechanism, just a real input instead of an assumed one. **`orders/create` and `orders/paid` both fire for the same order** (the dev database holds 490 create and 117 paid intake records), so this is the normal path, not an edge case.

   **This amends context §0.10's "no extra query is needed" for these two call sites only**, and aligns them with §0.7's table, which already said `before` is the existing row. The two ratified sections disagreed; §0.7 is the one that survives. Place the call so the idempotent short-circuit paths (context §9.1: same-orderId replay, already-terminal branch) do NOT reach it — hook only the outcome where `isSold` actually transitioned false→true (the command result / repository return exposes enough to decide; if it does not, derive from the pre-call `before.isSold` read).
5. Structured logging at each site per the existing command logging convention (context §3.7).

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Primitive resolution matrix: (a) both sides same config, same quantity → no mutation, `changed:false`; (b) same config, quantity 4→6 → net +2, one mutation; (c) different configs → source −q, destination +q, both states recalculated; (d) source resolves only → decrement only; (e) destination resolves only → increment only; (f) neither → no-op `changed:false`; (g) before.isSold=true & after.isSold=true → no-op; (h) source guard refusal still applies the destination increment (§0.15) | M3/M4, §0.7/§0.15 |
| C2 | Scan move (API): (a) scanning an item between two configured locations moves exactly `item.quantity` units — source decreases by that amount **and** destination increases by it, both states recalculated; (b) rescanning the same item to the location it already occupies produces `changed:false` and **no** counter movement on either side (the repository short-circuits before any event, §10.2) | M3, §0.10/§10.2 |
| C3 | Return to store: (a) a sold item returned via `returnToStore` increases the destination config by exactly `item.quantity`; (b) **nothing is decremented anywhere** — `before` carries `isSold: true`, so the primitive resolves no source side (§0.7's eligibility rule), and a decrement here would double-count against the sale that already removed it | M3, §0.7/§9.2 |
| C4 | Webhook path (`products/update`, worker process): (a) a location edit made in the Shopify admin moves stock **identically to C2(a)** — same amounts, same states; (b) a property, category or quantity sync that changes which config wins reallocates the item between configs without any location change; (c) `before` is captured **once**, from `existingHistory` ahead of both writes, and the stock change is applied **once** after both have run — so no delta is computed against a half-updated row (§0.7's ordering constraint); (d) an already-sold item whose quantity syncs is a stock **no-op** (`before.isSold && after.isSold`) | M3, §0.7 |
| C5 | Sale: (a) `orders/paid` on an allocated item decrements its config by exactly `item.quantity`, **once**; (b) replaying the identical webhook (same `orderId`) decrements **nothing further** — the idempotent short-circuits of §9.1 must not reach the primitive, including the already-terminal branch that still sets `isSold: true`; (c) `orders/create` behaves identically to (a) and (b) | M3, §0.10/§9.1 |
| C6 | Failure isolation, with a config quantity manually drifted to 0 on a scratch copy: (a) a scan-out emits the §0.15 `logger.error` carrying the operation context; (b) the **scan itself still succeeds** — HTTP 200 and `ScanHistory` updated; (c) the guard refusal does **not** roll back or clamp, and any other valid stock mutation in the same operation still applies (§0.15: a source refusal does not prevent the destination increment) | M4, §0.15 |
| C7 | Perimeter: (a) `git diff --name-only` for the phase = exactly the five files listed; (b) `src/modules/scanner/repositories/scan-history.repository.ts` is **byte-identical** to its pre-phase state (§0.10 — Option A exists precisely so this file is never touched); (c) `src/modules/ws/*` is byte-identical (§0.9 — V1 adds no event) | §0.10/§0.9 (perimeter integrity — **no `M` id by design**, per the P2 C7 precedent) |

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — this phase touches the domain P1 built and the service P2 built; the seam is what makes a regression in either visible here rather than at P6); perimeter diff (C7).

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
