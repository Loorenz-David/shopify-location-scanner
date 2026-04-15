# Shopify Webhook Reliability Refactor — Codex Implementation Plan
## Fast ACK + BullMQ Async Processing Pipeline

---

## Context & Failure Evidence

### What the logs prove

From `ec2-logs/logs/shopify-backend-error.log`, the failure is exact and repeatable:

```
PrismaClientKnownRequestError: Socket timeout
  at Qr.transaction → LibraryEngine.ts:217
  at appendPriceChangeIfHistoryExists → scan-history.repository.ts:826
  at handleProductsUpdateWebhookCommand → handle-products-update-webhook.command.ts:83
  at handleProductsUpdateWebhook → shopify.controller.ts:65
```

And:

```
Transaction API error: Transaction already closed: A query cannot be executed on an
expired transaction. The timeout for this transaction was 5000 ms, however 15018 ms
passed since the start of the transaction.
```

**Burst pattern observed:** Lines 109–123 in the log show ~15 webhook failures within 52 seconds for `POST /shopify/webhooks/products/update`, all hitting the same callsite. This is Shopify retrying a product batch after our 500 responses. The failure cascades because concurrent SQLite transactions contend on the same write lock.

### Root causes

1. **Synchronous processing in the request path.** `shopifyController.handleProductsUpdateWebhook` calls `handleProductsUpdateWebhookCommand` inline before returning a response.
2. **Long interactive Prisma transaction.** `appendPriceChangeIfHistoryExists` at `scan-history.repository.ts:826` opens a transaction that performs a lookup (`findFirst`) and a conditional write, and SQLite serializes all writers. Under concurrent webhooks, waits exceed the 5 s transaction timeout.
3. **`ShopifyWebhookDelivery` is written after processing.** If the handler crashes, no idempotency record is saved, so Shopify's retry is processed again, creating more contention.
4. **No queue exists.** All work happens synchronously inside Express.

---

## Current Architecture (as found)

```
POST /shopify/webhooks/products/update
  → verifyProductsUpdateWebhookMiddleware          (verify-shopify-webhook.middleware.ts)
      HMAC verify, header validation, shop lookup, attach webhookContext to req
  → asyncHandler
  → shopifyController.handleProductsUpdateWebhook  (shopify.controller.ts:65)
  → handleProductsUpdateWebhookCommand             (handle-products-update-webhook.command.ts)
      1. Check ShopifyWebhookDelivery (idempotency guard — READS from DB)
      2. normalizeProductId / getWebhookPrice / parseHappenedAt
      3. scanHistoryRepository.appendPriceChangeIfHistoryExists()   ← TRANSACTION TIMEOUT HERE
           opens prisma.$transaction(async tx => {
             tx.scanHistory.findFirst(...)
             tx.scanHistoryPrice.findFirst(...)
             tx.scanHistoryPrice.create(...)
           })
      4. shopifyAdminApi.getProductWithLocation()  ← EXTERNAL HTTP CALL IN REQUEST PATH
      5. scanHistoryRepository.appendLocationEvent()
      6. broadcastToShop(...)
      7. prisma.shopifyWebhookDelivery.create(...)  ← written LAST, so retries re-run everything
  → res.status(200).json(...)
```

### Existing relevant files

| File | Role |
|---|---|
| `src/modules/shopify/routes/shopify.routes.ts` | Route definitions |
| `src/modules/shopify/middleware/verify-shopify-webhook.middleware.ts` | HMAC verification |
| `src/modules/shopify/commands/handle-products-update-webhook.command.ts` | Synchronous processing command |
| `src/modules/shopify/controllers/shopify.controller.ts` | HTTP controller |
| `src/modules/scanner/repositories/scan-history.repository.ts` | Repository with `appendPriceChangeIfHistoryExists` at line 826 |
| `prisma/schema.prisma` | DB schema — has `ShopifyWebhookDelivery` model |
| `src/server.ts` | Express setup, raw body middleware at lines 63–65 |
| `package.json` | No BullMQ or Redis client yet |

---

## Target Architecture

```
POST /shopify/webhooks/products/update
  → verifyProductsUpdateWebhookMiddleware   (unchanged — fast, no heavy DB work)
  → shopifyController.handleProductsUpdateWebhook  (refactored)
      1. Write WebhookIntakeRecord to DB (minimal — topic, webhookId, shopId, rawPayload, status=pending)
      2. Enqueue BullMQ job: webhookQueue.add("products/update", { intakeId })
      3. Return res.status(200).json({ received: true })   ← IMMEDIATE ACK

[separate PM2 process: webhook-worker]
  → BullMQ Worker consumes "products/update" jobs
  → processProductsUpdateWebhookJob(job)
      1. Load WebhookIntakeRecord by intakeId
      2. Check if already processed (idempotency via status field)
      3. Mark status = "processing"
      4. normalizeProductId / getWebhookPrice / parseHappenedAt
      5. appendPriceChangeIfHistoryExists()   (short transaction — refactored)
      6. shopifyAdminApi.getProductWithLocation()
      7. appendLocationEvent()
      8. broadcastToShop(...)
      9. Mark status = "processed", set processedAt
      On failure: mark status = "failed", increment attempts, persist lastError
      BullMQ retries transient failures with exponential backoff
```

---

## Dependency Installation

### Step 1 — Install BullMQ and Redis client

```bash
cd apps/backend
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

**BullMQ requires Redis.** On EC2, Redis must be running. If not already present:

```bash
# On EC2 (Ubuntu)
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

Add to environment config (`src/config/env.ts`):

```typescript
REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
```

---

---

## Redis Key Namespacing

This app shares a Redis instance with other local applications. To prevent key collisions, every BullMQ Queue and Worker must declare the same `prefix` option. BullMQ uses this prefix to namespace all its internal keys:

```
{prefix}:{queue-name}:waiting
{prefix}:{queue-name}:active
{prefix}:{queue-name}:completed
{prefix}:{queue-name}:failed
...
```

**Chosen prefix:** `iss` (item-scanner-shopify)

With this in place, all keys for this app look like:

```
iss:shopify-webhooks:waiting
iss:shopify-webhooks:active
iss:shopify-webhooks:failed
...
```

Other apps using a different prefix (or no prefix) are completely isolated.

### Rules Codex must follow

1. The `prefix` value must be identical on the `Queue` constructor and the `Worker` constructor. If they differ, the worker will listen on a different key set and jobs will never be consumed.
2. The prefix is defined once as the exported constant `QUEUE_PREFIX = "iss"` in `webhook-queue.ts`. Both `Queue` and `Worker` import and use this constant — never hardcode the string in two places.
3. If a BullMQ Board / UI is added for observability (e.g., `@bull-board/express`), it must also be initialized with the same prefix when scanning queues.

### Verifying isolation in Redis CLI

To inspect only this app's keys:

```bash
redis-cli KEYS "iss:*"
```

To see keys from other apps (should return nothing from this app):

```bash
redis-cli KEYS "bull:*"     # default BullMQ prefix used by other apps
```

---

## Phase 1 — Prisma Schema: Add WebhookIntakeRecord

### File: `prisma/schema.prisma`

Add the following model. Do NOT modify any existing models.

```prisma
model WebhookIntakeRecord {
  id            String    @id @default(cuid())
  shopId        String
  shopDomain    String
  topic         String
  webhookId     String
  rawPayload    String    // JSON string of raw body
  dedupeKey     String    @unique  // "{shopId}:{topic}:{webhookId}"
  status        WebhookIntakeStatus @default(pending)
  attempts      Int       @default(0)
  processedAt   DateTime?
  lastError     String?
  retryable     Boolean   @default(true)
  receivedAt    DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shop          Shop      @relation(fields: [shopId], references: [id])

  @@index([shopId, status])
  @@index([topic, status])
  @@index([status, createdAt])
}

enum WebhookIntakeStatus {
  pending
  processing
  processed
  failed
}
```

Add the reverse relation to the `Shop` model:

```prisma
model Shop {
  // ... existing fields ...
  webhookIntakeRecords  WebhookIntakeRecord[]
}
```

After editing schema, run:

```bash
npx prisma migrate dev --name add_webhook_intake_record
npx prisma generate
```

---

## Phase 2 — Queue Infrastructure

### New file: `src/shared/queue/redis-connection.ts`

```typescript
import { Redis } from "ioredis";
import { env } from "../../config/env.js";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});
```

### New file: `src/shared/queue/webhook-queue.ts`

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

// Queue name and prefix are scoped to this app to avoid colliding with
// other applications sharing the same Redis instance (local dev or EC2).
// All BullMQ keys for this app will live under:  {iss}:{queue-name}:*
const QUEUE_PREFIX = "iss"; // item-scanner-shopify
const QUEUE_NAME   = "shopify-webhooks";

export const BULLMQ_QUEUE_OPTIONS = {
  prefix: QUEUE_PREFIX,
} as const;

export type WebhookJobPayload = {
  intakeId: string;
};

export const webhookQueue = new Queue<WebhookJobPayload>(QUEUE_NAME, {
  connection: redisConnection,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: 100,  // keep last 100 completed
    removeOnFail: 500,      // keep last 500 failed for inspection
  },
});
```

### New file: `src/shared/queue/index.ts`

```typescript
export { webhookQueue, BULLMQ_QUEUE_OPTIONS, QUEUE_PREFIX } from "./webhook-queue.js";
export { redisConnection } from "./redis-connection.js";
export type { WebhookJobPayload } from "./webhook-queue.js";
```

---

## Phase 3 — Webhook Intake Repository

### New file: `src/modules/shopify/repositories/webhook-intake.repository.ts`

This repository owns all reads and writes to `WebhookIntakeRecord`.

```typescript
import { WebhookIntakeStatus } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma.js";

export const webhookIntakeRepository = {
  async createIntakeRecord(input: {
    shopId: string;
    shopDomain: string;
    topic: string;
    webhookId: string;
    rawPayload: string;
  }): Promise<{ id: string; isDuplicate: boolean }> {
    const dedupeKey = `${input.shopId}:${input.topic}:${input.webhookId}`;
    try {
      const record = await prisma.webhookIntakeRecord.create({
        data: {
          shopId: input.shopId,
          shopDomain: input.shopDomain,
          topic: input.topic,
          webhookId: input.webhookId,
          rawPayload: input.rawPayload,
          dedupeKey,
          status: "pending",
        },
        select: { id: true },
      });
      return { id: record.id, isDuplicate: false };
    } catch (err: any) {
      // Unique constraint violation on dedupeKey = duplicate webhook delivery
      if (err?.code === "P2002") {
        const existing = await prisma.webhookIntakeRecord.findUnique({
          where: { dedupeKey },
          select: { id: true },
        });
        return { id: existing!.id, isDuplicate: true };
      }
      throw err;
    }
  },

  async findById(id: string) {
    return prisma.webhookIntakeRecord.findUnique({ where: { id } });
  },

  async markProcessing(id: string) {
    return prisma.webhookIntakeRecord.update({
      where: { id },
      data: { status: "processing", attempts: { increment: 1 } },
    });
  },

  async markProcessed(id: string) {
    return prisma.webhookIntakeRecord.update({
      where: { id },
      data: { status: "processed", processedAt: new Date() },
    });
  },

  async markFailed(id: string, error: string, retryable: boolean) {
    return prisma.webhookIntakeRecord.update({
      where: { id },
      data: {
        status: "failed",
        lastError: error.slice(0, 2000), // cap to avoid oversized rows
        retryable,
      },
    });
  },
};
```

---

## Phase 4 — Refactor the Controller (Fast ACK)

### File: `src/modules/shopify/controllers/shopify.controller.ts`

**Modify only `handleProductsUpdateWebhook`.** Leave all other controller methods unchanged.

Current (synchronous, heavy):
```typescript
// shopify.controller.ts:65 (approx)
async handleProductsUpdateWebhook(req, res) {
  const { shopId, shopDomain, topic, webhookId, rawBody } = req.webhookContext;
  const payload = JSON.parse(rawBody.toString());
  const result = await handleProductsUpdateWebhookCommand({ shopId, shopDomain, topic, webhookId, payload });
  res.status(200).json(result);
}
```

Replace with (fast ACK):
```typescript
async handleProductsUpdateWebhook(req, res) {
  const { shopId, shopDomain, topic, webhookId, rawBody } = req.webhookContext;

  const { id: intakeId, isDuplicate } = await webhookIntakeRepository.createIntakeRecord({
    shopId,
    shopDomain,
    topic,
    webhookId,
    rawPayload: rawBody.toString(),
  });

  if (!isDuplicate) {
    await webhookQueue.add(topic, { intakeId });
  }

  res.status(200).json({ received: true });
}
```

**Important:** Remove the import of `handleProductsUpdateWebhookCommand` from this controller. Add imports for `webhookIntakeRepository` and `webhookQueue`.

---

## Phase 5 — Worker Entry Point

### New file: `src/workers/webhook-worker.ts`

This is the separate PM2 process that runs the BullMQ worker.

```typescript
import "../config/load-env.js";
import { Worker, type Job } from "bullmq";
import { redisConnection, BULLMQ_QUEUE_OPTIONS } from "../shared/queue/index.js";
import { webhookIntakeRepository } from "../modules/shopify/repositories/webhook-intake.repository.js";
import { processProductsUpdateWebhookJob } from "../modules/shopify/jobs/process-products-update-webhook.job.js";
import { logger } from "../shared/logging/logger.js";

// IMPORTANT: prefix must match the Queue definition in webhook-queue.ts.
// Both Queue and Worker must share the same prefix or they will use different
// Redis key namespaces and jobs will never be consumed.
const worker = new Worker(
  "shopify-webhooks",
  async (job: Job<{ intakeId: string }>) => {
    const { intakeId } = job.data;
    const intake = await webhookIntakeRepository.findById(intakeId);

    if (!intake) {
      logger.warn("WebhookWorker: intake record not found", { intakeId, jobId: job.id });
      return;
    }

    if (intake.status === "processed") {
      logger.info("WebhookWorker: already processed, skipping", { intakeId });
      return;
    }

    await webhookIntakeRepository.markProcessing(intakeId);

    try {
      switch (intake.topic) {
        case "products/update":
          await processProductsUpdateWebhookJob(intake);
          break;
        default:
          logger.warn("WebhookWorker: unknown topic", { topic: intake.topic, intakeId });
      }
      await webhookIntakeRepository.markProcessed(intakeId);
      logger.info("WebhookWorker: processed", { intakeId, topic: intake.topic });
    } catch (err: any) {
      const isTransient = isTransientError(err);
      await webhookIntakeRepository.markFailed(intakeId, err?.message ?? String(err), isTransient);
      logger.error("WebhookWorker: job failed", {
        intakeId,
        topic: intake.topic,
        error: err?.message,
        retryable: isTransient,
      });
      if (isTransient) {
        throw err; // rethrow so BullMQ retries via backoff policy
      }
      // non-retryable: do not rethrow; job moves to failed state without further retries
    }
  },
  {
    connection: redisConnection,
    prefix: BULLMQ_QUEUE_OPTIONS.prefix, // "iss" — must match Queue prefix
    concurrency: 1, // SQLite is single-writer — keep concurrency at 1
  }
);

worker.on("failed", (job, err) => {
  logger.error("WebhookWorker: BullMQ job failed permanently", {
    jobId: job?.id,
    intakeId: job?.data?.intakeId,
    error: err?.message,
  });
});

logger.info("WebhookWorker: started and listening for shopify-webhooks jobs");

function isTransientError(err: any): boolean {
  const msg: string = err?.message ?? "";
  return (
    msg.includes("Socket timeout") ||
    msg.includes("Transaction already closed") ||
    msg.includes("SQLITE_BUSY") ||
    msg.includes("SQLITE_LOCKED") ||
    msg.includes("connect ECONNREFUSED")
  );
}
```

---

## Phase 6 — Job Processor (Domain Logic)

### New file: `src/modules/shopify/jobs/process-products-update-webhook.job.ts`

Move the domain logic currently in `handle-products-update-webhook.command.ts` here. This file owns the processing logic without HTTP or queue concerns.

```typescript
import type { WebhookIntakeRecord } from "@prisma/client";
import { normalizeProductId } from "../utils/normalize-product-id.js";
import { getWebhookPrice } from "../utils/get-webhook-price.js";
import { parseHappenedAt } from "../utils/parse-happened-at.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import type { ShopifyProductsUpdateWebhookPayload } from "../domain/shopify-webhook.types.js";

export async function processProductsUpdateWebhookJob(intake: WebhookIntakeRecord): Promise<void> {
  const payload = JSON.parse(intake.rawPayload) as ShopifyProductsUpdateWebhookPayload;
  const { shopId } = intake;

  const productId = normalizeProductId(payload.id);
  const price = getWebhookPrice(payload);
  const happenedAt = parseHappenedAt(payload.updated_at);

  // Price update — short transaction (refactored, see Phase 7)
  const priceUpdated = await scanHistoryRepository.appendPriceChangeIfHistoryExists({
    shopId,
    productId,
    price,
    happenedAt,
    emitBroadcast: false,
  });

  // Location update — external API call (safe outside transaction)
  let locationUpdated = false;
  const scanHistory = await scanHistoryRepository.findByShopAndProduct(shopId, productId);
  if (scanHistory) {
    const productWithLocation = await shopifyAdminApi.getProductWithLocation(
      shopId,
      productId
    );
    if (productWithLocation) {
      locationUpdated = await scanHistoryRepository.appendLocationEventIfChanged({
        scanHistoryId: scanHistory.id,
        shopId,
        productId,
        newLocation: productWithLocation.location,
        happenedAt,
      });
    }
  }

  // Broadcast once
  if (priceUpdated || locationUpdated) {
    broadcastToShop(shopId, { type: "scan_history_updated", productId });
  }
}
```

---

## Phase 7 — Refactor Repository Transaction (Eliminate Timeout)

### File: `src/modules/scanner/repositories/scan-history.repository.ts`

**Target: `appendPriceChangeIfHistoryExists` at line 826.**

The current transaction does lookup + conditional read + conditional write inside one `prisma.$transaction`. Under SQLite concurrent writes, this holds a write lock for the full duration including the `findFirst` calls.

**Refactor to separate read from write:**

```typescript
async appendPriceChangeIfHistoryExists(input: {
  shopId: string;
  productId: string;
  price: string;
  happenedAt?: Date;
  emitBroadcast?: boolean;
}): Promise<boolean> {
  const normalizedPrice = input.price?.trim() || null;
  if (!normalizedPrice) return false;

  // PHASE A: Read outside transaction (no write lock held)
  const scanHistory = await prisma.scanHistory.findUnique({
    where: { shopId_productId: { shopId: input.shopId, productId: input.productId } },
    select: { id: true },
  });
  if (!scanHistory) return false;

  const latestPrice = await prisma.scanHistoryPrice.findFirst({
    where: { scanHistoryId: scanHistory.id },
    orderBy: { happenedAt: "desc" },
    select: { price: true },
  });
  if (latestPrice?.price === normalizedPrice) return false;

  // PHASE B: Short write — only a single create, minimal lock duration
  await prisma.scanHistoryPrice.create({
    data: {
      scanHistoryId: scanHistory.id,
      price: normalizedPrice,
      terminalType: "price_update",
      happenedAt: input.happenedAt ?? new Date(),
    },
  });

  if (input.emitBroadcast !== false) {
    broadcastToShop(input.shopId, {
      type: "scan_history_updated",
      productId: input.productId,
    });
  }

  return true;
}
```

**Why this is safe in the worker context:** The worker runs with `concurrency: 1`, so only one product update job runs at a time. The TOCTOU race between read and write is not a concern for the same product within a single worker. If concurrency is raised later, revisit with `upsert` or conditional write logic.

**Also add `findByShopAndProduct` to the repository** (used by the job processor above):

```typescript
async findByShopAndProduct(shopId: string, productId: string) {
  return prisma.scanHistory.findUnique({
    where: { shopId_productId: { shopId, productId } },
  });
}
```

---

## Phase 8 — Remove Old Synchronous Command (After Validation)

### File: `src/modules/shopify/commands/handle-products-update-webhook.command.ts`

After the worker and job processor are confirmed working in production, **delete this file**. It is fully replaced by:
- `webhookIntakeRepository.createIntakeRecord()` (for the controller's fast ACK)
- `processProductsUpdateWebhookJob()` (for the domain logic in the worker)

Do not delete until the async path is validated end-to-end.

Also **remove `ShopifyWebhookDelivery` writes from the processing path.** The `WebhookIntakeRecord` table with `dedupeKey` unique constraint replaces the idempotency role of `ShopifyWebhookDelivery`. The old table can remain for historical data but should stop receiving new writes once the new path is live.

---

## Phase 9 — PM2 Process Configuration

### File: `ecosystem.config.js` (in project root or `apps/backend/`)

Add the worker as a second PM2 process alongside the existing API server:

```javascript
module.exports = {
  apps: [
    {
      name: "shopify-backend",
      script: "./dist/src/server.js",    // adjust to your actual entry
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "shopify-webhook-worker",
      script: "./dist/src/workers/webhook-worker.js",
      instances: 1,         // must be 1 — SQLite single-writer
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
      // Worker restarts automatically on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
    },
  ],
};
```

Deploy commands on EC2:

```bash
npm run build
pm2 reload ecosystem.config.js --env production
pm2 save
```

---

## Phase 10 — Operational Visibility (Admin Webhook Status)

### New file: `src/modules/shopify/routes/webhook-admin.routes.ts`

Add a protected internal route (require admin auth or internal token) to inspect webhook processing state:

```typescript
// GET /internal/webhooks?status=failed&limit=50
// GET /internal/webhooks/:id
// POST /internal/webhooks/:id/replay
```

### New file: `src/modules/shopify/controllers/webhook-admin.controller.ts`

```typescript
import { webhookIntakeRepository } from "../repositories/webhook-intake.repository.js";
import { webhookQueue } from "../../../shared/queue/webhook-queue.js";

export const webhookAdminController = {
  async list(req, res) {
    const { status, limit = "50" } = req.query;
    const records = await prisma.webhookIntakeRecord.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string, 10),
      select: {
        id: true, topic: true, shopDomain: true, webhookId: true,
        status: true, attempts: true, processedAt: true, lastError: true,
        retryable: true, receivedAt: true,
      },
    });
    res.json({ records });
  },

  async replay(req, res) {
    const { id } = req.params;
    const intake = await webhookIntakeRepository.findById(id);
    if (!intake) return res.status(404).json({ error: "not found" });

    // Reset to pending and re-enqueue
    await prisma.webhookIntakeRecord.update({
      where: { id },
      data: { status: "pending", lastError: null },
    });
    await webhookQueue.add(intake.topic, { intakeId: id });
    res.json({ queued: true });
  },
};
```

---

## New Module / File Summary

All files to create (new) or modify (existing):

### New files

| File | Purpose |
|---|---|
| `src/shared/queue/redis-connection.ts` | Shared ioredis connection for BullMQ |
| `src/shared/queue/webhook-queue.ts` | BullMQ Queue definition with retry policy |
| `src/shared/queue/index.ts` | Re-export barrel |
| `src/modules/shopify/repositories/webhook-intake.repository.ts` | WebhookIntakeRecord CRUD |
| `src/modules/shopify/jobs/process-products-update-webhook.job.ts` | Domain processing logic for worker |
| `src/workers/webhook-worker.ts` | BullMQ Worker entry point (separate PM2 process) |
| `src/modules/shopify/routes/webhook-admin.routes.ts` | Internal admin routes for observability |
| `src/modules/shopify/controllers/webhook-admin.controller.ts` | Admin list + replay handlers |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `WebhookIntakeRecord` model and `WebhookIntakeStatus` enum |
| `src/config/env.ts` | Add `REDIS_URL` env var |
| `src/modules/shopify/controllers/shopify.controller.ts` | Refactor `handleProductsUpdateWebhook` to fast ACK path |
| `src/modules/scanner/repositories/scan-history.repository.ts` | Refactor `appendPriceChangeIfHistoryExists` to split read/write |
| `ecosystem.config.js` | Add `shopify-webhook-worker` PM2 app entry |
| `package.json` | Add `bullmq`, `ioredis` |

### Deleted files (after validation)

| File | Reason |
|---|---|
| `src/modules/shopify/commands/handle-products-update-webhook.command.ts` | Replaced by job processor |

---

## Failure Classification for Worker Error Handling

Classify errors inside the worker to decide retry vs. dead-letter:

| Error pattern | Classification | Action |
|---|---|---|
| `Socket timeout` | Transient | Rethrow → BullMQ retries with backoff |
| `Transaction already closed` | Transient | Rethrow → BullMQ retries |
| `SQLITE_BUSY` / `SQLITE_LOCKED` | Transient | Rethrow → BullMQ retries |
| `connect ECONNREFUSED` (Redis) | Transient | Rethrow → BullMQ retries |
| `Shopify API 401/403` | Non-retryable | Mark failed, do not rethrow |
| Missing or invalid payload fields | Non-retryable | Mark failed, do not rethrow |
| Shop not found / delinked | Non-retryable | Mark failed, do not rethrow |

---

## Validation Plan

### Phase 1 validation (Fast ACK)
- Deploy refactored controller only (no worker yet, jobs will sit in Redis queue)
- Verify `POST /shopify/webhooks/products/update` returns `200` in < 200 ms
- Verify no more `PrismaClientKnownRequestError` in logs for webhook path
- Verify Shopify stops retrying

### Phase 2 validation (Worker)
- Start worker process: `pm2 start shopify-webhook-worker`
- Trigger a product price change in Shopify admin
- Verify `WebhookIntakeRecord` row is created with `status=processed`
- Verify `ScanHistoryPrice` row is created with correct price and `terminalType=price_update`
- Verify WebSocket broadcast fires and frontend receives `scan_history_updated`

### Idempotency validation
- Send the same `webhookId` twice (replay the same intake record)
- Verify second enqueue is skipped due to `dedupeKey` unique constraint
- Verify `WebhookIntakeRecord` has only one row for that `webhookId`
- Verify no duplicate `ScanHistoryPrice` rows

### Failure + retry validation
- Artificially stop SQLite (or introduce a sleep in the repository)
- Verify worker catches `Socket timeout`, marks record `failed`, rethrows
- Verify BullMQ retries with backoff (check Redis queue via `bull-board` or BullMQ CLI)
- Verify after transient condition clears, job succeeds on retry

### Performance validation
- Simulate 10 concurrent `products/update` webhooks
- Verify all return `200` immediately
- Verify worker drains the queue sequentially (concurrency=1)
- Verify no SQLite contention or timeout errors in worker logs

---

## Anti-Patterns to Avoid

- Do NOT run `prisma.$transaction` for sequences that include external HTTP calls (e.g., Shopify Admin API). Transactions must be kept to pure DB work only.
- Do NOT increase `concurrency` above 1 for the worker while SQLite is the database. SQLite is single-writer and concurrency will re-introduce the same contention problem.
- Do NOT rely only on the old `ShopifyWebhookDelivery` table for idempotency. It was written last, after processing, so any mid-processing crash left the idempotency guard absent.
- Do NOT call `broadcastToShop` inside a Prisma transaction. WebSocket broadcast is a side effect that must run after the transaction commits.
- Do NOT delete `handle-products-update-webhook.command.ts` until the async path is verified working end-to-end in production.

---

## Rollout Order for Codex

1. Install `bullmq` and `ioredis`, add `REDIS_URL` to env schema
2. Add `WebhookIntakeRecord` model to Prisma schema, run migration
3. Write `webhook-intake.repository.ts`
4. Write `redis-connection.ts` and `webhook-queue.ts`
5. Refactor `shopify.controller.ts` → `handleProductsUpdateWebhook` (fast ACK)
6. Write `process-products-update-webhook.job.ts` (domain logic)
7. Write `webhook-worker.ts` (BullMQ worker entry)
8. Refactor `scan-history.repository.ts` → `appendPriceChangeIfHistoryExists` (split read/write)
9. Update `ecosystem.config.js` with worker PM2 entry
10. Write internal admin routes and controller for observability
11. Validate end-to-end per validation plan above
12. Delete `handle-products-update-webhook.command.ts` after validation
