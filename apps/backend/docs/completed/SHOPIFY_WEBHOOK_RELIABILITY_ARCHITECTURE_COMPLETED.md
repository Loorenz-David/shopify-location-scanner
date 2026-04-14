# Shopify Webhook Reliability Architecture Completed

## Summary

Implemented the `products/update` webhook reliability refactor end to end:

- replaced synchronous webhook processing in the HTTP request path with fast ACK + BullMQ queue intake
- added durable webhook intake persistence with dedupe and processing state tracking
- moved `products/update` business logic into a dedicated single-concurrency worker
- shortened the SQLite price-history write path to reduce lock contention and transaction timeout risk
- added admin-only webhook observability and replay endpoints
- added worker runtime scripts and PM2 configuration for deployment
- removed the old synchronous `handle-products-update-webhook.command.ts`

Verification completed during implementation:

- `npx prisma migrate dev --name add_webhook_intake_record`
- `npm run build`

## Final Request / Worker Flow

### Incoming webhook flow

`POST /shopify/webhooks/products/update`

1. [verify-shopify-webhook.middleware.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/middleware/verify-shopify-webhook.middleware.ts) verifies required Shopify headers, validates HMAC, resolves the linked shop, and attaches `webhookContext` to the request.
2. [shopify.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/controllers/shopify.controller.ts) creates a `WebhookIntakeRecord` and enqueues a BullMQ job using the intake id as the job id.
3. The controller returns `200 { received: true }` immediately.

### Background processing flow

1. [webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/webhook-worker.ts) consumes jobs from the `shopify-webhooks` queue with `concurrency: 1`.
2. The worker loads the intake record and skips already processed rows.
3. The worker marks the intake as `processing` and increments `attempts`.
4. [process-products-update-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-products-update-webhook.job.ts) parses the stored raw payload and performs the actual domain work:
   - normalize Shopify product id
   - extract webhook price
   - append price history if needed
   - fetch product location from Shopify Admin API
   - append location history if it changed
   - broadcast `scan_history_updated` once per successful job
5. The worker marks the intake as `processed` on success.
6. On failure, the worker stores `lastError`, marks the row `failed`, and rethrows only retryable failures so BullMQ backoff can retry them.

## Implemented Changes

- Schema updates in [schema.prisma](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/prisma/schema.prisma)
- Migration in [migration.sql](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/prisma/migrations/20260413114220_add_webhook_intake_record/migration.sql)
- Queue and Redis setup in [redis-connection.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/redis-connection.ts), [webhook-queue.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/webhook-queue.ts), and [index.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/index.ts)
- Intake persistence in [webhook-intake.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/repositories/webhook-intake.repository.ts)
- Fast ACK controller refactor in [shopify.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/controllers/shopify.controller.ts)
- Async domain processor in [process-products-update-webhook.job.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/jobs/process-products-update-webhook.job.ts)
- Worker entry point in [webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/webhook-worker.ts)
- Reduced SQLite lock duration in [scan-history.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts)
- Admin status and replay endpoints in [webhook-admin.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/controllers/webhook-admin.controller.ts), [webhook-admin.routes.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/routes/webhook-admin.routes.ts), and [server.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/server.ts)
- Worker scripts in [package.json](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/package.json)
- PM2 process config in [ecosystem.config.cjs](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/ecosystem.config.cjs)

## Data Model

Added `WebhookIntakeRecord` and `WebhookIntakeStatus` to track webhook intake and processing lifecycle.

Key fields:

- `dedupeKey`: `{shopId}:{topic}:{webhookId}` unique key for idempotent intake
- `status`: `pending | processing | processed | failed`
- `attempts`: incremented each time the worker starts processing
- `rawPayload`: raw JSON payload stored for deferred processing and replay
- `lastError`: capped error message persisted for inspection
- `retryable`: whether the last failure should be retried

The older `ShopifyWebhookDelivery` table still exists for historical data and for `orders/paid`, but it is no longer used for `products/update` intake or idempotency.

## Queue Design

Queue configuration:

- queue name: `shopify-webhooks`
- prefix: `iss`
- job payload: `{ intakeId: string }`
- job id: `intakeId`
- retry attempts: `5`
- retry backoff: exponential starting at `2000ms`
- worker concurrency: `1`

The `iss` prefix isolates BullMQ keys from other apps sharing the same Redis instance:

- `iss:shopify-webhooks:waiting`
- `iss:shopify-webhooks:active`
- `iss:shopify-webhooks:completed`
- `iss:shopify-webhooks:failed`

Using `jobId = intakeId` means enqueue is idempotent for the same intake row and protects against duplicate queue insertion.

## Reliability Improvements

### Fast ACK

The request path no longer waits for:

- scan-history writes
- Shopify Admin API calls
- WebSocket broadcasts

That removes the previous failure mode where webhook requests stayed open long enough for SQLite lock contention and Prisma transaction expiry to trigger Shopify retries.

### Intake-first idempotency

The intake row is written before async processing begins. That means duplicate deliveries can be recognized even if the worker crashes later.

### Shorter SQLite write path

`appendPriceChangeIfHistoryExists()` now performs:

1. `scanHistory` lookup outside a transaction
2. latest price lookup outside a transaction
3. a minimal `scanHistoryPrice.create()` write only when needed

This reduces time spent holding a SQLite write lock compared with the old transaction-heavy implementation.

### Controlled retry behavior

The worker treats these as transient and retryable:

- socket timeouts
- expired Prisma transactions
- `SQLITE_BUSY`
- `SQLITE_LOCKED`
- Redis connection refusal

Non-retryable failures are recorded but not rethrown, so they stop retrying and remain visible for admin inspection and replay.

## Admin Observability

Added authenticated admin-only endpoints:

- `GET /internal/webhooks`
- `GET /internal/webhooks/:id`
- `POST /internal/webhooks/:id/replay`
- mirrored under `/api/internal/webhooks`

Behavior:

- list endpoint returns recent webhook intake records and supports status filtering
- detail endpoint returns one intake record including `rawPayload`
- replay resets the record to `pending`, clears previous error state, and re-enqueues the same intake id
- endpoints are scoped to the admin user’s `shopId` when present

## Deployment / Runtime Notes

- Redis is now a required dependency for `products/update` webhook processing.
- The worker must run as a separate process from the API server.
- The worker initializes SQLite runtime pragmas before consuming jobs.
- PM2 config now includes `shopify-backend` and `shopify-webhook-worker`.
- Local scripts were added:
  - `npm run dev:worker`
  - `npm run start:worker`

## Removed Legacy Path

Deleted the old synchronous command:

- `src/modules/shopify/commands/handle-products-update-webhook.command.ts`

The active `products/update` implementation is now only the queue-based architecture.

## Remaining Operational Work

The implementation is complete, but production readiness still depends on live validation:

- confirm Redis is running in each environment
- confirm the worker process is running alongside the API
- verify real Shopify `products/update` deliveries move `pending -> processing -> processed`
- verify scan-history writes and WebSocket updates remain correct under live traffic
- monitor logs for the absence of the old timeout/retry storm pattern

## Notes

- `orders/paid` still uses the older synchronous command path and `ShopifyWebhookDelivery`; this refactor only changed `products/update`.
- Unlinking a Shopify store still attempts to remove managed webhook subscriptions before clearing the access token, but that cleanup remains best-effort.
- The original implementation guide remains in [SHOPIFY_WEBHOOK_RELIABILITY_PLAN.md](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/docs/under_development/SHOPIFY_WEBHOOK_RELIABILITY_PLAN.md).
