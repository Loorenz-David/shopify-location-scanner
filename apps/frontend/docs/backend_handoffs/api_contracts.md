# Frontend API Handoff

Related frontend implementation guide:

- `docs/front_end_handoffs/shopify_linkage_flow.md` for end-to-end Shopify linkage flow and helper functions.

## Base URL

- Local backend base URL: `http://localhost:4000`
- Frontend should read base URL from environment (for example `VITE_API_BASE_URL`).

## Global Error Shape

All non-2xx responses follow this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human readable message",
    "details": {},
    "requestId": "uuid"
  }
}
```

## Authentication

### Register

- Method: `POST`
- Path: `/auth/register`
- Auth required: `No`

Request body:

```json
{
  "username": "string (3-50)",
  "password": "string (8-128)"
}
```

Response `201`:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | worker",
    "shopId": "string | null"
  },
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

Frontend request shape:

```json
{
  "method": "POST",
  "path": "/auth/register",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "scanner-worker",
    "password": "Password1234"
  }
}
```

### Login

- Method: `POST`
- Path: `/auth/login`
- Auth required: `No`

Request body:

```json
{
  "username": "string",
  "password": "string"
}
```

Response `200`:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | worker",
    "shopId": "string | null"
  },
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

Frontend request shape:

```json
{
  "method": "POST",
  "path": "/auth/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "scanner-worker",
    "password": "Password1234"
  }
}
```

### Refresh Access Token

- Method: `POST`
- Path: `/auth/refresh`
- Auth required: `No`

Request body:

```json
{
  "refreshToken": "string"
}
```

Response `200`:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | worker",
    "shopId": "string | null"
  },
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

Frontend request shape:

```json
{
  "method": "POST",
  "path": "/auth/refresh",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "refreshToken": "<refreshToken>"
  }
}
```

### Logout

- Method: `POST`
- Path: `/auth/logout`
- Auth required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Request body:

```json
{
  "refreshToken": "string"
}
```

Response `200`:

```json
{
  "ok": true
}
```

Frontend request shape:

```json
{
  "method": "POST",
  "path": "/auth/logout",
  "headers": {
    "Authorization": "Bearer <accessToken>",
    "Content-Type": "application/json"
  },
  "body": {
    "refreshToken": "<refreshToken>"
  }
}
```

### Current User

- Method: `GET`
- Path: `/auth/me`
- Auth required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Response `200`:

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | worker",
    "shopId": "string | null"
  }
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/auth/me",
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

## Bootstrap

### Initial Payload

- Method: `GET`
- Path: `/bootstrap`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Response `200`:

```json
{
  "payload": {
    "shopify": {
      "metafields": {
        "namespace": "app",
        "key": "item_location",
        "type": "single_line_text_field",
        "options": [
          {
            "label": "Rack A",
            "value": "Rack A"
          }
        ]
      }
    }
  }
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/bootstrap",
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

Notes:

- This payload is designed to be extensible. New top-level keys can be added later under `payload`.
- Current implementation includes Shopify metafield data only.

## Shopify Connect and Product APIs

### Shopify OAuth Install URL (Admin only)

- Method: `POST`
- Path: `/shopify/oauth/install`
- Auth required: `Yes`
- Admin role required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Request body:

```json
{
  "storeName": "example-store"
}
```

Alternative request body (also supported):

```json
{
  "shopDomain": "example-store.myshopify.com"
}
```

Notes:

- `storeName` is the preferred initial value for frontend input.
- Backend will normalize `storeName` to `<storeName>.myshopify.com`.
- If both are sent, `shopDomain` is used.

Response `200`:

```json
{
  "authorizationUrl": "https://example.myshopify.com/admin/oauth/authorize?..."
}
```

Frontend request shape:

```json
{
  "method": "POST",
  "path": "/shopify/oauth/install",
  "headers": {
    "Authorization": "Bearer <accessToken>",
    "Content-Type": "application/json"
  },
  "body": {
    "storeName": "example-store"
  }
}
```

### Shopify OAuth Callback

- Method: `GET`
- Path: `/shopify/oauth/callback`
- Auth required: `No` (callback is validated via Shopify state and HMAC)

Query params expected:

- `code`
- `hmac`
- `shop`
- `state`
- `timestamp`

Response `200`:

```json
{
  "ok": true,
  "shop": {
    "id": "string",
    "shopDomain": "example.myshopify.com"
  }
}
```

Frontend request shape:

```json
{
  "note": "Frontend does not call this endpoint directly.",
  "calledBy": "Shopify OAuth redirect",
  "method": "GET",
  "path": "/shopify/oauth/callback",
  "query": {
    "code": "string",
    "hmac": "string",
    "shop": "example.myshopify.com",
    "state": "string",
    "timestamp": "string"
  }
}
```

### Get Linked Shop Summary

- Method: `GET`
- Path: `/shopify/shop`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Response `200`:

```json
{
  "shop": {
    "shopDomain": "example.myshopify.com",
    "createdAt": "2026-04-07T10:00:00.000Z"
  }
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/shopify/shop",
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

### Unlink Shop (Admin only)

- Method: `DELETE`
- Path: `/shopify/shop`
- Auth required: `Yes`
- Admin role required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Behavior:

- Removes the currently linked shop instance from backend.
- Users become unlinked from a shop after deletion.

Response `200`:

```json
{
  "ok": true,
  "shop": {
    "shopDomain": "example.myshopify.com",
    "createdAt": "2026-04-07T10:00:00.000Z"
  }
}
```

Frontend request shape:

```json
{
  "method": "DELETE",
  "path": "/shopify/shop",
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

### Get Product by Product ID

- Method: `GET`
- Path: `/shopify/products/:productId`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Accepted path param values:

- Shopify GID: `gid://shopify/Product/1234567890`
- Numeric ID: `1234567890`

Response `200`:

```json
{
  "product": {
    "id": "gid://shopify/Product/1234567890",
    "title": "Product title",
    "location": "Rack A",
    "updatedAt": "2026-04-06T18:00:00Z"
  }
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/shopify/products/:productId",
  "pathParams": {
    "productId": "gid://shopify/Product/1234567890"
  },
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

### Update Product Location by Product ID

- Method: `PATCH`
- Path: `/shopify/products/:productId/location`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Request body:

```json
{
  "location": "Rack A"
}
```

Response `200`:

```json
{
  "product": {
    "id": "gid://shopify/Product/1234567890",
    "title": "Product title",
    "location": "Rack A",
    "previousLocation": "Rack B",
    "updatedAt": "2026-04-06T18:00:00Z"
  }
}
```

Frontend request shape:

```json
{
  "method": "PATCH",
  "path": "/shopify/products/:productId/location",
  "pathParams": {
    "productId": "gid://shopify/Product/1234567890"
  },
  "headers": {
    "Authorization": "Bearer <accessToken>",
    "Content-Type": "application/json"
  },
  "body": {
    "location": "Rack A"
  }
}
```

### Update Product Location by Typed Identifier

- Method: `PATCH`
- Path: `/shopify/items/location`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Request body:

```json
{
  "idType": "product_id | handle | sku",
  "itemId": "string",
  "location": "Rack A"
}
```

Resolution behavior:

- `product_id`: uses itemId directly (numeric IDs are normalized to Product GID)
- `handle`: resolves product by Shopify handle, then updates
- `sku`: resolves first matching product by SKU, then updates

Response `200`:

```json
{
  "product": {
    "id": "gid://shopify/Product/1234567890",
    "title": "Product title",
    "location": "Rack A",
    "previousLocation": "Rack B",
    "updatedAt": "2026-04-06T18:00:00Z"
  }
}
```

Frontend request shape:

```json
{
  "method": "PATCH",
  "path": "/shopify/items/location",
  "headers": {
    "Authorization": "Bearer <accessToken>",
    "Content-Type": "application/json"
  },
  "body": {
    "idType": "sku",
    "itemId": "CH5-230226",
    "location": "Rack A"
  }
}
```

### Query Products by SKU (Top 10)

- Method: `GET`
- Path: `/shopify/items/by-sku?sku=<value>`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Response `200`:

```json
{
  "items": [
    {
      "productId": "gid://shopify/Product/1234567890",
      "imageUrl": "https://cdn.shopify.com/...",
      "sku": "CH5-230226"
    }
  ],
  "count": 1
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/shopify/items/by-sku",
  "query": {
    "sku": "CH5-230226"
  },
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

Notes:

- Returns first 10 matching items.
- Each item includes product image, SKU, and product ID.

### Query Metafield Options

- Method: `GET`
- Path: `/shopify/metafields/options`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Query params:

- none

Response `200`:

```json
{
  "metafield": {
    "namespace": "app",
    "key": "item_location",
    "type": "single_line_text_field",
    "options": [
      {
        "label": "Rack A",
        "value": "Rack A"
      }
    ]
  }
}
```

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/shopify/metafields/options",
  "query": {},
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

### Set Metafield Options (Admin only)

- Method: `PUT`
- Path: `/shopify/metafields/options`
- Auth required: `Yes`
- Admin role required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Request body:

```json
{
  "options": ["Rack A", "Rack B", "Front Shelf"]
}
```

Behavior:

- Trims every option value.
- Removes duplicates (exact-case dedupe after trimming).
- Creates the metafield definition if it does not exist yet.
- Updates the definition choices when it already exists.

Response `200`:

```json
{
  "metafield": {
    "namespace": "app",
    "key": "item_location",
    "type": "single_line_text_field",
    "options": [
      {
        "label": "Rack A",
        "value": "Rack A"
      },
      {
        "label": "Rack B",
        "value": "Rack B"
      }
    ]
  }
}
```

Frontend request shape:

```json
{
  "method": "PUT",
  "path": "/shopify/metafields/options",
  "headers": {
    "Authorization": "Bearer <accessToken>",
    "Content-Type": "application/json"
  },
  "body": {
    "options": ["Rack A", "Rack B", "Front Shelf"]
  }
}
```

## Frontend Integration Notes

- Use `accessToken` in `Authorization` header for protected routes.
- Persist and send `refreshToken` only when calling `/auth/refresh` and `/auth/logout`.
- For scanner flows, prefer `/shopify/items/location` because it supports `product_id`, `handle`, and `sku` in one endpoint.
- On app startup, call `/bootstrap` once and cache payload in frontend state.

## Scanner History APIs

### Get Scan History (Paginated)

- Method: `GET`
- Path: `/scanner/history?page=<number>&q=<searchText>`
- Auth required: `Yes`
- Shop link required: `Yes`
- Header: `Authorization: Bearer <accessToken>`

Query params:

- `page` optional, default `1`
- `q` optional search string (case-insensitive prefix match, `value%`)
- Fixed page size is `50`

Example requests:

- `/scanner/history`
- `/scanner/history?page=2`
- `/scanner/history?q=rack%20a`
- `/scanner/history?page=3&q=CH5-230226`

Frontend request shape:

```json
{
  "method": "GET",
  "path": "/scanner/history",
  "query": {
    "page": 1,
    "q": "rack"
  },
  "headers": {
    "Authorization": "Bearer <accessToken>"
  }
}
```

Response `200`:

```json
{
  "history": {
    "items": [
      {
        "id": "string",
        "shopId": "string",
        "userId": "string | null",
        "username": "string",
        "productId": "gid://shopify/Product/1234567890",
        "itemSku": "CH5-230226 | null",
        "itemType": "product_id | handle | sku",
        "itemTitle": "Sample product",
        "item_image": "some url",
        "lastModifiedAt": "2026-04-06T21:26:00.000Z",
        "events": [
          {
            "location": "Rack A",
            "happenedAt": "2026-04-06T21:26:00.000Z",
            "username": "user-1"
          }
        ],
        "createdAt": "2026-04-06T20:00:00.000Z",
        "updatedAt": "2026-04-06T21:26:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 50,
    "total": 120
  }
}
```

Behavior:

- Sorted by `lastModifiedAt` descending (newest first).
- `q` filters scan history by prefix match (`value%`) in: `username`, `productId`, `itemSku`, `itemType`, `itemTitle`, and event `location` values.
- `q` is shop-scoped and only searches records belonging to the authenticated user's linked shop.
- On each successful item location update, backend appends a new event object with `location` and `happenedAt`.
- If the product does not yet have a history row, backend creates one automatically.
