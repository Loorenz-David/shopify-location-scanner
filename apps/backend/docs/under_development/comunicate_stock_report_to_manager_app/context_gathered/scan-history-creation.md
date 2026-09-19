# Where a new ScanHistory row gets created

A `ScanHistory` row is only ever created in one file: [scan-history.repository.ts](../../../../src/modules/scanner/repositories/scan-history.repository.ts). Both creation sites are guarded by a lookup on `shopId`/`productId` — a new row is only inserted when no existing row is found for that product.

## 1. `appendLocationEvent` (line ~548)

Inside a `prisma.$transaction`, if `tx.scanHistory.findUnique({ where: { shopId_productId } })` returns nothing, it creates the record with the scanned location, item metadata (category, sku, barcode, dimensions, volume, properties, etc.), and an initial `events` entry (`eventType`, `location`, `happenedAt`).

Callers:
- [update-item-location.command.ts:134](../../../../src/modules/shopify/commands/update-item-location.command.ts#L134) — item scanned/located via the scanner UI (the normal, first-touch path).
- [process-products-update-webhook.job.ts:149](../../../../src/modules/shopify/jobs/process-products-update-webhook.job.ts#L149) and [:205](../../../../src/modules/shopify/jobs/process-products-update-webhook.job.ts#L205) — Shopify `products/update` webhook triggers a location sync.

**Stock-location matching happens right after, not inside this call.** All 4 callers of either creation path (see below) follow the `ScanHistory` append with a call to `applyItemStockChange` from [apply-item-stock-change.service.ts](../../../../src/modules/stock/services/apply-item-stock-change.service.ts), passing a before/after `ScanHistory` snapshot plus an `operation` (`location_move`, `return_to_store`, or `sold`). That service is what checks whether the target location matches a stock-location's grouping criteria (the wood-grouping strategy) and increments/decrements `LocationStock.quantity`/`instanceCount` via [location-stock.repository.ts](../../../../src/modules/stock/repositories/location-stock.repository.ts) (`applyIncrement`/`applyGuardedDecrement`). So the count-matching logic is a separate step layered on top of the `ScanHistory` write, shared by both creation paths and by plain location moves on existing rows.

## 2. `appendSoldTerminalEventWithFallback` (function starts ~831, create at ~974)

Fallback path: an item was marked sold but no scan history row exists yet for it (i.e. it was never scanned into location tracking before selling). Creates the row directly with `latestLocation: null`, `isSold: true`, `lastSoldChannel` (the sales channel/origin — see below), `orderId`, `orderNumber`.

Callers:
- [handle-orders-create-webhook.command.ts:179](../../../../src/modules/shopify/commands/handle-orders-create-webhook.command.ts#L179) — Shopify `orders/create` webhook.
- [handle-orders-paid-webhook.command.ts:157](../../../../src/modules/shopify/commands/handle-orders-paid-webhook.command.ts#L157) — Shopify `orders/paid` webhook.

Both webhook commands look up the existing row by `shopId`+`productId` twice: once explicitly beforehand (`findByShopAndProduct`, used to build the before-snapshot for `applyItemStockChange`), and again inside `appendSoldTerminalEventWithFallback`'s own transaction, which is the actual create-vs-update decision. Same `shopId`/`productId` key both times — no separate dedup by SKU/barcode.

The sale's origin is captured via `salesChannel` (`classifyShopifyOrderChannel(...)`, e.g. `physical`/`online`/`unknown`), stored on the row as `lastSoldChannel` — so it's the sales channel/origin that's recorded, in addition to `shopId` identifying which shop.

## Summary

Normal flow: a scan/location update creates the row first. The sold-webhook paths only create one directly as a fallback, when the item was sold without ever passing through location scanning. In both paths, the `ScanHistory` write is immediately followed by `applyItemStockChange`, which is where stock-location count matching actually happens.
