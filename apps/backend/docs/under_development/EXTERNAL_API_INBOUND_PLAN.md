# External API — Inbound Requests

## What this plan covers

A new `external-api` module that exposes routes for external applications (e.g. a delivery-scheduling app). Authentication is a single static API key stored in an env var — simple, revocable by rotating the env var, and zero DB dependency. The module is structured so new inbound endpoints are added by dropping a new command + one route line, nothing else.

---

## Authentication model

- Header: `x-api-key: <value>`
- Value must match `env.EXTERNAL_API_KEY`
- Requests must also include `shopId` in the body so queries are always shop-scoped (the key proves identity, the shopId scopes the data)
- A single middleware handles both checks and rejects early with 401/400

---

## Files to create or modify

### 1. `src/config/env.ts` — add one field

Inside `EnvSchema`:

```ts
EXTERNAL_API_KEY: z.string().min(32),
```

---

### 2. `src/modules/external-api/middleware/authenticate-external-api.middleware.ts`

```ts
import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { UnauthorizedError } from "../../../shared/errors/http-errors.js";

export function authenticateExternalApiMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const key = req.headers["x-api-key"];

  if (!key || key !== env.EXTERNAL_API_KEY) {
    return next(new UnauthorizedError("Invalid or missing API key"));
  }

  next();
}
```

This is the only middleware all external routes share. It is applied once at router level — every route registered below it is automatically protected.

---

### 3. `src/modules/external-api/contracts/external-api.contract.ts`

```ts
import { z } from "zod";

export const ScheduleOrderItemsInputSchema = z.object({
  shopId: z.string().min(1),
  orderId: z.string().min(1),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd")
    .transform((v) => new Date(v))
    .refine((v) => !isNaN(v.getTime()), "scheduledDate is not a valid date"),
});

export type ScheduleOrderItemsInput = z.infer<typeof ScheduleOrderItemsInputSchema>;
```

Adding a new endpoint = add a new schema here.

---

### 4. `src/modules/external-api/commands/schedule-order-items.command.ts`

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import type { ScheduleOrderItemsInput } from "../contracts/external-api.contract.js";

export async function scheduleOrderItemsCommand(
  input: ScheduleOrderItemsInput,
): Promise<{ updated: number }> {
  const items = await prisma.scanHistory.findMany({
    where: { shopId: input.shopId, orderId: input.orderId, isSold: true },
    select: { id: true },
  });

  if (items.length === 0) {
    throw new NotFoundError(
      `No sold items found for orderId "${input.orderId}" in this shop`,
    );
  }

  await prisma.scanHistory.updateMany({
    where: { shopId: input.shopId, orderId: input.orderId, isSold: true },
    data: { scheduledDate: input.scheduledDate },
  });

  logger.info("scheduleOrderItemsCommand: scheduled date applied", {
    shopId: input.shopId,
    orderId: input.orderId,
    scheduledDate: input.scheduledDate,
    updated: items.length,
  });

  return { updated: items.length };
}
```

---

### 5. `src/modules/external-api/controllers/external-api.controller.ts`

```ts
import type { Request, Response } from "express";
import { ScheduleOrderItemsInputSchema } from "../contracts/external-api.contract.js";
import { scheduleOrderItemsCommand } from "../commands/schedule-order-items.command.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";

export const externalApiController = {
  async scheduleOrderItems(req: Request, res: Response): Promise<void> {
    const parsed = ScheduleOrderItemsInputSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const result = await scheduleOrderItemsCommand(parsed.data);
    res.json({ ok: true, updated: result.updated });
  },
};
```

Adding a new endpoint = add one method here, call the corresponding command.

---

### 6. `src/modules/external-api/routes/external-api.routes.ts`

```ts
import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateExternalApiMiddleware } from "../middleware/authenticate-external-api.middleware.js";
import { externalApiController } from "../controllers/external-api.controller.js";

export const externalApiRouter = Router();

// All routes below this line require a valid x-api-key header
externalApiRouter.use(authenticateExternalApiMiddleware);

externalApiRouter.post(
  "/orders/schedule",
  asyncHandler(externalApiController.scheduleOrderItems),
);

// Future inbound endpoints go here — one line each
```

---

### 7. `src/server.ts` — register the router

Add import:

```ts
import { externalApiRouter } from "./modules/external-api/routes/external-api.routes.js";
```

Add mount (alongside the other `/api/*` routes):

```ts
app.use("/api/external", externalApiRouter);
```

---

## Request / response contract

### `POST /api/external/orders/schedule`

**Headers:**
```
x-api-key: <EXTERNAL_API_KEY>
Content-Type: application/json
```

**Body:**
```json
{
  "shopId": "clxxxxxx",
  "orderId": "987654321",
  "scheduledDate": "2026-05-10"
}
```

**Success `200`:**
```json
{ "ok": true, "updated": 3 }
```

**Errors:**
| Status | Reason |
|--------|--------|
| 401 | Missing or wrong API key |
| 400 | Body fails validation |
| 404 | No sold items found for that orderId + shopId |

---

## Adding the next inbound endpoint

1. Add a Zod schema to `contracts/external-api.contract.ts`
2. Add a command to `commands/`
3. Add one method to `externalApiController`
4. Add one `.post(...)` line to `external-api.routes.ts`

No other files change.

---

## Exit criteria

- `POST /api/external/orders/schedule` with correct key + valid body sets `scheduledDate` on all matching sold items and returns `{ ok: true, updated: N }`.
- Wrong key returns 401.
- Valid key but unknown orderId returns 404.
- Valid key but malformed body returns 400.
- All existing JWT-authenticated routes are unaffected.
- `EXTERNAL_API_KEY` missing from env causes the server to refuse to start (Zod parse throws at boot).
