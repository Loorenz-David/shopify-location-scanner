# Order Marker Items Completed

## Summary

Implemented Shopify order marker support end to end for `orders/create` and `orders/paid`.

The backend now:

- detects internal marker line items from reserved Shopify SKUs
- keeps marker items out of normal `ScanHistory` persistence
- derives `LogisticIntention` and boolean flags from those marker SKUs
- applies the resolved marker values to the real sold items in the order
- processes order webhooks asynchronously through the webhook intake worker
- keeps the default webhook logs concise while allowing detailed payload logging behind an environment flag

Verification completed during implementation:

- `npm run build`
- live manual webhook/order creation validation against Shopify

## Final Behavior

### Marker contract

Supported intent SKUs:

- `INTENT_STORE_PICKUP` -> `store_pickup`
- `INTENT_LOCAL_DELIVERY` -> `local_delivery`
- `INTENT_INTERNATIONAL_SHIPPING` -> `international_shipping`
- `INTENT_CUSTOMER_TOOK_IT` -> `customer_took_it`

Supported flag SKUs:

- `FLAG_NEEDS_FIXING` -> `fixItem = true`

The active implementation recognizes marker items when either of these is true:

- `line_item.product_type === "INTERNAL_MARKER"`
- the line item SKU exactly matches one of the supported marker SKUs above

The SKU lookup is exact, not prefix-based. Unknown `INTENT_*` or `FLAG_*` values are not silently accepted as valid markers.

### Order webhook flow

`POST /shopify/webhooks/orders/create`

`POST /shopify/webhooks/orders/paid`

1. [verify-shopify-webhook.middleware.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/middleware/verify-shopify-webhook.middleware.ts) verifies headers, validates HMAC, resolves the shop, and attaches `webhookContext`.
2. [enqueue-shopify-webhook.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/enqueue-shopify-webhook.command.ts) persists a `WebhookIntakeRecord`, enqueues a BullMQ job, and returns immediately to Shopify.
3. [webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/webhook-worker.ts) consumes the queued intake and dispatches to [process-shopify-webhook-intake.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-shopify-webhook-intake.job.ts).
4. The topic-specific order job parses the stored raw payload and runs the existing order command:
   - [process-orders-create-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-orders-create-webhook.job.ts)
   - [process-orders-paid-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-orders-paid-webhook.job.ts)
5. The order command:
   - parses markers using [order-marker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/domain/order-marker.ts)
   - filters marker items out of the normal product loop
   - persists real sold items through [scan-history.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts)
   - applies the resolved markers to the order’s sold items through [apply-order-markers.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/apply-order-markers.command.ts)

## Implemented Changes

- Marker parsing domain in [order-marker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/domain/order-marker.ts)
- Optional detailed line-item debug formatter in [order-webhook-debug.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/domain/order-webhook-debug.ts)
- Marker application orchestration in [apply-order-markers.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/apply-order-markers.command.ts)
- Shared async intake command in [enqueue-shopify-webhook.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/enqueue-shopify-webhook.command.ts)
- Worker topic dispatcher in [process-shopify-webhook-intake.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-shopify-webhook-intake.job.ts)
- Topic-specific order jobs in [process-orders-create-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-orders-create-webhook.job.ts) and [process-orders-paid-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-orders-paid-webhook.job.ts)
- Updated order webhook commands in [handle-orders-create-webhook.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/handle-orders-create-webhook.command.ts) and [handle-orders-paid-webhook.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/handle-orders-paid-webhook.command.ts)
- Repository support for order-level scan-history updates in [scan-history.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts)
- Extended Shopify order line-item contract in [shopify.contract.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/contracts/shopify.contract.ts)
- Webhook replay support for order topics in [webhook-admin.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/controllers/webhook-admin.controller.ts)
- Debug env flag in [env.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/config/env.ts)

## Logging

Default order webhook completion logs now include marker outcome:

- `hasMarkerIntention`
- `intention`
- `fixItem`
- `internalMarkerCount`
- `processedProducts`
- `skippedProducts`

Verbose incoming order payload logging is disabled by default and can be enabled with:

```env
SHOPIFY_DEBUG_ORDER_WEBHOOKS=true
```

That flag turns on the detailed `"Received Shopify orders/... webhook payload"` logs with per-line-item summaries.

## Important Notes

- The original plan assumed marker detection would rely on `product_type === "INTERNAL_MARKER"`. Real Shopify order webhook payloads did not reliably include that field, so the implementation was hardened to use exact reserved SKU matching as a fallback.
- Order webhooks now use the same async intake-and-worker architecture as `products/update`.
- Duplicate delivery of the same webhook is guarded by webhook intake dedupe and the existing order webhook delivery table.
- Shopify may still legitimately send both `orders/create` and `orders/paid` for the same order. That is not itself a retry bug; it is normal topic behavior.

## Outcome

The shipped result is a clean, feature-scoped implementation that follows the backend contract:

- domain parsing is pure and isolated
- commands orchestrate state changes
- repository access stays inside repository modules
- webhook admission is fast and worker-backed
- logging is useful by default and deeper when explicitly enabled
