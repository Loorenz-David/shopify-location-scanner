# Location Stock System — Frontend API Contract

**Audience:** the frontend planning/implementation agent. This document is self-contained: it carries every endpoint shape, the domain meaning behind it, and the reactivity rules. It is generated from the backend master plan's naming registry (`../master_plan.md` §6) — that registry is authoritative; if the two ever disagree, report it, don't guess.
**Version:** 1.1 (2026-09-01) — property vocabulary finalized in §4.1; no shape changes from v1.0. Amendments arrive only as new versions of this file via the backend pipeline's coordinator.

## 1. What this feature is

Users configure **stock definitions** per shop location. One definition = `location + itemCategory + property criteria`, and represents an independently monitored stock instance carrying:

- `quantity` — units currently allocated (maintained automatically by the backend as items are scanned, moved, sold, returned, or edited in Shopify),
- three user-set thresholds (`low_in_stock`, `medium_in_stock`, `normal_in_stock`, strictly increasing),
- a derived `stockState`.

**States, severity-ascending (this exact order drives all sorting and any severity UI):**
`out_of_stock → low_in_stock → medium_in_stock → normal_in_stock → high_in_stock`.
Semantics with thresholds low=10 / med=15 / norm=20: `0 → out_of_stock`, `1–10 → low`, `11–15 → medium`, `16–20 → normal`, `>20 → high`.

An eligible item (unsold, at the location, of the category) is counted by **exactly one** definition — the most specific one whose criteria it matches. Users can therefore layer a broad catch-all with narrower carve-outs and the counts never double-count.

## 2. Property criteria — the shapes the form builds

`properties` is an object mapping property keys to accepted values:

| Shape | Meaning |
|---|---|
| `{ "wood_type": ["Teak", "Oak"] }` | item's wood_type must include Teak OR Oak |
| `{ "wood_type": "Teak" }` | scalar accepted on input; equivalent to `["Teak"]` |
| `{ "upholstery": null }` | wildcard: the item must HAVE an upholstery value, any value accepted |
| `{}` | catch-all: every eligible item in this location+category |

Rules the UI should reflect:
- Keys and values must come from the options endpoint (§4.1) — free-typing is rejected by the backend (400).
- Keys not included in the object don't constrain matching at all. A wildcard is a real constraint (key must be present on the item) — it is not the same as omitting the key.
- The backend normalizes values (lowercase, dedupe, sort) — responses return the canonical form, so what you render back may differ cosmetically from what was submitted (e.g. `"Teak"` → `["teak"]`). Display casing should come from the options map, matching case-insensitively.
- Two definitions in the same location+category **conflict** when they use the exact same set of keys and their accepted values overlap on every key (wildcard overlaps everything). Adding/removing a key dimension always avoids conflict. The backend enforces this (409); the form only needs to surface the error, not pre-compute it.

## 3. Transport, auth, envelopes

- Base path: `/api/stock/...` (same axios client as existing features). Auth: Bearer JWT; user must be shop-linked. Any authenticated role may read AND write (same policy as zones/logistic locations).
- Success: reads/creates `{ "data": ... }`; deletes `{ "ok": true }`.
- Errors: `{ "error": { "code", "message", "details"?, "requestId" } }` — 400 `VALIDATION_ERROR`, 401, 404, 409 conflict. Conflict `details` carries `conflictingId` (the existing definition's id) and, on batch create, `batchIndex` (which submitted entry collided).

## 4. Endpoints

### 4.1 `GET /api/stock/options` — configuration form vocabulary
```json
{ "data": {
    "itemCategories": ["Dining Chairs", "Easy Chairs", ...],
    "propertyOptions": [
      { "key": "wood_type", "values": ["Beech","Birch","Cherry","Elm","Mahogany","Oak","Santos Rosewood","Teak","Walnut"], "categories": "universal" },
      { "key": "shape", "values": ["Oval","Rectangular","Round","Square"], "categories": ["Dining Tables"] }
    ]
} }
```
Static vocabulary (no DB behind it). `categories: "universal"` → offer for every item type; otherwise only when the selected item type is listed. **Locations are NOT here** — the valid location list is already in the bootstrap payload (`shopify.metafields.options`, the same source the scanner uses).

**Final vocabulary (owner-selected, v1.1)** — the exact payload content, safe to hardcode in mocks:

| key | values | categories |
|---|---|---|
| `wood_type` | Beech, Birch, Cherry, Elm, Mahogany, Oak, Santos Rosewood, Teak, Walnut | `"universal"` |
| `years` | 1950-1960s, 1960-1970s, 1970-1980s, 1980-1990s, Early 20th century furniture | `"universal"` |
| `weight_definition` | 1-20 kg, 21-40 kg, 41-60 kg, 61+ kg | `"universal"` |
| `country` | Denmark, Sweden, Germany, United Kingdom, Italy, Netherland | `"universal"` |
| `shape` | Oval, Rectangular, Round, Square | Dining Tables, Bedside Tables, Coffee Tables, Side Tables, Hall Tables, Nest Of Tables |
| `extension_type` | Inside Extension, Outside Extension | same six table categories |
| `extension_quantity` | 1, 2, 3, 4 | same six table categories |
| `upholstery` | Up, Down | Dining Chairs, Easy Chairs, Armchairs |

### 4.2 `GET /api/stock/locations` — settings landing page
```json
{ "data": [ { "location": "LC1", "stockCount": 3 }, { "location": "H1", "stockCount": 1 } ] }
```
Every location having ≥1 definition, with its **definition count** (not item-type count).

### 4.3 `GET /api/stock/locations/:location` — location detail (URL-encode the location)
```json
{ "data": [ {
  "id": "cm...", "location": "LC1", "itemCategory": "Dining Chairs",
  "properties": { "wood_type": ["teak"] },
  "quantity": 12, "stockState": "medium_in_stock",
  "thresholds": [
    { "state": "low_in_stock", "thresholdQuantity": 10 },
    { "state": "medium_in_stock", "thresholdQuantity": 15 },
    { "state": "normal_in_stock", "thresholdQuantity": 20 } ],
  "createdAt": "...", "createdByUsername": "david",
  "updatedAt": "...", "updatedByUsername": "david"
} ] }
```
This `LocationStockDto` is the shape everywhere a definition is returned.

### 4.4 `POST /api/stock/configurations` — create (always an array; one entry is fine)
```json
{ "configurations": [ {
    "location": "LC1", "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["Teak"] },
    "thresholds": [
      { "state": "low_in_stock", "thresholdQuantity": 10 },
      { "state": "medium_in_stock", "thresholdQuantity": 15 },
      { "state": "normal_in_stock", "thresholdQuantity": 20 } ]
} ] }
```
→ `201 { "data": [LocationStockDto...] }`. **All-or-nothing:** any invalid/conflicting entry fails the whole batch (nothing created; error names `batchIndex`/`conflictingId`). `properties` optional — omitted or `{}` = catch-all. All three thresholds mandatory, strictly increasing. The response DTOs already carry the **real initial quantity and state**, computed from existing inventory — never 0 by default. Expect this call to be slightly heavier than a plain insert (it recounts the affected group inline); no polling needed, the response is final.

### 4.5 `PATCH /api/stock/configurations/:id`
Body: any subset of `{ location, itemCategory, properties, thresholds }`. `thresholds`, when present, is the **complete replacement list** (all three states), not a patch. Editing location/category/properties can change quantities of *sibling* definitions too (items reallocate) — after an update, refetch the whole location detail (both locations, if the location changed), not just the edited row. → `200 { "data": LocationStockDto }` (post-reallocation values).

### 4.6 `DELETE /api/stock/configurations/:id`
→ `200 { "ok": true }`. Items are untouched; they fall back to a broader matching definition, so siblings' quantities may rise — refetch the location detail.

### 4.7 `GET /api/stock/report` — restock prioritization (available one phase later than 4.1–4.6)
Query params: `states` (optional CSV, e.g. `states=out_of_stock,low_in_stock`), `groupByLocation` (optional boolean).

Default (compacted): definitions with identical `itemCategory + properties + stockState` are merged across locations —
```json
{ "data": { "rows": [ {
  "itemCategory": "Dining Chairs", "properties": { "wood_type": ["walnut"] },
  "quantity": 5, "stockState": "low_in_stock", "locations": ["L1","L2"]
} ] } }
```
`locations` is always an array, even with one entry. Rows ordered worst-state-first (severity order of §1). Same category+properties in a *different* state stays a separate row — low stock in one location is never hidden by healthy stock elsewhere.

Grouped (`groupByLocation=true`): no compaction —
```json
{ "data": { "groups": [ { "location": "H1", "entries": [
  { "itemCategory": "...", "properties": {...}, "quantity": 0, "stockState": "out_of_stock" } ] } ] } }
```
Groups ordered by problem severity: most `out_of_stock` first, then most `low_in_stock`, then most `medium_in_stock`, then location name ascending. Entries within a group are severity-ascending.

## 5. Reactivity

- **No stock-specific WebSocket event exists.** Subscribe to the existing `scan_history_updated` event and refetch the visible stock data, exactly as the analytics page does (`features/analytics/flows/use-analytics-page.flow.ts:138-142` — ignore payload, refetch). It fires on every item-driven stock change (scans, Shopify admin edits, sales, returns, syncs) and also on some item changes that can't affect stock — the extra refetches are accepted.
- **Configuration changes emit no event.** The editing user gets final values in the HTTP response; other users see them on next load/refetch. Deliberate V1 scope.

## 6. Domain facts worth reflecting in UX copy

- An item can legitimately match **no** definition (missing property key, unmapped value, no catch-all) — its units are counted nowhere. A location's definition quantities only sum to its physical inventory when a catch-all `{}` definition exists for that category. Consider surfacing this in the settings UI (e.g. hint to add a catch-all).
- Item categories are the plural strings (`"Dining Chairs"`); locations are free-case-sensitive strings (`"LC1"`, `"H1"`) from the bootstrap metafield options.
- Quantities count **units**, not products — a "set of 4 chairs" item contributes 4.

## 7. Availability sequencing (for planning the integration order)

1. This document — available now; build against mocks.
2. Endpoints 4.1–4.6 — after backend phase P3 is approved.
3. Endpoint 4.7 (report) — after backend phase P5.
4. Live quantity movement from scans/sales (worth demoing end-to-end) — after backend phase P4.
5. ~~Contract v1.1 (final property key/value lists in §4.1)~~ — landed; this document is v1.1 and complete.
