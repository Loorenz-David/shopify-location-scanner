# External App API Key System

## What this plan covers

External applications (e.g. a delivery-scheduling app) need a stable, revocable credential to call this backend. This plan introduces a first-class `ExternalApp` concept — an admin links an external application to a shop and receives a one-time API key. All subsequent requests from that app carry the key in a header; a middleware validates it and injects a typed principal identical in structure to `AuthPrincipal` so routes can stay unaware of whether the caller is a human or an app.

---

## Design decisions

**Key format:** `isa_<64 hex chars>` — the `isa_` prefix makes keys identifiable in logs and secret scanners. Only the SHA-256 hash is stored; the raw key is returned once on creation.

**Scopes:** A JSON-stored string array per app (`["read:logistics", "write:logistics"]`). A dedicated middleware guard `requireExternalScope("write:logistics")` protects individual routes. Adding a new scope is one string — no migration needed.

**Multi-tenancy:** Every `ExternalApp` belongs to a `shopId`. The middleware resolves the shop from the key, so the app never needs to pass a shop identifier separately.

**Actor identity:** External apps act under the username `"app:<appName>"` and the special role `external_app`. This role is understood by logistic services so broadcasts and notifications can be routed correctly if needed.

---

## Schema changes — `prisma/schema.prisma`

### New enum

```prisma
enum ExternalAppStatus {
  active
  revoked
}
```

### New model

```prisma
model ExternalApp {
  id             String            @id @default(cuid())
  shopId         String
  appName        String            // human label e.g. "delivery-app"
  keyPrefix      String            // first 8 chars of raw key — for display only
  keyHash        String            @unique // SHA-256 of raw key
  scopes         String            // JSON array e.g. '["read:logistics"]'
  status         ExternalAppStatus @default(active)
  createdByUserId String
  lastUsedAt     DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  shop           Shop              @relation(fields: [shopId], references: [id])
  createdBy      User              @relation(fields: [createdByUserId], references: [id])

  @@unique([shopId, appName])
  @@index([keyHash])
}
```

Add the back-relations on `Shop` and `User`:

```prisma
// inside Shop model
externalApps   ExternalApp[]

// inside User model
createdExternalApps ExternalApp[]
```

---

## New files to create

### 1. `src/modules/external-app/domain/external-app-scope.ts`

Single source of truth for all valid scope strings.

```ts
export const EXTERNAL_APP_SCOPES = [
  "read:logistics",
  "write:logistics",
  "read:orders",
] as const;

export type ExternalAppScope = (typeof EXTERNAL_APP_SCOPES)[number];

export function parseScopes(raw: string): ExternalAppScope[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((s): s is ExternalAppScope =>
    (EXTERNAL_APP_SCOPES as readonly string[]).includes(s),
  );
}
```

> To add a new scope: add one string to `EXTERNAL_APP_SCOPES`.

---

### 2. `src/modules/external-app/domain/api-key.ts`

Key generation and hashing — no I/O.

```ts
import crypto from "node:crypto";

const KEY_PREFIX = "isa_";

export function generateRawApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function extractKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, KEY_PREFIX.length + 8); // "isa_" + 8 chars
}
```

---

### 3. `src/modules/external-app/contracts/external-app.contract.ts`

```ts
import { z } from "zod";
import { EXTERNAL_APP_SCOPES } from "../domain/external-app-scope.js";

export const LinkExternalAppInputSchema = z.object({
  appName: z.string().trim().min(2).max(60),
  scopes: z
    .array(z.enum(EXTERNAL_APP_SCOPES))
    .min(1, "At least one scope required"),
});

export const RevokeExternalAppInputSchema = z.object({
  appId: z.string().min(1),
});

export type LinkExternalAppInput = z.infer<typeof LinkExternalAppInputSchema>;

export type ExternalAppDto = {
  id: string;
  appName: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export type LinkExternalAppResponse = ExternalAppDto & {
  rawKey: string; // returned once only
};
```

---

### 4. `src/modules/external-app/commands/link-external-app.command.ts`

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { ConflictError } from "../../../shared/errors/http-errors.js";
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from "../domain/api-key.js";
import type { LinkExternalAppInput } from "../contracts/external-app.contract.js";
import type { LinkExternalAppResponse } from "../contracts/external-app.contract.js";

export async function linkExternalAppCommand(input: {
  shopId: string;
  createdByUserId: string;
  payload: LinkExternalAppInput;
}): Promise<LinkExternalAppResponse> {
  const existing = await prisma.externalApp.findUnique({
    where: { shopId_appName: { shopId: input.shopId, appName: input.payload.appName } },
  });

  if (existing && existing.status === "active") {
    throw new ConflictError(`App "${input.payload.appName}" is already linked to this shop`);
  }

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);

  const app = await prisma.externalApp.upsert({
    where: { shopId_appName: { shopId: input.shopId, appName: input.payload.appName } },
    create: {
      shopId: input.shopId,
      appName: input.payload.appName,
      keyPrefix,
      keyHash,
      scopes: JSON.stringify(input.payload.scopes),
      status: "active",
      createdByUserId: input.createdByUserId,
    },
    update: {
      keyPrefix,
      keyHash,
      scopes: JSON.stringify(input.payload.scopes),
      status: "active",
      createdByUserId: input.createdByUserId,
    },
  });

  return {
    id: app.id,
    appName: app.appName,
    keyPrefix: app.keyPrefix,
    scopes: input.payload.scopes,
    status: app.status,
    lastUsedAt: app.lastUsedAt,
    createdAt: app.createdAt,
    rawKey, // only time it is returned
  };
}
```

---

### 5. `src/modules/external-app/commands/revoke-external-app.command.ts`

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";

export async function revokeExternalAppCommand(input: {
  shopId: string;
  appId: string;
}): Promise<void> {
  const app = await prisma.externalApp.findFirst({
    where: { id: input.appId, shopId: input.shopId },
  });

  if (!app) throw new NotFoundError("External app not found");

  await prisma.externalApp.update({
    where: { id: input.appId },
    data: { status: "revoked" },
  });
}
```

---

### 6. `src/modules/external-app/middleware/authenticate-external-app.middleware.ts`

Drop-in replacement for `authenticateUserMiddleware` on external routes.

```ts
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../../shared/database/prisma-client.js";
import { hashApiKey } from "../domain/api-key.js";
import { parseScopes } from "../domain/external-app-scope.js";
import { UnauthorizedError } from "../../../shared/errors/http-errors.js";

export type ExternalAppPrincipal = {
  appId: string;
  shopId: string;
  appName: string;
  scopes: string[];
  username: string; // "app:<appName>"
};

declare global {
  namespace Express {
    interface Request {
      externalApp?: ExternalAppPrincipal;
    }
  }
}

export async function authenticateExternalAppMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.headers["x-api-key"];
  if (!raw || typeof raw !== "string") {
    return next(new UnauthorizedError("Missing x-api-key header"));
  }

  const keyHash = hashApiKey(raw);

  const app = await prisma.externalApp.findUnique({
    where: { keyHash },
    select: { id: true, shopId: true, appName: true, scopes: true, status: true },
  });

  if (!app || app.status !== "active") {
    return next(new UnauthorizedError("Invalid or revoked API key"));
  }

  // fire-and-forget — don't block the request
  prisma.externalApp
    .update({ where: { id: app.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  req.externalApp = {
    appId: app.id,
    shopId: app.shopId,
    appName: app.appName,
    scopes: parseScopes(app.scopes),
    username: `app:${app.appName}`,
  };

  next();
}
```

---

### 7. `src/modules/external-app/middleware/require-external-scope.middleware.ts`

```ts
import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../../../shared/errors/http-errors.js";
import type { ExternalAppScope } from "../domain/external-app-scope.js";

export function requireExternalScope(scope: ExternalAppScope) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.externalApp?.scopes.includes(scope)) {
      return next(new ForbiddenError(`Scope "${scope}" required`));
    }
    next();
  };
}
```

---

### 8. `src/modules/external-app/controllers/external-app.controller.ts`

```ts
import type { Request, Response } from "express";
import { linkExternalAppCommand } from "../commands/link-external-app.command.js";
import { revokeExternalAppCommand } from "../commands/revoke-external-app.command.js";
import { prisma } from "../../../shared/database/prisma-client.js";
import { parseScopes } from "../domain/external-app-scope.js";
import { LinkExternalAppInputSchema } from "../contracts/external-app.contract.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";

export const externalAppController = {
  async linkApp(req: Request, res: Response): Promise<void> {
    const parsed = LinkExternalAppInputSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const result = await linkExternalAppCommand({
      shopId: req.authUser!.shopId,
      createdByUserId: req.authUser!.id,
      payload: parsed.data,
    });

    res.status(201).json(result);
  },

  async listApps(req: Request, res: Response): Promise<void> {
    const apps = await prisma.externalApp.findMany({
      where: { shopId: req.authUser!.shopId },
      select: {
        id: true, appName: true, keyPrefix: true, scopes: true,
        status: true, lastUsedAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      apps.map((a) => ({ ...a, scopes: parseScopes(a.scopes) })),
    );
  },

  async revokeApp(req: Request, res: Response): Promise<void> {
    await revokeExternalAppCommand({
      shopId: req.authUser!.shopId,
      appId: req.params.appId,
    });
    res.status(204).end();
  },
};
```

---

### 9. `src/modules/external-app/routes/external-app.routes.ts`

```ts
import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { externalAppController } from "../controllers/external-app.controller.js";

export const externalAppRouter = Router();

externalAppRouter.use(
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
);

externalAppRouter.post("/", externalAppController.linkApp);
externalAppRouter.get("/", externalAppController.listApps);
externalAppRouter.delete("/:appId", externalAppController.revokeApp);
```

---

## Files to modify

### 10. Main router (wherever routes are registered)

Add:

```ts
import { externalAppRouter } from "./modules/external-app/routes/external-app.routes.js";

app.use("/api/external-apps", externalAppRouter);
```

---

## How to protect an external-facing route

Example: exposing a logistic read endpoint to the delivery app.

```ts
import { authenticateExternalAppMiddleware } from "../../external-app/middleware/authenticate-external-app.middleware.js";
import { requireExternalScope } from "../../external-app/middleware/require-external-scope.middleware.js";

externalLogisticRouter.use(
  authenticateExternalAppMiddleware,
  requireExternalScope("read:logistics"),
);

externalLogisticRouter.get("/items", externalLogisticController.getItems);
```

Inside the handler, use `req.externalApp.shopId` (instead of `req.authUser.shopId`) to scope the query.

---

## Extending the system

| Goal | Where to change |
|------|----------------|
| Add a new scope | `EXTERNAL_APP_SCOPES` in `external-app-scope.ts` |
| Add a new external-facing endpoint | New router file + `authenticateExternalAppMiddleware` + `requireExternalScope(...)` |
| Rotate a key | Call `POST /api/external-apps` with the same `appName` — upsert issues a fresh key |
| Per-app rate limiting | Add express-rate-limit keyed on `req.externalApp.appId` to the external router |
| Audit log | Write to a new `ExternalAppAuditLog` model in the middleware after `lastUsedAt` update |

---

## Exit criteria

- Admin can link an external app and receive a one-time raw key.
- Admin can list all linked apps (keys never exposed — prefix only).
- Admin can revoke an app; subsequent requests with its key receive 401.
- An external route protected with `authenticateExternalAppMiddleware` + `requireExternalScope` returns 401 with no key, 403 with wrong scope, 200 with correct key and scope.
- Existing JWT-authenticated routes are completely unaffected.
