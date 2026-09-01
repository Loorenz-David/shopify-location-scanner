# Plan — Expand `ScanHistory.properties`

All Shopify product metafields + Beyo Vintage purchase-API attributes, kept in
sync on product updates.

Status: **implemented and verified 2026-08-31** (Phases 1-5; two checks remain
that need a deploy) · Target: `apps/backend` only · **No DB migration**,
**no frontend change**

---

## 0. What changes, in one paragraph

`ScanHistory.properties` stops being "two hand-declared metafields" and becomes
"every Shopify metafield on the product that has a value, plus every attribute
the purchase API returns for the product's barcode". The bag stays a flat
`Record<string, string>` written to the same `Json?` column, and
`extension_type` / `extension_quantity` keep their exact key names so
`ItemQuantityPill` keeps working untouched. The write semantics change from
**merge-only** to **full replace**, so a metafield deleted in Shopify also
disappears here — which is what "if a product metafield was updated we should
update it on `ScanHistory.properties` also" actually requires.

---

## 1. Findings from the research that shape the design

### 1.1 Today's write semantics can never remove a key

`scan-history.repository.ts:164-176`:

```ts
const resolvePropertiesForUpdate = (existingProperties, incomingProperties) => {
  const normalizedIncoming = normalizeIncomingProperties(incomingProperties);
  if (Object.keys(normalizedIncoming).length === 0) return undefined;  // ← no-op
  return { ...normalizeStoredProperties(existingProperties), ...normalizedIncoming };  // ← merge
};
```

Every update path (`appendLocationEvent:657`,
`appendSoldTerminalEventWithFallback:1061`,
`syncProductSnapshotIfHistoryExists:1469`) goes through this one function, so
it is a single chokepoint — good news, one edit changes all three. But as
written, a cleared metafield keeps its old stored value forever. **Full replace
is required**, and it is safe precisely *because* all three paths share this
function.

### 1.2 The two-sources-one-bag problem (the main design risk)

Once the bag has two producers (Shopify metafields, purchase API) and
full-replace semantics, a write built from only *one* producer replaces the
other's keys too. There is no provenance stored per key, and none can be
derived — the Shopify set is dynamic, so a deleted metafield key is
indistinguishable from a purchase-API key.

**Resolved (review round 2): Shopify is authoritative, and a purchase-API
failure never blocks the write.** If Shopify answers and the purchase API does
not, the Shopify metafields are stored as properties on their own; when both
answer, they merge with Shopify winning any key collision (D3). The cost is
explicit and accepted: an item written during a purchase-API outage temporarily
loses its purchase-app attributes, and gets them back on its next successful
sync (or immediately via the Phase 5 backfill script). Two things soften it —
the resolver falls back to a **stale cache entry** for the same article number
before giving up (§2.3), and outages are logged per lookup.

*(The alternative — a `externalProperties Json` column holding the last
purchase-API answer plus the article number it came from, re-merged on failure
so nothing is ever lost — was considered and deferred. It is the upgrade path if
outages ever prove painful; it costs one nullable column and keeps every reader
unchanged.)*

A separate rule still governs snapshots that never fetched metafields at all
(the bulk queries of §1.4):

> `metafieldProperties` on a product snapshot is
> **`null` = not fetched → do not write properties at all**,
> **`{...}` (possibly `{}`) = fetched, authoritative → replace**.

That one falls out of the existing call sites for free: they already pass
`properties: product.properties ?? undefined`, and the repository already treats
`undefined` as "don't touch". To make it impossible to violate by accident, the
snapshot field is **renamed** `properties` → `metafieldProperties` (§2.2), which
forces a compile error at all six call sites so each one is reviewed once.

### 1.3 Which paths write properties, and which are user-facing

| Path | Process | User waits? |
|---|---|---|
| `update-item-location.command.ts:67,102` (`before` + `after` fetch) | API server | **yes** — the scan hot path |
| `process-products-update-webhook.job.ts:93,113` | webhook worker | no |
| `handle-orders-create/paid-webhook.command.ts` → `load-product-snapshots-for-order.service.ts:30` | webhook worker | no |
| `get-product.query.ts:27` | API server | reads only, drops `properties` |

Only one path is latency-sensitive, and it can hide the purchase-API round-trip
behind work it already does (§2.5). No new queue/worker is needed.

`getProductsWithLocation` and `listProductsWithLocation` are used **only** by
`scripts/update-scan-history-item-images.ts` and `scripts/restore-scan-history.ts`,
and `grep -rn properties scripts/` returns nothing — no script writes
properties, so they are out of the blast radius.

### 1.4 "All metafields" cannot go into the bulk queries

Shopify's calculated query cost is roughly `2 + first × (cost of each node)`
per connection, with a **1000-point max per query**. Adding
`metafields(first: 100)` costs ~102 points per product node:

- `product(id:)` single fetch → ~110 points total. **Fine.**
- `products(first: 100)` (current `listProductsWithLocation` page size) →
  ~12,200 points. **Rejected outright by Shopify.** It would need a page size
  of ~10, i.e. ~630 pages for the 6.2k-product catalogue.

So all-metafields is added to the **single-product query only**. The two bulk
queries drop the metafield selection entirely and return
`metafieldProperties: null` (= unknown, §1.2), which is exactly right since
their callers never write properties.

### 1.5 Metafield values are always strings, but not always useful ones

`Metafield.value` is a `String!` in the Admin API regardless of `type`. That
matches the string-only `properties` contract
(`scan-history.contract.ts:158`), so no type change is needed. But:

- `*_reference` / `list.*_reference` / `file_reference` types have `gid://...`
  values — meaningless downstream.
- `list.*` types are JSON strings (`"[\"a\",\"b\"]"`).
- `rich_text_field` is a JSON document blob.

Handled by the projection rules in §2.1.

### 1.6 No migration, and an existing precedent for clearing the column

`ScanHistory.properties` is `Json?` on **SQLite** (`prisma/schema.prisma:145`,
datasource `sqlite` — the context doc's "Postgres" is wrong). Nothing about the
column changes. To store "no properties" the plan follows the existing
`floor-plan.repository.ts:15-25` precedent (`Prisma.JsonNull` for a nullable
Json field), so reads keep yielding `null` and not `{}`.

### 1.7 Payload size is the one non-obvious cost

`properties` rides on every `ScanHistoryRecord`-shaped response, including
paginated `GET /scanner/history`. Going from 2 keys to potentially dozens
multiplies that. Hence the caps in §2.1 (max keys, max value length).


### 1.8 Store survey — run 2026-08-31, read-only, 48 active products + 2 tables

Sampled with `products(first: 12, query: "status:active")` × 4 pages plus two
targeted table products, each with `metafields(first: 60..100)`.

**Finding 1 — the `metafields` connection returns *everything*, including other
apps' namespaces.** 23 distinct metafields across the 48-product sample, in 7
namespaces:

```
  custom(14)  judgeme(2)  mm-google-shopping(2)  global(2)
  mc-facebook(1)  booster_apps_seo(1)  product_seo(1)
```

The non-`custom` ones are third-party app storage, and two of them are big:

| metafield | on | size |
|---|---|---|
| `judgeme.widget` | 100% of products | **4574 chars of HTML** |
| `judgeme.badge` | 100% of products | 517 chars of HTML |
| `booster_apps_seo.config` | 98% | 329-431 chars of JSON |
| `global.title_tag`, `global.description_tag`, `product_seo.product_seo_template` | ~19% | SEO copy, up to 376 chars |
| `mm-google-shopping.*`, `mc-facebook.*` | 98% | Google category ids |

Storing "all metafields" literally means **~5.5 KB of third-party junk on every
item**, which lands in every `GET /scanner/history` page (~275 KB per 50-item
page). This is the reason for decision **D8**.

**Finding 2 — all the real item data is in `custom`.** From the two table
products, the merchant-authored set is exactly what "item properties" should
mean:

```
  wood_type  damage_details  detailed_condition  years  country  shape
  weight_definition  link  price_st  compare_at_price  seatheightchairs
  extension_type  extension_quantity  extensions_quantity  extension_dimension
  height_dimension  width_dimension  depth_dimension  dimensionss  location
```

Note `custom.wood_type = ["Walnut"]` — the purchase API's own example attribute
is `wood_type`. The D3 collision rule (Shopify wins) is therefore a **live**
case, not a hypothetical.

**Finding 3 — the two current metafields are healthy.** `custom.extension_type`
and `custom.extension_quantity` exist on table products, and 109 of 1107
`ScanHistory` rows carry them today (`{"extension_type":"Outside Extension","extension_quantity":"2"}`
being the most common). Nothing to repair — unlike the sibling category work,
this pipeline has always worked. Beware the near-twin `custom.extensions_quantity`
(type `number_integer`, present on ~all products, usually `0`): after this change
both keys land in the bag, spelled one letter apart.

**Finding 4 — `app.item_location` IS returned by the connection**, with the
namespace literally `"app"` (not the reserved `app--<id>` form). So the §2.1
exclusion is a plain equality check, and it is genuinely needed or the scanner's
own location metafield would be mirrored into the bag.

**Finding 5 — the types in play** are `single_line_text_field`,
`multi_line_text_field`, `list.single_line_text_field` (`["Teak","Beech"]`),
`dimension` (`{"value":74.0,"unit":"CENTIMETERS"}`), `number_integer`, `url`,
`json`, `string`. **No reference types at all** in the sample. Two of these need
projection rules or they store raw JSON (§2.1).

**Finding 6 — cost is a non-issue for the single-product query.** Shopify billed
`actualQueryCost` **9-10** for the full product query with
`metafields(first: 100)` (actual cost counts returned nodes, not requested).
Max metafields on any sampled product: **26**. The §1.4 ceiling still applies to
the *requested* cost of the bulk queries, so that conclusion is unchanged.

---

## 2. Design

### 2.1 The properties bag: projection rules

One module owns all of this:
`apps/backend/src/modules/shopify/domain/shopify-metafield-properties.ts`
(rewritten; the `SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS` alias list is
deleted).

**Selection**

```graphql
metafields(first: 100) { nodes { namespace key value type } }
```

`first: 100` covers the store's key count with headroom (max seen on a product:
26) and bills an actual cost of 9-10 (§1.8/6).

**Config — one allowlist, one derived exclusion set.**

The keys that must not become properties are exactly the keys that already feed
a first-class column. Today those key names are written out twice: once as the
GraphQL variables that drive the aliased selections
(`heightKey: "totalheight"`, `quantityMeta: metafield(namespace: "custom", key: "quantity")`,
`locationKey: env.SHOPIFY_METAFIELD_KEY`, …) and, in the first draft of this
plan, again as a hand-maintained exclusion list. Two lists that must agree is a
drift bug waiting to happen, so **Phase 1 promotes them to a single constant**
that feeds both:

```ts
/** The metafields that already have a dedicated column on the record. */
export const PROMOTED_METAFIELDS = {
  location:    { namespace: env.SHOPIFY_METAFIELD_NAMESPACE, key: env.SHOPIFY_METAFIELD_KEY },
  itemHeight:  { namespace: DIMENSION_NAMESPACE_FALLBACK, key: "totalheight" },
  itemWidth:   { namespace: DIMENSION_NAMESPACE_FALLBACK, key: "totalwidth" },
  itemDepth:   { namespace: DIMENSION_NAMESPACE_FALLBACK, key: "totaldepth" },
  quantity:    { namespace: "custom", key: "quantity" },
} as const;

/** Only these namespaces become properties. Everything else is ignored. */
export const PROPERTY_METAFIELD_NAMESPACES = new Set(["custom"]);

/** Derived — never hand-edited. */
const COLUMN_BACKED_KEYS = new Set(
  Object.values(PROMOTED_METAFIELDS).map((m) => m.key),
);

/** Hand-maintained: keys we simply don't want in the bag. */
export const EXCLUDED_PROPERTY_METAFIELD_KEYS = new Set([
  "location",           // confusable with the scanner's own location
  "height_dimension",   // structured duplicate of totalheight
  "width_dimension",    // structured duplicate of totalwidth
  "depth_dimension",    // structured duplicate of totaldepth
]);
```

Two exclusion inputs, deliberately kept apart so "excluded because it has a
column" stays distinguishable from "excluded because we don't want it":
`COLUMN_BACKED_KEYS` (derived) and the hand-maintained key set. Plain exact keys
only — no pattern matching, so nothing gets excluded by accident.

`PROMOTED_METAFIELDS` supplies the GraphQL variables for the aliased selections
*and* the exclusion set, so re-pointing a column at a different metafield
automatically stops that metafield from also appearing in the bag. The only
list anyone hand-edits is the namespace allowlist, plus `PROMOTED_METAFIELDS`
when a metafield is genuinely promoted to a column.

The namespace allowlist is `custom` only (D8): everything merchant-authored
lives there, and the other six namespaces in the store are third-party app
storage worth 5.5 KB per product (§1.8/1). Note the derived exclusion set
matches on bare `key`, which is safe while `custom` is the only allowed
namespace; widening the allowlist means matching on `namespace.key` instead.

**Key naming**: bare metafield `key`, so `extension_type` /
`extension_quantity` keep their exact names and `ItemQuantityPill` is untouched.
With a single allowed namespace there are no cross-namespace collisions to
resolve. (If D8 opens this up to more namespaces, the rule becomes: bare key for
`custom`, `` `${namespace}.${key}` `` otherwise, first-wins on collision with a
warning.)

**Why those four are excluded** (D2): they are already first-class columns on
the record, so the bag means "extra attributes not already modeled" and nothing
is readable from two places. `app.item_location` (→ `latestLocation`) is the
fifth; it is excluded twice over, by the namespace allowlist and by
`PROMOTED_METAFIELDS`.

**Also excluded by hand** (review round 2): `custom.location` (the merchant's
building, `"Västberga Warehouse"` — too easily confused with the scanner's own
`K1` shelf) and `height_dimension` / `width_dimension` / `depth_dimension`
(structured duplicates of the `total*` set the app already parses into columns).

`custom.extension_dimension` is **kept** — it is not a duplicate of anything the
app models, it describes the table's extension leaf. It is the one live user of
the `dimension` value projection (rule 4 below), which turns
`{"value":60.0,"unit":"CENTIMETERS"}` into `"60 cm"`.

**Value projection**

1. skip `type` ending in `_reference` (incl. `list.*_reference`, `file_reference`) — gids
   (none in the store today, §1.8/5 — this is future-proofing)
2. skip `rich_text_field` — JSON document blob
3. `list.*` (non-reference): `JSON.parse` → join the members with `", "`
   → `custom.wood_type` `["Teak","Beech"]` becomes `"Teak, Beech"`. On a parse
   failure store the raw string and log a warning (§2.1a)
4. `dimension` / `weight` / `volume`: `JSON.parse` → `` `${value} ${unitAbbrev}` ``
   → `{"value":74.0,"unit":"CENTIMETERS"}` becomes `"74 cm"`; trailing `.0`
   dropped; unknown unit → lowercased raw unit; parse failure → raw string
5. everything else: raw value, trimmed
6. skip empty-after-trim values (unchanged from today's behaviour)
7. truncate values to **500 chars**
8. cap at **100 keys** per item, log when the cap bites — the store has 49
   metafield keys today and is expected to stay under ~80 as keys are added and
   removed (the survey saw at most 26 on one product), so the cap is a runaway
   guard, not a working limit

Result: `Record<string, string>` (possibly `{}`) — never `null`; "not fetched"
is expressed by the caller, not by this function.

### 2.1a List values are flattened to comma-separated strings

Measured on 36 randomly sampled scanned products: only **three** list-typed keys
exist on real items — `wood_type` (34/36), `damage_details` (35/36) and
`reserved` (1/36), with at most 3 members each. Stored values:

```
  wood_type       "Teak, Mahogany"
  damage_details  "Completely restored, Surface has been refinished"
  reserved        "Non-reserved"
```

**Decision history.** The first draft joined; review round 3 switched to storing
the raw JSON array to keep the members separable; review round 4 switched back
to joining, for a reason the round-3 discussion had not yet surfaced — see
§5.1: the purchase API sends its own multi-values as plain comma-separated
strings (`material_type: "Teak,Walnut"`), and Shopify wins collisions only
*sometimes*. Storing JSON on the Shopify side would mean the **same key holds a
different shape on different items**: `wood_type` as `'["Teak"]'` where Shopify
has the metafield, and as `"Teak"` where only the purchase API does. Rendering
could cope with that; **`LIKE %value%` search could not** — a query would have
to match two encodings of the same fact.

Joining makes every property value a plain string regardless of source, so
search behaves uniformly and the frontend needs no decode helper. The cost is
that the join is not reversible if a member ever contains a comma — no current
value does, and nothing splits these today. A consumer that wants the members
back can split on `/\s*,\s*/`, which also handles the purchase API's
unspaced form.

### 2.1b What happens when the config changes

Editing `PROPERTY_METAFIELD_NAMESPACES` or promoting a metafield changes
**writes only** — it triggers no migration. Because every write replaces the
whole bag (§2.4), each row converges on the new rules the next time that item is
synced (scanned, ordered, or edited in Shopify), not at deploy time. Rows that
are never touched again keep the old shape indefinitely.

Excluding a key therefore removes it from rows gradually, and un-excluding it
adds it back the same way. `scripts/backfill-item-properties.ts` (Phase 5) is
the convergence tool: running it re-syncs all rows and applies the current rules
everywhere at once. Worth re-running after any change to this config.

### 2.2 Snapshot contract change

`shopify-shop.ts` — `ProductLocationData`:

```ts
-  properties: Record<string, string> | null;
+  /**
+   * Shopify metafield-derived properties.
+   * `null` = NOT FETCHED (partial snapshot) — callers must not write it.
+   * `{}`   = fetched, product has no property metafields.
+   */
+  metafieldProperties: Record<string, string> | null;
```

`shopifyAdminApi.getProductWithLocation` gains
`includeMetafieldProperties?: boolean` (default `false`): when false the
`metafields(...)` selection is not spliced in at all (cheaper query) and the
field comes back `null`. The bulk queries never fetch it.

The rename is deliberate: it breaks compilation at `update-item-location.command.ts:131`,
`handle-orders-create-webhook.command.ts:186`, `handle-orders-paid-webhook.command.ts:164`,
`process-products-update-webhook.job.ts:144,184,200`, so every site is
re-examined against the §1.2 rule instead of silently inheriting old behaviour.

### 2.3 New module: `apps/backend/src/shared/item-properties/`

Mirrors the `shared/category/` precedent (cross-cutting resolution service, no
HTTP surface of its own). Three files:

**`purchase-api.integration.ts`** — the client, a direct port of the handoff doc:

```
GET {BEYO_VINTAGE_API_URL}/api/partner/items/{encodeURIComponent(articleNumber)}
X-Partner-Key: {BEYO_VINTAGE_API_KEY}
AbortSignal.timeout(BEYO_VINTAGE_API_TIMEOUT_MS)
```

Returns a tagged result, mapping the doc's status table onto the §1.2 rule:

| Outcome | Result |
|---|---|
| 200, `success:true` | `{ status:"resolved", attributes }` (parsed per handoff §3) |
| 200, `success:false` | `{ status:"resolved", attributes:{} }` |
| 404, 400 | `{ status:"resolved", attributes:{} }` — not found is an answer |
| 401 / 403 | `{ status:"unknown" }` + `logger.error` (config problem, no retry) |
| 503, other non-2xx | `{ status:"unknown" }` + `logger.warn` |
| network error / timeout | `{ status:"unknown" }` + `logger.warn` |
| malformed `attributes` blob | `{ status:"resolved", attributes:{} }` + warn (per handoff §3.2) |

`parsePurchaseApiAttributes` is the handoff's sketch verbatim in TS (defensive
about a pre-parsed array, dedupe-first-wins, drop `label`, skip blank values),
plus `String(value)` coercion since our column is string-only.

**`item-properties-resolver.service.ts`** — the single producer of a
write-ready bag:

```ts
resolve(input: {
  metafieldProperties: Record<string, string> | null;   // null ⇒ result is null
  articleNumber: string | null;                          // = product barcode
}): Promise<Record<string, string> | null>
```

- `metafieldProperties === null` → return `null` (nothing was fetched, §1.2)
- no `articleNumber` → return `metafieldProperties` as-is; per the intention,
  "if it doesn't have a barcode we don't query at all"
- purchase API disabled by config (no `BEYO_VINTAGE_API_KEY`) → same, plus a
  one-time startup warning
- lookup `resolved` → return `{ ...attributes, ...metafieldProperties }`
  (**Shopify wins collisions** — D3) with the §2.1 caps applied to the merge
- lookup `unknown` (timeout, 5xx, bad key, network) → **fall back to a stale
  cache entry** for the same article number if one exists and merge as above;
  otherwise return `metafieldProperties` alone. Either way **the write
  proceeds** — a purchase-API outage never blocks a Shopify metafield change
  from being stored (§1.2). Logged at `warn` (or `error` for 401/403).

Plus a module-level cache: `Map<articleNumber, { attributes, expiresAt }>`,
positive TTL 15 min, empty-result TTL 5 min, single-flight (in-flight promise
map) so concurrent webhooks for the same product make one call, hard size cap
~5000 entries. Entries are **kept past expiry** rather than deleted, so they can
serve the stale fallback above; failures themselves are never cached. Exposes
`prefetch(articleNumber)` (fire-and-forget cache warm) for §2.5. Cache is
per-process (API server and each worker keep their own) — fine, it is a
latency/quota optimisation, not correctness.

**`item-properties.ts`** — shared caps/constants/types.

`config/env.ts` gains:

```ts
BEYO_VINTAGE_API_KEY: z.string().min(1).optional(),
BEYO_VINTAGE_API_URL: z.string().url().default("https://api.beyovintage.se"),
BEYO_VINTAGE_API_TIMEOUT_MS: z.coerce.number().default(4000),
```

Optional key = the feature degrades to "Shopify metafields only", it does not
crash boot in an environment without the key.

### 2.4 Repository: full replace

`scan-history.repository.ts` — only the two resolvers change; all three call
sites keep their current shape.

```ts
const resolvePropertiesForUpdate = (existing, incoming) => {
  if (incoming === null || incoming === undefined) return undefined;   // unknown → no change
  return normalizeIncomingProperties(incoming);                        // authoritative → replace
};
```

`undefined` still means "omit from the Prisma payload". A resolved-but-empty set
writes `Prisma.JsonNull` (§1.6) so the column goes back to null rather than `{}`.
`resolvePropertiesForCreate` likewise stops treating `{}` as "omit" only because
there is nothing to clear on create — behaviour there is unchanged in practice.

`syncProductSnapshotIfHistoryExists:1469-1477` already diffs
`sameStringRecord(current, next)` before deciding `hasChanges`, so removals now
correctly count as a change and trigger the `scan_history_updated` broadcast.
The other two paths write unconditionally, as they do today.

### 2.5 Write-path wiring

Ordering everywhere is **Shopify first, then the purchase API** — the barcode
only exists once the product has been fetched, so the two calls are inherently
sequential.

**`update-item-location.command.ts`** — the only latency-sensitive path. It
already fetches the product twice, so the `before` fetch supplies the barcode
early and the lookup overlaps work that has to happen anyway:

```
before = getProductWithLocation({ includeMetafieldProperties: false })   // unchanged cost
        ↓ gives us the barcode
itemPropertiesResolver.prefetch(before.barcode)      ← fires now, not awaited
        ↓
updateProductLocation() mutation  +  after = getProductWithLocation({ includeMetafieldProperties: true })
        ↓
properties = await itemPropertiesResolver.resolve({ after.metafieldProperties, after.barcode })
```

The barcode still comes from Shopify before the purchase API is touched — the
prefetch just starts that lookup at the earliest moment it is possible rather
than after the refetch, so it overlaps the mutation and the `after` query. In
the common case `resolve` is then a cache hit and adds ~0 ms; worst case (cold
cache, purchase API slow) it adds up to `BEYO_VINTAGE_API_TIMEOUT_MS`. If the
barcode changed between `before` and `after`, the prefetch is simply wasted and
`resolve` fetches under the new key. Dropping the prefetch is a two-line change
if you would rather keep the flow strictly linear.

**`process-products-update-webhook.job.ts`** — both `getProductWithLocation`
calls take `includeMetafieldProperties: true`; the two `appendLocationEvent`
calls (144, 200) and `syncProductSnapshotIfHistoryExists` (184) take the
resolver output. Worker process, latency irrelevant.

**`load-product-snapshots-for-order.service.ts`** — `includeMetafieldProperties: true`
and resolve per product (it already loops sequentially). An N-line order costs N
purchase-API calls at worst, deduped by cache.

### 2.6 "Article number changed → query again"

Falls out for free: every products/update webhook re-resolves properties from
the product's *current* barcode, and the cache is keyed by article number, so a
new barcode is a new key. The negative-result TTL (5 min) also covers the
"item didn't exist in the purchase app yet, now it does" case.

**This depends on Shopify firing `products/update` for metafield edits** — the
single empirical assumption in the whole plan. Verified in Phase 4; if it turns
out not to fire for some edit route, the fallback is a periodic re-sync script
(the machinery for it already exists in `scripts/`).

---

## 3. Decisions for you

Review round 1 (2026-08-31) resolved **D1-D7** and confirmed the full-replace
semantics of §1.1/§2.4; the survey it authorised then raised **D8**, resolved in
the same round. Nothing is open — this section is kept as the record of why the
design is shaped the way it is.

**D1 — Store survey. RESOLVED: run. Done** — results in §1.8, and they changed
§2.1 in three ways (namespace allowlist, a `dimension` projection rule, and
confirmation that `app.item_location` needs excluding).

**D2 — Exclusions. RESOLVED: exclude the five** already promoted to first-class
columns. See §2.1.

**D3 — Collision precedence. RESOLVED: Shopify wins.** One flat properties
object, no per-source namespacing. Collisions are expected to be ~never; when
one happens the Shopify metafield value overrides the purchase-app value, and
the resolver logs a warning so the overlap is visible.

**D4 — Latency vs. eventual consistency. RESOLVED: inline, sequential.** No
enrichment queue. Shopify is fetched first for the barcode, then the purchase
API, then one write.

**D5 — Backfill. RESOLVED: yes**, as Phase 5, and it also repairs missing
`itemBarcode` values (review round 2). Real sizes: **1107** `ScanHistory` rows
(not ~6k — that was the product count), of which 109 have properties today and
**36 have no stored barcode**. At ~10 points per product query it is a quick,
cheap run.

**D6 — `ShopifyProductLocationDto`.** `GET /shopify/products/:productId` and the
`product` half of the location-update responses keep omitting `properties`
(context §4) — out of scope, nothing reads it. Proceeding on that unless you say
otherwise.

**D7 — Frontend.** No frontend change in this plan: `extension_quantity` keeps
working byte-for-byte and the other keys are stored-but-unrendered (exactly
`extension_type`'s status quo today). UI for the expanded bag is separate work. Every
property value is a plain string (§2.1a), so it needs no decoding — but it must
expect **two vocabularies for the same key**, since a key present only in the
purchase API keeps that app's wording (§5.1).

---

**D8 — Third-party namespaces (raised by the survey). RESOLVED: allowlist
`custom` only.** The connection also returns other apps' storage —
`judgeme.widget` alone is 4574 chars of HTML on every product, ~5.5 KB per item
once `judgeme.badge`, `booster_apps_seo.config` and the Google/Facebook category
ids are counted (§1.8/1). Every merchant-authored attribute lives in `custom`
(§1.8/2), so the allowlist keeps the bag at ~15-20 meaningful keys / ~300 bytes
and keeps a newly installed third-party app from silently filling it. Adding a
namespace later is a one-line constant change.

**Follow-up in review round 2:** `custom.location` and the
`height_/width_/depth_dimension` trio were added to the hand-maintained
exclusion set (§2.1); `custom.extension_dimension` stays in the bag.

---

## 4. Implementation phases

Each phase compiles and is independently deployable. Ordering matters: Phase 1
lands full-replace-from-Shopify *before* any purchase-API data exists, so the
§1.2 wipe risk is structurally absent during the transition.

### Phase 0 — Store survey ✅ done (2026-08-31)

Read-only, from the scratchpad, no repo files touched. Results in §1.8. The one
thing it did **not** cover is a live purchase-API call (no known-good article
number to try) — that is verified in Phase 3 instead.

### Phase 1 — Shopify: fetch all metafields

1. Rewrite `shopify-metafield-properties.ts`: delete the alias list; add
   `PROMOTED_METAFIELDS`, `PROPERTY_METAFIELD_NAMESPACES`, the derived
   `EXCLUDED_PROPERTY_METAFIELD_KEYS`, `buildAllMetafieldsSelection(first)`,
   `projectMetafieldValue(type, value)`, `extractMetafieldProperties(nodes)`
   (all of §2.1).
2. `shopify-admin-api.integration.ts`:
   - drop `extensionTypeMeta` / `extensionQuantityMeta` from the 4 inline type
     blocks (59-61, 421-423, 538-540, 635-637) and the 3 query strings;
   - feed the aliased dimension/quantity/location selections their keys from
     `PROMOTED_METAFIELDS` instead of the inline literals in the three
     `variables` objects, so the exclusion set stays derived;
   - add `metafields: { nodes: [...] } | null` to the single-product type;
   - `getProductWithLocation` takes `includeMetafieldProperties` and splices the
     selection conditionally;
   - `mapProductNodeToLocationSnapshot` returns
     `metafieldProperties: product.metafields ? extractMetafieldProperties(...) : null`.
3. `shopify-shop.ts`: rename the field + document the null/`{}` contract (§2.2).
4. Fix the 6 now-broken call sites: each passes
   `properties: snapshot.metafieldProperties ?? undefined`, with
   `includeMetafieldProperties: true` on the three write paths and `false` on
   `get-product.query.ts`.

**Acceptance:** `npm --prefix apps/backend run typecheck` clean; scanning an
item stores every non-excluded metafield; `extension_quantity` still drives the
table pill; `GET /shopify/products/:productId` issues the cheaper query.

### Phase 2 — Repository: full replace

`resolvePropertiesForUpdate` / `resolvePropertiesForCreate` per §2.4, plus a
comment block stating the null/`{}`/`undefined` contract at the top of the
group. No call-site changes.

**Acceptance:** clearing `custom.extension_quantity` in Shopify admin removes
the key from the stored bag on the next products/update; an item whose product
has no metafields at all ends with `properties = null`; a Shopify-side no-op
webhook produces no write (`hasChanges === false`).

### Phase 3 — Purchase API

`env.ts` additions, then the three files of §2.3, then wire the resolver into
the three write paths (§2.5) — `update-item-location.command.ts` including the
prefetch.

**Acceptance:** an item with a barcode present in the purchase app stores the
`attributes` keys alongside the metafield keys; an item without a barcode makes
no outbound call (assert via log); with `BEYO_VINTAGE_API_KEY` unset the app
boots and stores Shopify-only properties; with the key set to garbage, one
`logger.error` per lookup and **the Shopify metafields are still written** as
properties (§1.2).

### Phase 4 — Verification (§5)

### Phase 5 — Backfill script

`scripts/backfill-item-properties.ts`: page the 1107 `ScanHistory` rows by shop,
resolve each product with `includeMetafieldProperties: true`, write via
`syncProductSnapshotIfHistoryExists`, concurrency 2-4, `DRY_RUN=1` default,
summary counters in the style of `update-scan-history-item-images.ts`.

**It also repairs `itemBarcode`.** 36 of the 1107 rows have no stored barcode
(19 have no SKU), and the barcode is the purchase API's article number — so a
row missing it is a row that can never gain purchase-app attributes from a path
that reads the stored value. `syncProductSnapshotIfHistoryExists` already routes
`itemBarcode` through `resolveStringForUpdate` (`scan-history.repository.ts:52`),
which takes a non-empty incoming value and otherwise keeps what is stored, so
passing `itemBarcode: product.barcode` fills the gaps and refreshes changes
without ever blanking a row. The script's summary must split the outcome three
ways so the residue is visible:

- barcode filled from Shopify
- barcode already present (unchanged or refreshed)
- **still missing — the Shopify product itself has no barcode**, so no purchase
  API lookup is possible for that item until someone sets one

Note the resolver always uses the barcode from the *freshly fetched Shopify
product*, never the stored `itemBarcode`, so a stale stored value can never
cause attributes from the wrong article number to be written.

---

## 5. Verification plan

**Run on 2026-08-31, against the live store and the dev DB:**

| # | check | result |
|---|---|---|
| 1 | `npm run typecheck` / `npm run build` | ✅ clean |
| 2 | opt-in fetch returns the projected bag; opt-out returns `null` | ✅ verified on 3 real products |
| 2b | excluded keys absent, columns still populated from `PROMOTED_METAFIELDS` | ✅ (`location`, `total*`, `quantity`, `*_dimension` all absent; height/width/depth/location/quantity columns correct) |
| 3 | full-replace semantics incl. key removal and `{}` → column cleared | ✅ all six cases, dev DB row restored afterwards |
| 4 | purchase API reachable, key accepted, envelope as documented | ✅ HTTP 404 `{"success":false,"error":"Item '…' not found."}` for every article number tried |
| 4b | attribute parsing against all handoff §3 rules | ✅ 16 synthetic cases |
| 5 | happy-path purchase-API lookup, merged end-to-end on real scanned items | ✅ see §5.1 |
| 5b | cache single-flight + warm hit | ✅ 3 concurrent cold lookups = 1 request (29ms); warm hit 0ms |
| 6 | metafield edit → `products/update` → stored bag updates; deletion removes the key | ⏳ needs a live edit in Shopify admin |
| 7 | payload size on `GET /scanner/history?limit=50` | ⏳ after deploy |

### 5.1 The happy path, closed

Article numbers are **zero-padded 7-digit strings** (`0000071`), and **111 of
the 1107** scanned rows already carry one as their Shopify barcode. The earlier
404s were simply items not present in the purchase app.

Resolved end-to-end on three real scanned items. Example — *Danish dining table
in Santos rosewood by Skovby*, barcode `0001035`, 15 ms:

```json
{
  "shape": "Oval",                    // ← Shopify won over purchase "Oval"
  "extension_type": "Outside Extension", // ← Shopify won over purchase "Insert"
  "qty_extensions": "2",              // ← purchase API only
  "wood_type": "Santos Rosewood",     // ← Shopify won over purchase "Mahogany"
  "country": "Denmark",
  "damage_details": "Surface has been refinished, Completely restored",
  "detailed_condition": "Very Good - …",
  "extension_dimension": "50 cm",
  "extension_quantity": "2",
  "extensions_quantity": "2",
  "manufacturer": "Skovby",
  "price_st": "21500",
  "weight_definition": "21-40 kg",
  "years": "1970-1980s"
}
```

**Collisions are common, not rare — D3 turned out to be load-bearing.** Three of
that item's four purchase attributes (`shape`, `extension_type`, `wood_type`)
collide with a `custom.*` metafield of the same name. Shopify won all three, as
designed, and each was logged. Two consequences worth knowing:

- **The vocabularies differ.** Purchase `extension_type` is `"Insert"` where
  Shopify says `"Outside Extension"`. Because Shopify wins, `ItemQuantityPill`
  and anything else reading these keys keeps seeing the values it sees today.
- **The same fact can appear twice under different keys.** Purchase
  `material_type: "Teak,Walnut"` sits beside Shopify `wood_type: "Teak, Walnut"`.
  Both are stored. If that redundancy is unwanted, the fix is an exclusion list
  for *purchase-API attribute keys*, mirroring
  `EXCLUDED_PROPERTY_METAFIELD_KEYS` — not built, since it is a data judgement
  rather than a mechanism gap.
- **This is what settled §2.1a.** Shopify winning *sometimes* means a key like
  `wood_type` would carry a JSON array on items where Shopify has the metafield
  and a plain string where only the purchase API does. Flattening both to
  comma-separated strings keeps one shape per key, which `LIKE %value%` search
  depends on.

Observed purchase-API attribute keys: `drawers_qty`, `material_type`,
`magazine_shelf`, `wood_type`, `shape`, `extension_type`, `qty_extensions`,
`door_type`.

Lookup latency was **15-29 ms** cold — far inside the 4 s timeout, which makes
the §2.5 prefetch a nicety rather than a necessity.

### 5.2 Original checklist

There is **no test framework in this repo** (`npm test` is a stub), so
verification is a written checklist run against dev, matching how the sibling
category work was validated.

1. **Typecheck**: `npm --prefix apps/backend run typecheck`.
2. **Scan path**: scan an item with a rich metafield set → inspect
   `GET /scanner/history/:productId` → expect all non-excluded keys; measure the
   added latency from the existing `Update item location command started` /
   `Scan history append completed` log pair (expect ≲ 50 ms delta on a warm cache).
3. **Metafield edit → sync**: change a metafield value in Shopify admin, confirm
   a `products/update` intake row appears, confirm the stored bag updates and
   `scan_history_updated` is broadcast. **Then delete a metafield** and confirm
   the key disappears (this is the behaviour change).
4. **Barcode change**: set a barcode that exists in the purchase app on a
   product that had none → confirm the attributes appear after the webhook.
5. **Failure isolation**: point `BEYO_VINTAGE_API_URL` at an unroutable host →
   scan → confirm the scan still succeeds within the timeout, the Shopify
   metafields are stored, one warn line is logged, and (within the same process)
   a previously cached article number still contributes its attributes via the
   stale-cache fallback.
6. **Payload sanity**: `GET /scanner/history?limit=50` response size before/after;
   if it grows past ~1 MB, tighten the §2.1 caps.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| ~~`metafields` connection hides some metafields~~ | **Resolved by the survey**: it returns everything, including other apps' namespaces and the scanner's own `app.item_location` (§1.8/1, §1.8/4) |
| Shopify `products/update` doesn't fire for some metafield edit routes | Verification step 3; fallback is a periodic re-sync script |
| Query cost regression on the single-product query | ~110 points vs a 1000 max, and the existing throttle/retry in `shopifyGraphql` already handles 429/THROTTLED |
| Purchase API becomes a dependency of the scan path | Bounded by `AbortSignal.timeout`, cached, and failure = "Shopify properties written without purchase attributes", never an error surfaced to the scanner |
| A purchase-API outage strips purchase attributes from items scanned during it | Accepted (§1.2); softened by the stale-cache fallback, self-heals on the next successful sync, and Phase 5's backfill forces convergence. Upgrade path if it hurts: the `externalProperties` column described in §1.2 |
| Response payload growth on history/logistic/stats lists | The `custom` allowlist (D8) is what keeps this bounded — ~300 bytes/item instead of ~5.5 KB; plus caps in §2.1 and verification step 6 |
| Overlap with the in-flight category refactor | Disjoint: category work touches `shared/category/*` and `categoryResolverService.resolve` inside `mapProductNodeToLocationSnapshot`; this work touches the metafield/properties half of the same function and the repository's properties helpers. Expect at most a two-line merge conflict in the snapshot mapper. |

---

## 7. Files touched

```
apps/backend/src/config/env.ts                                            (+3 env vars)
apps/backend/src/modules/shopify/domain/shopify-metafield-properties.ts   (rewritten)
apps/backend/src/modules/shopify/domain/shopify-shop.ts                   (field rename + contract doc)
apps/backend/src/modules/shopify/integrations/shopify-admin-api.integration.ts (selection + option + mapper)
apps/backend/src/modules/shopify/commands/update-item-location.command.ts (resolve + prefetch)
apps/backend/src/modules/shopify/commands/handle-orders-create-webhook.command.ts
apps/backend/src/modules/shopify/commands/handle-orders-paid-webhook.command.ts
apps/backend/src/modules/shopify/services/load-product-snapshots-for-order.service.ts
apps/backend/src/modules/shopify/jobs/process-products-update-webhook.job.ts
apps/backend/src/modules/shopify/queries/get-product.query.ts             (explicit opt-out)
apps/backend/src/modules/scanner/repositories/scan-history.repository.ts  (full-replace resolvers)
apps/backend/src/shared/item-properties/purchase-api.integration.ts       (new)
apps/backend/src/shared/item-properties/item-properties-resolver.service.ts (new)
apps/backend/src/shared/item-properties/item-properties.ts                (new)
apps/backend/scripts/backfill-item-properties.ts                          (new, Phase 5)
```

No changes to: `prisma/schema.prisma`, any contract DTO, any frontend file.

---

## Appendix A — the exact metafields, from the definition list (2026-08-31)

Authoritative source: `metafieldDefinitions(ownerType: PRODUCT)` — **47
definitions**, `custom(32)`, `app(1)`, `shopify(8)`,
`shopify--discovery--*(4)`, `reviews(2)`. The definition-less metafields the
product sample turned up (`judgeme.*`, `booster_apps_seo.config`,
`mm-google-shopping.*`, `mc-facebook.*`, `global.*`, `product_seo.*`) have no
definitions at all, which confirms they are app-owned storage.

### A.1 Stored — 22 keys

`used` = products carrying the metafield today.

| property key | type | projection | used |
|---|---|---|---|
| `color_furniture` | single_line_text_field | raw | 3 |
| `compare_at_price` | single_line_text_field | raw | 268 |
| `contains_key` | single_line_text_field | raw | 0 |
| `country` | single_line_text_field | raw | 2965 |
| `damage_details` | list.single_line_text_field | join `", "` | 2998 |
| `designer` | single_line_text_field | raw | 790 |
| `detailed_condition` | single_line_text_field | raw | 2996 |
| `dimensionss` | multi_line_text_field | raw | 2001 |
| `extension_dimension` | dimension | `"60 cm"` | 970 |
| `extension_quantity` | single_line_text_field | raw — **existing key, unchanged** | 166 |
| `extension_type` | single_line_text_field | raw — **existing key, unchanged** | 167 |
| `extensions_quantity` | number_integer | raw (`"0"` on most products) | 4610 |
| `link` | url | raw | 960 |
| `manufacturer` | single_line_text_field | raw | 1263 |
| `mark_stamp` | single_line_text_field | raw | 0 |
| `price_st` | single_line_text_field | raw | 3305 |
| `reserved` | list.single_line_text_field | join `", "` | 33 |
| `seatheightchairs` | single_line_text_field | raw | 1076 |
| `shape` | single_line_text_field | raw | 66 |
| `weight_definition` | single_line_text_field | raw | 3003 |
| `wood_type` | list.single_line_text_field | join `", "` → `"Teak, Beech"` | 2942 |
| `years` | single_line_text_field | raw | 3004 |

Any future `custom.*` metafield is picked up automatically, defined or not — no
code change needed to *add* one, only to exclude one (§2.1's
`EXCLUDED_PROPERTY_METAFIELD_KEYS`).

### A.2 Not stored, and why

| metafield | reason |
|---|---|
| `custom.totalheight`, `.totalwidth`, `.totaldepth` | D2 — already the `itemHeight/Width/Depth` columns |
| `custom.quantity` | D2 — already the `quantity` column |
| `app.item_location` | D2 — already `latestLocation` |
| `custom.height_dimension`, `.width_dimension`, `.depth_dimension` | §2.1 key set — structured duplicates of the `total*` set (`extension_dimension` is **kept**) |
| `custom.location` | §2.1 key set — confusable with the scanner's own location |
| `custom.restoration` (rich_text_field, 2 products) | §2.1 rule 2 — JSON document blob |
| `custom.video_and_condition` (file_reference, 0 products) | §2.1 rule 1 — gid |
| `shopify.*` — `color-pattern`(45), `seat-type`(13), `backrest-type`(12), `upholstery-material`, `washing-method`, `back-type`, `chair-features`, `lumber-wood-type` | D8 namespace + §2.1 rule 1: all `list.metaobject_reference`, values are gids |
| `shopify--discovery--*`, `reviews.*` | D8 — Shopify-internal / review app |
| `judgeme.*`, `booster_apps_seo.config`, `mm-google-shopping.*`, `mc-facebook.*`, `global.*`, `product_seo.*` | D8 — third-party app storage, ~5.5 KB per product |

### A.3 One gap worth knowing about

The `shopify.*` entries are Shopify's **standard product taxonomy** attributes,
and two of them overlap real item data: `lumber-wood-type` (vs the merchant's
own `custom.wood_type`) and `color-pattern`. They are metaobject references, so
their readable value lives behind a second lookup — storing them would mean
resolving metaobject display names, not just reading `value`. Usage is tiny
today (1-45 products vs. 2942 for `custom.wood_type`), so this plan skips them.
If the shop starts filling the taxonomy in, that resolution is the natural
follow-up.
