# Frontend Handoff: Scan History Dimensions

## Summary

Backend now includes item dimensions in `ScanHistory` and returns them in scan-history payloads.

New nullable numeric fields:

- `itemHeight`
- `itemWidth`
- `itemDepth`

These are in addition to existing `volume`.

## Backend Changes

Source of truth fields were added on `ScanHistory` in Prisma schema:

- `itemHeight Float?`
- `itemWidth Float?`
- `itemDepth Float?`

Persistence path now writes these fields when product dimensions are available from Shopify metafields.

## API Shape Update

### Endpoint

- `GET /scanner/history`

### Response wrapper (unchanged)

```json
{
  "history": {
    "items": [],
    "page": 1,
    "pageSize": 50,
    "total": 0
  }
}
```

### Item shape change (`history.items[]`)

Added fields:

```json
{
  "id": "cm...",
  "shopId": "cm...",
  "userId": "cm...",
  "username": "david",
  "productId": "gid://shopify/Product/15164571189578",
  "itemCategory": "Tables",
  "itemSku": "St1 26.09",
  "itemBarcode": "0520010063",
  "itemImageUrl": "https://...",
  "itemType": "product_id",
  "itemTitle": "Swedish side table in oak by Jonas Lindvall for Scandiform, model 'Papa'",
  "itemHeight": 53,
  "itemWidth": 44,
  "itemDepth": 35,
  "volume": 81620,
  "lastModifiedAt": "2026-04-09T05:05:21.437Z",
  "events": [],
  "priceHistory": [],
  "createdAt": "2026-04-09T05:03:56.352Z",
  "updatedAt": "2026-04-09T05:05:21.449Z"
}
```

### Nested arrays shape (explicit)

`events` item shape (`history.items[].events[]`):

```json
{
  "username": "david",
  "eventType": "location_update",
  "orderId": "gid://shopify/Order/1234567890",
  "orderGroupId": "gid://shopify/Order/1234567890",
  "location": "H1",
  "happenedAt": "2026-04-09T05:05:21.437Z"
}
```

`priceHistory` item shape (`history.items[].priceHistory[]`):

```json
{
  "price": "1495",
  "terminalType": "sold_terminal",
  "orderId": "gid://shopify/Order/1234567890",
  "orderGroupId": "gid://shopify/Order/1234567890",
  "happenedAt": "2026-04-09T05:05:21.437Z"
}
```

Type notes for nested arrays:

- `events[].eventType`: `"location_update" | "unknown_position" | "sold_terminal"`
- `events[].orderId`: `string | null`
- `events[].orderGroupId`: `string | null`
- `events[].happenedAt`: ISO datetime string
- `priceHistory[].price`: `string | null`
- `priceHistory[].terminalType`: `"unknown_position" | "sold_terminal" | "price_update" | null`
- `priceHistory[].orderId`: `string | null`
- `priceHistory[].orderGroupId`: `string | null`
- `priceHistory[].happenedAt`: ISO datetime string

### Enums (source of truth values)

Backend enum values used in history payloads:

`ScanHistoryEventType`

- `location_update`
- `unknown_position`
- `sold_terminal`

`ScanHistoryPriceTerminalType`

- `unknown_position`
- `sold_terminal`
- `price_update`

Frontend-ready TypeScript aliases:

```ts
export type ScanHistoryEventType =
  | "location_update"
  | "unknown_position"
  | "sold_terminal";

export type ScanHistoryPriceTerminalType =
  | "unknown_position"
  | "sold_terminal"
  | "price_update";
```

Notes:

- `itemHeight`, `itemWidth`, `itemDepth` are `number | null`.
- Fields are nullable when metafields are missing or unparsable.
- Units are whatever the Shopify metafield values represent today (currently treated as cm by backend parsing logic).

## Frontend Update Required

Update receive DTO/type for scan-history item to include:

- `itemHeight: number | null`
- `itemWidth: number | null`
- `itemDepth: number | null`

Suggested minimum updates in frontend:

1. Extend scan-history API DTO (`ItemScanHistoryEntryDto`).
2. Extend normalized domain item type if UI/state should retain dimensions.
3. Update mapper/normalizer to pass through these fields.
4. Optional: UI rendering for dimensions (for example in item details).

## Backward Compatibility

- Existing clients that ignore unknown fields will continue to work.
- No existing field was renamed or removed.

## Migration/Application Note

Schema + migration files are committed, but applying migration can fail if SQLite is locked by a running backend process.

If needed in local/dev:

1. Stop backend process using `dev.db`.
2. Run `npm run prisma:migrate:dev`.
3. Run `npm run prisma:generate`.
