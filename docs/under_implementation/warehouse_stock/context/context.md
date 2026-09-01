# Location Stock System — System Context for Planning

**Purpose.** This document is the seed context for the implementation plan of the Location Stock System described in `docs/under_implementation/warehouse_stock/intention/raw_intention.md`. It describes the system **as it is today** — conventions, data shapes, integration points, constraints, and the places where the intention's vocabulary does not line up with the codebase's vocabulary.

It is **descriptive, not prescriptive**. Where the intention assumes something that is not true of this codebase, that is called out explicitly in §17 (Vocabulary mapping) and §18 (Open decisions). The planner must resolve those before writing the plan; it must not silently pick a reading.

**Roots.** Backend `apps/backend`, frontend `apps/frontend`. All backend paths in this document are relative to `apps/backend` unless stated otherwise. Line numbers are from the working tree at commit `11b33eb`.

**Status.** All decisions are resolved. §0 records the twenty-two decisions the product owner settled against this context; §18 is retained as the audit trail showing what was open and where each item was closed. The planner should read §0 as binding and §18 only for the reasoning behind a decision.

---

## 0. Resolved decisions

Decided by the product owner on 2026-09-01 after review of this document. The intention document is being amended to match; where the two disagree, **§0 wins**. Each entry names the §18 item it closes.

### 0.1 `item_type` means `ScanHistory.itemCategory` — closes §17 row 2

The stock system's item type is `ScanHistory.itemCategory`, validated against the `ITEM_CATEGORIES` constant in `shared/category/item-categories.ts`. `ScanHistory.itemType` (the identifier kind) is not involved anywhere in this feature.

### 0.2 `shopId` is included on both new tables — closes §18.1

`LocationStock` (and, following the existing pattern, `StockThresholdsLocation`) carries `shopId` with a `Shop` relation and `onDelete: Cascade`, matching `StoreZone` / `LogisticLocation` / `OutboundWebhookTarget`. Rationale:

- the uniqueness rule "duplicate `location + item_type + normalized properties` hard-fails" is only correct **per shop** — `latestLocation` strings are per-shop free text and would collide across shops;
- every reconciliation query is `where { shopId, latestLocation, itemCategory, isSold: false }` anyway;
- without it the table would be the only shop-owned table that does not cascade on shop deletion;
- retrofitting it later means a data migration that, under SQLite, makes Prisma drop and recreate the table (see `prisma/migrations/20260415040930_add_logistic_management/migration.sql`).

`shopId` participates in every uniqueness constraint, every index, and every query. Its value comes from `req.authUser.shopId` after `requireShopLinkMiddleware`.

### 0.3 Audit fields follow the `username` convention — closes §18.2

No `createdBy`/`updatedBy` user-ID FKs. Both tables get denormalised `createdByUsername` / `updatedByUsername` string columns, following `ScanHistory.username`, `ScanHistoryEvent.username` and `ScanHistoryLogistic.username`. System-driven writes use the existing sentinel style (`"system:shopify-webhook"`, and a new equivalent for reconciliation). `createdAt` / `updatedAt` use the standard `@default(now())` / `@updatedAt`.

### 0.4 A single configuration-options endpoint, hard-coded — partially closes §18.4

One endpoint serves the stock-configuration form with everything it needs to build a valid criterion. All three sources are **static code, not database queries**:

| Field | Source | Notes |
|---|---|---|
| `itemCategories` | the `ITEM_CATEGORIES` constant | returned as-is; no query |
| `locations` | **not returned** | the frontend already has this from the bootstrap payload (`build-bootstrap-payload.query.ts` → `shopify.metafields.options`, the Shopify metafield `choices`) |
| `properties` | a new hand-maintained map | `Array<{ key, values[] }>` |

The property map is a new module — suggested `src/shared/item-properties/item-property-options.ts`, built as `as const` following the `ITEM_CATEGORIES` pattern so it is usable directly in `z.enum`. It is **curated, not derived**: only keys that are meaningful stock dimensions are listed. Free-text and prose keys observed in the data — `price_st`, `years`, `detailed_condition`, `damage_details`, `link`, `compare_at_price`, `designer` — are deliberately excluded.

Multi-value stored strings are split into their individual choices when the map is authored (`"Teak, Beech"` contributes `Teak` and `Beech`, not the joined string).

This map is load-bearing in three places, and that is the point:

1. it is the options payload for the form;
2. it is the **validation whitelist** for `LocationStock.properties` — an unknown key or an unknown value is rejected at create/update time, which eliminates the silent "config matches zero items forever" failure;
3. it is the matching vocabulary consumed by §0.5.

Accepted consequence: an item whose stored value is absent from the map (typo, or a new Shopify choice) will not satisfy that criterion and falls through to a broader configuration. This is silent. A small maintenance script that reports stored property values not present in the map is recommended as drift insurance.

### 0.5 Property matching is tokenized set membership — closes §18.4 (matching semantics)

An item's stored property value is a single string that may encode several values. Matching asks **"is the criterion value one of the values in the item's string"**, decided on whole tokens:

```
tokens(stored)  = stored.split(/[,\/&]/).map(trim).filter(Boolean).map(toLowerCase) → Set<string>
matches(criterionValue) = tokens(stored).has(toLowerCase(criterionValue))
```

- **Separators are `,` `/` `&`.** Verified against real values: `"Teak, Beech"`, `"Teak,Walnut"` (no space), `"Oval/Rectangular"`, `"Up & Down"`.
- **`-` is not a separator** — it occurs inside real values (`"1-20 kg"`, `"Excellent - This vintage piece…"`).
- **Comparison is case-insensitive.** Stored values are title-cased (`"Teak"`); the map holds the canonical casing for display, comparison lowercases both sides.
- **Order and spacing stop mattering.** `"Teak, Walnut"` and `"Walnut, Teak"` both tokenize to `{teak, walnut}`, satisfying the intention's §4 requirement that `["up","down"]` and `["down","up"]` be equivalent.

**Substring matching (`String.includes`) is explicitly rejected.** It produces false positives against values live in the database today:

| Key | Stored value | Criterion that wrongly matches under `includes` |
|---|---|---|
| `detailed_condition` | `Very Good - This vintage item has no defects…` | `Good` — matches every "Very Good" item |
| `upholstery` | `Up & Down` | `Down` — matches by accident on characters |
| `shape` | `Oval/Rectangular` | `Oval`, `Rectangular` — right answer, wrong mechanism |
| `wood_type` | `Santos Rosewood` | `Rosewood` — latent; fires if that choice is ever added |

Tokenization gives the intended result in every one of these cases, including `"Up & Down"` → `{up, down}`, which correctly reads as "this item is both".

A criterion with **multiple accepted values** (`{ wood_type: ["Teak", "Mahogany"] }`) matches when the intersection of the accepted set and the item's token set is non-empty. Criteria are stored canonically (lowercased, de-duplicated, sorted) so that duplicate/conflict detection is a plain string comparison of the canonical form.

The same `tokens()` function is used by matching, conflict detection, reconciliation and report aggregation. There is exactly one implementation.

### 0.6 Full-scan matching in application memory is the accepted approach — closes §18 efficiency concerns

No JSON indexing, no denormalised match columns, no materialised property table. Justified by operation:

| Operation | Work | Cost today |
|---|---|---|
| Allocate one item (every scan, every webhook — the hot path) | **no item scan at all**: load `LocationStock` rows for `(shopId, location, itemCategory)` — an indexed point query — and match one property bag against a handful of configs in memory | O(configs) |
| Reconcile one config (create / update / delete) | `findMany({ where: { shopId, latestLocation, itemCategory, isSold: false } })` — both columns indexed — then match in memory | largest real bucket is 58 rows (`LC1` + `Dining Chairs`) |
| Full rebuild (maintenance) | scan all eligible items | 518 unsold rows |

This is correct **because** the dataset is ~500 rows. The plan should record that fact and the threshold at which it stops holding (tens of thousands of items, i.e. the Postgres migration `docs/DATABASE.md` already anticipates). §12.1 remains true: SQLite JSON is not queryable through Prisma, and no raw-SQL JSON access is introduced.

The residual risk is not query cost but concurrent read-modify-write on the same `LocationStock` row — still open, §18.8.

### 0.7 `products/update` is in scope, via one shared primitive — partially closes §18.7

The Shopify `products/update` webhook path (`modules/shopify/jobs/process-products-update-webhook.job.ts`) is in scope. When it touches a product, the stock machinery evaluates whether anything of stock concern changed — **location, quantity, itemCategory, or properties** — and applies the change.

The agreed shape is a single primitive that every integration point reduces to:

```
applyItemStockChange({ before, after })
  before / after = { location, itemCategory, properties, quantity, isSold }
```

It resolves the best-matching `LocationStock` for `before` and for `after`, decrements the first, increments the second, no-ops when both resolve to the same instance with an unchanged quantity, and returns whether anything actually changed so the caller can decide whether to emit an event.

| Integration point | `before` | `after` |
|---|---|---|
| Location scan (`updateItemLocationCommand`) | existing row | resulting row |
| `products/update` webhook | `existingHistory`, loaded at `process-products-update-webhook.job.ts:86` **before** any mutation | the freshly synced row |
| Sold (`orders/paid`, `orders/create`) | existing row | same row, `isSold: true` |
| Return to store (`returned_to_store`) | existing row, `isSold: true` | resulting row, `isSold: false` |
| Config create / update / delete | — | reconciliation instead (§0.6) |

Two constraints specific to the webhook path:

- **Ordering.** The job today runs `syncProductSnapshotIfHistoryExists` (quantity, properties, category) **before** `appendLocationEvent` (location), at `:182` and `:201`. Hooking each mutation separately would compute deltas against a half-updated row. Capture `before` once from `existingHistory` at `:86` and apply the stock change once, after both writes.
- **Process.** This runs in the **webhook worker**, which has no in-memory WS registry. Its stock event must go through the injected `broadcast` function the job already receives (`:59-63`), never `broadcastToShop`. See §11.3.

The sold-item branch at `:90-107` (`syncSoldQuantityIfHistoryExists`) changes quantity on an already-sold item; that is correctly a stock no-op.

**Still open** from §18.7: whether the hook itself lives in `updateItemLocationCommand`, in `scanHistoryRepository.appendLocationEvent`, or in an extracted service that owns the transaction and passes `tx` into both repositories (the shape `.github/instructions/backend-contracts.instructions.md` points at). §0.7 fixes *what* triggers the machinery and *what it does*, not *where the call site sits*.

### 0.8 Wildcard criteria require the key to be present — closes §18.4 (wildcard)

`{ upholstery: null }` means "this item must have an `upholstery` value, and any value is accepted". An item **without** the `upholstery` key does **not** satisfy the criterion and falls through to a broader configuration.

Rationale: the wildcard is a statement that the dimension is relevant to this stock instance, not a catch-all. Today only 13 of 1107 items carry `upholstery` at all, so under the opposite reading a single wildcard config would absorb almost every item in its location + category. Coverage is expected to rise over time — the purchase-API integration (`shared/item-properties/purchase-api.integration.ts`, added in commit `11b33eb`) now supplies these attributes for items whose Shopify metafields lack them, so key presence grows as items re-sync.

Consequence to carry into the report and the reconciliation tests: an item can legitimately match **no** configuration at all in a location where configurations exist, and contributes to none. That is not an error state.

### 0.9 No new WebSocket event — reuse `scan_history_updated` — closes intention §13

V1 introduces **no new event type**. The `WsOutboundEvent` union in `modules/ws/ws-broadcaster.ts` and its hand-mirrored twin in `apps/frontend/src/core/ws-client/ws-events.ts` are left untouched.

**Item-driven stock changes** already emit `scan_history_updated`, on every trigger path in §0.7, including the ones running in the webhook worker (which publishes over Redis and is re-broadcast by `server.ts:159-168`):

| Trigger | Emission point |
|---|---|
| Location move (scan) | `scan-history.repository.ts:820` (guarded by `didAppendLocationEvent`) |
| Location move (Shopify admin → `products/update`) | same, via the job's injected `broadcast` |
| Item sold | `scan-history.repository.ts:1336` |
| Return to store | `scan-history.repository.ts:820` |
| Quantity / properties / category sync | `scan-history.repository.ts:1522` |

The stock pages consume it the way the analytics page already does — ignore the payload, refetch:

```ts
// apps/frontend/src/features/analytics/flows/use-analytics-page.flow.ts:138-142
const handleScanHistoryUpdated = useCallback(() => { void load(); }, [load]);
useWsEvent("scan_history_updated", handleScanHistoryUpdated);
```

**Configuration-driven stock changes emit nothing.** Creating, updating or deleting a `LocationStock` changes quantities on the edited row and its siblings via reconciliation, and a threshold-only edit changes `stock_state` — neither touches an item, so no event fires. Accepted deliberately: the editing user receives the result in the HTTP response, and other users reload the page. This is an explicit V1 scope decision, not an oversight.

**Accepted over-firing.** `scan_history_updated` also fires for changes that cannot affect stock — price updates (`:1400`), sold-quantity syncs on already-sold items (`:1726`), and any item change in a location or category with no stock configuration. The stock pages will refetch pointlessly in those cases. At ~500 items and scanning cadence this is negligible.

**Amends the intention.** Intention §13 requires events that "represent successfully committed stock changes" and are "not emitted for stock no-ops". Reusing `scan_history_updated` breaks that by construction — it signals *item* changes, not *stock* changes. §13 is amended to: the stock UI reacts to the existing item-change event; no stock-specific event exists in V1.

**Not a lock-in.** Adding `location_stock_updated` later is one arm on each of the two union types plus an emit from the primitive — which already returns whether anything changed, so the no-op rule comes for free at that point.

### 0.10 Hook call site: Option A — commands and job, after commit — closes §18.7

`applyItemStockChange({ before, after })` is invoked from the **command and job layer**, after the item write has committed. `scan-history.repository.ts` is not modified.

Four call sites:

| Call site | `before` obtained from |
|---|---|
| `modules/shopify/commands/update-item-location.command.ts` (move + return-to-store) | an added `scanHistoryRepository.findByShopAndProduct` before the write — the same call the command already makes on its `returnToStore` branch (`:53-70`), hoisted so it always runs |
| `modules/shopify/jobs/process-products-update-webhook.job.ts` | `existingHistory`, already loaded at `:86` before any mutation; apply the stock change **once**, after both `syncProductSnapshotIfHistoryExists` and `appendLocationEvent` have run (§0.7) |
| `modules/shopify/commands/handle-orders-paid-webhook.command.ts` | derived as `{...after, isSold: false}` — the sold write changes no location, quantity or property, so no extra query is needed |
| `modules/shopify/commands/handle-orders-create-webhook.command.ts` | same |

Rationale:

- **Blast radius.** `scan-history.repository.ts` is 1967 lines and owns every item write in the system — the scanner, the order webhooks and the daily stats all run through it. With no test suite (§0.11) a refactor there is unguarded. Option A touches none of it.
- **The atomicity given up is recoverable.** Stock updates land after the item transaction commits, so a process crash in that window leaves a stale counter. That is precisely the drift the reconciliation service exists to repair, and the intention already frames `quantity` as an observable invariant with reconciliation as the remedy.
- **It stays reversible.** All four sites call the same primitive, so moving the invocation inside a transaction later (Option C — a service that owns the transaction and passes `tx` into both repositories, the shape `.github/instructions/backend-contracts.instructions.md` points at) is a change to *where the function is called*, not to *what it does*.

Rejected: **Option B** (inside the repository methods) — deepens an existing violation of the project's own layering rules and lengthens a write transaction already contended by the worker under SQLite's single-writer model. **Option C** — correct, but the largest diff, on the most delicate file, untested.

**Unaffected by this choice:** the concurrency guard (§18.8). Two of the four sites can run in parallel — the controller fans batches out with `Promise.all` (`shopify.controller.ts:254`) and the worker writes concurrently with the API — so the non-negative quantity invariant still needs its own protection wherever the mutation happens.

### 0.11 No automated tests — manual verification — closes §18.10

No test runner is introduced. The 17 test categories listed in intention §22.10 are **descoped for V1**; correctness is verified manually by the product owner.

This is a deliberate, informed trade given that the app is acknowledged as an interim system pending a backend rebuild. Two consequences the plan must carry:

- **It is the primary argument for §0.10.** Refactoring shared write paths without a safety net is the risk being avoided.
- **Design for testability anyway.** The domain machinery (tokenization, matching, specificity, state calculation, conflict detection) must remain pure and Prisma-free, in `domain/` or `shared/`. That costs nothing now, keeps manual reasoning tractable, and means tests can be added later without a rewrite.

When checking totals by hand, note the catch-all rule in §0.21: a group's quantities sum to its true eligible inventory only if the group contains a `{}` catch-all configuration. Without one, a short total is expected, not drift.

Manual verification is materially easier if the plan specifies, per phase, the concrete scenarios to exercise by hand (a scan into a configured location, a scan out, a sale, a return, a Shopify admin location edit, a config create with existing inventory, a config delete causing fallback) with the expected quantity and state after each.

### 0.12 No server-side location validation — closes §18.3 (validation)

`LocationStock.location` is accepted as a trimmed non-empty string. The backend does **not** validate it against the Shopify metafield choices, `StoreZone.label`, or observed `ScanHistory.latestLocation` values. The frontend form presents the valid options (it already holds them from the bootstrap payload), so the client is trusted.

No Shopify Admin API call is made during stock configuration create/update — avoiding a network dependency, a per-shop token requirement, and a failure mode where Shopify being down blocks settings edits.

Accepted risk: a location string that matches no items produces a configuration that silently reports `out_of_stock` forever. Note this is the one criterion dimension **not** covered by the §0.4 whitelist, which validates categories and property criteria.

**Still open, and separate from validation:** whether a configuration for `"H1"` should also capture items at `"H1:2"`. `stats-items.repository.ts:49-79` implements exactly this hierarchical rule for stats queries (a bare zone query matches the zone and all its levels), and `"H1:1"` exists in `ScanHistoryEvent.location` today, so the format is live. If stock matching uses plain string equality instead, a shop that starts using level suffixes will silently split its stock. See §18.3.

### 0.13 Specificity scoring — closes §18.6

When an item satisfies several `LocationStock` configurations in its location and category, the winner is chosen by scoring each candidate and comparing the components **in order** — the first difference decides:

1. **Constraint weight.** Sum over criterion keys: an exact value or a multi-value set scores **2**, a wildcard (`null`) scores **1**. Higher wins.
2. **Count of valued (non-wildcard) keys.** Higher wins.
3. **Total accepted values across all keys.** **Lower** wins — `{wood_type: ["Teak"]}` is more specific than `{wood_type: ["Teak","Oak"]}`.
4. **`createdAt` ascending, then `id` ascending.** The guaranteed final tie-break.

A wildcard scores 1 rather than 0 because, under §0.8, it is a real constraint — it requires the key to be present.

Verified against the intention's worked examples:

| Configuration | Weight | Valued keys | Result |
|---|---|---|---|
| `{ upholstery: null }` | 1 | 0 | |
| `{ upholstery: "Up", wood_type: "Teak" }` | 4 | 2 | **wins** — intention §5, instance B |
| `{ upholstery: null }` | 1 | 0 | |
| `{ upholstery: ["Up","Down"], wood_type: ["Teak","Mahogany"] }` | 4 | 2 | **wins** — intention §5, instance D |
| `{ upholstery: "Up" }` | 2 | 1 | **wins** on rule 2 |
| `{ upholstery: null, wood_type: null }` | 2 | 0 | |

This mechanism is complementary to the conflict-prevention rules of intention §6, which remove most ambiguous configurations **before** they can be created (given `{upholstery: null}`, creating `{upholstery: "Up"}` is rejected because the only dimension is already fully covered). Rule 4 exists so that even a tie that survives configuration validation still allocates deterministically, rather than depending on database row order.

The scoring function is pure and lives with the rest of the domain machinery (§0.11), alongside tokenization, matching, state calculation and conflict detection.

### 0.14 Location matching is exact string equality — closes §18.3

A configuration's `location` matches an item's `latestLocation` by trimmed, case-sensitive string equality — the same normalisation `normalizeLocation` already applies (`scan-history.repository.ts:79-82`). No hierarchical or prefix matching.

This is safe **because both sides draw from the same vocabulary**: the frontend presents the Shopify metafield `choices` (from the bootstrap payload) both when a user scans an item to a location and when a user configures a stock instance. A configured location is therefore always a value an item can actually hold, and the `"H1"` vs `"H1:2"` divergence cannot arise from normal use — if a level suffix is a valid choice, both sides use it; if it is not, neither does.

Accepted residual: a legacy item whose `latestLocation` is no longer in the choices list (a retired zone, or the `"H1:1"` form seen in `ScanHistoryEvent.location`) matches no configuration and contributes to none. That is the same benign fall-through as an item with an unrecognised property value (§0.4), not an error state.

### 0.15 Non-negative quantity guard — closes §18.8

`LocationStock.quantity` must never become negative. Decrements use a **guarded conditional mutation**: the decrement is applied only when the stored quantity is already greater than or equal to the requested amount.

```ts
const result = await prisma.locationStock.updateMany({
  where: { id, shopId, quantity: { gte: delta } },
  data:  { quantity: { decrement: delta } },
});
const guardFailed = result.count === 0;
```

This is a single atomic statement — no read-then-write window — so it is race-free under concurrent writers without any locking. `count === 0` means the guard genuinely refused.

**Deliberately not** an optimistic-concurrency form such as `where: { id, quantity: expectedValue }`. That would also return `count === 0` when a *concurrent, perfectly valid* mutation had changed the row, producing false integrity errors in the log. The `gte` form fires only on a real shortfall.

**On guard failure:**

- do **not** mutate that `LocationStock.quantity`;
- do **not** clamp to zero;
- do **not** fail or roll back the parent item/location operation;
- emit a `logger.error` describing the stock integrity mismatch;
- continue — the remaining parent operation and **any other valid stock mutation proceed normally**. On a location move this means that if the source decrement fails its guard, the destination increment still applies.

A guard failure is a **stock consistency error, not a business-operation failure**. The parent scan, sale or webhook succeeds.

This is structurally guaranteed by §0.10: stock mutation runs *after* the item transaction has committed and outside it, so a stock guard failure cannot roll back an item write even in principle.

**Required log context** (`logger.error("...", { ... })`, following the JSON-context convention of `shared/logging/logger.ts`), each field included where available:

| Field | Source |
|---|---|
| `locationStockId` | the config that refused |
| `location` | the config's location |
| `shopId` | tenant (§0.2) |
| `productId` / `scanHistoryId` | item identifiers |
| `itemCategory` | the item's type (§0.1) |
| `requestedDecrement` | the delta that was refused |
| `currentQuantity` | read back for diagnostics after the failure |
| `locationFrom` / `locationTo` | the move being applied, where the operation is a move |
| `operation` | the triggering context — one of `location_move`, `sold`, `return_to_store`, `products_update_sync`, `reconciliation` |

Enumerating `operation` as a closed set keeps the logs greppable when drift is investigated later.

**Recalculating `stock_state`.** The guarded statement changes the quantity but cannot compute the derived state in the same operation. After a successful mutation, read the row back and write `stock_state` from the resulting quantity and its thresholds using the shared state function. Increments need no guard and follow the same read-back-and-recalculate step.

**Repair.** Detected drift is not corrected in place. The reconciliation service (intention §9) is run separately to rebuild the correct quantity and state from source inventory.

### 0.16 Eligibility edge cases fall through harmlessly — mostly closes §18.5

An item that matches no configuration contributes to none. That is a normal outcome, not an error (§0.8, §0.14). Each of the observed edge cases resolves through that same fall-through:

| Case | Rows in dev | Outcome |
|---|---|---|
| `itemCategory = "unknown"` | 9 | Never allocated. `"unknown"` is `UNKNOWN_ITEM_CATEGORY`, deliberately **outside** the `ITEM_CATEGORIES` array (`shared/category/item-categories.ts:44-48`), so it is absent from the options payload (§0.4) and rejected by the `z.enum(ITEM_CATEGORIES)` validator. No configuration can name it. |
| `latestLocation = null` | 77 | Never allocated. A configuration's location is always a non-empty string, and matching is exact equality (§0.14). |
| `latestLocation = "UNKNOWN_POSITION"` | — | Never allocated in practice: the sentinel is not among the Shopify metafield choices the form offers. |
| `latestLocation = "SOLD_ORDER:…"` | 2 | Excluded by `isSold` regardless (§5). |
| `properties = null` | many | Satisfies no criterion at all, since every criterion — wildcards included — requires the key to be present (§0.8). Such an item can only ever match a configuration with empty criteria. |
| Sold items retaining a `latestLocation` | 589 | Excluded by `isSold = false` alone. This is the only eligibility predicate on sold state. |

**Still open:** items whose Shopify product status is not `ACTIVE`. `process-products-update-webhook.job.ts:129-137` skips them for snapshot sync, but the rows stay in `ScanHistory` with `isSold = false` and a real location, so they **would** be counted as stock. Whether a `DRAFT` or `ARCHIVED` product should contribute to a location's stock is a product question: the unit is physically on the shop floor, but it is not sellable. Note the status is not stored on `ScanHistory`, so excluding them would require a new column or a Shopify lookup.

### 0.17 Group-scoped reconciliation, run inline — closes §18.11

Because an item is allocated to exactly one configuration (the best match, §0.13), configurations **compete** for items. Changing one can therefore move items into or out of its siblings, so a configuration change never recalculates only the edited row.

**The affected set is the group** — every `LocationStock` sharing `(shopId, location, itemCategory)`. That is the exact boundary of competition: an item can only ever be allocated within its own location and category, so the effect cannot ripple beyond the group.

`reconcileGroup(shopId, location, itemCategory)`:

1. load every configuration in the group;
2. load eligible items once — `where { shopId, latestLocation: location, itemCategory, isSold: false }`, both columns indexed;
3. for each item resolve the winning configuration (§0.5 matching, §0.13 specificity) and tally `quantity` per configuration;
4. write every configuration's resulting quantity and recomputed `stock_state`, in one transaction so the group is never observed half-updated.

**Trigger scope:**

| Operation | Groups reconciled |
|---|---|
| Create | 1 — the new configuration's group |
| Delete | 1 — the deleted configuration's group, after the row and its cascaded thresholds are removed |
| Update criteria only | 1 |
| Update `location` and/or `item_type` | **2** — the group it left *and* the group it joined |
| Update thresholds only | 0 — no reallocation; recompute `stock_state` on that one row from its existing quantity |

The two-group case is the one most easily missed: moving a configuration from `LC1 + Dining Chairs` to `H1 + Dining Chairs` leaves stale quantities behind at LC1 unless that group is reconciled too.

**Runs inline**, synchronously within the request, before responding. At the current data size the largest real group is 58 rows / 221 units, so this is sub-millisecond; deferring it would add a queue and a job for no gain, and would leave a window in which the numbers the user just configured are visibly wrong.

**Satisfies intention §14** — a newly created configuration is written with its correct quantity and state from existing inventory, never starting at zero.

**Same function as the maintenance tool.** This is the reconciliation service of intention §9: the post-configuration-change fixup and the programmatic drift-repair mechanism are one implementation, invoked with different scopes.

**Interaction with the §0.15 guard.** Reconciliation writes **absolute** quantities computed from source inventory, not deltas. The non-negative guard applies only to incremental decrements and is not used here — a reconciliation result is authoritative and cannot be refused. A useful side effect: reconciling a group also silently repairs any pre-existing drift in it.

### 0.18 Authorisation matches existing settings resources — closes §18.9

Any authenticated, shop-linked user may read and edit stock configuration and read the report. Routers mount `authenticateUserMiddleware` then `requireShopLinkMiddleware`, exactly as `zones.routes.ts` and `logistic.routes.ts` do. No `requireAdminMiddleware`.

Admin-only gating is currently reserved for shop linking, shop unlinking and metafield-option mutations; applying it here would make stock the only settings resource with a stricter rule than zones or logistic locations.

### 0.19 Report contract details — closes §18.12

- **`type`** is the configuration's `itemCategory` (§0.1).
- **`properties`** in a compacted row is the **configuration's criteria**, not any item's property bag. Compaction keys on `item_type + normalized properties + stock_state`, so every contributing row carries identical criteria by definition.
- **`locations[]`** is always a list, including when it holds a single entry, per intention §19.
- **Default ordering** is lowest stock state first: `out_of_stock` → `low_in_stock` → `medium_in_stock` → `normal_in_stock` → `high_in_stock`.
- **`out_of_stock` rows are included by default.** They are the most urgent signal the report exists to surface; a configuration whose quantity has fallen to zero must not disappear from it.
- **Location-group ranking** (when grouping by location, where compaction is disabled) compares, in order: count of `out_of_stock` descending, then `low_in_stock` descending, then `medium_in_stock` descending, then location string ascending. The final component guarantees a deterministic order.

### 0.20 `stock_state` is declared twice, not three times — closes §18.13

- `prisma/schema.prisma` declares `enum StockState { out_of_stock low_in_stock medium_in_stock normal_in_stock high_in_stock }` — PascalCase name, snake_case members, matching `LogisticZoneType` and `ScanHistoryEventType`. Under SQLite this is stored as `TEXT` (§12.2).
- The domain declares `export const STOCK_STATES = [...] as const`, which is the single source for both the TS union type and the zod schema via `z.enum(STOCK_STATES)` — the `ITEM_CATEGORIES` pattern (`shared/category/item-categories.ts:12-42`).

The hand-written third TS union that `LogisticZoneType` carries (declared in `schema.prisma`, again in `modules/logistic/domain/logistic.domain.ts:7`, and again in `contracts/logistic.contract.ts:16-20`) is deliberately **not** repeated.

The ordering in `STOCK_STATES` is severity-ascending and is the single source for report sorting (§0.19) — comparisons use the array index, never a hand-maintained rank map.

### 0.21 Empty criteria is a valid location-wide catch-all — closes §18.4

A configuration with `properties = {}` is valid and means "every eligible item in this location and item type", imposing no property constraints at all.

- It scores **0** under §0.13, so it loses to any other matching configuration and only ever receives items nothing narrower claims.
- It is the **only** configuration an item with `properties = null` or an empty bag can match, since every criterion — wildcards included — requires the key to be present (§0.8, §0.16).
- Conflict rules treat it like any other criteria set: a second empty-criteria configuration in the same group is an exact duplicate of `location + item_type + normalized properties` and hard-fails.

Useful consequence: a group containing a catch-all allocates **every** eligible item somewhere, so the group's stock instances sum to the group's true inventory. Without one, items matching no criterion are counted nowhere — legitimate (§0.16), but it means group totals need not reconcile to a location's physical contents.

**Persistence requirement — binding on the model and repository.** `LocationStock.properties = {}` is a meaningful persisted value and **must never be normalized to `null` or `Prisma.JsonNull`**. In the stock-configuration domain `{}` explicitly means "catch-all for this location and item type"; `null`, if it is ever written at all, remains a distinct value. The repository must round-trip `{}` as `{}`.

This is a deliberate departure from the item-side convention. `ScanHistory.properties` writes an empty bag as `Prisma.JsonNull` (`toPropertiesUpdateValue`, `scan-history.repository.ts:188-191`) precisely so readers keep seeing `null` — on an *item*, "empty" and "absent" mean the same thing. On a *configuration* they must not be conflated: collapsing `{}` to `null` would silently turn every catch-all into "no criteria stored" and lose the distinction the allocator depends on. The stock repository must not copy that helper or its behaviour.

**Verification note — must be carried into the plan.** A group's stock totals reconcile to its true eligible inventory **only when the group contains a catch-all**:

- **With a `{}` catch-all** — every eligible item in that location and item type resolves to some stock instance, so the sum of the group's `LocationStock.quantity` values equals the group's true eligible inventory. A shortfall here *is* drift and should be investigated.
- **Without one** — items matching no criterion are legitimately unallocated (§0.16), so the configured totals may be lower than the physical/eligible inventory total. **A short total in this case is expected behaviour, not quantity drift**, and must not be diagnosed as one.

The plan must state this explicitly wherever it describes manual verification (§0.11) or the reconciliation/drift-repair tooling, so that a short total is never automatically read as a bug in the stock machinery.

### 0.22 Non-`ACTIVE` Shopify products still count as stock — closes §18.5

Items whose Shopify product status is `DRAFT` or `ARCHIVED` remain eligible and contribute to stock quantities for V1. The unit is physically present in the location, which is what this system counts.

Excluding them would require storing the product status on `ScanHistory` (a new column, backfilled) or a Shopify lookup per item — disproportionate for V1. Note `process-products-update-webhook.job.ts:129-137` already skips non-`ACTIVE` products for snapshot sync, so such an item's stored location, quantity and properties simply stop being refreshed while its stock allocation persists.

---

## 1. Eleven things that will bite the planner if missed

Read these first. Each is expanded later.

1. **The database is SQLite, not Postgres.** The intention says "JSONB". Prisma's `Json` type on SQLite is a `TEXT`/`JSONB` column that **cannot be queried** — no `path` filters, no `string_contains` on JSON, no `json_extract` through Prisma. Every property match must happen in application memory. (§12)
2. **`ScanHistory.itemType` is NOT the item type the intention means.** It stores the *identifier kind* used at scan time: `"product_id" | "handle" | "sku" | "barcode"`. The furniture type ("Dining Chairs", "Dining Tables") lives in **`ScanHistory.itemCategory`**, validated against `ITEM_CATEGORIES`. (§6; resolved §0.1)
3. **There is no `createdBy`/`updatedBy` convention anywhere in this codebase.** Zero occurrences in `src` or `prisma/schema.prisma`. The closest existing pattern is a denormalised `username: String` column (`ScanHistory`, `ScanHistoryEvent`, `ScanHistoryLogistic`). The intention's `created_by` / `updated_by` user-ID fields are new ground. (§3.6; resolved §0.3)
4. **Everything is scoped by `shopId`.** Every user-owned table has `shopId` with a `Shop` FK, every query filters on it, and `requireShopLinkMiddleware` resolves it per request. The intention never mentions `shopId` for `LocationStock`. (§3.5; resolved §0.2 — it gets one)
5. **Property values are flattened, comma-joined, title-cased strings.** Real stored values include `"Teak, Beech"`, `"Teak,Walnut"` (inconsistent spacing), `"Walnut, Teak"` (inconsistent order), `"Up & Down"`. The intention's examples (`"teak"`, `"up"`) do not match real data. (§7.4; resolved §0.5 — tokenized set membership, not substring)
6. **`updateItemLocationCommand` is not the only location-transition path.** The Shopify `products/update` webhook job also calls `appendLocationEvent`, from a **different OS process** (the webhook worker), and also mutates `quantity`, `itemCategory` and `properties`. (§10; resolved §0.7 — in scope, via one shared primitive)
7. **Sold-state transitions happen in the webhook worker process, not the API process.** `isSold: false → true` only ever happens inside `scanHistoryRepository.appendSoldTerminalEventWithFallback`, driven by orders webhooks running in the BullMQ worker. That process has **no in-memory WebSocket registry** — it must publish over Redis. (§9, §11.3)
8. **`isSold: true → false` already exists** — it is the `returned_to_store` event on `appendLocationEvent`. The intention asks whether the inverse should restore stock; the transition is real and reachable today. (§9.2)
9. **There is no test infrastructure at all.** No test runner, no test files, `npm test` is `echo "Error: no test specified" && exit 1`. Every test the intention requires must be built on infrastructure that does not exist yet. (§15)
10. **There is a written architecture contract at `.github/instructions/backend-contracts.instructions.md`** that the existing hook-point code already violates (transactions and domain decisions inside `scan-history.repository.ts`, Prisma called from commands). The new module can comply; the hook points are where the conflict has to be decided. (§3.8, §18.7)
11. **Concurrent stock mutation is real even in one process.** `shopifyController.updateLocationByIdentifier` runs a batch of location updates with `Promise.all` (`shopify.controller.ts:254`). Plus SQLite is a single-writer database whose `SQLITE_BUSY` / `SQLITE_LOCKED` errors are already treated as transient-retryable in the worker (`workers/webhook-worker.ts:15-26`). (§12.4)

---

## 2. Runtime topology

Four Node processes, one SQLite file, one Redis.

| Process | Entry | Role |
|---|---|---|
| API server | `src/server.ts` | Express HTTP + WebSocket server. Holds the in-memory WS connection registry. |
| Shopify webhook worker | `src/workers/webhook-worker.ts` | BullMQ consumer of Shopify webhook intake records (orders/create, orders/paid, products/update). **Writes ScanHistory.** |
| Notification worker | `src/workers/notification-worker.ts` | Push notifications for logistic tasks. |
| Outbound webhook worker | `src/workers/outbound-webhook-worker.ts` | Delivers outbound `item_placed` events to registered targets. |

Startup order and commands: `docs/guides/BACKEND_WORKERS_GUIDE.md`. Deployment is a single EC2 instance with a file-backed SQLite DB (`docs/DEPLOYMENT_EC2_SQLITE.md`, `docs/DATABASE.md`).

Key consequence for this feature: **any stock mutation that must be triggered from webhook-driven item changes runs in the worker process**, which cannot call `broadcastToShop` directly (see §11.3).

`src/server.ts` mounts every router twice — bare and under `/api` (`server.ts:124-145`):

```ts
app.use("/zones", zonesRouter);
...
app.use("/api/zones", zonesRouter);
```

A new router must be registered in **both** blocks to be reachable the way the frontend expects (the frontend calls `/api/...`).

---

## 3. Module anatomy and conventions

### 3.1 Folder layout

Every backend module under `src/modules/<module>/` uses the same folders. Not every module has every folder.

```
contracts/     zod schemas + exported DTO/input types      (<name>.contract.ts)
domain/        pure types + pure domain rules, no I/O      (<name>.domain.ts | <name>.ts)
repositories/  Prisma access + toDomain mapping            (<name>.repository.ts)
commands/      write use-cases                             (<verb>-<noun>.command.ts)
queries/       read use-cases                              (get-<noun>.query.ts)
services/      reusable multi-step logic between the above (<name>.service.ts)
controllers/   express handlers, zod parse, res.json       (<name>.controller.ts)
routes/        Router + middleware wiring                  (<name>.routes.ts)
jobs/          BullMQ job processors                       (process-<x>.job.ts)
integrations/  outbound third-party calls                  (<name>.integration.ts)
middleware/    express middleware
```

Cross-cutting code lives in `src/shared/<concern>/`. Examples relevant here: `shared/item-properties/`, `shared/category/`, `shared/database/`, `shared/errors/`, `shared/utils/`, `shared/logging/`.

The best complete small module to copy for CRUD shape: **`src/modules/zones/`** (contract → controller → command → repository → routes, 6 endpoints). The best module to copy for *domain rules + events + services*: **`src/modules/logistic/`**.

### 3.2 Imports

ESM with explicit `.js` extensions on every relative import (`"type": "module"`, `tsx`/`tsc`). Example: `import { prisma } from "../../../shared/database/prisma-client.js";`. Type-only imports use `import type`.

### 3.3 Style

- Arrow-function consts exported as named exports; repositories exported as one object literal of async methods (`export const zoneRepository = { async list(...) {...} }`).
- Commands take a **single object argument** and return a typed object: `export const markLogisticPlacementCommand = async (input: { shopId: string; ... }): Promise<{...}> => {...}`.
- Optional fields are spread conditionally rather than passed as `undefined`: `...(input.floorPlanId !== undefined ? { floorPlanId: input.floorPlanId } : {})`. This is pervasive (`exactOptionalPropertyTypes`-style discipline).
- Non-obvious decisions are documented in block comments above the code. The codebase's comment style explains *why*, and the reviewer of the plan will expect the same.

### 3.4 HTTP layer

- Controllers wrap handlers with `asyncHandler` (`shared/http/async-handler.ts`) or the route does (`asyncHandler(logisticController.getItems)`). Both patterns exist.
- Input validation: `SomeSchema.parse(req.body)` / `.parse(req.query)` with zod v4. A thrown `ZodError` is converted to a 400 `VALIDATION_ERROR` by `errorMiddleware` (`shared/http/error-middleware.ts:22-25`).
- Errors: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409) from `shared/errors/http-errors.ts`. Error body shape is fixed:
  ```json
  { "error": { "code": "...", "message": "...", "details": {}, "requestId": "uuid" } }
  ```
- Response envelope is **not uniform**. Counting `res.status(n).json({...})` across all controllers: `{ data }` ×17, `{ ok: true }` ×14, then one-off keys (`{ payload }`, `{ item }`, `{ locations }`, `{ history }`, …). **`{ data }` is the dominant convention for new read endpoints; `{ data }` for creates (201) and `{ ok: true }` for deletes** — that is exactly what `zones.controller.ts` does.
- Path params are validated by hand; `zones.controller.ts:18-30` has the canonical `getRequiredIdParam` helper.

### 3.5 Auth and shop scoping

```ts
router.use(authenticateUserMiddleware);
router.use(requireShopLinkMiddleware);
```

- `authenticateUserMiddleware` (`modules/auth/middleware/authenticate-user.middleware.ts`) verifies the Bearer JWT and sets `req.authUser = { userId, username, role, shopId, tokenVersion }` (typed in `shared/types/express.d.ts`).
- `requireShopLinkMiddleware` re-reads the user from the DB, rejects stale `tokenVersion`, and overwrites `req.authUser.shopId` with the DB truth. After it, `req.authUser.shopId as string` is the idiom used in every controller.
- Roles: `admin | manager | worker | seller` (`UserRole` enum). `requireAdminMiddleware` exists and is used for shop-linking and metafield-option mutations. **No route currently uses manager/worker/seller gating on settings CRUD** — zones and logistic locations are editable by any authenticated, shop-linked user. Whether stock configuration should be admin-only is an open decision (§18.9).

### 3.6 IDs, timestamps, audit

- **IDs**: every model uses `id String @id @default(cuid())`. That is "the established system ID convention". Generated by Prisma, never by application code.
- **Timestamps**: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`. Prisma stores UTC. Domain-level "day" bucketing uses `startOfUtcDay` (`shared/utils/date.ts:1-5`).
- **Actor tracking**: there is **no** `createdBy`/`updatedBy` column anywhere. What exists:
  - `ScanHistory.userId` (nullable FK to `User`, `onDelete: SetNull`) **plus** `ScanHistory.username String` (denormalised, survives user deletion; system writers use sentinel strings like `"system:shopify-webhook"`, `"unknown"`).
  - `ScanHistoryEvent.username`, `ScanHistoryLogistic.username` — username only, no FK.
  The intention asks for `created_by` / `updated_by` **user IDs**. Either convention (FK userId, denormalised username, or both) is defensible; the planner must pick one and say why. See §18.2.

### 3.7 Logging

`logger.info|warn|error(message, context?)` from `shared/logging/logger.ts` — JSON lines to stdout. Commands log start/completion with a structured context object; this is heavily used and expected (see `update-item-location.command.ts`, which logs at 8 points).

### 3.8 The written architecture rules — and where the code departs from them

`.github/instructions/backend-contracts.instructions.md` (119 lines, `applyTo: "apps/backend/**/*.ts"`) is the project's declared backend architecture contract. Read it in full before planning. Its load-bearing rules for this feature:

- **Layering.** `route → controller → service → repository/integration`. Controllers must never import repositories. Repositories must not import services/controllers.
- **Commands / queries / domain split.** `commands` = write use-cases and state-changing orchestration; `queries` = read use-cases, must not mutate; `domain` = **pure business rules, framework-agnostic and side-effect free**; `contracts` = zod DTOs. "Shared rules used by both commands and queries must be extracted to domain." "One file should implement one use-case or one domain concept where practical."
- **Prisma.** "Prisma client access is restricted to repository modules." "Controllers, commands, queries, and domain modules must not call Prisma client directly." "Repositories must not implement domain decisions (only data access semantics)." "Avoid embedding business rules in Prisma queries."
- **Transactions.** "Transaction boundaries belong in services, not controllers or repositories." "Use service-level orchestration for multi-repository transactions and **pass transactional clients into repositories** when needed." "Design write flows to be idempotent when retries are possible."
- **Contracts.** Validate params/query/body with zod before service logic; define explicit request/response DTOs; never return ORM entities directly.
- **Errors.** Typed `AppError` subclasses thrown in domain/services; global error middleware is the single mapper; every error response carries a stable code and request id.
- **API design.** "Use consistent success and error envelope shapes across endpoints." "Introduce additive changes first."
- **Testing.** "Service layer requires unit tests for business rules and edge cases. Controllers require integration-style tests for validation and error mapping. … For behavior changes, update or add tests in the same change set." — note §15: none of this infrastructure exists yet.

**Where the existing code departs from these rules** (the planner needs to know, because the stock hooks land squarely in the departing code):

| Rule | Departure |
|---|---|
| Prisma only in repositories | `modules/logistic/commands/mark-logistic-placement.command.ts:46` and `:78` call `prisma` directly; `modules/logistic/services/mark-as-uncompleted.service.ts:16` opens `prisma.$transaction`; `modules/external-api/commands/update-manager-app-items-location.command.ts` runs `prisma.$queryRaw`. |
| Transactions belong in services | The two biggest transactions in the system live **inside** `scan-history.repository.ts` (`appendLocationEvent:524`, `appendSoldTerminalEventWithFallback:878`). |
| Repositories must not implement domain decisions | `scan-history.repository.ts` decides sold-state transitions, location no-ops, stats attribution, and property replacement semantics. |
| Repositories must not depend on outward layers | `scan-history.repository.ts:6` imports `broadcastToShop` from the ws module and emits events. |
| Consistent envelopes | `{ data }` / `{ ok: true }` / `{ payload }` / `{ item }` / `{ locations }` all exist (§3.4). |
| Query handlers | `modules/stats/queries/*.query.ts` are unimplemented stubs; controllers call `stats.repository.ts` directly. |

The new stock module can and should follow the written rules (pure `domain/`, zod `contracts/`, Prisma only in its repository, transaction orchestration in a service that receives a `tx`). The tension is only at the **hook points**, which live in the departing code. §18.7.

---

## 4. Persistence: the `ScanHistory` item model

`ScanHistory` is **the item**. One row per `(shopId, productId)` — enforced by `@@unique([shopId, productId])`. There is no separate Item table. Full definition: `prisma/schema.prisma:83-152`. Domain type: `modules/scanner/domain/scan-history.ts:50-92`.

Fields that matter to the stock system:

| Column | Type | Meaning / trap |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `shopId` | `String` → `Shop`, `onDelete: Restrict` | Tenant key. |
| `productId` | `String` | Shopify GID `gid://shopify/Product/123`. |
| **`itemCategory`** | `String?` | **The furniture type.** One of `ITEM_CATEGORIES` or the sentinel `"unknown"`. This is the intention's `item_type`. Indexed: `@@index([shopId, itemCategory])`. |
| **`itemType`** | `String` | **NOT a furniture type.** The identifier kind used at scan time: `product_id` (1090 rows), `handle` (16), `sku` (1). Indexed but semantically useless here. |
| **`latestLocation`** | `String?` | **The item's current location.** Free-text mirror of the Shopify `app.item_location` metafield. `null` for items that never had a location (77 rows in dev). Indexed: `@@index([shopId, latestLocation])`. |
| **`quantity`** | `Int @default(1)` | Units represented by this row. **Frequently > 1** (see §8). |
| **`isSold`** | `Boolean @default(false)` | Eligibility flag. Indexed: `@@index([shopId, isSold, lastModifiedAt])`. |
| **`properties`** | `Json?` | Flat `Record<string,string>` bag. `null` when empty. Never queryable in SQL (§12.1). |
| `restockedAt` | `DateTime?` | Set when a sold item is returned to store. |
| `lastModifiedAt` | `DateTime` | For sold items this is read as the *sold* timestamp by stats; post-sale moves deliberately do not touch it (`scan-history.repository.ts:697-703`). |
| `logisticLocationId` | `String?` → `LogisticLocation` | Post-sale staging zone. **Different vocabulary from `latestLocation`** (§5). |
| `orderId`, `orderNumber`, `intention`, `fixItem`, `isItemFixed`, `logisticsCompletedAt` | | Post-sale logistics; irrelevant to in-store stock except as signals that the item is sold. |

Child tables: `ScanHistoryEvent` (location/sold event log, `location: String` per event) and `ScanHistoryPrice`.

**Dev-database reality** (`prisma/dev.db`, 1107 rows, 1 shop):

- 518 unsold / 589 sold.
- Locations: `H1` 99, `LC1` 90, `H2` 83, *(empty/null)* 77, `K2` 52, `H3` 50, `O1` 47, … ~40 distinct.
- Categories: `Dining Chairs` 301, `Dining Tables` 197, `Side Tables` 114, `Sideboards` 77, … `unknown` 9.
- Largest unsold location+category buckets: `LC1`+`Dining Chairs` = 58 rows / **221 units**; `H1`+`Side Tables` = 23 rows / 25 units; `H1`+`Dining Chairs` = 17 rows / **80 units**.

So a full-inventory reconciliation scan is ~518 rows today — trivially small. **A naive "load all eligible items into memory and match" reconciliation is entirely viable at this data size** and avoids the SQLite JSON-query problem completely. Say so in the plan rather than building a query optimiser.

---

## 5. Locations: three separate vocabularies

There is no `Location` table for shop locations. "Location" means different things in three places:

| Vocabulary | Storage | Values seen | Used for |
|---|---|---|---|
| **Item location** (`ScanHistory.latestLocation`) | free-text string, mirrored from the Shopify product metafield `app.item_location` (`env.SHOPIFY_METAFIELD_NAMESPACE` / `SHOPIFY_METAFIELD_KEY`) | `H1`, `H2`, `H3`, `LC0`…`LC13`, `R11`…`R35`, `K1`, `K2`, `O1`, `O2`, `E11`, `E12`, `E21`, plus `UNKNOWN_POSITION` and `SOLD_ORDER:<id>` sentinels in the *event* log | **This is the location the stock system counts against.** |
| **Floor-plan zone** (`StoreZone.label`) | DB table, per shop, with geometry | same labels (`LC1`, `H1`, `R21`, …), 27 rows | Floor-plan UI only. Not authoritative for item location. |
| **Logistic location** (`LogisticLocation.location`) | DB table, per shop, typed `for_delivery | for_pickup | for_fixing` | `DI1`, `DL1`…`DL4`, `DT1`, `DT2`, `ZP`, `ZIO`, `Lc11` | Post-sale staging for sold items only. |

**The authoritative list of valid item locations is not in the database.** It is the `choices` validation of the Shopify metafield definition, fetched live: `shopifyAdminApi.getMetafieldOptions` (`modules/shopify/integrations/shopify-admin-api.integration.ts:1412-1470`), surfaced by `getMetafieldOptionsQuery` and included in the bootstrap payload (`modules/bootstrap/queries/build-bootstrap-payload.query.ts`). Admin-only mutations exist to set/append/remove options.

Consequences for `LocationStock.location`:
- Validating it against a closed enum requires a **Shopify Admin API call** (network, per-shop access token) — no local source of truth.
- Not validating it means a typo silently creates a stock definition that never matches anything.
- See §18.3.

**Location string format details:**
- Locations can carry a level suffix: `"H1:2"`. `stats-items.repository.ts:49-79` implements the matching rules — a bare `"H1"` query matches `"H1"` *and* `"H1:N"`; `"H1:1"` matches `"H1:1"` and bare `"H1"`; `"H1:2"` matches exactly. No such suffixed values exist in the current dev data, but the read path supports them.
- `"UNKNOWN_POSITION"` is a sentinel meaning "no known position"; `stats-items.repository.ts:52-58` treats it as equivalent to `latestLocation = null`.
- `"SOLD_ORDER:<orderId>"` is written as a `ScanHistoryEvent.location` for `sold_terminal` events. **It also leaks into `latestLocation` in real data** — 2 rows in `prisma/dev.db` currently have `latestLocation = "SOLD_ORDER:…"`, both `isSold = 1`. This is a known historical defect: `scripts/correct-scan-history-data.ts` has a dedicated "Phase 5 — Fix SOLD_ORDER: latestLocation" (`:892-925`) that rewrites them to the last real location, and its header attributes the cause to a `products/update` webhook rewriting `latestLocation` after a sale. **The stock system must not assume `latestLocation` is always a real shop location.** In practice the `isSold` eligibility filter excludes these rows anyway.
- Level suffixes are real in historical data: `ScanHistoryEvent.location` contains `"H1:1"`. No current `latestLocation` carries one, but the format is live in the system.
- Normalisation is `trim()`-then-empty-to-null (`normalizeLocation`, `scan-history.repository.ts:79-82`). There is **no case normalisation** anywhere (note `Lc11` vs `LC1` in the logistic table).

---

## 6. Item type = `itemCategory` = `ITEM_CATEGORIES`

`src/shared/category/item-categories.ts` holds the closed vocabulary:

```ts
export const ITEM_CATEGORIES = [
  "Dining Chairs", "Easy Chairs", "Armchairs", "Sofas", "Stools",
  "Seating Benches", "Serving Trolleys", "Dining Tables", "Bedside Tables",
  "Coffee Tables", "Side Tables", "Hall Tables", "Writing Desks",
  "Nest Of Tables", "Sideboards", "Highboards", "Bookshelves",
  "Shelving Units", "Chest of Drawers", "Secretary Cabinets", "Bar Cabinets",
  "Wardrobes", "Storage Cabinets", "Posters", "Mirrors", "Porcelain",
  "Carpets", "Lamps",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export const UNKNOWN_ITEM_CATEGORY = "unknown";
```

- These are Shopify `productType` strings stored verbatim; they are both the persisted value and the UI label. The file's own header warns that renaming one is a data migration because the string is the stats aggregation key.
- Resolution: `categoryResolverService.resolve(productType, title)` — `matchItemCategory` on `productType` first (tolerant of casing/plural via `lookupKey`), falling back to substring parsing of the title against `CATEGORY_DICTIONARY`, else `"unknown"`. Files: `shared/category/{item-categories,category-dictionary,category-parser.service,category-resolver.service}.ts`.
- Note the vocabulary is **plural** (`"Dining Chairs"`), while the intention writes `Dining Chair`. Cosmetic, but a zod enum must use the exact strings.
- `"unknown"` is a real, reachable value (9 rows in dev). Whether a `LocationStock` may be configured for `"unknown"`, and whether `unknown` items are eligible for allocation, is undecided (§18.5).
- `isSeatingCategory(itemCategory)` (`item-categories.ts:87-88`) — matches any category containing "chair"; used to infer quantity from titles like "set of 4".

**Reuse for `LocationStock.item_type`:** a zod enum built from `ITEM_CATEGORIES` is the direct analogue. `z.enum(ITEM_CATEGORIES)` works with the `as const` tuple.

---

## 7. Item properties

### 7.1 Shape

`ScanHistory.properties: Json?`, domain type `Record<string, unknown> | null`, in practice always a flat `Record<string, string>`.

The write contract enforces flatness: `properties: z.record(z.string(), z.string().trim().min(1)).optional()` (`modules/scanner/contracts/scan-history.contract.ts:158`).

Caps (`shared/item-properties/item-properties.ts`): `MAX_PROPERTY_KEYS = 100`, `MAX_PROPERTY_VALUE_LENGTH = 500`, applied by `capProperties` deterministically (sorted by key).

### 7.2 Sources and merge rules

`itemPropertiesResolver.resolve({ metafieldProperties, articleNumber })` (`shared/item-properties/item-properties-resolver.service.ts`) is the **single producer** of a write-ready properties bag:

- **Shopify metafields** in namespace `custom` only (`PROPERTY_METAFIELD_NAMESPACES`), minus column-backed keys (`PROMOTED_METAFIELDS`: item_location, totalheight, totalwidth, totaldepth, quantity) and minus a hand-maintained exclusion set (`location`, `height_dimension`, `width_dimension`, `depth_dimension`, `damage_details`, `link`, `reserved`). See `modules/shopify/domain/shopify-metafield-properties.ts`.
- **Beyo Vintage purchase API** attributes, looked up by barcode (article number), with a per-process TTL cache. Optional — skipped when unconfigured or down.
- **Shopify wins every key collision.** Purchase-API attributes fill in around them.
- Returning `null` means "not fetched — leave the stored value alone".

### 7.3 Write semantics — replacement, never merge

`resolvePropertiesForCreate` / `resolvePropertiesReplacement` / `toPropertiesUpdateValue` (`scan-history.repository.ts:156-191`):

- `undefined` / `null` → caller doesn't know the truth → **leave stored value untouched**.
- `{...}` → the complete authoritative set → **replace**.
- `{}` → authoritative and empty → **clear the column to `Prisma.JsonNull`** (so readers keep seeing `null`).

`normalizeIncomingProperties` (`:106-127`) drops non-string values and trims keys/values, dropping empties. `normalizeStoredProperties` (`:129-154`) is the read-side guard.

**This means an item's property bag can change on any product sync** — a metafield edit in Shopify rewrites it via the `products/update` webhook. An item can therefore move between `LocationStock` instances **without its location changing**. §10 and §18.7.

### 7.4 What the real values look like

Key frequency across the 1107 dev rows:

```
price_st 1081 | years 1060 | weight_definition 1060 | detailed_condition 1056
damage_details 1056 | wood_type 1044 | country 1044 | extensions_quantity 965
manufacturer 502 | link 382 | seatheightchairs 360 | designer 269
extension_dimension 163 | compare_at_price 124 | extension_type 110
extension_quantity 109 | shape 66 | magazine_shelf 40 | material_type 32
dimensionss 27 | door_type 24 | upholstery 13 | parts 10 | drawers_qty 7
unit_type 6 | reserved 4 | height_2 2 | set_count 1 | drawer_units 1
```

Value samples:

| Key | Values (count) |
|---|---|
| `wood_type` | `Teak` 390, `Oak` 111, **`Teak, Beech` 108**, `Santos Rosewood` 107, `Walnut` 74, `Teak, Oak` 61, `Teak, Walnut` 55, `Mahogany` 46, `Beech` 43, `Walnut, Beech` 7, **`Walnut, Teak` 3**, `Santos Rosewood, Mahogany` 3, … |
| `upholstery` | `Up & Down` 9, `Down` 4 |
| `shape` | `Rectangular` 26, `Oval` 25, `Round` 13, `Square` 1, `Oval/Rectangular` 1 |
| `extension_type` | `Outside Extension` 70, `Inside Extension` 40 |
| `material_type` | `Teak` 23, `Walnut` 4, **`Teak,Walnut` 2** (no space), `Oak` 2, `Oak,Pine` 1 |
| `designer` | `Erik Buch` 45, `Kai Kristiansen` 17, … (long tail, free text) |

Three facts the matching algorithm must confront:

1. **Values are title-cased** (`"Teak"`, `"Up & Down"`), not lowercase as the intention's examples suggest.
2. **Multi-valued items are encoded as one comma-joined string.** This is deliberate: `projectMetafieldValue` flattens Shopify `list.*` metafields with `", "` (`shopify-metafield-properties.ts:104-127`), and the purchase API sends its own multi-values the same way — the comment there says the uniform string keeps `LIKE %value%` search working. Separator spacing is inconsistent (`"Teak, Beech"` vs `"Teak,Walnut"`) and **member order is not canonical** (`"Teak, Walnut"` and `"Walnut, Teak"` both occur).
3. **`upholstery` in the intention's examples takes values `up` / `down`; the real column holds `Up & Down` and `Down`.** The intention's worked examples are illustrative, not literal data.

None of the existing code compares property values for equality except `sameStringRecord` (exact whole-string equality, used only to decide whether a write is needed, `scan-history.repository.ts:193-205`). **There is no existing property-matching semantic to reuse — the stock system defines it from scratch.** Resolved in §0.5.

### 7.5 Complete distinct values for the candidate criterion keys

Source material for authoring the hard-coded property-options map (§0.4). These are the **full** distinct sets in `prisma/dev.db` as of 2026-09-01, not samples. Tokens after splitting on `,` `/` `&` are shown where they differ from the raw values.

**`wood_type`** — 37 distinct raw values, all combinations of 9 atomic woods:
`Beech`, `Birch`, `Cherry`, `Elm`, `Mahogany`, `Oak`, `Santos Rosewood`, `Teak`, `Walnut`.
Raw values run from `Teak` through `Santos Rosewood, Mahogany, Teak, Oak, Beech` (five members). Note `Teak, Santos Rosewood` and `Santos Rosewood, Beech` both occur — confirming member order is not canonical.

**`shape`** — `Oval`, `Oval/Rectangular`, `Rectangular`, `Round`, `Square` → atomic: `Oval`, `Rectangular`, `Round`, `Square`. **`/` must be a separator** or `Oval/Rectangular` matches nothing.

**`upholstery`** — `Down`, `Up & Down` → atomic: `Up`, `Down`. **`&` must be a separator**; `Up` exists only inside `Up & Down`.

**`extension_type`** — `Inside Extension`, `Outside Extension`. Two-word values; no separators, no collisions between them.

**`material_type`** — `Oak`, `Oak,Pine`, `Teak`, `Teak,Walnut`, `Walnut` → atomic: `Oak`, `Pine`, `Teak`, `Walnut`. Note the missing space after the comma.

**`door_type`** — `Opening doors`, `Sliding doors`. Lowercase second word; casing is not consistent across keys.

**`unit_type`** — `Pair`, `Single`.

**`weight_definition`** — `1-20 kg`, `21-40 kg`, `41-60 kg`, `61+ kg`. **Contains `-` inside the value** — `-` must not be a separator.

**`detailed_condition`** — three long prose sentences beginning `Excellent - …`, `Good - …`, `Very Good - …`. Recommended for exclusion from the map (§0.4): the values are sentences, and `Good` is a substring of `Very Good - …`.

Keys with free-text or numeric values, all recommended for exclusion: `price_st`, `compare_at_price`, `years`, `manufacturer` (502 rows, free text), `designer` (269 distinct-ish free text), `country`, `link`, `damage_details`, `extension_dimension`, `dimensionss`, `seatheightchairs`, `height_2`, `parts`, `drawers_qty`, `set_count`, `drawer_units`, `extensions_quantity`, `extension_quantity`, `magazine_shelf`, `reserved`.

---

## 8. Quantity semantics

`ScanHistory.quantity: Int @default(1)` is the number of physical units the row represents (a "set of 4 dining chairs" is one row with `quantity = 4`).

Distribution in dev: `1`×792, `2`×52, `3`×1, `4`×142, `5`×5, `6`×99, `7`×1, `8`×12, `10`×3. **28% of rows have quantity > 1.**

Where it comes from — `resolveQuantity` (`shopify-admin-api.integration.ts:351-368`):
1. the `custom.quantity` metafield, if a positive integer;
2. else, for seating categories only, a "set of N" pattern parsed from the title;
3. else `1`.

Where it is normalised — `normalizeQuantity` (`scan-history.repository.ts:23-28`): anything non-integer or `< 1` becomes `1`. **Quantity is never zero and never negative on an item.**

Where it changes:
- Every `appendLocationEvent` write sets `quantity` from the freshly fetched product.
- `syncProductSnapshotIfHistoryExists` updates it for unsold items on `products/update`.
- `syncSoldQuantityIfHistoryExists` updates it for **sold** items on `products/update`, adjusting daily stats by the delta.

Consequence: **an item's quantity can change while it sits in a location**, without any location or sold transition. Incremental stock counters will drift unless that path is also hooked or reconciliation is triggered. §18.7.

---

## 9. The sold-state lifecycle

All `isSold` writes live in exactly one file: `modules/scanner/repositories/scan-history.repository.ts`.

### 9.1 `false → true`

Only inside **`appendSoldTerminalEventWithFallback`** (`:831-1342`):

- Row create with `isSold: true` (`:994`) when no history exists.
- Row update to `isSold: true` at `:1133` (already-terminal-for-location branch) and `:1172` (main branch).
- Also `appendLocationEvent` creates with `isSold: eventType === "sold_terminal"` (`:569`) and updates to `true` when `eventType === "sold_terminal"` (`:695-700`) — but no caller passes that event type to `appendLocationEvent` today.

Callers of `appendSoldTerminalEventWithFallback`:
- `modules/shopify/commands/handle-orders-paid-webhook.command.ts:149`
- `modules/shopify/commands/handle-orders-create-webhook.command.ts:171`

Both run inside the **webhook worker process** via `process-shopify-webhook-intake.job.ts`. Both pass `unknownLocation: "UNKNOWN_POSITION"` and `soldLocation: "SOLD_ORDER:<orderId>"`.

**Crucially: the sold path never changes `latestLocation`.** The sold event is appended to `ScanHistoryEvent` with `location = "SOLD_ORDER:..."`, but the row's `latestLocation` keeps the shop location the item was standing in. So at the moment of sale, the item's current location is still available on the row — which is exactly what "remove it from the stock instance for its current location" needs.

Idempotency guards already present in that method:
- an existing `sold_terminal` event with the same `orderId` short-circuits the whole thing (`:1063-1086`);
- an existing `sold_terminal` event for the same `soldLocation` since `restockedAt` takes a reduced update branch (`:1103-1156`) — **this branch still sets `isSold: true`**, so a hook placed naively there could double-decrement.

### 9.2 `true → false`

Only via `appendLocationEvent` with `eventType: "returned_to_store"` (`:695-700`, plus the lifecycle reset at `:706-722` which clears order/logistics fields and sets `restockedAt`). Reached from:

`shopifyController.updateLocation*` → `updateItemLocationCommand({ payload: { returnToStore: true } })` (`update-item-location.command.ts:53-70` validates that the item is currently sold) → `appendLocationEvent({ eventType: "returned_to_store" })` (`:131`).

This runs in the **API process**. So the inverse transition the intention asks about (§12 of the intention) already exists and is user-triggered from the scanner UI.

### 9.3 Sold items and location

A sold item can still be moved: `updateItemLocationCommand` logs a "Post-sale shop location move" (`:172-179`) and `appendLocationEvent` will update `latestLocation` for a sold row. Also, sold items get a `logisticLocationId` in the separate logistic-zone vocabulary. **A sold item therefore still has a `latestLocation` — eligibility must be decided by `isSold`, not by absence of a location.**

---

## 10. Every path that changes an item's location, quantity, category or properties

This is the complete integration surface. The intention names only the first row.

| # | Entry point | Process | What it changes | Reaches |
|---|---|---|---|---|
| 1 | `PATCH/POST /shopify/items/location` and `PATCH /shopify/products/:productId/location` → `shopifyController.updateLocation*` → **`updateItemLocationCommand`** (`modules/shopify/commands/update-item-location.command.ts`) | API | location, quantity, properties, category, isSold (on `returnToStore`) | `appendLocationEvent` |
| 2 | `PATCH /api/manager-app/...` → `updateManagerAppItemsLocationCommand` (`modules/external-api/commands/update-manager-app-items-location.command.ts:189-234`) | API | **for unsold items, delegates to `updateItemLocationCommand`** (so hooking #1 covers it); for sold items it goes to `markLogisticPlacementCommand` instead | via #1 |
| 3 | Shopify `products/update` webhook → `processProductsUpdateWebhookJob` (`modules/shopify/jobs/process-products-update-webhook.job.ts:145` and `:201`) | **Worker** | location (create + move), quantity, properties, category, title, dimensions | `appendLocationEvent`, `syncProductSnapshotIfHistoryExists`, `syncSoldQuantityIfHistoryExists` |
| 4 | Shopify `orders/paid` webhook → `handleOrdersPaidWebhookCommand:149` | **Worker** | `isSold → true` | `appendSoldTerminalEventWithFallback` |
| 5 | Shopify `orders/create` webhook → `handleOrdersCreateWebhookCommand:171` | **Worker** | `isSold → true` | `appendSoldTerminalEventWithFallback` |
| 6 | Maintenance scripts (`scripts/reconcile-active-sold-items.ts`, `scripts/correct-scan-history-data.ts`, `scripts/backfill-item-properties.ts`, `scripts/migrate-item-category-vocabulary.ts`) | CLI (`tsx`) | everything | direct Prisma and/or repository calls |

### 10.1 Anatomy of integration point #1

`updateItemLocationCommand` (`modules/shopify/commands/update-item-location.command.ts`), in order:

1. Load shop + access token; 404 if unlinked (`:44-51`).
2. If `returnToStore`, load existing history and reject if not sold (`:53-70`).
3. `shopifyAdminApi.getProductWithLocation(...)` → **`before`** (`:72-77`); prefetch purchase-API attributes by barcode (`:82`).
4. If `before.location !== payload.location`, call `shopifyAdminApi.updateProductLocation(...)` — **the Shopify metafield is written before the DB** (`:88-108`).
5. Re-fetch → **`after`**, this time `includeMetafieldProperties: true` (`:110-115`).
6. `itemPropertiesResolver.resolve(...)` → the authoritative property bag (`:124-127`).
7. **`scanHistoryRepository.appendLocationEvent({...})`** with `location: after.location ?? payload.location` (`:131-152`) → returns the full `ScanHistoryRecord`.
8. Logging branches for return-to-store / post-sale move (`:161-179`).
9. Returns `{ product: {...previousLocation: before.location}, historyItem }`.

Observations for placing the hook:

- The command **knows `before.location`** (from Shopify) and the resulting `historyItem` (with `latestLocation`, `quantity`, `properties`, `itemCategory`, `isSold`). It does **not** read the pre-move DB `latestLocation` except on the `returnToStore` branch. Shopify's `before.location` and the DB's `latestLocation` can diverge (they are synced, but a failed earlier write or an out-of-band metafield edit breaks the tie).
- The command has no transaction of its own; the transaction lives inside `appendLocationEvent`.
- Batch calls run **concurrently** via `Promise.all` in the controller (`shopify.controller.ts:254`).

### 10.2 Anatomy of `appendLocationEvent` (the transactional core)

`modules/scanner/repositories/scan-history.repository.ts:494-829`. Everything happens inside one `prisma.$transaction(async (tx) => {...})`:

- Normalises inputs; throws if location is empty (`:497-512`).
- **No existing row** → creates `ScanHistory` + first `ScanHistoryEvent`; increments `LocationStatsDaily.itemsReceived` for `location_update`; sets `didAppendLocationEvent = true` (`:533-629`).
- **Existing row**:
  - rejects `returned_to_store` on an unsold item (`:637-641`);
  - **short-circuits and returns unchanged when the normalised location equals `existing.latestLocation` and it is not a return-to-store** (`:645-670`) — `didAppendLocationEvent` stays `false`, **no event, no broadcast**. This is the built-in "same location = no-op" guard the intention refers to;
  - otherwise updates the row (location, snapshot fields, quantity, properties, isSold per §9), appends a `ScanHistoryEvent`, increments `LocationStatsDaily.itemsReceived`, appends a price point if changed (`:672-781`).
- After the transaction commits, and only if `didAppendLocationEvent`, it calls `broadcastToShop(shopId, { type: "scan_history_updated", productId })` (`:820-827`).

**This is the only place in the system where an item's location actually changes, and it already owns a transaction, a change/no-change flag, and the post-commit broadcast.** It is also called by the worker process (path #3). Whether the stock hook belongs here (covers everything, but puts stock logic in the scanner repository and inside a transaction that also touches stats) or in `updateItemLocationCommand` (as the intention says, but misses path #3) is the single biggest structural decision in this feature. §18.7.

### 10.3 The `LocationStatsDaily` precedent

`LocationStatsDaily` / `LocationCategoryStatsDaily` / `SalesChannelStatsDaily` are **already** incrementally maintained derived counters, mutated with `upsert({ create, update: { field: { increment: n } } })` inside the same transaction as the item write. See `scan-history.repository.ts:601-624`, `:744-770`, `:1229-1290`, `:1567-1700`.

They are the closest existing analogue to `LocationStock.quantity` and they establish:
- the `upsert` + `increment` idiom,
- that derived counters live in the same transaction as the item mutation,
- that drift is repaired by **out-of-band scripts**, not a scheduled job (`scripts/correct-scan-history-data.ts`, `scripts/reconcile-active-sold-items.ts`).

They differ in one important way: they are **append-only day buckets**, never decremented on a move-out, and they have no invariant to violate. `LocationStock.quantity` is a live balance with a "never negative" invariant, so `{ decrement: n }` alone is unsafe (Prisma/SQLite will happily write `-3`). §18.8.

---

## 11. Events and realtime

### 11.1 The event union

`modules/ws/ws-broadcaster.ts:6-33` — one discriminated union, hand-maintained:

```ts
export type WsOutboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  | { type: "logistic_intention_set"; scanHistoryId; orderId; intention }
  | { type: "logistic_item_placed"; scanHistoryId; orderId; logisticLocationId }
  | { type: "logistic_item_fulfilled"; scanHistoryId; orderId }
  | { type: "logistic_items_updated"; itemIds: string[]; orderId }
  | { type: "logistic_batch_notification"; count; itemIds; message }
  | { type: "session_invalidated" };
```

The frontend mirrors it **by hand** in `apps/frontend/src/core/ws-client/ws-events.ts` (`WsInboundEvent`). Adding a stock event means editing both files; nothing enforces they stay in sync. **V1 adds no event — see §0.9.**

Payloads are deliberately thin — mostly IDs. Consumers refetch. `scan_history_updated` carries only `productId`.

### 11.2 Emission

```ts
broadcastToShop(shopId, event, targetRoles?: UserRole[])   // ws-broadcaster.ts:57
broadcastToUser(shopId, userId, event)                     // ws-broadcaster.ts:36
```

`targetRoles` filters the in-memory registry by the connection's role — used heavily by the logistic module to route work between `seller` / `worker` / `manager` (`mark-logistic-placement.command.ts:99-146`).

Emission points are **after the transaction commits**, guarded by a "did anything actually change" flag. `appendLocationEvent:820`, `appendSoldTerminalEventWithFallback:1336`, `syncProductSnapshotIfHistoryExists:1400`, `syncSoldQuantityIfHistoryExists:1522`. This matches the intention's "no events for no-ops" requirement — the pattern already exists, copy it.

### 11.3 Cross-process emission

Worker processes have an empty in-memory WS registry. They publish to Redis instead:

- `createWsBroadcastPublisher()` → `client.publish("iss:ws:broadcast", JSON.stringify({ shopId, event, targetRoles }))` (`shared/queue/ws-bridge.ts:17-40`).
- The API server subscribes and re-broadcasts locally (`server.ts:159-168`).
- Job processors receive `broadcast` as an **injected function** so they stay process-agnostic — see the comment at `process-products-update-webhook.job.ts:56-58` and its signature `(intake, broadcast) => ...`.

**Any stock event emitted from a webhook-driven path must go through the injected/publisher route, not `broadcastToShop`.**

### 11.4 Connection lifecycle

`modules/ws/ws-server.ts` — single `WS_PATH = "/ws"`, origin-checked upgrade, `waitForAuth(ws)` expects a `{ type: "auth", token }` message, then `registerConnection(shopId, ws, role, userId)`, then `{ type: "authenticated", shopId }`, then 30s ping/pong. Presence is mirrored into Redis (`iss:ws:online:<shopId>`) for push-notification fallback.

---

## 12. Persistence constraints (SQLite + Prisma)

### 12.1 JSON is opaque

`datasource db { provider = "sqlite" }`. On SQLite, Prisma does **not** support JSON filters (`path`, `string_contains`, `array_contains`). There are **zero** `$queryRaw` JSON expressions in the codebase (the only raw SQL is three `PRAGMA` statements in `shared/database/sqlite-runtime.ts` and two `Prisma.sql` identifier-column selects in `update-manager-app-items-location.command.ts:70-90`).

So property matching **must** be done in application memory over rows fetched by the indexed columns (`shopId`, `latestLocation`, `itemCategory`, `isSold`). At ~518 eligible rows this is a non-issue. If it ever matters, `json_extract` via `$queryRawUnsafe` is available at the SQLite level (verified working against `prisma/dev.db`) but would be the first such usage in the codebase.

The intention's word "JSONB" should be read as "Prisma `Json?` column", matching `ScanHistory.properties`.

### 12.2 Enums are TEXT

Prisma enums exist in the schema (`UserRole`, `LogisticZoneType`, …) and generate TS union types, but SQLite stores them as `TEXT` — see the migration `CREATE TABLE "LogisticLocation" (... "zoneType" TEXT NOT NULL ...)`. Domain code declares the union twice: once as a Prisma enum, once as a hand-written TS union in `domain/*.ts` (e.g. `LogisticZoneType` in both `schema.prisma` and `modules/logistic/domain/logistic.domain.ts:7`), plus a third time as a zod enum in `contracts/*.contract.ts:16-20`. That triplication is the established (if redundant) convention for a new `stock_state` enum.

### 12.3 Migrations

- Workflow: `npm run prisma:migrate:dev -- --name <change-name>` locally, `npm run prisma:migrate:deploy` on deploy (`docs/DATABASE.md`).
- Migrations are timestamped folders under `prisma/migrations/` with a single `migration.sql`. Naming convention is `snake_case` verbs: `add_logistic_management`, `add_outbound_webhook_targets`, `add_properties_and_description`.
- Every schema change **must** be committed as a migration.
- Note: SQLite table alterations that change constraints cause Prisma to emit a full `RedefineTables` block (drop/recreate/copy) — visible in `20260415040930_add_logistic_management/migration.sql`. Adding a new table with FKs is clean; altering `ScanHistory` is not.

### 12.4 Concurrency and transactions

- `prisma.$transaction(async (tx) => {...})` interactive transactions are the norm for multi-write operations. Default timeout (5s) is used everywhere — nothing overrides `maxWait`/`timeout`.
- SQLite is a **single-writer** database. WAL mode is on (`sqlite-runtime.ts:12`), so readers don't block the writer, but two concurrent write transactions contend.
- `SQLITE_BUSY` and `SQLITE_LOCKED` are already classified as transient/retryable in the webhook worker (`workers/webhook-worker.ts:15-26`), which retries the whole job.
- The API server has **no** such retry — a busy-timeout collision inside an HTTP request surfaces as a 500.
- Real concurrency sources for stock: batched location updates via `Promise.all` (`shopify.controller.ts:254`), API server vs. webhook worker writing simultaneously, and the manager-app external API.

**Implication for the intention's "lightweight locking":** a row-level lock (`SELECT … FOR UPDATE`) does not exist in SQLite. The practical options are (a) rely on the enclosing write transaction plus a read-modify-write with an explicit non-negative guard, (b) a conditional `updateMany({ where: { id, quantity: { gte: n } }, data: { quantity: { decrement: n } } })` and check `count`, or (c) an in-process mutex/serialised queue keyed by stock id — which is only correct because there is exactly one API writer process today. §18.8.

### 12.5 Cascades

Owning relations use `onDelete: Cascade` (`ScanHistoryEvent`, `ScanHistoryLogistic`, `RefreshToken`, `StoreZone`→`Shop`). `ScanHistory.shopId` uses `Restrict` deliberately (`20260409113000_preserve_scan_history_on_shop_unlink`). `LocationStock` → `StockThresholdsLocation` ownership maps cleanly onto `onDelete: Cascade`, matching the intention's "deleting a LocationStock removes its thresholds".

---

## 13. Reference implementations to copy

| Need | Copy from |
|---|---|
| Table + zod contract + CRUD repository + commands + controller + routes | `src/modules/zones/**` (6 files, ~350 lines total) |
| Multi-entity module with domain rules, services, events, role routing | `src/modules/logistic/**` |
| Batch create/update in one request | `zones.controller.ts:74-81` + `zone.repository.ts:112-152` (`batchUpdate` validates all ids exist, then `prisma.$transaction([...])` of updates) |
| Full-replacement child collection | *(none exists — thresholds-as-full-replacement is new)* nearest is `reorder`/`batchUpdate` in `zone.repository.ts` |
| Derived counter maintained incrementally in the item transaction | `LocationStatsDaily` upserts in `scan-history.repository.ts:601-624` |
| Post-commit conditional broadcast | `scan-history.repository.ts:508 / 628 / 783 / 820-827` (`didAppendLocationEvent` flag) |
| Read query with filters + in-memory sort + pagination | `modules/stats/repositories/stats-items.repository.ts` (see `APP_SORT_MAX` comment at `:14-23` — explicit "sort in app memory for derived columns" precedent) |
| Aggregation endpoint returning `{ data }` | `modules/stats/controllers/stats.controller.ts` |
| Maintenance/repair script | `scripts/reconcile-active-sold-items.ts` (env-driven `DRY_RUN`, `SHOP_ID`, imports `src/` directly, run with `tsx`) |

Note: `modules/stats/queries/*.query.ts` are mostly 3-line `throw new Error("Not implemented")` stubs — the real stats logic lives in `modules/stats/repositories/stats.repository.ts` and the controllers call the repository directly. Do not take the stats module's query layer as the convention; take `zones`/`logistic`.

---

## 14. Existing read/settings surfaces

- Bootstrap: `GET /bootstrap` → `{ payload: { shopify: { metafields }, logisticLocations, vapidPublicKey } }` (`modules/bootstrap/`). This is what the frontend loads at startup. If stock configuration needs to be available app-wide at boot, this is where it would go — but it is currently a small, hot payload and the intention's read endpoints are page-scoped, so probably not.
- Zones settings: `GET/POST/PUT/PATCH/DELETE /zones` (+ `/batch`, `/reorder`).
- Logistic locations settings: `GET /logistic/get-location`, `PUT /logistic/add-location`, `PATCH /logistic/update-location/:locationId`, `DELETE /logistic/delete-location/:locationId`. Note the verb-in-path naming here; `zones` uses REST nouns. **Both conventions exist**; `zones` is the cleaner precedent for a new settings resource.
- Location options (Shopify metafield choices): `GET /shopify/metafields`, plus admin-only `set`/`append`/`remove`.

The new stock-configuration **options** endpoint (§0.4) has no existing analogue: it returns static code-defined data (`ITEM_CATEGORIES` plus the curated property map) and hits no database. `bootstrap` is the nearest precedent for "static + config payload the form needs", but the stock options belong on the stock router rather than in the hot boot payload.

Frontend features that would consume the new endpoints (for orientation only): `apps/frontend/src/features/locations-settings/`, `location-options/`, `logistic-locations/`, `analytics/`. The frontend API layer is per-feature (`features/<x>/api/*.api.ts`, `controllers/`, `stores/`, `flows/`), and the WS event union must be extended in `apps/frontend/src/core/ws-client/ws-events.ts`.

---

## 15. Testing reality

**There is no test infrastructure.**

- `find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "vitest.config*" -o -name "jest.config*"` → nothing (backend and frontend).
- `apps/backend/package.json` → `"test": "echo \"Error: no test specified\" && exit 1"`.
- No test dependencies installed (`devDependencies` are `@types/*`, `prisma`, `tsx`, `typescript`).
- The only automated check is `npm run typecheck` (`tsc --noEmit`).
- `apps/backend/docs/under_development/FLOOR_PLAN_BACKEND_TEST_FOLLOW_UP_PLAN.md` exists — a prior plan for tests that was not executed.

**Decision: §0.11 — descoped for V1, manual verification.** The remainder of this section is the factual state, retained because it is the argument behind §0.10.

The intention lists 17 categories of required tests. Standing up a test runner (choice of runner, how to get a disposable SQLite DB per run, how to seed items) as an explicit early phase, or explicitly descope it. This is the single largest piece of hidden work in the feature. §18.10.

Pure-domain machinery (normalisation, matching, specificity, state calculation, conflict detection) is trivially unit-testable with no DB — that argues strongly for keeping it in `src/shared/` or `modules/<stock>/domain/` as pure functions with no Prisma imports, which is also what the intention's §21 asks for.

---

## 16. File index — the files the plan will touch or read

**Must read before planning:**

```
prisma/schema.prisma                                              # models, enums, indexes
src/modules/shopify/commands/update-item-location.command.ts      # integration point #1 (named in intention)
src/modules/scanner/repositories/scan-history.repository.ts       # appendLocationEvent :494, sold :831, syncs :1408/:1531
src/modules/shopify/jobs/process-products-update-webhook.job.ts   # integration point #3 (NOT named in intention)
src/modules/shopify/commands/handle-orders-paid-webhook.command.ts:149
src/modules/shopify/commands/handle-orders-create-webhook.command.ts:171
src/modules/ws/ws-broadcaster.ts                                  # event union
src/modules/ws/ws-server.ts                                       # named in intention; connection lifecycle only
src/shared/queue/ws-bridge.ts                                     # cross-process events
src/server.ts                                                     # router registration (twice!)
src/shared/category/item-categories.ts                            # the real "item type" vocabulary
src/shared/item-properties/item-properties.ts                     # property caps + type
src/modules/shopify/domain/shopify-metafield-properties.ts        # how property values are shaped
```

**New files this feature introduces (not yet existing):**

```
src/shared/item-properties/item-property-options.ts    # §0.4 curated key→values map; `as const`, feeds
                                                       # the options endpoint, criteria validation, matching
src/modules/<stock>/domain/                            # pure: tokenize, match, specificity, state, conflicts
src/modules/<stock>/{contracts,repositories,commands,queries,services,controllers,routes}/
prisma/migrations/<ts>_add_location_stock/migration.sql
```

**Convention references:**

```
.github/instructions/backend-contracts.instructions.md            # the declared architecture contract — read in full
src/modules/zones/**                                              # CRUD module template
src/modules/logistic/**                                           # domain + events template
src/shared/errors/http-errors.ts, src/shared/http/error-middleware.ts
src/modules/auth/middleware/{authenticate-user,require-shop-link,require-admin}.middleware.ts
src/shared/database/{prisma-client,sqlite-runtime}.ts
src/shared/utils/date.ts
prisma/migrations/20260422090000_add_outbound_webhook_targets/migration.sql   # new-table migration shape
docs/DATABASE.md, docs/guides/BACKEND_WORKERS_GUIDE.md
```

---

## 17. Vocabulary mapping: intention → this codebase

| Intention term | Reality in this codebase | Notes |
|---|---|---|
| `LocationStock.location` (`L1`, `L2`) | `ScanHistory.latestLocation` free-text string; real values are `H1`, `LC1`, `R21`, `K2`… | No local enum. Authoritative list is a Shopify metafield validation fetched over the network. §5 |
| `item_type` "validated against the existing item-type domain/enum" | **`ScanHistory.itemCategory`**, validated against `ITEM_CATEGORIES` in `shared/category/item-categories.ts` | **`ScanHistory.itemType` is a different, unrelated field** (identifier kind). §6 |
| "Dining Chair", "Dining Table" | `"Dining Chairs"`, `"Dining Tables"` (plural) | Exact strings matter. |
| `properties` JSONB | Prisma `Json?` on SQLite, `Record<string,string>`, values are comma-joined title-case strings | Not queryable in SQL. §7, §12.1 |
| `{ upholstery: "up" }` | real values are `"Up & Down"`, `"Down"` | Examples are illustrative only. §7.4 |
| `isSold: boolean` | `ScanHistory.isSold` ✔ exact match | §9 |
| item `quantity` | `ScanHistory.quantity` ✔, often > 1, changes independently of location | §8 |
| "established system ID convention" | `String @id @default(cuid())` | §3.6 |
| `created_by` / `updated_by` user ID | **does not exist anywhere**; nearest is `userId` FK + denormalised `username` | §3.6, §18.2 |
| "the existing event/realtime system" | `WsOutboundEvent` union + `broadcastToShop` + Redis bridge for workers | §11 |
| "sold-state machinery" at `scan-history.repository.ts` | correct file; specifically `appendSoldTerminalEventWithFallback` (`:831`) for `false→true` and `appendLocationEvent` `returned_to_store` (`:695`) for `true→false` | §9 |
| "the location-transition command" | `updateItemLocationCommand` covers the scanner UI and the manager-app API, **but not the `products/update` webhook** | §10 |
| "ScanHistory with the passed location" | `appendLocationEvent` creates or updates and appends a `ScanHistoryEvent`; it already short-circuits same-location moves | §10.2 |
| "lightweight locking/transaction strategy" | SQLite: single writer, WAL, no row locks, no `SELECT … FOR UPDATE` | §12.4 |

---

## 18. Decision log (all resolved — see §0)

These were the points where the intention was silent or contradicted by the system. **Every one is now closed** — each entry names the §0 decision that resolves it and, where useful, retains the reasoning that led there. Nothing in this section requires a decision from the planner.

**18.1 — Tenancy. ✅ RESOLVED — see §0.2.** `shopId` + `Shop` relation with `onDelete: Cascade` on both new tables, included in every uniqueness constraint, index and query.

**18.2 — Audit fields. ✅ RESOLVED — see §0.3.** Denormalised `createdByUsername` / `updatedByUsername` strings following the `ScanHistory.username` convention. No user-ID FKs. System writers use the `"system:…"` sentinel style.

**18.3 — Location validation and matching. ✅ RESOLVED — see §0.12 and §0.14.** No server-side validation (the frontend presents the valid options); matching is trimmed, case-sensitive string equality with no hierarchical rule, safe because both sides draw from the same Shopify metafield choices.

**18.4 — Property matching semantics. ✅ RESOLVED — see §0.4, §0.5, §0.8, §0.21.** Tokenized set membership; curated whitelist; wildcards require key presence; empty criteria is a valid location-wide catch-all scoring 0.

**18.5 — Eligibility edge cases. ✅ RESOLVED — see §0.16 and §0.22.** All edge cases fall through harmlessly and are allocated to nothing; non-`ACTIVE` Shopify products still count.

**18.6 — Specificity algorithm. ✅ RESOLVED — see §0.13.** Four-component ordered score: constraint weight (exact/multi-value = 2, wildcard = 1), then valued-key count, then total accepted values ascending, then `createdAt` / `id`.

**18.7 — Where the mutation hooks live. ✅ RESOLVED — see §0.7 and §0.10.** Triggers, primitive and before/after sourcing in §0.7; call sites in the command and job layer, after commit, in §0.10.

**18.8 — Concurrency and the non-negative invariant. ✅ RESOLVED — see §0.15.** Guarded conditional `updateMany` with `quantity: { gte: delta }`; on refusal, log at error level with enumerated diagnostic context and continue without clamping or rolling back the parent operation.

**18.9 — Authorisation. ✅ RESOLVED — see §0.18.** Any authenticated, shop-linked user, matching `zones` and `logistic locations`.

**18.10 — Testing. ✅ RESOLVED — see §0.11.** Descoped for V1; manual verification. Domain machinery stays pure and Prisma-free regardless, and the plan should enumerate the manual scenarios per phase.

**18.11 — Reconciliation scope after configuration change. ✅ RESOLVED — see §0.17.** Group-scoped (`shopId` + `location` + `itemCategory`), up to two groups on an update that moves location or item type, run inline; absolute writes, so the §0.15 guard does not apply.

**18.12 — Report contract details. ✅ RESOLVED — see §0.19.** `type` is the configuration's `itemCategory`; compacted `properties` is the configuration's criteria; `out_of_stock` included by default; location-group ranking by `out_of_stock`, then `low_in_stock`, then `medium_in_stock`, then location ascending.

**18.13 — `stock_state` declaration. ✅ RESOLVED — see §0.20.** Prisma enum plus a `STOCK_STATES` `as const` array feeding the TS type and zod; no third hand-written union.

---

## 19. Quick facts sheet

```
DB                sqlite (prisma/dev.db locally; file:/var/lib/item-scanner/data/app.db in prod)
ORM               Prisma 6.19, @prisma/client, interactive $transaction, no raw SQL
Runtime           Node ESM, TypeScript 6, tsx (dev) / tsc build to dist (prod)
HTTP              express 5, zod 4 validation, custom AppError hierarchy
Realtime          ws + in-memory registry, Redis pub/sub bridge for worker → API
Queue             BullMQ + ioredis
IDs               cuid via Prisma @default(cuid())
Timestamps        DateTime @default(now()) / @updatedAt, UTC, startOfUtcDay for buckets
Tenancy           shopId on every user-owned table; req.authUser.shopId after requireShopLinkMiddleware
Item table        ScanHistory, unique (shopId, productId), 1107 rows / 518 unsold in dev
Item type         ScanHistory.itemCategory ∈ ITEM_CATEGORIES ∪ {"unknown"}   (NOT itemType!)
Item location     ScanHistory.latestLocation, free text, nullable
Item eligibility  isSold === false
Item units        ScanHistory.quantity, Int ≥ 1, >1 in 28% of rows
Item properties   ScanHistory.properties: Json? → Record<string,string>, comma-joined values
Property match    tokenize on , / &, lowercase, exact token membership (§0.5) — never substring
Stock tenancy     LocationStock.shopId + Shop FK, cascade (§0.2)
Stock audit       createdByUsername / updatedByUsername strings (§0.3)
Tests             none — no runner, no test files, npm test fails by design
Typecheck         npm run typecheck (tsc --noEmit) — the only automated gate
Routers           registered twice in server.ts: bare and under /api
Response shape    { data } for reads/creates, { ok: true } for deletes
Error shape       { error: { code, message, details?, requestId } }
```
