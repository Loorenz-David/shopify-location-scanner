# Location Stock System — Frontend API Contract

**Audience:** the frontend planning/implementation agent. This document is self-contained: it carries every endpoint shape, the domain meaning behind it, and the reactivity rules. It is generated from the backend master plan's naming registry (`../master_plan.md` §6) — that registry is authoritative; if the two ever disagree, report it, don't guess.
**Version:** 1.6 (2026-09-02) — **§4.7: the report entry gains `thresholds` and `unitsToNormalThreshold`.** The report said a definition was low and held 7; it never said what "enough" was, so the screen that exists to drive restocking could not say how much to bring. Each entry now carries the definition's three configured thresholds and a backend-computed **units-to-full** number. **Additive only — no existing field changes, no field is removed, and every v1.5 rule still holds**, so code built against v1.5 keeps working untouched. Backend authority: intention §27 (ratified 2026-09-02), which extends §26.1's entry shape and nothing else. **Read §4.7's boundary table before rendering the number** — one of its four cases looks like a bug and is not. Previously — **1.5 (2026-09-02): §4.4: the worked example was factually wrong and is replaced.** v1.4 illustrated an intra-batch conflict with `{}` + `{wood_type:["Teak"]}`. That pair is **not** a conflict — different key sets never conflict (§2), and the endpoint returns `201` for it, confirmed by execution against the implemented backend. The example now uses a genuine conflict (same key set, overlapping values) and says plainly what the old one got wrong, because a frontend that pre-validated from it would reject the feature's central catch-all-plus-carve-out pattern. **Nothing else changes: the two `details` shapes in §3 are unaffected and correct.** Previously — **1.4 (2026-09-01): §3 and §4.4: conflict errors have TWO shapes, not one.** v1.1–v1.3 promised `conflictingId` on every 409. That is only true when the submitted entry clashes with something already stored; when two entries *within one batch* clash with each other, nothing is written, so no existing definition and no id exist. Both shapes are now specified, with the message each one makes possible. Everything else is unchanged. Previously — **1.3 (2026-09-01): §4.1 `itemCategories` un-elided.** The list was written `["Dining Chairs", "Easy Chairs", ...]` in v1.1 and v1.2; the `...` was literal and the real vocabulary is **28** values, not the 9 inferable from the property table's `categories` column. Answers `handoffs/frontend/handoff_item_categories_confirmation.md`. No other section changes. Previously — **1.2 (2026-09-01): §4.7 (report) replaced.** Answers `frontend_handoffs/frontend-report-endpoint-request.md` (frontend decision D7), approved by the owner and ratified into the backend intention as §26. The report is now one unparameterized read returning uncompacted entries with a `mergeKey`; compaction, filtering, ordering and ranking move to the client. **§§4.1–4.6, transport, auth, envelopes and reactivity are unchanged from v1.1.** Amendments arrive only as new versions of this file via the backend pipeline's coordinator.

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
- Errors: `{ "error": { "code", "message", "details"?, "requestId" } }` — 400 `VALIDATION_ERROR`, 401, 404, 409 conflict.

**A 409's `details` has two shapes. Handle both — the field that identifies the clash differs, and only one of them can carry an id.**

| Case | `details` | What it means |
|---|---|---|
| **Clashes with a stored definition** | `{ "conflictingId": "<id>", "batchIndex": <n> }` | The submitted entry overlaps a definition that already exists. `conflictingId` is that definition's id, so you can fetch or highlight it. `batchIndex` (batch create only) says which submitted entry caused it. |
| **Two entries in one batch clash with each other** | `{ "batchIndex": <later>, "conflictsWithBatchIndex": <earlier> }` — **no `conflictingId`** | Both entries are in the request you just sent. Batch create is all-or-nothing, so **nothing was written**: there is no existing definition and therefore no id to name. The two indices are the only actionable information, and they are enough — *"row 2 overlaps row 1"*. |

**Do not read `conflictingId` unconditionally.** In the second case it is absent, and code written against v1.3 that dereferences it will show an empty error, or highlight nothing, at exactly the moment the user needs to know which of the rows they just typed is the problem. Branch on its presence.

## 4. Endpoints

### 4.1 `GET /api/stock/options` — configuration form vocabulary
```json
{ "data": {
    "itemCategories": ["Dining Chairs","Easy Chairs","Armchairs","Sofas","Stools","Seating Benches","Serving Trolleys","Dining Tables","Bedside Tables","Coffee Tables","Side Tables","Hall Tables","Writing Desks","Nest Of Tables","Sideboards","Highboards","Bookshelves","Shelving Units","Chest of Drawers","Secretary Cabinets","Bar Cabinets","Wardrobes","Storage Cabinets","Posters","Mirrors","Porcelain","Carpets","Lamps"],
    "propertyOptions": [
      { "key": "wood_type", "values": ["Beech","Birch","Cherry","Elm","Mahogany","Oak","Santos Rosewood","Teak","Walnut"], "categories": "universal" },
      { "key": "shape", "values": ["Oval","Rectangular","Round","Square"], "categories": ["Dining Tables"] }
    ]
} }
```
Static vocabulary (no DB behind it). `categories: "universal"` → offer for every item type; otherwise only when the selected item type is listed. **Locations are NOT here** — the valid location list is already in the bootstrap payload (`shopify.metafields.options`, the same source the scanner uses).

**`itemCategories` is exactly the 28 values above, in that order, complete** (v1.3 — it was elided as `...` in v1.1/v1.2, which was a defect in this document). It is a static `as const` array in backend code, returned verbatim with no query; it is **not** derived from Shopify product types at request time, so it does not vary by shop or grow on its own.

**Most categories carry no category-specific property**, and that is normal, not an omission: only the six table types and the three chair types appear in the `categories` column of the table below. A `Sideboard` or a `Sofa` is configured with the four universal keys alone. **Do not infer the category list from that column** — 19 of the 28 never appear in it, including `Sideboards`, `Bookshelves`, `Wardrobes`, `Mirrors` and `Sofas`, which together account for 152 unsold units in the current data. A UI offering only the nine categories named below would leave those unconfigurable, with no error to reveal it.

The sentinel `"unknown"` is deliberately **not** in the list and cannot be configured (backend context §0.16): items resolve to it when their product type matches nothing, and they are counted by no stock definition.

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
→ `201 { "data": [LocationStockDto...] }`. **All-or-nothing:** any invalid or conflicting entry fails the whole batch and **nothing is created** — including when the conflict is between two entries of the batch itself. The 409's `details` tells you which case you hit; see the two-shape table in §3. Worked example: submitting `LC1 · Dining Chairs · {wood_type:["Oak","Teak"]}` together with `LC1 · Dining Chairs · {wood_type:["Teak"]}` in one request is an intra-batch conflict — same location, same category, **same key set** (`wood_type`), and their accepted values overlap on Teak — and comes back as `{ "batchIndex": 1, "conflictsWithBatchIndex": 0 }` with no `conflictingId`, because neither row was written.

> **Corrected in v1.5 — the v1.4 example was wrong, and wrong in the direction that matters.** v1.4 used `{}` together with `{wood_type:["Teak"]}` as its intra-batch conflict example. **That pair does not conflict**, and submitting it returns `201` with both rows created — verified against the running endpoint. A catch-all and a narrower carve-out have *different key sets*, and §2's rule is explicit that adding or removing a key dimension always avoids conflict. That pair is not an error case at all; it is the **layering the whole feature exists for** (§1: "users can therefore layer a broad catch-all with narrower carve-outs"). If you built client-side pre-validation from the v1.4 example, it now rejects the single most common thing a user will configure — a location-wide catch-all plus one carve-out — with an error the backend would never have raised. **§2 was always correct; only the §4.4 example contradicted it.** Trust §2. `properties` optional — omitted or `{}` = catch-all. All three thresholds mandatory, strictly increasing. The response DTOs already carry the **real initial quantity and state**, computed from existing inventory — never 0 by default. Expect this call to be slightly heavier than a plain insert (it recounts the affected group inline); no polling needed, the response is final.

### 4.5 `PATCH /api/stock/configurations/:id`
Body: any subset of `{ location, itemCategory, properties, thresholds }`. `thresholds`, when present, is the **complete replacement list** (all three states), not a patch. Editing location/category/properties can change quantities of *sibling* definitions too (items reallocate) — after an update, refetch the whole location detail (both locations, if the location changed), not just the edited row. → `200 { "data": LocationStockDto }` (post-reallocation values).

### 4.6 `DELETE /api/stock/configurations/:id`
→ `200 { "ok": true }`. Items are untouched; they fall back to a broader matching definition, so siblings' quantities may rise — refetch the location detail.

### 4.7 `GET /api/stock/report` — restock prioritization (available one phase later than 4.1–4.6)

**v1.2 — replaces v1.1's compacted/grouped dual shape.** Backend authority: intention §26.

**No query parameters.** Send none; any that arrive are ignored, not rejected. One call returns
the complete dataset: every stock definition, all locations, all states, **uncompacted** — one
entry per definition (`location × itemCategory × properties`).

```json
{ "data": { "entries": [
  { "location": "LC1", "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["walnut"] },
    "mergeKey": "<opaque>", "quantity": 2, "stockState": "low_in_stock",
    "thresholds": [
      { "state": "low_in_stock",    "thresholdQuantity": 10 },
      { "state": "medium_in_stock", "thresholdQuantity": 15 },
      { "state": "normal_in_stock", "thresholdQuantity": 20 } ],
    "unitsToNormalThreshold": 18 },
  { "location": "H1",  "itemCategory": "Dining Chairs",
    "properties": { "wood_type": ["walnut"] },
    "mergeKey": "<same opaque value>", "quantity": 3, "stockState": "low_in_stock",
    "thresholds": [
      { "state": "low_in_stock",    "thresholdQuantity": 10 },
      { "state": "medium_in_stock", "thresholdQuantity": 15 },
      { "state": "normal_in_stock", "thresholdQuantity": 20 } ],
    "unitsToNormalThreshold": 17 }
] } }
```

**`thresholds`** (v1.6) is the definition's three configured bands — the **same shape** §4.3 already
returns for a configuration, so you can reuse whatever renders it there. Look the row you want up
**by `state`**, never by array position.

**`unitsToNormalThreshold`** (v1.6) is how many units this definition needs to be **full**:

```
unitsToNormalThreshold = max(0, normal_in_stock threshold − quantity)
```

It is computed on the backend on purpose. The band boundaries are domain rules, and the same
reasoning that keeps `mergeKey` server-side applies here — a client that re-derives them will
eventually derive them differently. Display it; don't recompute it.

**Read this table before you render it. The third row looks like a bug and is not:**

| `quantity` | `stockState` | `unitsToNormalThreshold` | what to show |
|---|---|---|---|
| 0 | `out_of_stock` | **20** | bring a full shelf |
| 7 | `low_in_stock` | **13** | **not 9** — 9 would only *enter* the normal band; this number fills it |
| 18 | `normal_in_stock` | **2** | **already `normal_in_stock`, and still asking for 2.** Deliberate (owner decision, intention §27.3): normal is a band of `16–20`, and 18 is inside it but not yet full. If your UI hides the number whenever the state is normal, you will hide a legitimate restock. |
| 25 | `high_in_stock` | **0** | never negative — safe to render unconditionally |

**Why "fill" and not "clear the warning".** With thresholds 10/15/20 the states are
`0 → out`, `1–10 → low`, `11–15 → medium`, `16–20 → normal`, `>20 → high`. A definition *enters*
normal at 16 and *fills* it at 20. The owner chose the fill number, so it is a replenishment
target, not the minimum that stops the warning. The field is named `unitsToNormalThreshold` rather
than `unitsToNormal` precisely so the two cannot be confused.

**`mergeKey`** is an **opaque string**, equal between two entries **iff** their `itemCategory`
and canonical `properties` are equal. Group on it to build the compacted view. **Never parse
it** — its encoding is backend-owned and may change without a contract version. It exists so
property canonicalization and equality (§4.1's rules — scalar/array unification, ordering,
case) stay on the backend and are never re-implemented client-side.

**A definition with `quantity: 0` is included**, always. It is the report's most urgent signal.

**Response ordering carries no meaning.** The client sorts.

**The client now owns:** compaction (group on **`mergeKey` + `stockState`**), state filtering,
location filtering, severity ordering, location ranking by problem counts, unfiltered counter
tiles, entry-detail breakdown, and PDF assembly.

> ⚠ **Compact on `mergeKey` + `stockState`, never on `mergeKey` alone.** Two definitions with
> the same category and properties but *different* states must stay separate rows. Merging
> them hides low stock at one location behind healthy stock at another — the exact signal this
> report exists to produce. Under v1.1 the backend enforced this by construction; under v1.2 it
> is the client's obligation, and no backend check can observe a violation. Backend authority:
> intention §26.4.

**Scale:** entries scale with stock **definitions** (tens, plausibly low hundreds), never with
items, so the unparameterized full fetch stays small.

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
5. ~~Contract v1.1 (final property key/value lists in §4.1)~~ — landed.
6. ~~Contract v1.2 (report shape per the frontend's request case)~~ — landed.
7. ~~Contract v1.3 (complete `itemCategories`)~~ — landed.
8. ~~Contract v1.4 (both conflict-error shapes)~~ — landed.
9. ~~Contract v1.5 (§4.4 worked example corrected)~~ — landed.
10. ~~Contract v1.6 (report entry gains `thresholds` + `unitsToNormalThreshold`)~~ — landed; this document is v1.6 and complete. **Additive to v1.5**: nothing you built against v1.5 changes. It is **self-contained**: it is the only file you need for this integration, and every amendment is explained where it applies rather than in a companion notice. The mocks encoding the request case's §3 shape are now authoritative-matching and can be pointed at the real endpoint once P5 is approved.
