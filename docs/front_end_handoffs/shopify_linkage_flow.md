# Shopify Linkage Frontend Handoff

This document explains how frontend should connect a Shopify store to the app.

## Goal

Create a clear user flow for:

1. Admin enters store value.
2. Frontend requests Shopify install URL.
3. Browser redirects to Shopify OAuth.
4. Shopify calls backend callback.
5. Frontend verifies linkage state and loads app bootstrap data.

## Backend Endpoints Used

- `POST /shopify/oauth/install`
- `GET /shopify/oauth/callback` (Shopify calls this directly)
- `GET /auth/me`
- `GET /bootstrap`

See API contracts in `docs/front_end_handoffs/api_contracts.md` for payload details.

## Input From Frontend

Preferred input:

```json
{
  "storeName": "example-store"
}
```

Also accepted:

```json
{
  "shopDomain": "example-store.myshopify.com"
}
```

## End-to-End Flow

### Step 1: Ensure current user is admin

Before showing "Connect Shopify" action:

- Call `GET /auth/me`.
- Check `user.role === "admin"`.
- If user is not admin, disable or hide connect action.

### Step 2: Request install URL

Call `POST /shopify/oauth/install` with bearer token.

Request body example:

```json
{
  "storeName": "example-store"
}
```

Success response:

```json
{
  "authorizationUrl": "https://example-store.myshopify.com/admin/oauth/authorize?..."
}
```

### Step 3: Redirect browser

Set browser location to the returned `authorizationUrl`.

```ts
window.location.assign(authorizationUrl);
```

### Step 4: Shopify callback happens server-to-server/browser redirect

Shopify redirects to backend callback:

- `GET /shopify/oauth/callback?code=...&hmac=...&shop=...&state=...&timestamp=...`

Backend verifies HMAC + state, exchanges token, links shop to admin, and assigns unlinked users to that shop.

### Step 5: Return user to frontend and hydrate state

After callback success, frontend should ensure user lands on app route (for example `/app` or `/settings/integrations`).

Then run:

1. `GET /auth/me` to confirm `shopId` is no longer null.
2. `GET /bootstrap` to load Shopify metafield options and startup data.

## Suggested Frontend Helpers

```ts
// api/shopify.ts
export async function createShopifyInstallUrl(input: {
  storeName?: string;
  shopDomain?: string;
  accessToken: string;
}): Promise<{ authorizationUrl: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/shopify/oauth/install`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify(
        input.storeName
          ? { storeName: input.storeName }
          : { shopDomain: input.shopDomain },
      ),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message ?? "Failed to create Shopify install URL",
    );
  }

  return response.json();
}

export function redirectToShopify(authorizationUrl: string): void {
  window.location.assign(authorizationUrl);
}
```

```ts
// linkage/flow.ts
import { createShopifyInstallUrl, redirectToShopify } from "../api/shopify";

export async function startShopifyLinkage(params: {
  storeInput: string;
  accessToken: string;
}): Promise<void> {
  const normalized = params.storeInput.trim();

  const payload = normalized.endsWith(".myshopify.com")
    ? { shopDomain: normalized, accessToken: params.accessToken }
    : { storeName: normalized, accessToken: params.accessToken };

  const { authorizationUrl } = await createShopifyInstallUrl(payload);
  redirectToShopify(authorizationUrl);
}
```

```ts
// post-linkage bootstrap check
export async function finalizeShopifyLinkage(
  accessToken: string,
): Promise<void> {
  const meRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    throw new Error("Unable to verify user after Shopify callback");
  }

  const me = await meRes.json();
  if (!me?.user?.shopId) {
    throw new Error("Shopify store is not linked yet");
  }

  const bootstrapRes = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/bootstrap`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!bootstrapRes.ok) {
    throw new Error("Failed to load app bootstrap after linkage");
  }

  // frontend can cache/use payload here
  await bootstrapRes.json();
}
```

## UX Guidance

- Show store input placeholder: `example-store`.
- Allow user to paste either `example-store` or full `example-store.myshopify.com`.
- Disable connect button while request is in-flight.
- On success redirect immediately.

## Error Handling Map

- `401 UNAUTHORIZED`:
  - Session expired or callback validation failed.
  - Prompt re-login.
- `403 FORBIDDEN`:
  - Non-admin attempted to link.
  - Show: "Only admin can connect Shopify store".
- `409 CONFLICT`:
  - Different store already linked.
  - Show: "A different Shopify store is already linked".
- `422 / VALIDATION_ERROR`:
  - Invalid store input format.
  - Highlight store input and show validation message.

## QA Checklist

- Admin can start linkage using `storeName` only.
- Admin can start linkage using full `shopDomain`.
- Worker cannot start linkage (gets forbidden).
- After callback success, `auth/me` returns non-null `shopId`.
- `bootstrap` succeeds after linkage.
- If different shop is already linked, API returns conflict.
