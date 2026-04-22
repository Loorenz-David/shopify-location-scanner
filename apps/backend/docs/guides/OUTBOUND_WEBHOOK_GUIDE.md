# Outbound Webhook Guide

## Purpose

This guide explains the backend outbound webhook system.

Outbound webhooks are HTTP POST requests sent from this backend to external applications when certain internal events happen.

Current supported outbound event:

- `item_placed`

This means:

- an admin can register one or more external targets
- when a logistic item is placed, the backend enqueues outbound delivery jobs
- the outbound worker sends the payload asynchronously to each active target

## Architecture

There are two parts:

1. Management API
   This is the API your admin users use to register, list, enable, disable, and remove outbound webhook targets.

2. Delivery worker
   This is the background process that actually performs the HTTP POST requests to the external target URLs.

The placement command does not wait for outbound delivery to finish.
It only enqueues jobs.

## Event Flow

Current flow for `item_placed`:

```text
User places logistic item
  -> markLogisticPlacementCommand
  -> enqueueOutboundEventService
  -> one BullMQ job per active target
  -> outbound-webhook-worker
  -> POST targetUrl with x-api-key + JSON payload
```

Source files:

- [mark-logistic-placement.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/logistic/commands/mark-logistic-placement.command.ts)
- [enqueue-outbound-event.service.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/outbound-webhook/services/enqueue-outbound-event.service.ts)
- [outbound-webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/outbound-webhook-worker.ts)

## Management API

Base path:

`/api/outbound-webhooks`

These routes are protected by the normal backend auth stack:

- authenticated user required
- admin role required
- linked shop required

Route file:

[outbound-webhook.routes.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/outbound-webhook/routes/outbound-webhook.routes.ts)

## Register A Target

### `POST /api/outbound-webhooks`

Registers or reactivates a target for a given event type.

### Request Body

```json
{
  "label": "delivery-app-prod",
  "targetUrl": "https://example.com/api/external/logistics/item-placed",
  "secret": "very-long-shared-secret",
  "eventType": "item_placed"
}
```

### Field Rules

- `label`: string, 2 to 80 chars
- `targetUrl`: valid URL
- `secret`: minimum 16 chars
- `eventType`: currently only `item_placed`

### Success Response

Status:

`201 Created`

Body:

```json
{
  "id": "cmxxxxxx"
}
```

### Conflict Case

If an active target already exists for the same:

- `shopId`
- `targetUrl`
- `eventType`

the API returns `409 Conflict`.

## List Targets

### `GET /api/outbound-webhooks`

Returns all targets for the current admin’s shop.

### Success Response

Status:

`200 OK`

Body:

```json
{
  "targets": [
    {
      "id": "cmxxxxxx",
      "label": "delivery-app-prod",
      "targetUrl": "https://example.com/api/external/logistics/item-placed",
      "eventType": "item_placed",
      "active": true,
      "createdAt": "2026-04-22T08:00:00.000Z"
    }
  ]
}
```

Important:

- `secret` is never returned by the list API

## Enable / Disable A Target

### `PATCH /api/outbound-webhooks/:id/active`

### Request Body

```json
{
  "active": false
}
```

### Success Response

Status:

`204 No Content`

Use this when you want to stop delivery without deleting the target row.

## Remove A Target

### `DELETE /api/outbound-webhooks/:id`

### Success Response

Status:

`204 No Content`

This deletes the target for the current shop.

## Payload Sent To External Applications

When `item_placed` is triggered, the worker sends:

### Request Headers

```http
Content-Type: application/json
x-api-key: <target.secret>
```

### Request Body

```json
{
  "event": "item_placed",
  "shopId": "cmo8ouq4b0000qhzo3hn1q6qz",
  "scanHistoryId": "cmxxxxxx",
  "orderId": "6890363912345",
  "itemSku": "SKU-RED-XL",
  "logisticLocation": {
    "id": "cmxxxxxx",
    "location": "Shelf A-3",
    "updatedAt": "2026-04-22T08:30:00.000Z"
  }
}
```

### Payload Meaning

- `event`: the outbound event name
- `shopId`: owning shop
- `scanHistoryId`: item record id in this backend
- `orderId`: related order id, or `null`
- `itemSku`: SKU for the specific item to update in the external service, or `null`
- `logisticLocation.id`: target logistic location id in this backend
- `logisticLocation.location`: human-readable location label
- `logisticLocation.updatedAt`: location timestamp in ISO format

## Delivery Behavior

Delivery is asynchronous.

The placement command only enqueues jobs.
The worker performs the actual HTTP calls.

Queue:

- queue name: `outbound-webhooks`
- prefix: `iss`
- worker concurrency: `5`

Worker file:

[outbound-webhook-worker.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/workers/outbound-webhook-worker.ts)

## Retry Rules

### Successful response

- `2xx` -> job completes successfully

### Target rejects request

- `4xx` -> no retry

This means the target explicitly rejected the payload, auth header, or endpoint contract.

### Retryable failures

The worker retries on:

- `5xx` responses
- connection failures
- timeouts
- socket reset / hang-up style network errors

Current job policy:

- attempts: `4`
- exponential backoff
- base delay: `5000ms`

## Example Registration Request

```bash
curl -X POST "http://localhost:4000/api/outbound-webhooks" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "delivery-app-prod",
    "targetUrl": "https://example.com/api/external/logistics/item-placed",
    "secret": "very-long-shared-secret",
    "eventType": "item_placed"
  }'
```

## Example Toggle Request

```bash
curl -X PATCH "http://localhost:4000/api/outbound-webhooks/TARGET_ID/active" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "active": false
  }'
```

## Example External Receiver Expectation

Your external application should expect:

- a POST request
- JSON body
- shared secret in `x-api-key`

At minimum, the receiver should:

1. validate `x-api-key`
2. parse the JSON body
3. check `event === "item_placed"`
4. return `2xx` when accepted

If the receiver returns `4xx`, this backend will not retry that delivery.

## Runtime / Worker Startup

Local dev:

```bash
npm run dev:outbound-webhook-worker
```

Production-style:

```bash
npm run start:outbound-webhook-worker
```

PM2 process name:

- `shopify-outbound-webhook-worker`

## Notes

- outbound targets are shop-scoped
- one shop can have multiple targets for the same event
- each target gets its own queue job
- failure of one target does not block delivery to another target
- there is currently one outbound event type: `item_placed`
