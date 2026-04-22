# Outbound Webhook System — Item Placed Notification

## Why not env vars

Env vars for target URLs work for one app but break down fast: adding a second delivery app requires a redeploy, rotating a target's secret requires a redeploy, and there is no audit trail. A database-backed target registry costs one extra table and gives you add/remove/disable without touching the server.

---

## Design

A new `OutboundWebhookTarget` model stores one row per (shop, URL, event type). Each row has its own `secret` sent as `x-api-key` to the target. When an item is placed, `markLogisticPlacementCommand` calls `enqueueOutboundEventService` which queries active targets and enqueues **one BullMQ job per target**. A dedicated `outbound-webhook-worker` process picks up each job, does the HTTP POST, and retries on transient failures. The placement command returns immediately — dispatch is fully async.

One job per target gives per-target retry granularity: if the delivery app is down, only its job retries; other targets are unaffected.

---

## Schema changes — `prisma/schema.prisma`

### New enum

```prisma
enum OutboundEventType {
  item_placed
}
```

### New model

```prisma
model OutboundWebhookTarget {
  id        String            @id @default(cuid())
  shopId    String
  label     String            // human label e.g. "delivery-app-prod"
  targetUrl String
  secret    String            // sent as x-api-key header to the target
  eventType OutboundEventType
  active    Boolean           @default(true)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([shopId, targetUrl, eventType])
  @@index([shopId, eventType, active])
}
```

Add back-relation on `Shop`:

```prisma
outboundWebhookTargets OutboundWebhookTarget[]
```

---

## New files to create

### 1. `src/modules/outbound-webhook/contracts/outbound-webhook.contract.ts`

```ts
import { z } from "zod";

export const OUTBOUND_EVENT_TYPES = ["item_placed"] as const;
export type OutboundEventType = (typeof OUTBOUND_EVENT_TYPES)[number];

export const RegisterOutboundTargetInputSchema = z.object({
  label: z.string().trim().min(2).max(80),
  targetUrl: z.string().url(),
  secret: z.string().min(16),
  eventType: z.enum(OUTBOUND_EVENT_TYPES),
});

export type RegisterOutboundTargetInput = z.infer<
  typeof RegisterOutboundTargetInputSchema
>;

// Payload shape sent to the target for item_placed
export type ItemPlacedPayload = {
  event: "item_placed";
  shopId: string;
  scanHistoryId: string;
  orderId: string | null;
  logisticLocation: {
    id: string;
    location: string;
    updatedAt: string; // ISO 8601
  };
};
```

Adding a new outbound event = add its string to `OUTBOUND_EVENT_TYPES` and define its payload type here.

---

### 2. `src/shared/queue/outbound-webhook-queue.ts`

Follows the exact same pattern as `webhook-queue.ts` and `notification-queue.ts`.

```ts
import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

export const OUTBOUND_WEBHOOK_QUEUE_NAME = "outbound-webhooks";
export const OUTBOUND_WEBHOOK_QUEUE_PREFIX = "iss";

export type OutboundWebhookJobPayload = {
  targetId: string;
  targetUrl: string;
  secret: string;
  eventPayload: unknown;
};

export const outboundWebhookQueue = new Queue<OutboundWebhookJobPayload>(
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  {
    connection: redisConnection,
    prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 5_000, // 5s → 10s → 20s → 40s
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  },
);
```

Then export from `src/shared/queue/index.ts`:

```ts
export { outboundWebhookQueue } from "./outbound-webhook-queue.js";
export type { OutboundWebhookJobPayload } from "./outbound-webhook-queue.js";
```

---

### 3. `src/modules/outbound-webhook/services/enqueue-outbound-event.service.ts`

This service replaces the old fire-and-forget dispatcher. It queries active targets and enqueues one job per target. The actual HTTP call happens in the worker.

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { outboundWebhookQueue } from "../../../shared/queue/outbound-webhook-queue.js";
import { logger } from "../../../shared/logging/logger.js";
import type { OutboundEventType } from "../contracts/outbound-webhook.contract.js";

export async function enqueueOutboundEventService(input: {
  shopId: string;
  eventType: OutboundEventType;
  payload: unknown;
}): Promise<void> {
  const targets = await prisma.outboundWebhookTarget.findMany({
    where: { shopId: input.shopId, eventType: input.eventType, active: true },
    select: { id: true, targetUrl: true, secret: true },
  });

  if (targets.length === 0) return;

  await Promise.all(
    targets.map((target) =>
      outboundWebhookQueue.add(
        `${input.eventType}:${target.id}`,
        {
          targetId: target.id,
          targetUrl: target.targetUrl,
          secret: target.secret,
          eventPayload: input.payload,
        },
      ),
    ),
  );

  logger.info("Outbound webhook jobs enqueued", {
    shopId: input.shopId,
    eventType: input.eventType,
    targetCount: targets.length,
  });
}
```

---

### 4. `src/workers/outbound-webhook-worker.ts`

Follows the exact same structure as `webhook-worker.ts`.

```ts
import "../config/load-env.js";
import { initializeDatabaseRuntime } from "../shared/database/sqlite-runtime.js";
import { logger } from "../shared/logging/logger.js";
import { redisConnection } from "../shared/queue/redis-connection.js";
import {
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  OUTBOUND_WEBHOOK_QUEUE_PREFIX,
  type OutboundWebhookJobPayload,
} from "../shared/queue/outbound-webhook-queue.js";
import { Worker, type Job } from "bullmq";

const DISPATCH_TIMEOUT_MS = 8_000;

const isRetryableError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");

  // Network / timeout errors are retryable
  if (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("TimeoutError") ||
    message.includes("socket hang up")
  ) {
    return true;
  }

  return false;
};

await initializeDatabaseRuntime();

const worker = new Worker<OutboundWebhookJobPayload>(
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  async (job: Job<OutboundWebhookJobPayload>) => {
    const { targetId, targetUrl, secret, eventPayload } = job.data;

    logger.info("Outbound webhook worker dispatching", {
      jobId: job.id,
      targetId,
      targetUrl,
    });

    let res: Response;

    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": secret,
        },
        body: JSON.stringify(eventPayload),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      });
    } catch (error) {
      const retryable = isRetryableError(error);
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");

      logger.error("Outbound webhook dispatch network error", {
        jobId: job.id,
        targetId,
        targetUrl,
        retryable,
        error: message,
      });

      if (retryable) throw error; // BullMQ will retry
      return; // non-retryable network error — drop the job
    }

    if (res.status >= 400 && res.status < 500) {
      // 4xx = target explicitly rejected — do not retry
      logger.warn("Outbound webhook target rejected with 4xx — not retrying", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: res.status,
      });
      return;
    }

    if (!res.ok) {
      // 5xx or unexpected — retryable
      logger.warn("Outbound webhook target returned non-OK status — will retry", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: res.status,
      });
      throw new Error(`Target returned HTTP ${res.status}`);
    }

    logger.info("Outbound webhook dispatched successfully", {
      jobId: job.id,
      targetId,
      targetUrl,
      status: res.status,
    });
  },
  {
    connection: redisConnection,
    prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
    concurrency: 5, // dispatch multiple targets in parallel
  },
);

worker.on("failed", (job, error) => {
  logger.error("Outbound webhook job failed permanently", {
    jobId: job?.id,
    targetId: job?.data?.targetId,
    targetUrl: job?.data?.targetUrl,
    error: error.message,
  });
});

logger.info("Outbound webhook worker started", {
  queue: OUTBOUND_WEBHOOK_QUEUE_NAME,
  prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
  concurrency: 5,
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.warn("Outbound webhook worker shutdown signal received", { signal });
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => { void shutdown("SIGINT"); });
process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
```

---

### 5. `src/modules/outbound-webhook/commands/register-outbound-target.command.ts`

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { ConflictError } from "../../../shared/errors/http-errors.js";
import type { RegisterOutboundTargetInput } from "../contracts/outbound-webhook.contract.js";

export async function registerOutboundTargetCommand(input: {
  shopId: string;
  payload: RegisterOutboundTargetInput;
}): Promise<{ id: string }> {
  const existing = await prisma.outboundWebhookTarget.findUnique({
    where: {
      shopId_targetUrl_eventType: {
        shopId: input.shopId,
        targetUrl: input.payload.targetUrl,
        eventType: input.payload.eventType,
      },
    },
  });

  if (existing?.active) {
    throw new ConflictError(
      "An active target already exists for this URL and event type",
    );
  }

  const target = await prisma.outboundWebhookTarget.upsert({
    where: {
      shopId_targetUrl_eventType: {
        shopId: input.shopId,
        targetUrl: input.payload.targetUrl,
        eventType: input.payload.eventType,
      },
    },
    create: { shopId: input.shopId, ...input.payload, active: true },
    update: {
      label: input.payload.label,
      secret: input.payload.secret,
      active: true,
    },
  });

  return { id: target.id };
}
```

---

### 6. `src/modules/outbound-webhook/controllers/outbound-webhook.controller.ts`

```ts
import type { Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { RegisterOutboundTargetInputSchema } from "../contracts/outbound-webhook.contract.js";
import { registerOutboundTargetCommand } from "../commands/register-outbound-target.command.js";
import { prisma } from "../../../shared/database/prisma-client.js";

export const outboundWebhookController = {
  async register(req: Request, res: Response): Promise<void> {
    const parsed = RegisterOutboundTargetInputSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const result = await registerOutboundTargetCommand({
      shopId: req.authUser!.shopId,
      payload: parsed.data,
    });

    res.status(201).json(result);
  },

  async list(req: Request, res: Response): Promise<void> {
    const targets = await prisma.outboundWebhookTarget.findMany({
      where: { shopId: req.authUser!.shopId },
      select: {
        id: true, label: true, targetUrl: true,
        eventType: true, active: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(targets); // secret is never returned
  },

  async toggle(req: Request, res: Response): Promise<void> {
    await prisma.outboundWebhookTarget.updateMany({
      where: { id: req.params.id, shopId: req.authUser!.shopId },
      data: { active: req.body.active === true },
    });
    res.status(204).end();
  },

  async remove(req: Request, res: Response): Promise<void> {
    await prisma.outboundWebhookTarget.deleteMany({
      where: { id: req.params.id, shopId: req.authUser!.shopId },
    });
    res.status(204).end();
  },
};
```

---

### 7. `src/modules/outbound-webhook/routes/outbound-webhook.routes.ts`

```ts
import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { outboundWebhookController } from "../controllers/outbound-webhook.controller.js";

export const outboundWebhookRouter = Router();

outboundWebhookRouter.use(
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
);

outboundWebhookRouter.post("/", asyncHandler(outboundWebhookController.register));
outboundWebhookRouter.get("/", asyncHandler(outboundWebhookController.list));
outboundWebhookRouter.patch("/:id/active", asyncHandler(outboundWebhookController.toggle));
outboundWebhookRouter.delete("/:id", asyncHandler(outboundWebhookController.remove));
```

---

## Files to modify

### 8. `src/modules/logistic/commands/mark-logistic-placement.command.ts`

Add import:

```ts
import { enqueueOutboundEventService } from "../../outbound-webhook/services/enqueue-outbound-event.service.js";
import type { ItemPlacedPayload } from "../../outbound-webhook/contracts/outbound-webhook.contract.js";
```

After `logger.info("Mark logistic placement completed", ...)` and before `return`, fire-and-forget the enqueue — it is fast (just a DB read + Redis write):

```ts
const outboundPayload: ItemPlacedPayload = {
  event: "item_placed",
  shopId: input.shopId,
  scanHistoryId: scanHistory.id,
  orderId: scanHistory.orderId ?? null,
  logisticLocation: {
    id: location.id,
    location: location.location,
    updatedAt: location.updatedAt.toISOString(),
  },
};

enqueueOutboundEventService({
  shopId: input.shopId,
  eventType: "item_placed",
  payload: outboundPayload,
}).catch(() => {}); // errors already logged inside the service
```

`location` is already in scope from `logisticLocationRepository.findById`. No extra DB call needed.

---

### 9. `src/server.ts` — register the router

```ts
import { outboundWebhookRouter } from "./modules/outbound-webhook/routes/outbound-webhook.routes.js";
```

```ts
app.use("/api/outbound-webhooks", outboundWebhookRouter);
```

---

## Data flow

```
markLogisticPlacementCommand
  │
  ├─ logisticEventRepository.appendEvent() — DB write
  ├─ broadcastToShop() — WS
  │
  └─ enqueueOutboundEventService() ← fire-and-forget
       │
       ├─ query active OutboundWebhookTarget for shopId + item_placed
       └─ outboundWebhookQueue.add() × N targets → Redis
                                        │
                              outbound-webhook-worker (separate process)
                                        │
                              fetch(targetUrl, { x-api-key: secret })
                                        │
                              ┌─ 2xx → done
                              ├─ 4xx → drop (not retried)
                              └─ 5xx / network → retry (exp backoff, 4 attempts)
```

---

## Payload delivered to the target

```
POST <targetUrl>
x-api-key: <target.secret>
Content-Type: application/json

{
  "event": "item_placed",
  "shopId": "clxxxxxx",
  "scanHistoryId": "clxxxxxx",
  "orderId": "987654321",
  "logisticLocation": {
    "id": "clxxxxxx",
    "location": "Shelf A-3",
    "updatedAt": "2026-04-21T10:30:00.000Z"
  }
}
```

---

## Extending the system

| Goal | Where to change |
|------|----------------|
| Add a new outbound event | Add string to `OUTBOUND_EVENT_TYPES`, define payload type, call `enqueueOutboundEventService` from the triggering command |
| Register a new delivery app | `POST /api/outbound-webhooks` with the app's URL, its secret, and the event type — no redeploy |
| Disable a target without deleting | `PATCH /api/outbound-webhooks/:id/active` with `{ "active": false }` |
| Change retry count / backoff | `defaultJobOptions` in `outbound-webhook-queue.ts` |

---

## Instance changes — register the worker with PM2

Three files must be updated so the new worker starts on every deploy.

### `ecosystem.config.cjs` — add the PM2 app entry

```js
{
  name: "shopify-outbound-webhook-worker",
  cwd: __dirname,
  script: "./dist/src/workers/outbound-webhook-worker.js",
  instances: 1,
  exec_mode: "fork",
  autorestart: true,
  max_restarts: 10,
  min_uptime: "5s",
  env_production: {
    NODE_ENV: "production",
  },
},
```

### `scripts/deploy-ec2.sh` — add to `BACKEND_APPS`

```bash
BACKEND_APPS=(
  "shopify-backend"
  "shopify-webhook-worker"
  "shopify-notification-worker"
  "shopify-outbound-webhook-worker"   # add this line
)
```

The deploy script uses this array to stop apps before migrations and assert they are online after reload. Adding it here means the new worker is stopped cleanly during deploys and verified as healthy after.

### `package.json` — add dev and start scripts

```json
"dev:outbound-webhook-worker": "tsx watch src/workers/outbound-webhook-worker.ts",
"start:outbound-webhook-worker": "node dist/src/workers/outbound-webhook-worker.js"
```

---

## Exit criteria

- `markLogisticPlacementCommand` returns without waiting for any HTTP dispatch.
- The worker delivers the correct payload with `x-api-key` to all active targets.
- A 4xx response from a target does not trigger a retry.
- A 5xx or network error retries up to 4 times with exponential backoff.
- A permanently failed job is logged with `targetId` and `targetUrl`.
- Admin can register, list, toggle, and remove targets via the API.
- The `secret` field is never returned in list responses.
- An order with no active targets processes identically to today.
