# Shopify OAuth 403 Debug — Root Cause & Resolution

## Context

During Shopify OAuth installation, the flow failed with:

- Redirect to: `admin.shopify.com/store/...`
- Final result: `403 Forbidden`
- Callback route was never reached

---

## Observed Request Flow

1. Frontend → `POST /api/shopify/oauth/install` ✅
2. Backend → returns `200 JSON { authorizationUrl }` ✅
3. Frontend → `window.location.href = authorizationUrl` ✅
4. Browser → `beyovintage.myshopify.com/admin/oauth/authorize` → `303 See Other` ⚠️
5. Shopify → `303 → /admin/auth/login` ⚠️
6. Shopify → `admin.shopify.com/store/{handle}/oauth/authorize` ❌
7. Final → `403 Forbidden` ❌
8. Callback — **never reached**

---

## What Was Checked and Eliminated

Each of the following was investigated and confirmed NOT to be the cause:

| Suspect | Status | Notes |
|---|---|---|
| Redirect URI mismatch in Partner Dashboard | ✅ Correct | Exact match confirmed in install URL logs |
| Wrong `client_id` / API key in `.env` | ✅ Correct | Confirmed via install URL log |
| `FRONTEND_URL` missing from EC2 `.env` | ⚠️ Side issue | Was missing (defaults to `localhost:5173`) — fixed separately |
| `FRONTEND_URLS` not including current ngrok URL | ⚠️ Side issue | Fixed separately |
| "Embed app in Shopify admin" checkbox | ⚠️ Should be off | Unchecked for standalone apps — but not the root cause |
| HMAC validation failure | ✅ Not applicable | Callback was never reached so HMAC was never tested |
| Legacy install flow | ✅ Not applicable | Deprecated, less secure, not relevant for modern apps |
| DB stale shop record (no access token) | ✅ Not blocking | `findAnyLinkedShop` only returns shops with non-null `accessToken` |

---

## Root Cause

The OAuth flow was initiated using `fetch()` followed by a JavaScript redirect:

```typescript
// BROKEN — fetch() keeps execution in the app/browser context
const response = await fetch("/api/shopify/oauth/install", { method: "POST" });
const { authorizationUrl } = await response.json();
window.location.href = authorizationUrl; // too late — context is already set
```

### What happens:

When `fetch()` is used before the navigation, the browser's request context carries metadata from the current page session. When Shopify sees the OAuth request arrive in this context, it interprets it as originating from an embedded or admin-session context. Shopify then rewrites the authorization URL to `admin.shopify.com/store/{handle}/oauth/authorize` and enforces stricter session validation — resulting in `403` for any request that doesn't hold a valid admin session token in that unified admin context.

This is a **silent failure mode** with no clear error message. It looks identical to a redirect URI mismatch or invalid `client_id`.

### Why it worked in some setups and not others:

- The original local dev app was set up before the `fetch()` pattern was introduced. Some browser/ngrok combinations did not trigger the admin context rewrite.
- New apps in the Shopify Partner Dashboard default to "Embed app in Shopify admin" checked, which makes this failure more likely and consistent.

---

## Solution

Replace the two-step fetch + redirect with a **single direct browser navigation** to the backend install endpoint. The backend then issues the `302` redirect to Shopify. This gives Shopify a clean top-level browser navigation with no preceding fetch context.

### Backend change — `GET /oauth/install` returns 302

```typescript
// routes
shopifyRouter.get("/oauth/install", asyncHandler(shopifyController.install));

// controller
install: async (req, res) => {
  const rawToken = req.query.token as string;
  const principal = tokenService.verifyAccessToken(rawToken);
  if (principal.role !== "admin") throw new ValidationError("Admin role required");

  const input = InstallShopInputSchema.parse({
    shopDomain: req.query.shopDomain ?? req.query.shop,
    storeName: req.query.storeName,
  });

  const result = await createInstallUrlCommand(input, principal.userId);
  res.redirect(302, result.authorizationUrl); // backend drives the redirect
}
```

### Frontend change — direct navigation, no fetch

```typescript
// Read JWT from localStorage — cannot use Authorization header in a navigation request
const token = tokenAuthController.getAccessToken();
const params = new URLSearchParams({ token, shop: shopDomain });
window.location.href = `/api/shopify/oauth/install?${params.toString()}`;
```

### Resulting flow (correct)

1. `window.location.href = /api/shopify/oauth/install?shop=...&token=...`
2. Backend `GET /oauth/install` → verifies token → `302 → beyovintage.myshopify.com/admin/oauth/authorize?...`
3. Browser follows redirect to Shopify — clean top-level navigation, no prior context
4. Shopify → `302 → /api/shopify/oauth/callback?code=...&hmac=...`
5. Callback is hit ✅
6. Token exchange completes ✅
7. Backend → `302 → FRONTEND_URL` ✅

---

## Auth Note

Since `GET` browser navigation cannot send an `Authorization: Bearer` header, the JWT is passed as a `?token=` query parameter. It is verified inline in the controller using `tokenService.verifyAccessToken()` before any shop logic runs. The token appears in the URL only during the navigation and is never forwarded to Shopify (the backend handles the redirect).

---

## Partner Dashboard Settings for Standalone Apps

For an app that is **not** an embedded Shopify admin extension:

| Setting | Value |
|---|---|
| App URL | `https://your-domain.com` |
| Allowed redirection URL(s) | `https://your-domain.com/api/shopify/oauth/callback` |
| Embed app in Shopify admin | **Unchecked** |
| Use legacy install flow | **Unchecked** |

The redirect URL must match **exactly** — no trailing slash, exact path.

---

## Rule for Future

> Shopify OAuth MUST be initiated via direct top-level browser navigation.  
> Never use `fetch()` or any AJAX call to get the authorization URL and then navigate.  
> The backend install endpoint must return a `302` redirect directly to Shopify's OAuth URL.
