# Relaxing the sold-item location gate

## Goal

After an item is sold (Shopify webhook marks the scan-history record `isSold`), the app currently only allows changing the **logistic** location. We want to also allow moving sold items to/between **shop** locations, while recording movement analytics only for the shop movement (logistic movements stay analytics-free, as today).

## Where the gate actually lives today

There is no single backend gate — the rule is enforced in three separate places:

1. **Frontend** — the UI blocks shop-location changes for sold items.
2. **External API** — `src/modules/external-api/commands/update-manager-app-items-location.command.ts:213`: unsold items route to `updateItemLocationCommand` (shop/Shopify), sold items route to `markLogisticPlacementCommand` only. If the position doesn't match a logistic location it fails with `LOGISTIC_LOCATION_NOT_FOUND` ("Sold item requires a known logistic location").
3. **Shopify products/update webhook job** — `src/modules/shopify/jobs/process-products-update-webhook.job.ts:89-109`: sold items only get quantity synced; location sync is skipped.

Notably, the seller-facing endpoint (`PUT /shopify/items/location` → `updateItemLocationCommand`) has **no backend sold check at all** — only the frontend protects it. So the backend already "allows" the move; it just corrupts state when it happens (see below).

## Why the gate existed — the analytics couplings

All in `src/modules/scanner/repositories/scan-history.repository.ts`:

- **`appendLocationEvent` flips `isSold` back to false** (lines 547 / 661): `isSold: eventType === "sold_terminal"`. Any post-sale `location_update` silently un-sells the item → it vanishes from every logistic query (`isSold: true` filter), the webhook job starts treating it as unsold again, and stats break.
- **`appendLocationEvent` bumps `lastModifiedAt`** (line 662), and `stats-items.repository.ts:160-163` computes per-item `timeToSell = lastModifiedAt - createdAt` for sold items. A post-sale move would inflate time-to-sell.
- **Sold-time attribution uses "latest `location_update` event"** (line 1116-1130): `itemsSold` / `totalTimeToSellSeconds` / `totalValuation` in `locationStatsDaily` are attributed to the location of the most recent `location_update`. Safe at sold time (post-sale moves come later), **but**:
- **`syncSoldQuantityIfHistoryExists` re-derives that location later** (lines 1525-1541): when a products/update webhook changes quantity on a sold item, it re-queries the latest `location_update` with no time bound. A post-sale shop move would mis-attribute the sold-stats delta to the *new* location.
- **`appendLocationEvent` increments `locationStatsDaily.itemsReceived`** for every `location_update` (lines 582-604 / 676-698). This is the "shop movement analytics" we *want* to keep recording.

Logistic placements write only to `LogisticEvent` (via `logisticEventRepository.appendEvent`) and never touch `locationStatsDaily` — so "no analytics for logistic movements" already holds and needs no change.

## Plan

### A. Make post-sale `location_update` harmless (core correctness)

All in `scan-history.repository.ts`:

1. **Stop un-selling on move** — in the `appendLocationEvent` update path (line 661), change
   `isSold: eventType === "sold_terminal"` to preserve the existing value:
   `isSold: eventType === "sold_terminal" ? true : existing.isSold`.
   (The create path at line 547 is fine — a brand-new record from a location scan is unsold.)
2. **Preserve `lastModifiedAt` for sold items** — same update block: when `existing.isSold`, keep `existing.lastModifiedAt` (it doubles as the sold timestamp for `stats-items` timeToSell and daily-bucket stats). Optional longer-term cleanup: a dedicated `soldAt` column so `lastModifiedAt` can go back to meaning "last activity".
3. **Bound sold-attribution queries by sold time** — in `syncSoldQuantityIfHistoryExists`, add `happenedAt: { lte: soldAt }` to the `arrivedEvent` `location_update` query (line 1525) so post-sale moves never steal `itemsSold`/timeToSell attribution. (`soldAt` is already computed just above at line 1518.)
4. **Keep the `itemsReceived` increment** on `location_update` — this is the shop-movement analytic we want. Decision flag: this counts an already-sold item as "received" at the destination, which skews per-location sell-through (`itemsSold / itemsReceived`) since that item can never sell *from there*. If that matters, gate the `locationStatsDaily` upsert with `!existing.isSold` instead.

### B. Open the gates deliberately

5. **External API** (`update-manager-app-items-location.command.ts`): for sold items, resolve the position against logistic locations first; if `LOGISTIC_LOCATION_NOT_FOUND`, fall back to `updateItemLocationCommand` (same path as unsold). Precedence rule when a position string matches both: logistic wins. Keep the conflict errors as-is.
6. **Frontend**: remove the UI block for changing a sold item's shop location.
7. **Seller endpoint**: `updateItemLocationCommand` stays ungated, but now by design instead of by accident — add an explicit log line for post-sale moves. Decide whether the manager app should get an outbound webhook for a post-sale shop move (currently only logistic placement emits `item_placed` via the outbound-webhook worker).

### C. Semantics to keep (or consciously change)

8. **Logistic task stays open** after a shop move: `isSold` stays true and `logisticsCompletedAt` stays null, so the item remains in worker task lists with its `latestLocation` updated. Recommended: keep it that way and let the existing fulfil flow close the task. If a shop move should close/annotate the task, that's an explicit extra step — don't let it happen implicitly.
9. **Keep the webhook job's sold guard** (`process-products-update-webhook.job.ts:89-109`): Shopify-driven location syncs continue to skip sold items — only user/manager-initiated moves apply. This also prevents webhook loops (our Shopify location write bounces back a products/update webhook, which lands in the sold branch and only syncs quantity).
10. **Verify Shopify accepts the write** for sold products: `updateItemLocationCommand` mutates the product's location in Shopify — confirm sold products' status (active/draft/archived) still accepts that mutation.

### D. Return-to-store (customer return) flag

The frontend no longer guards sold-item moves; instead it asks the user whether a move is a **normal move** (sold item just relocates, stays sold) or a **return to store** (customer returned it — the item re-enters the selling pipeline). The frontend sends a flag for the latter.

11. **Contract** — add `returnToStore: z.boolean().optional()` to **both** input schemas in `shopify.contract.ts`: `UpdateItemLocationInputSchema` (line 34, used by `PATCH /shopify/products/:productId/location`) and `UpdateItemLocationByIdentifierSchema` (line 45, used by `PATCH|POST /shopify/items/location`, single and batch — the flag is per item so one batch can mix returns and normal moves). The batch controller path (`shopify.controller.ts:289`) rebuilds the payload with only `location` — it must pass `returnToStore` through or the flag is silently dropped. Validation in `updateItemLocationCommand`: `returnToStore: true` on an **unsold** item is a `ValidationError` (catches frontend bugs; in the batch route it surfaces as a per-item failure); absent/false on a sold item = normal move (section A semantics).
12. **New event type `"returned_to_store"`** — add to the event enum (`scan-history.contract.ts:144`, `scanner/domain/scan-history.ts`). The return move appends this event (instead of `location_update`) so the timeline explicitly shows the return. Every "arrived location" reader must then accept both types, i.e. `eventType: { in: ["location_update", "returned_to_store"] }`:
    - sold-flow arrived query (`scan-history.repository.ts:1116`)
    - quantity-sync arrived query (`scan-history.repository.ts:1525`)
    - the `itemsReceived` upsert branches (lines 582 / 676) — a return **should** increment `itemsReceived` (the location genuinely receives the item back into stock)
    This also makes second-sale attribution correct for free: the next sale's `arrivedEvent` is the return event, so time-to-sell and location attribution start from the return, not from the original intake.
13. **Record reset on return** — add a nullable `restockedAt DateTime?` column to `ScanHistory` (additive migration, no backfill; `null` = never returned). In the same transaction, reset the sold/logistic lifecycle: `isSold: false`, `lastSoldChannel: null`, `orderId: null`, `orderNumber: null`, `intention: null`, `fixItem: null`, `isItemFixed: false`, `fixNotes: null`, `scheduledDate: null`, `lastLogisticEventType: null`, `logisticLocationId: null`, `logisticsCompletedAt: null`, `lastModifiedAt: happenedAt`, `restockedAt: happenedAt`. `restockedAt` is overwritten on each subsequent return and **not** cleared on the next sale — it always means "last time this item re-entered the pipeline". The original order linkage is preserved on the historical `sold_terminal` events (they carry `orderId`), so nothing is lost. With `isSold: false` the item automatically drops out of all logistic task lists and the products/update webhook resumes normal location syncing — exactly "back in the pipeline".
14. **Fix the resale dedupe trap** — `appendSoldTerminalEventWithFallback` skips stats and skips creating a `sold_terminal` event when one already exists for the same location (`alreadyTerminalForLocation`, line 1043). A returned item that sells a second time from the same sold-location would be **silently uncounted**. Bound the dedupe with `restockedAt`: a prior `sold_terminal` event only suppresses the new sale if `happenedAt > restockedAt` (when `restockedAt` is null, behavior is unchanged). Genuine second sales are recorded; duplicate webhooks for the same sale are still suppressed. The same bound applies to the orderId-based idempotency check (line 1015) only if Shopify can reuse order ids — it can't, so that one stays as-is.
15. **Keep historical sold stats** — do not decrement `locationStatsDaily` / `salesChannelStatsDaily` for the original sale; the sale happened. If return metrics are wanted later (returns per location/day), that's a separate additive counter.
16. **Per-item timeToSell with `restockedAt`** — `stats-items.repository.ts:160` becomes `lastModifiedAt - (restockedAt ?? createdAt)` for sold items, so a second sale measures from the return, not the original intake — still a pure record computation, no event join on the paginated list. Check the `timeInStock` fast path/sort in the same file: unsold returned items should also measure stock time from `restockedAt ?? createdAt`. The per-location `locationStatsDaily` timeToSell is already correct via item 12.
17. **Scope** — the external manager-app API keeps normal-move semantics only (no return flag) until the manager app needs it.

### E. Regression tests

- `location_update` on a sold item: `isSold` stays true, `lastModifiedAt` unchanged, item still returned by `getLogisticItemsQuery`, `itemsReceived` behavior per decision 4.
- products/update quantity sync **after** a post-sale move: sold-stats delta attributed to the pre-sale location.
- External API: sold item + shop-location position → scanner route succeeds; sold + logistic position → logistic route; position matching both → logistic precedence.
- Stats item timeToSell unchanged by post-sale moves.
- Return-to-store: sold item + `returnToStore: true` → `isSold` false, logistic fields cleared, `restockedAt` set, `returned_to_store` event appended, `itemsReceived` incremented, item gone from logistic lists.
- `returnToStore: true` on an unsold item → `ValidationError`.
- Sell → return → sell again (same location): second sale creates a new `sold_terminal` event and increments `itemsSold`/revenue; per-item timeToSell = second sale − `restockedAt`; per-location timeToSell measured from the return event.
- Sell → return → return again: `restockedAt` reflects the latest return.
- Duplicate sold webhooks for the same order still deduped after a return exists in the history.
