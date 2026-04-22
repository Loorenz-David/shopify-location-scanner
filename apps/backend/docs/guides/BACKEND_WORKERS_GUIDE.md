# Backend Workers Guide

## Initialization Guide

This backend currently has one API server process and three background worker processes.

The API server handles HTTP traffic.
The workers handle asynchronous jobs that should not block HTTP requests.

### Before starting workers

Make sure these are in place first:

1. Backend dependencies installed in `apps/backend`
2. A valid backend `.env`
3. Redis running and reachable through `REDIS_URL`
4. Database migrated and Prisma client generated

Typical local setup:

```bash
cd apps/backend
npm run prisma:generate
npm run build
```

If you changed the Prisma schema, also apply migrations before running production-style workers.

### Local development commands

API server:

```bash
npm run dev
```

Shopify webhook worker:

```bash
npm run dev:worker
```

Notification worker:

```bash
npm run dev:notification-worker
```

Outbound webhook worker:

```bash
npm run dev:outbound-webhook-worker
```

### Production-style commands

API server:

```bash
npm run start
```

Shopify webhook worker:

```bash
npm run start:worker
```

Notification worker:

```bash
npm run start:notification-worker
```

Outbound webhook worker:

```bash
npm run start:outbound-webhook-worker
```

### Deployment / PM2

On EC2, PM2 is expected to run all backend processes:

- `shopify-backend`
- `shopify-webhook-worker`
- `shopify-notification-worker`
- `shopify-outbound-webhook-worker`

These are defined in [ecosystem.config.cjs](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/ecosystem.config.cjs) and managed through [deploy-ec2.sh](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/scripts/deploy-ec2.sh).

## Worker Overview

### 1. Shopify Webhook Worker

File:

[webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/webhook-worker.ts)

Purpose:

Processes inbound Shopify webhooks after the API has already acknowledged them.

Owned queue:

- queue name: `shopify-webhooks`
- prefix: `iss`
- concurrency: `1`

Current topics handled:

- `products/update`
- `orders/create`
- `orders/paid`

What it does:

1. Reads a queued webhook intake id
2. Loads the stored `WebhookIntakeRecord`
3. Skips already processed intake rows
4. Marks the intake row as `processing`
5. Dispatches by topic into the Shopify job layer
6. Marks the intake row `processed` or `failed`
7. Retries only retryable failures

Flow:

```text
Shopify -> API route -> verify HMAC -> create WebhookIntakeRecord -> enqueue BullMQ job
       -> webhook-worker -> load intake -> process topic job -> mark processed/failed
```

Important behavior:

- HTTP requests return quickly to Shopify
- raw webhook payload is persisted before background processing
- duplicate delivery is guarded at intake and processing level
- worker retries transient failures such as SQLite lock issues or connection failures

Typical failure handling:

- `400/401/403/404` style app errors are treated as non-retryable
- transient infrastructure failures are retried

When you need it:

- any Shopify webhook processing must have this worker running

### 2. Notification Worker

File:

[notification-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/notification-worker.ts)

Purpose:

Dispatches delayed logistic notifications to users when items are waiting and the target users are idle.

Owned queue:

- queue name: `logistic-notifications`
- prefix: `iss`
- concurrency: `5`

What it does:

1. Receives a `{ shopId, role }` notification job
2. Finds users in that shop for the target role
3. Checks whether those users are idle
4. Counts pending logistic items relevant to that role
5. Builds a batch notification payload
6. Sends delivery over:
   - WebSocket when the user is connected
   - Push notifications when the user is not connected

Flow:

```text
logistic command/service -> enqueue notification job
                         -> notification-worker
                         -> find idle users
                         -> count pending items
                         -> WS and/or push notification delivery
```

Role-specific behavior:

- `worker` notifications are for items waiting to be picked up from store
- `manager` notifications are for items placed in the fixing area

Important behavior:

- the worker is not responsible for deciding business state transitions
- it only reacts to already-created notification jobs
- it supports both WS delivery and push delivery

When you need it:

- logistic notification flows will silently stop if this worker is down

### 3. Outbound Webhook Worker

File:

[outbound-webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/outbound-webhook-worker.ts)

Purpose:

Dispatches outbound HTTP POST requests from this application to registered external targets.

Owned queue:

- queue name: `outbound-webhooks`
- prefix: `iss`
- concurrency: `5`

Current event handled:

- `item_placed`

What it does:

1. Receives a job containing:
   - `targetId`
   - `targetUrl`
   - `secret`
   - `eventPayload`
2. Sends an HTTP POST to `targetUrl`
3. Adds `x-api-key: <secret>`
4. Sends the event JSON payload
5. Retries only retryable failures

Flow:

```text
markLogisticPlacementCommand
  -> enqueueOutboundEventService
  -> one BullMQ job per active target
  -> outbound-webhook-worker
  -> POST to target URL with x-api-key
```

Important behavior:

- placement flow does not wait for outbound delivery
- each target gets its own job
- one failing target does not block another target

Retry behavior:

- `2xx`: success
- `4xx`: do not retry
- `5xx`: retry
- network / timeout failures: retry

Current timeout:

- `8_000ms` dispatch timeout per request

When you need it:

- registered outbound webhooks will not be delivered if this worker is not running

## How the Workers Fit Together

### Inbound Shopify path

```text
Shopify
  -> API server
  -> webhook intake table + BullMQ
  -> Shopify webhook worker
  -> backend state updates
```

### Logistic notification path

```text
logistic state change
  -> notification job enqueued
  -> notification worker
  -> WS / push delivery to users
```

### Outbound integration path

```text
logistic placement
  -> outbound event enqueued
  -> outbound webhook worker
  -> POST to external application
```

## Operational Notes

- Redis is shared infrastructure for all workers
- if Redis is down, queue-based flows will stop working
- workers are separate processes; restarting the API server alone does not restart them unless PM2 manages all of them
- after code changes, the relevant worker process must be restarted or redeployed
- after Prisma schema changes, migrate and regenerate Prisma client before restarting workers

## Quick Troubleshooting

### Webhooks not being processed

Check:

- API server is running
- `shopify-webhook-worker` is running
- Redis is reachable
- webhook intake rows are moving from `pending` to `processed`

### Notifications not arriving

Check:

- `shopify-notification-worker` is running
- notification jobs are being enqueued
- user idle checks and push subscriptions exist as expected

### External app not receiving outbound events

Check:

- `shopify-outbound-webhook-worker` is running
- outbound webhook target is registered and active
- target URL is reachable from the backend host
- target is accepting the configured `x-api-key`
- logs show whether failures are `4xx`, `5xx`, or network timeouts

## Source Files

Main worker files:

- [webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/webhook-worker.ts)
- [notification-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/notification-worker.ts)
- [outbound-webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/outbound-webhook-worker.ts)

Queue definitions:

- [webhook-queue.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/webhook-queue.ts)
- [notification-queue.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/notification-queue.ts)
- [outbound-webhook-queue.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/queue/outbound-webhook-queue.ts)
