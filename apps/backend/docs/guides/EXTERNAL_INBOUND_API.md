# External Inbound API

## Purpose

This API is for server-to-server inbound requests from other applications you control.

It is separate from the normal JWT-authenticated frontend API. These routes do not use user login. They use a static API key passed in a header and are intended for trusted external systems only.

Current base path:

`/api/external`

Current implemented endpoint:

- `POST /api/external/orders/schedule`

## Authentication

Every request must include:

```http
x-api-key: <EXTERNAL_API_KEY>
Content-Type: application/json
```

The backend compares `x-api-key` against `EXTERNAL_API_KEY` from the backend environment.

If the key is missing or wrong, the API returns `401`.

## Request Scope

Requests must include `shopId` in the JSON body.

The API key proves the caller is allowed to use the inbound API.
The `shopId` tells the backend which shop’s data to operate on.

## Response Shape

### Success

Success responses use a simple JSON shape like:

```json
{
  "ok": true
}
```

For endpoints that return counters or other result fields, those fields are included alongside `ok`.

### Errors

All errors go through the backend’s global error middleware and return this envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "..."
  }
}
```

Possible fields:

- `code`: stable application error code
- `message`: safe error message
- `requestId`: request correlation id
- `details`: optional extra validation/debug details

The response header also includes:

```http
x-request-id: <request id>
```

## Endpoint

### `POST /api/external/orders/schedule`

Sets `scheduledDate` on all sold `ScanHistory` items that match the given `shopId` and `orderId`.

This endpoint is intended for external apps that need to schedule all items in an order after the order already exists in the backend.

### Request Headers

```http
x-api-key: <EXTERNAL_API_KEY>
Content-Type: application/json
```

### Request Body

```json
{
  "shopId": "clxxxxxx",
  "orderId": "987654321",
  "scheduledDate": "2026-05-10"
}
```

### Field Rules

- `shopId`: required, non-empty string
- `orderId`: required, non-empty string
- `scheduledDate`: required, must be in `yyyy-mm-dd` format

Example valid values:

- `2026-05-10`
- `2026-12-01`

Example invalid values:

- `10-05-2026`
- `2026/05/10`
- `2026-5-10`

### Success Response

Status:

`200 OK`

Body:

```json
{
  "ok": true,
  "updated": 3
}
```

Meaning:

- `updated` is the number of sold `ScanHistory` records that were updated for that order

## Error Cases

### Invalid or missing API key

Status:

`401 Unauthorized`

Example:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key",
    "requestId": "..."
  }
}
```

### Malformed body

Status:

`400 Bad Request`

This happens when:

- `shopId` is missing
- `orderId` is missing
- `scheduledDate` is missing
- `scheduledDate` is not in `yyyy-mm-dd`

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "requestId": "..."
  }
}
```

### No matching sold items found

Status:

`404 Not Found`

This happens when the provided `shopId` + `orderId` does not match any sold items in `ScanHistory`.

Example:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No sold items found for orderId \"987654321\" in this shop",
    "requestId": "..."
  }
}
```

## Curl Example

```bash
curl -X POST "http://localhost:4000/api/external/orders/schedule" \
  -H "x-api-key: b5dbaa4bb89725b08e4b641a83dd0306347b32ef3041f59cd26668e2b1c71ea2" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "cmnractlq0000qr53y8so42t3",
    "orderId": "16959209308490",
    "scheduledDate": "2026-05-15"
  }'
```

Example success:

```json
{
  "ok": true,
  "updated": 1
}
```

## Notes

- This endpoint only updates sold items.
- It does not create orders.
- It does not validate whether the external caller “owns” the shop beyond the provided API key and `shopId`.
- `EXTERNAL_API_KEY` must be present in backend env or the backend will fail at startup.
- This module is designed so new inbound endpoints can be added under the same `/api/external` router.
