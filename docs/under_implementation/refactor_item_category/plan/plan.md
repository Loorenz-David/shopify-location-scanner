# Plan — Closed category vocabulary + `productType` resolution

Status: implemented + migrated; deploy and runtime checks pending · Target: `apps/backend`

Two phases, in this order. Phase 1 is the bigger half and makes Phase 2 nearly
trivial, so it goes first.

## 0. Decisions taken before implementation

### 0.1 Sequencing — resolved, low risk

`custom.productcategory` was **never populated** (confirmed in review). So the
metafield branch in `category-resolver.service.ts:14-17` has never fired, every
existing category value came from title parsing, and there is no risk of the
metafield writing old slugs back over migrated rows.

That also explains why all 29 stored values are exactly dictionary outputs with
no free-form strays.

Both phases still ship in **one release** followed by the migration, inside the
no-activity window — simplest to reason about, and it keeps the resolver and the
data on the same vocabulary at every moment.

### 0.2 Title rules — resolved

`productType` is authoritative; title parsing is only a fallback for products
with no `productType` set. Decided:

| title key | → category | note |
|---|---|---|
| `easy chair` | **Armchairs** | must precede the `chair` catch-all, or it falls through to Dining Chairs |
| `wardrobe` | **Storage Cabinets** | |
| `carpet` | **Carpets** | `rug` not included |
| `small table` | **Side Tables** | existing key, retargeted from `small_side_table` |
| *(none)* | Porcelain | reachable only via `productType` |

Note the deliberate asymmetry: a product **typed** `Easy Chairs` in Shopify
stores `Easy Chairs`, while a product with no type whose **title** says "easy
chair" is guessed as `Armchairs`. Same for `Wardrobes` vs a `wardrobe` title →
`Storage Cabinets`. That's fine — the guess is intentionally coarse, and the
authoritative path is unaffected.

The rest of the dictionary rewrite is mechanical: each entry's output is
replaced by that value's new name from the §1.2 mapping.

### 0.3 Data validation — resolved

`apps/backend/prisma/dev.db` is the most recent production copy, so the mapping
coverage, collision, and row-count checks in §1.2 hold against real data. The
script still fails loudly on any unrecognised value.

### 0.4 Casing of the `unknown` sentinel — leave as-is

Items that resolve to nothing store the literal lowercase `"unknown"`. After
this change the analytics list reads:

```
  Dining Chairs
  Side Tables
  Mirrors
  unknown          ← lowercase, visibly out of place
```

Renaming it to `"Unknown"` would mean updating ~16 call sites that write or
compare that literal (`scan-history.repository.ts:49,75,76,1583`,
`correct-scan-history-data.ts:301,941,954,1086`,
`repair-scan-history-order-metadata.ts:392,438,439,447,577,628`), where the
repair scripts use `"unknown"` as their "needs re-resolution" marker. That's a
lot of surface for a cosmetic gain, and a missed site would break a repair
script silently.

Decision: keep the stored value lowercase. If the display bothers anyone,
capitalise it in the frontend only.

### 0.5 Store survey — run, with two findings

Surveyed all 6,273 products in the live store (read-only).

**Finding 1 — 92% of active products have no `productType` set.**

```
  ACTIVE   | typed      295        ARCHIVED | typed        7
  ACTIVE   | EMPTY     3305        ARCHIVED | EMPTY     2393
  DRAFT    | typed        3        UNLISTED | typed       12
  DRAFT    | EMPTY       44        UNLISTED | EMPTY      214
```

The refactor is still correct, but its immediate effect is small: title parsing
will keep doing ~92% of the work until `productType` is filled in on the active
catalogue. Nothing to change in the code — worth knowing so the outcome isn't a
surprise.

**Finding 2 — the store has casing and singular/plural variants.** Six
`productType` values sit outside the 28, five of them just variants of a value
we already have:

```
  15  "Dining table"        1  "stool"        1  "Linneskåp"
   4  "chest of drawers"    1  "armchair"
   2  "sideboard"
```

Under strict equality these 22 products would fall through to title parsing.
**Design change:** `productType` is matched through a normalised lookup key
(lowercase, whitespace-collapsed, singularised) rather than raw equality. Both
sides normalise, so `"Dining table"` and `"sideboard"` land on the canonical
value. Verified to produce no collisions across the 28 — in particular
`Side Tables` and `Bedside Tables` stay distinct. `"Linneskåp"` (Swedish, 1
product) correctly still falls through to title parsing and logs a warning.

Nine vocabulary values are not yet used as product types in Shopify
(`Seating Benches`, `Serving Trolleys`, `Shelving Units`, `Secretary Cabinets`,
`Wardrobes`, `Posters`, `Mirrors`, `Porcelain`, `Carpets`). They stay in the
vocabulary — six of them have existing ScanHistory rows and are produced by
title parsing; `Wardrobes`, `Porcelain` and `Carpets` are forward-looking.

The mixed capitalisation (`Nest Of Tables` / `Chest of Drawers`) is confirmed
verbatim from the store.

---

# Phase 1 — Make the dictionary a closed vocabulary

## 1.1 The vocabulary

28 values, stored **verbatim** as they appear in Shopify's `productType`:

```
Dining Chairs      Dining Tables      Sideboards           Posters
Easy Chairs        Bedside Tables     Highboards           Mirrors
Armchairs          Coffee Tables      Bookshelves          Porcelain
Sofas              Side Tables        Shelving Units       Carpets
Stools             Hall Tables        Chest of Drawers     Lamps
Seating Benches    Writing Desks      Secretary Cabinets
Serving Trolleys   Nest Of Tables     Bar Cabinets
                                      Wardrobes
                                      Storage Cabinets
```

Plus the `"unknown"` sentinel, unchanged.

`Serving Trolleys` was added in review — the original 27 had no home for 13
existing trolley items.

This becomes a real closed set in code, not a convention:

```ts
export const ITEM_CATEGORIES = ["Dining Chairs", ...] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
```

Typing the dictionary's output as `ItemCategory` makes the compiler enforce
that no title rule can ever produce a value outside the vocabulary — the
guarantee that's missing today.

> **The values must match Shopify byte-for-byte**, since Phase 2 compares
> `productType` against this list directly. Note `Nest Of Tables` (capital O)
> vs `Chest of Drawers` (lowercase o) — confirmed as verbatim from Shopify's own
> product-type listing (§0.5).

## 1.2 Renaming existing data

This is the part the earlier "no backfill" decision no longer covers. Every
one of the 1,107 `ScanHistory` rows carries a value that won't exist after this
change, and sold items never re-resolve — so without a rename you'd run two
vocabularies side by side in analytics permanently.

But this is a **rename, not a re-derivation**: a fixed old→new string map, no
Shopify calls, fully reviewable up front.

| old value | rows | → new value |
|---|---:|---|
| `dining_chair` | 301 | Dining Chairs |
| `dining_table` | 196 | Dining Tables |
| `side_table` | 112 | Side Tables |
| `sideboard` | 77 | Sideboards |
| `bookshelf` | 61 | Bookshelves |
| `armchair` | 60 | Armchairs |
| `coffee_table` | 52 | Coffee Tables |
| `chest_of_drawers` | 37 | Chest of Drawers |
| `nest_of_tables` | 31 | Nest Of Tables |
| `mirror` | 28 | Mirrors |
| `highboard` | 20 | Highboards |
| `bedside_table` | 20 | Bedside Tables |
| `secretary_cabinet` | 17 | Secretary Cabinets |
| `stool` | 13 | Stools |
| `serving_trolley` | 13 | Serving Trolleys |
| `writing_desk` | 12 | Writing Desks |
| `lamp` | 12 | Lamps |
| `bar_cabinet` | 10 | Bar Cabinets |
| `sofa` | 6 | Sofas |
| `poster` | 2 | Posters |
| `hall_table` | 2 | Hall Tables |
| `shelving` | 1 | Shelving Units |
| `bench` | 1 | Seating Benches |
| `unknown` | 9 | *(unchanged)* |
| `cabinet` | 9 | Storage Cabinets |
| `sewing_table` | 2 | Side Tables |
| `corner_cabinet` | 1 | Storage Cabinets |
| `plant_stand` | 1 | Hall Tables |
| `conference_table` | 1 | Dining Tables |

All 29 values have an explicit target (confirmed in review). The script must
still fail loudly on any value it doesn't recognise, rather than passing it
through as legacy or `"unknown"` — that's what protects against a value that
exists in prod but not in this dev snapshot.

Validated against the current snapshot with this exact mapping:

```
UNMAPPED in ScanHistory:  none
UNMAPPED in stats:        none
PK COLLISIONS:            0
total itemsSold before:   802     ← must be identical after the migration
```

### Scope: exactly two columns

Verified against `schema.prisma` — only two columns in the entire database
store a category value:

| table | column | rows |
|---|---|---:|
| `ScanHistory` | `itemCategory` (line 120) | 1,107 |
| `location_category_stats_daily` | `itemCategory` (line 291) | 384 |

`LocationStatsDaily` and `SalesChannelStatsDaily` have no category axis at all,
and category is never denormalised into an outbound-webhook payload, a WS
broadcast, or `ScanHistory.properties` — so there is no third place holding a
stale copy. Missing the stats table would leave every historical chart keyed to
dead values, which is why it's in scope alongside `ScanHistory`.

### The migration script

The stats table needs care: its primary key is
`[date, location, itemCategory]` (`schema.prisma:296`), so when two old values
merge into one new value, a blind `UPDATE` hits a PK conflict. The script must
**merge on conflict** — sum `itemsSold`, `totalRevenue`, and
`totalTimeToSellSeconds` into the surviving row, then delete the source row.

Under the final mapping, four old values merge into an existing target
(`cabinet`+`corner_cabinet` → Storage Cabinets, `sewing_table` → Side Tables,
`plant_stand` → Hall Tables, `conference_table` → Dining Tables). I checked the
current snapshot for merge candidates sharing a `(date, location)` key and found
zero collisions, but the script handles them regardless — prod may differ from
this dev copy.

Run order: back up first (`npm run backup:sqlite`), dry-run printing every
rename and every merge with row counts, then apply.

## 1.3 Code changes in Phase 1

- **`category-dictionary.ts`** — rewrite the `category` side of every entry to
  the new values. The `match` side (lowercase title substrings) is unchanged,
  and the ordering rule still holds: longer/more specific keys first.
- **`shopify-admin-api.integration.ts:361`** — the set-of-N quantity inference
  currently reads `itemCategory === "dining_chair"`. Decided in review: it
  should cover **all** seating, so it becomes a substring test:

  ```ts
  if (itemCategory.toLowerCase().includes("chair")) { ... }
  ```

  Matches exactly `Dining Chairs`, `Easy Chairs`, `Armchairs` and nothing else
  in the vocabulary (verified). This widens behaviour: an easy chair or armchair
  titled "set of 2" now gets quantity 2 where it previously got 1.
  This is the one place a stale literal silently breaks a feature rather than
  failing to compile, so it's worth grepping for the old literals repo-wide as
  a final check.
- **`scripts/correct-scan-history-data.ts:215`** — carries a duplicated copy of
  the same rule and needs the identical change.

Notably, the frontend needs **no** changes. Its substring checks in
`ItemQuantityPill.tsx` are already lowercased (`includes("chair")`,
`includes("table")`), which still match `Dining Chairs` and `Coffee Tables`.
And the `:category` URL path is already `encodeURIComponent`-ed client-side
(`get-category-by-location.api.ts:9`) and decoded in
`stats.controller.ts:59`, so values with spaces travel safely. Analytics
panels render the raw stored value (`${category} — Sold`), so they simply
start showing `Dining Chairs` instead of `dining_chair` — a free readability
win.

## 1.4 Every place the exact string matters

The vocabulary values are compared by exact, case-sensitive equality in eight
places. None of this is *new* — `dining_chair` is exactly as case-sensitive
today — but these are the sites to check when the strings change.

**System-supplied on both sides — inherently safe:**

| site | what it does |
|---|---|
| `scan-history.repository.ts:914` | `date_location_itemCategory` upsert key (new sold row) |
| `scan-history.repository.ts:1250` | same key (existing sold row) |
| `scan-history.repository.ts:1655` | same key (sold-quantity correction) |

Both sides come from `normalizeCategory()` on a value the resolver produced, so
they can't disagree. A write landing between the code deploy and the migration
would go into an old-vocabulary bucket, but the release is scheduled for a
no-activity window, so this is not a live constraint.

**Client-supplied filter → exact equality:**

| site | value comes from |
|---|---|
| `stats-items.repository.ts:82` | `itemCategory` query param |
| `stats.repository.ts:335` | `:category` URL path param |
| `stats.repository.ts:752` | `itemCategory` query param on time-patterns |

All three are **click-driven**: the value comes from a list the API returned and
the user selected (`CategoryStatsPanel`/`ZoneStatsPanel` pass `selectedCategory`
straight back). No UI lets a user type into these. The exposure is direct API
callers and saved bookmarks holding an old value — those return zero rows
silently rather than erroring, same as today.

**These three stay exact matches — see §1.5.**

**Hard-coded literals — must be updated by hand:**

| site | current |
|---|---|
| `shopify-admin-api.integration.ts:361` | `itemCategory === "dining_chair"` |
| `correct-scan-history-data.ts:215` | duplicate of the same rule |

These are the only two that break silently rather than failing to compile,
which is why a repo-wide grep for the old values is a required closing step.

**Not affected:** the two free-text search paths
(`scan-history.repository.ts:232`, `get-logistic-items.query.ts:73`) use
`contains`, which compiles to SQLite `LIKE` and is case-insensitive for ASCII.

## 1.5 Partial / case-insensitive search — already covered, and where not to add it

**Every path where a user types a category already does case-insensitive
partial matching.** `contains` in Prisma compiles to SQLite `LIKE '%value%'`,
and SQLite's `LIKE` is case-insensitive for ASCII by default — so no `ILIKE`
and no `mode: "insensitive"` is needed. (Prisma's `mode: "insensitive"` isn't
supported on SQLite anyway; it's a Postgres feature. Worth remembering only if
this database ever moves to Postgres, where `contains` *would* become
case-sensitive and would then need that flag.)

Verified against the new vocabulary:

```
search "chair"       -> Dining Chairs, Easy Chairs, Armchairs
search "dining cha"  -> Dining Chairs
search "TABLES"      -> Side Tables, Bedside Tables, Dining Tables
```

**The three aggregate filters in §1.4 should NOT be switched to `contains`.**
They're click-driven, so partial matching adds no search capability there — and
the vocabulary contains one substring collision that would silently corrupt the
numbers:

```
"Side Tables" is a substring of "Bedside Tables"

  filter "Side Tables" with equality  -> Side Tables                  ✅
  filter "Side Tables" with contains  -> Side Tables + Bedside Tables ❌
```

That's the only collision across all 28 values (checked exhaustively), but it
sits on an analytics aggregate. Concretely, with today's data:

```
user clicks "Side Tables" in the category panel
  equality  ->  114 items   (Side Tables only)              ✅
  contains  ->  134 items   (+20 Bedside Tables folded in)  ❌
```

Same distortion on revenue, units sold, and average time-to-sell, with nothing
in the UI indicating it happened.

---

# Phase 2 — Resolve from `productType`

## 2.1 The resolution rule

Once the vocabulary *is* the set of Shopify product types, the productType path
needs no dictionary lookup at all — just a membership test:

```ts
resolve(productType, title):
  1. productType is in ITEM_CATEGORIES        → use it verbatim
  2. productType set but NOT in vocabulary    → warn log, fall through
  3. title → dictionary match                 → canonical value
  4. "unknown"
```

This is **simpler than the pre-vocabulary version of this plan**, which needed
a slugify fallback to avoid silently dropping unrecognized product types. With
a closed vocabulary that fallback is not just unnecessary but wrong: an
unrecognized productType is a data-quality signal to log, not a new category to
invent. Step 2 above is what surfaces it.

It also dissolves a bug I'd found in the substring approach. Matching
`productType` against dictionary *substrings* broke on irregular plurals —
`"Bookshelves"` doesn't contain the key `"bookshelf"`, so it would have landed
in a separate bucket from existing `bookshelf` rows. Exact membership matching
has no such failure mode.

## 2.2 Step 0 — survey the store first

See §0.5. Run first, as a read-only diff of the live store's distinct
`productType` values against the 28. Any productType that comes back unmapped is either a
vocabulary gap to fix now or a Shopify data issue to clean up — exactly how
`Serving Trolleys` surfaced during this review.

## 2.3 `shopify-admin-api.integration.ts`

Every product fetch in the backend goes through this one file.

**Replace the `itemCategoryMeta` selection with `productType` in the 4 GraphQL
queries** (lines 691, 817, 947, 1165). `productType` is a plain field on
`Product` — no alias, no metafield lookup, and it lowers query cost.

**Swap the field in the 5 type declarations**: `ShopifyProductSearchEdge`
(line 28), `ShopifyProductSnapshotNode` (line 57), the
`mapProductNodeToLocationSnapshot` parameter (line 419),
`ListProductsWithLocationResponse` (line 536), and the inline response type in
`getProductWithLocation` (line 633).

**Update the 2 resolution call sites** (lines 480 and 1216) to pass
`productType` instead of `itemCategoryMeta?.value`.

The metafield `custom.productcategory` is dropped entirely rather than left
fetched-but-unused.

## 2.4 `scripts/correct-scan-history-data.ts`

Carries a second, duplicated copy of the resolution logic with its own GraphQL
query (lines 256, 276, 299-301). Left alone it would silently re-apply the old
metafield rule the next time anyone runs it. Point it at
`categoryResolverService` so the duplication disappears rather than being
maintained twice.

---

# What deliberately does not change

- `ScanHistory.itemCategory` stays a `String` column — the vocabulary is
  enforced in TypeScript, not by a DB enum, so no schema migration is needed
  and legacy rows stay readable during the rename.
- The `"unknown"` sentinel and every `normalizeCategory` /
  `resolveCategoryForUpdate` write rule in `scan-history.repository.ts`.
- `categoryParserService` — still pure substring matching over titles.
- The frontend (see 1.3).
- The order-webhook `product_type` field (`shopify.contract.ts:83`) stays
  reserved for internal-marker detection (`order-marker.ts:41`).

# Verification

Done:

- [x] `npm run typecheck` clean; `npm run build` clean, and the compiled output
      no longer contains the `productcategory` metafield.
- [x] Migration dry run reviewed: 1,098 rows renamed across 28 values, 9
      `unknown` skipped, 381 of 384 stats rows renamed, 0 merge collisions.
- [x] Apply path exercised end-to-end on a database copy before touching real
      data; `items_sold` held at 802 before and after.
- [x] Migration applied. Post-check: no `ScanHistory` or stats row holds a value
      outside the vocabulary; stats still 384 rows / 802 items_sold.
- [x] Resolver checked against 14 real cases from the store survey, including
      every casing variant and the `Side Tables` / `Bedside Tables` distinction.

Pending — needs the deployed app:

- [ ] **Deploy the backend.** Until the new build is running, the old code
      resolves categories with the old dictionary and writes snake_case values
      back over migrated rows on every scan.
- [ ] Scan SKU `Ch6-280826` (productType `Dining Chairs`) → lands as
      `Dining Chairs` with set-of-N quantity inference intact.
- [ ] Scan a product whose title parses differently from its productType, to
      prove productType wins.
- [ ] Edit a productType in Shopify on an unsold item → `PRODUCTS_UPDATE`
      webhook re-syncs the category.
- [ ] Search by SKU in the unified scanner (the second resolution call site).
- [ ] Analytics category panel and a category filter still return rows, now
      labelled in Title Case.

# Risks

| Risk | Handling |
|---|---|
| Stale `"dining_chair"` string literal survives somewhere | Repo-wide grep for old values as a final check; the type only catches dictionary values, not comparisons |
| Stats PK collision when two categories merge | Merge-on-conflict summing counters, verified by the unchanged-total check |
| Vocabulary strings don't match Shopify exactly | Step 0 survey diffs against the live store before the strings are committed |
| A prod-only category value not in this snapshot | Script fails loudly on any unmapped value instead of guessing |
| Rename runs twice | Make it idempotent — a value already in the vocabulary is skipped |
