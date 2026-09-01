Intention — Location Stock System

**Status: RATIFIED**

> **Changelog**
> - 2026-09-01 — System-context review: sections 13 and 22.10 rewritten; both previously required behaviour this codebase cannot provide as written. Twenty-two decisions resolved by the product owner, recorded in `context/context.md` §0 (binding).
> - 2026-09-01 — Mechanism-inventory round: six further decisions ratified by the product owner (David) in session, recorded in §23 below. Ratification surface: six decision cards (canonical criteria form, conflict rule, category-grouped options map, frontend scope, batch atomicity, reconciliation double-pass) plus the measurement ledger in §24. Where §23 disagrees with earlier sections or context §0, **§23 wins**.
> - 2026-09-01 — Status stamped RATIFIED by the product owner (David), confirming the context §0 decisions of the same date as the ratification act.
> - 2026-09-01 — §25 (Review Doctrine) ratified by the product owner: single-reviewer flow (orchestrator model doubles as reviewer; a separate implementer model), findings bounded by ratified artifacts, enumerated non-findings maintained in the master plan §11.
>
> Resolved decisions live in `docs/under_implementation/warehouse_stock/context/context.md` §0 (22 entries) and are **binding**. Where this intention and context §0 disagree, §0 wins. In particular §0 settles: `item_type` means `ScanHistory.itemCategory` (not `ScanHistory.itemType`); the database is SQLite, so "JSONB" means a Prisma `Json?` column that cannot be queried in SQL; property matching semantics; specificity scoring; the non-negative quantity guard; reconciliation scope; and tenancy via `shopId`.

We will implement a Location Stock System.

The purpose of this system is to extend the existing location domain so that users can configure stock definitions for combinations of:

location + item_type + properties

Each configured stock definition represents an independently monitored stock instance with:

- its own matching criteria,
- current quantity,
- stock thresholds,
- and derived stock state.

The system should automatically maintain these quantities as items move between locations or become sold, and provide configuration and reporting APIs for the frontend.

A fundamental domain rule is that an eligible item should belong to the single best-matching LocationStock instance for its current location and item type. More-specific stock definitions take precedence over broader definitions.

This implementation should be developed through a multi-phase plan.

Before implementation, inspect the existing architecture and turn this intention into a concrete phased implementation plan. Reuse established conventions for IDs, database models, transactions, authentication, audit fields, events/realtime communication, item types, locations, and existing item-domain behavior.

Do not silently invent business rules where this intention remains ambiguous. Surface unresolved decisions before implementation.

⸻

1. Domain Model

LocationStock

LocationStock represents one user-configured stock definition.

Fields:

- id — string ID using the established system ID convention.
- location — string representing an existing stock location/zone such as L1, L2, etc.
- item_type — validated against the existing item-type domain/enum.
- quantity — integer representing the quantity currently allocated to this stock instance. May be 0 but must never be negative.
- properties — JSONB object containing property matching criteria.
- stock_state — derived stock-state enum.
- created_at — UTC datetime.
- created_by — user ID.
- updated_at — UTC datetime.
- updated_by — user ID.

Relationship:

A LocationStock owns its StockThresholdsLocation records.

A location may contain any number of LocationStock instances.

For example:

L1 + Dining Chair + {upholstery: null}

and:

L1 + Dining Table + {shape: "round"}

are independent stock instances with independent quantities and thresholds.

⸻

2. Stock Threshold Model

StockThresholdsLocation

Represents one configurable stock-state threshold belonging to a LocationStock.

Fields:

- id — string ID using the established system convention.
- state — stock-state enum.
- threshold_quantity — positive integer.
- stock_location_id — owning LocationStock.
- created_by — user ID.
- created_at — UTC datetime.
- updated_by — user ID.
- updated_at — UTC datetime.

The configurable threshold states are:

- low_in_stock
- medium_in_stock
- normal_in_stock

All three thresholds are mandatory for every LocationStock.

out_of_stock and high_in_stock are derived business states and do not have independently configurable thresholds.

The configured thresholds must satisfy:

low < medium < normal

Invalid, duplicated, contradictory, missing, or unordered threshold configurations must hard-fail validation.

⸻

3. Stock State Domain Rules

Stock states from lowest to highest are:

out_of_stock
low_in_stock
medium_in_stock
normal_in_stock
high_in_stock

Given:

low = 10
medium = 15
normal = 20

the resulting classification is:

- quantity 0 → out_of_stock
- quantity 1–10 → low_in_stock
- quantity 11–15 → medium_in_stock
- quantity 16–20 → normal_in_stock
- quantity >20 → high_in_stock

More formally:

quantity == 0
→ out_of_stock

0 < quantity <= low_threshold
→ low_in_stock

low_threshold < quantity <= medium_threshold
→ medium_in_stock

medium_threshold < quantity <= normal_threshold
→ normal_in_stock

quantity > normal_threshold
→ high_in_stock

This state calculation is a domain rule and should exist in one reusable place.

Any operation that changes either:

- LocationStock.quantity, or
- its threshold configuration

must leave stock_state synchronized with the resulting quantity and thresholds.

stock_state will be persisted even though it is derivable. This is intentional because it is required for querying, sorting, reporting, events, and frontend reactivity.

⸻

4. Property Criteria

LocationStock.properties defines the criteria used to classify items into stock instances.

Properties are represented as a JSON object.

A property criterion can contain:

Specific value

{ "upholstery": "up" }

The item must have upholstery = up.

Multiple accepted values

{ "upholstery": ["up", "down"] }

The item’s upholstery must be one of the supplied values.

The same applies to other properties:

{ "wood": ["teak", "mahogany"] }

The arrays represent sets of accepted values. Their order has no semantic meaning.

Therefore:

["up", "down"]

and:

["down", "up"]

must be normalized and treated as equivalent criteria.

Wildcard value

{ "upholstery": null }

means that any value for upholstery is accepted.

Properties not included in the configuration do not constrain matching.

For example:

{ "upholstery": null }

does not constrain wood, designer, or other item properties.

Property criteria must be normalized centrally so that matching, duplicate/conflict validation, reconciliation, and report aggregation all operate on the same semantics.

⸻

5. Best-Match Allocation

An eligible item should be allocated to one and only one LocationStock instance for its current location and item type.

Stock instances are therefore not independent overlapping counters.

The allocation process begins by selecting candidate configurations matching:

item.location + item.item_type

The item’s properties are then evaluated against each candidate’s configured property criteria.

From the matching candidates, the system selects the most specific / best matching configuration.

More-specific configurations take precedence over broader configurations.

Example:

Instance A

L1 + Dining Chair + { upholstery: null }

Instance B

L1 + Dining Chair + { upholstery: "up", wood: "teak" }

Item:

L1 + Dining Chair + { upholstery: "up", wood: "teak", designer: "Henrik", ... }

matches both A and B.

However, Instance B is more specific and therefore wins.

The item contributes its quantity only to Instance B.

Another item:

L1 + Dining Chair + { upholstery: "up", wood: "mahogany", designer: "Henrik", ... }

does not satisfy Instance B because wood != teak.

It does satisfy Instance A because Instance A accepts all upholstery values and places no restriction on wood.

Therefore it is allocated to Instance A.

Another example:

Instance C

L1 + Dining Chair + { upholstery: null }

Instance D

L1 + Dining Chair + { upholstery: ["up", "down"], wood: ["teak", "mahogany"] }

Item:

{ upholstery: "down", wood: "mahogany", ... }

is allocated to Instance D.

Item:

{ upholstery: "up", wood: "rosewood", ... }

does not satisfy Instance D and therefore falls back to Instance C.

The implementation plan must formalize a deterministic specificity algorithm for selecting the best match.

The same matching implementation must be reused by:

- initial quantity allocation,
- quantity reconciliation,
- location transitions,
- sold-state transitions,
- configuration changes,
- and any future maintenance/rebuild process.

There must not be multiple independent implementations of these matching semantics.

⸻

6. Configuration Conflict Prevention

The system must prevent configurations that make allocation ambiguous.

At minimum, an exact duplicate of:

location + item_type + normalized properties

must hard-fail.

Additionally, broader wildcard definitions must prevent redundant configurations that they already completely represent at the same level of specificity.

For example, if this exists:

L1 + Dining Chair + { upholstery: null }

then creating:

L1 + Dining Chair + { upholstery: "up" }

should not be allowed because the only property dimension being defined is already completely covered by the wildcard definition.

However, this is allowed:

Instance 1:

L1 + Dining Chair + { upholstery: null }

Instance 2:

L1 + Dining Chair + { upholstery: "up", wood: "teak" }

because Instance 2 introduces additional specificity and represents an intentional narrower stock classification.

Conflict validation must use the same normalized property semantics as the best-match allocator.

The implementation plan should identify and test additional ambiguous combinations, particularly combinations involving wildcard values and accepted-value sets.

⸻

7. Item Eligibility

Only eligible items contribute to stock quantities.

For V1, eligibility includes:

- the item belongs to the relevant location,
- the item matches the configured item type,
- the item matches the winning property configuration,
- the item is not sold.

Sold state comes from the existing item field:

isSold: boolean

Items where:

isSold == true

must not contribute to LocationStock.quantity.

The codebase already contains machinery responsible for marking items as sold. The stock state machinery must also be integrated into that transition so that an item becoming sold is removed from the LocationStock instance to which it is currently allocated.

Sold-state integration point:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts

The planning agent should inspect this flow before determining the exact hook location. (Resolved: hook call sites are fixed by context §0.10 — command and job layer, after commit.)

⸻

8. Quantity Semantics

The existing item domain has a quantity field.

The parent operation already has the current item instance available and therefore knows the quantity represented by the item.

The stock machinery may receive the quantity delta from this educated parent rather than independently assuming every transition represents exactly one unit.

However:

- quantity mutations must never result in a negative LocationStock.quantity.
- the quantity supplied must correspond to the item being transitioned.
- state must always be recalculated after quantity changes.

⸻

9. Quantity Reconciliation Service

Implement a reusable reconciliation service capable of rebuilding the correct quantity for a LocationStock.

Given a stock configuration, it should evaluate the existing eligible inventory and determine which items are allocated to that configuration according to the shared best-match algorithm.

It then sets:

- the correct quantity,
- and the resulting stock_state.

This service is required during configuration creation and modification and should also be reusable as a programmatic maintenance/recovery mechanism if quantity drift is ever detected.

LocationStock.quantity acts as an observable invariant of the incremental stock system.

Under normal operation it is maintained incrementally.

Reconciliation provides a way to restore the derived quantity from source inventory if necessary.

⸻

10. Location Transition Stock Service

Implement a service responsible for maintaining stock when an item changes location.

The educated parent provides:

- the item / required item classification information,
- item quantity,
- location_from,
- location_to.

The service should resolve the best matching LocationStock for the item at both locations.

If a matching source configuration exists:

source.quantity -= item.quantity

If a matching destination configuration exists:

destination.quantity += item.quantity

Possible outcomes:

Source match only

Subtract from source.

Destination match only

Add to destination.

Source and destination match

Subtract from source and add to destination.

Neither matches

Perform no stock mutation.

After every affected quantity mutation, recalculate stock_state.

The service must return a result that allows the parent to know whether:

- stock was changed,
- or the operation was a stock no-op.

The parent location-transition machinery already prevents invalid transitions such as moving an item from and to the same location. The stock service executes only after the parent has resolved its existing movement validation.

A lightweight locking/transaction strategy should be used if it can be introduced cleanly within the existing architecture to protect against concurrent quantity mutation. The system is currently small, so avoid introducing disproportionate infrastructure solely for this concern.

⸻

11. Initial Location Transition Integration

The first integration point is the existing Shopify location-transition command:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/update-item-location.command.ts

This existing flow creates a ScanHistory with the passed location when appropriate or updates the location when an existing record is found.

This is where the Location Stock quantity/state machinery should initially be integrated after the parent has resolved the valid location transition.

The planning agent must inspect this file and its surrounding services before determining the exact implementation point.

Existing behavior must remain intact.

⸻

12. Sold-State Integration

When an existing eligible item becomes sold:

isSold: false → true

its quantity must be removed from the best-matching LocationStock instance for its current location.

If future existing behavior allows:

isSold: true → false

the planning phase should determine whether the inverse operation should restore the item to the appropriate stock instance.

Integration point:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts

Inspect the existing sold-state machinery before planning this integration. (Resolved: `isSold: true → false` — the `returned_to_store` event — IS in scope and restores the item to its best-matching stock instance; see context §0.7.)

⸻

13. Stock Events / Frontend Reactivity

**Amended — see context §0.9. This section previously required a stock-specific event that never fires on a stock no-op. That is not what V1 does.**

V1 introduces no new event type. The existing `scan_history_updated` event already fires on every item-driven stock trigger — location moves from the scanner, location moves arriving via the Shopify `products/update` webhook, sales, returns to store, and quantity/property/category syncs — including from the webhook worker process, which publishes over Redis for the API server to re-broadcast.

The stock pages consume it the way the analytics page already does: ignore the payload, refetch. The `WsOutboundEvent` union and its hand-mirrored frontend twin are left untouched.

Two accepted consequences:

- Configuration changes emit nothing. Creating, updating or deleting a LocationStock changes quantities through reconciliation without touching any item, so no event fires. The editing user receives the result in the HTTP response; other users reload the page. This is a deliberate V1 scope decision.
- `scan_history_updated` also fires for item changes that cannot affect stock — price updates, sold-quantity syncs, and changes in locations or item types with no stock configuration. The stock pages will refetch unnecessarily in those cases, which is negligible at current data volumes.

Adding a dedicated `location_stock_updated` event later is one arm on each of the two union types plus an emission from the shared stock primitive, which already reports whether anything changed.

⸻

14. Create Configuration

Provide an endpoint/service for creating LocationStock instances.

Required:

- location
- item_type
- stock_thresholds_configuration

Optional:

- properties

Threshold configuration contains the mandatory thresholds for:

- low_in_stock
- medium_in_stock
- normal_in_stock

Each threshold object contains:

- state
- threshold_quantity

Validate:

- enum state,
- required threshold states,
- positive integer quantities,
- low < medium < normal,
- duplicate threshold states,
- configuration conflicts,
- normalized property semantics.

The endpoint must support creating multiple LocationStock instances in one request.

After configuration creation, quantity cannot simply start at zero.

The allocation/reconciliation machinery must evaluate existing inventory and initialize the correct:

- quantity
- stock_state

according to the complete set of stock configurations and best-match rules.

Record:

- authenticated user → created_by
- current UTC time → created_at

and follow established conventions for update audit fields.

⸻

15. Update Configuration

Provide an endpoint/service for updating an existing LocationStock.

The user may modify:

- location,
- item type,
- properties,
- threshold configuration.

Threshold configuration is sent as the complete desired list and should therefore behave as a full replacement rather than individual threshold-row patches.

Changing:

- location,
- item type,
- or properties

can change which items are allocated not only to the edited instance but potentially to broader or narrower sibling configurations.

Therefore the planning phase must determine the correct reconciliation scope after configuration changes rather than assuming only the edited row needs recalculation.

Changing only thresholds does not change item allocation but must immediately recalculate stock_state.

Updates must enforce the same conflict/uniqueness rules as creation.

Record:

- authenticated user → updated_by
- current UTC time → updated_at

⸻

16. Delete Configuration

Deleting a LocationStock removes the configuration and its associated StockThresholdsLocation records.

It must not delete inventory/items.

Because removing a specific stock configuration can cause items to fall back to a broader configuration, deletion may affect the quantities of remaining stock instances.

The planning phase must therefore determine the appropriate reconciliation scope following deletion.

⸻

17. Configuration Read — Location Summary

Provide an endpoint/service returning every unique location that currently contains one or more LocationStock instances.

Each location should return the number of configured stock instances it contains.

This is explicitly a count of configurations, not distinct item types.

Example:

L1 + Dining Chair + upholstery=up
L1 + Dining Chair + upholstery=down
L1 + Dining Table

should produce:

L1 → 3 stock instances

This endpoint supports the main Stock Location Settings page.

⸻

18. Configuration Read — Location Detail

Provide an endpoint/service that, given a location, returns all complete LocationStock configurations belonging to that location.

Include the information required for configuration inspection/editing, including:

- item type,
- properties,
- quantity,
- current stock state,
- threshold configuration,
- relevant IDs/audit information according to existing API conventions.

This endpoint supports the Location Detail settings page.

⸻

19. Stock Report Service

Build a stock report service for operational decisions such as determining which inventory should be prioritized for restoration or replenishment.

Each underlying stock configuration is defined by:

location + item_type + properties

and has its own:

- quantity,
- thresholds,
- stock state.

The report returns:

- type
- properties
- quantity
- stock_state
- locations[]

locations must always be a list for response-shape consistency.

Stock-state ordering:

out_of_stock
→ low_in_stock
→ medium_in_stock
→ normal_in_stock
→ high_in_stock

By default, lowest stock states appear first.

Cross-location compaction

When not grouping by location, configurations may be compacted when:

item_type + normalized properties + stock_state

are equivalent.

When compacted:

- quantities are summed.
- contributing locations are combined into locations[].

Entries with identical type/properties but different stock states must remain separate.

Example:

L1 + Chair + Walnut + quantity 2 + low_in_stock

and:

L2 + Chair + Walnut + quantity 3 + low_in_stock

may become:

Chair + Walnut + quantity 5 + low_in_stock + locations [L1, L2]

However:

L1 + Chair + Walnut + low_in_stock

and:

L2 + Chair + Walnut + normal_in_stock

must remain separate.

Low stock in one location must never be hidden by healthy inventory elsewhere.

State filtering

The caller may provide a list of stock states to surface.

Only rows matching those states should be returned.

Grouping by location

The caller may request grouping by location.

When grouped:

- cross-location compaction is disabled.
- stock instances remain associated with their individual locations.
- entries within each location are ordered by stock-state severity.

The states considered problematic/low-stock for location ranking are:

1. out_of_stock
2. low_in_stock
3. medium_in_stock

Location groups containing the greatest number of these problematic stock instances should appear first.

Within equivalent counts, the implementation should preserve severity so that locations with worse stock conditions are prioritized.

The exact deterministic tie-breaking strategy should be defined in the implementation plan.

⸻

20. Quantity and State Integrity

LocationStock.quantity and stock_state are persisted operational state.

They are expected to remain synchronized through the same domain machinery.

Every quantity-changing operation must also perform stock-state calculation.

If quantity becomes incorrect, that indicates drift or a failure in one of the stock mutation paths.

The reconciliation service provides the programmatic mechanism for rebuilding quantity and state from current inventory when necessary.

No scheduled reconciliation/background repair process is required for V1.

⸻

21. Shared Domain Machinery

The implementation should avoid duplicating core stock semantics across endpoints.

At minimum, establish reusable domain machinery for:

1. property normalization,
2. property matching,
3. best-match/specificity resolution,
4. configuration conflict detection,
5. stock-state calculation,
6. quantity reconciliation,
7. incremental quantity mutation.

Creation, updates, deletion reconciliation, item-location transitions, sold-state transitions, and reporting should build on these shared rules rather than implementing their own interpretations.

⸻

22. Planning Requirements

Before implementation:

1. Inspect the existing item, location, item-type, property, database, authentication/audit, event/realtime, ScanHistory, and Shopify transition architecture.
2. Inspect the concrete location-transition integration point:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/update-item-location.command.ts

3. Inspect the sold-state machinery once its file path is supplied:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts

4. Identify existing conventions and services that should be reused.
5. Formalize the property normalization and best-match specificity algorithm before implementing stock mutation.
6. Determine how creation/update/deletion trigger reconciliation when changing one configuration can alter the winning allocation of items belonging to sibling configurations.
7. Determine the smallest appropriate transaction/locking mechanism for safe quantity updates.
8. Define the stock-change event contract and integration with the existing realtime/event system.
9. Produce a multi-phase implementation plan, including migrations, domain machinery, configuration APIs, reconciliation, transition integrations, events, read APIs, reporting, and tests.
10. **Amended — see context §0.11. This section previously required automated tests. This repository has no test runner, no test files and no test dependencies; `npm test` fails by design, and the only automated gate is `npm run typecheck`.**

Automated tests are descoped for V1. Correctness is verified manually by the product owner. Two requirements replace them:

a. The plan must enumerate, per phase, the concrete manual scenarios to exercise and the expected quantity and stock state after each — at minimum: a scan into a configured location, a scan out of one, a sale, a return to store, a location edit made directly in the Shopify admin, a configuration created against existing inventory, and a configuration deleted so its items fall back to a broader one.

b. The domain machinery — property tokenization and normalization, matching, best-match specificity, stock-state calculation, and conflict detection — must remain pure and free of any Prisma import, living in `domain/` or `shared/`. This costs nothing now, keeps manual reasoning tractable, and means automated tests can be added later without a rewrite.

The behaviours the original list named remain the things to verify, now by hand rather than by test: every threshold boundary, property normalization, wildcard matching, multi-value matching, best-match precedence, ambiguous/conflicting configurations, duplicate prevention, zero quantity, reconciliation, create/update/delete reallocation, location transitions, sold-item removal, negative-quantity protection, report aggregation, report state filtering, and location grouping and ranking.

11. Preserve existing behavior outside this feature.
12. Surface contradictions or missing domain decisions before implementation rather than silently choosing behavior.

for the event emition to the client this happens at: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/ws/ws-server.ts

⸻

23. Mechanism Contracts — ratified 2026-09-01 (round 2)

Six decisions ratified by the product owner after the mechanism-inventory pass. Where these disagree with earlier sections or context §0, §23 wins.

23.1 Canonical criteria form

A property criterion set is normalized to exactly one canonical form before any storage, comparison, matching, or conflict check:

- Every accepted-value entry becomes an **array**: a scalar value `"Teak"` normalizes to `["teak"]`. `{ "wood_type": "Teak" }` and `{ "wood_type": ["Teak"] }` are therefore the same criterion, and creating both is an exact-duplicate conflict.
- Array members are lowercased, trimmed, de-duplicated, and sorted lexicographically. An empty array after normalization hard-fails validation.
- `null` (wildcard) is preserved as `null` — it is not an empty array.
- Keys are sorted lexicographically in the canonical serialization.
- `{}` (the catch-all) is preserved as `{}` — never collapsed to `null` (context §0.21).
- The canonical JSON string of the normalized object is the identity used for duplicate detection and report compaction.
- API inputs may use scalar or array shapes; API responses always return the canonical form.

23.2 Conflict-rejection rule (generalizes §6)

A new or updated configuration C is rejected with a conflict error when any existing sibling E — same shop + location + item_type, excluding the row being updated — satisfies BOTH:

1. C and E have the **exact same set of criterion keys** (the empty key set counts: two catch-alls collide), and
2. on **every** key, C's accepted-value set and E's accepted-value set **intersect**, where a wildcard (`null`) intersects everything.

Consequences, all intended: exact duplicates are rejected (rule's special case); `{upholstery: "Up"}` is rejected against `{upholstery: null}` (§6's worked example); `{wood_type: ["Teak"]}` is rejected against `{wood_type: ["Teak","Oak"]}`; `{wood_type: ["Teak"]}` and `{wood_type: ["Oak"]}` may coexist (disjoint sets — no item can match both); adding or removing a key dimension always avoids conflict (`{upholstery: null}` + `{upholstery: "Up", wood_type: "Teak"}` coexist, per §6). The error identifies the conflicting existing configuration.

23.3 Category-grouped property options map

The curated options map (context §0.4) carries a category dimension:

```
ITEM_PROPERTY_OPTIONS: ReadonlyArray<{
  key: string;
  values: readonly string[];        // canonical display casing
  categories: "universal" | readonly ItemCategory[];
}>
```

- `"universal"` keys are offered and valid for every item type; category-listed keys only for those item types.
- Validation is category-aware: a criterion key that is neither universal nor listed for the configuration's item_type is rejected at create/update, as is any value not in the key's value list.
- The map's **content** (which keys, which values, which grouping) is selected by the product owner from the candidate inventory extracted from real data; that selection is a gate for the phase that authors the module. The structure above is fixed now so the API contract and frontend can proceed.
- The configuration-options endpoint returns this map verbatim alongside `itemCategories`, so the frontend renders only the keys valid for the selected item type.

23.4 Frontend scope for this pipeline

This pipeline delivers the **backend only**, plus one frontend-facing artifact: a self-contained API contract document (endpoints, request/response shapes, semantics, sequencing, and the intention behind each surface) that a separate frontend planning agent consumes. No frontend code phases are planned here. The contract document is a first-class deliverable, frozen at the end of planning and amended only through the coordinator.

23.5 Batch create is all-or-nothing

The multi-create endpoint validates and creates all submitted configurations in a single transaction. Any validation or conflict failure — including conflicts between two members of the same batch — fails the entire request; nothing is written. The error names the offending batch index. Group reconciliation for all affected groups runs after the batch commits.

23.6 Reconciliation double-pass (amends §0.17's single inline run)

To shrink the window in which a concurrent item write (e.g. the webhook worker) invalidates freshly computed absolute quantities, `reconcileGroup` runs **two passes**:

1. Pass 1 — as context §0.17: load configurations and eligible items, resolve winners, write every configuration's quantity and stock_state in one transaction, inline in the request.
2. Pass 2 — immediately after pass 1 commits: recompute from a fresh read. If the recomputed values differ from what pass 1 wrote, write the corrected values (again one transaction) and log a `logger.warn` naming the group and the delta — a differing pass 2 means a concurrent mutation interleaved.

Bounded at exactly two passes; a race against pass 2 itself is accepted residual drift, repairable by any later reconciliation. The HTTP response reflects pass 2's values.

⸻

24. Measurement Ledger

The observable outcomes that, verified true, mean this intention shipped. Automated tests are descoped (§22.10); each entry is verified by the enumerated manual scenarios the plans must carry per phase. Every phase acceptance criterion traces to one of these IDs.

- **M1 — Allocation correctness.** An eligible item is counted by exactly one configuration: the best match per §0.5/§0.13, wildcard and catch-all semantics per §0.8/§0.21. Guards: silent misallocation, double-counting.
- **M2 — State boundary correctness.** Every threshold boundary (0, low, low+1, medium, medium+1, normal, normal+1) yields the §3 state. Guards: off-by-one state drift.
- **M3 — Quantity conservation on item transitions.** Scans in/out, Shopify-admin moves, sales, returns, and quantity/property/category syncs move exactly the item's quantity between the affected instances (§0.7). Guards: incremental drift.
- **M4 — Non-negative integrity.** No operation drives a quantity negative; a guard refusal logs the §0.15 context and never fails the parent operation. Guards: corrupted counters, broken business flows.
- **M5 — Configuration-lifecycle reconciliation.** Create/update/delete leaves every affected group (two groups on a location/type move, §0.17) with quantities equal to a fresh full recount, via the §23.6 double-pass. Guards: stale sibling counters.
- **M6 — Conflict prevention.** Every §23.2-conflicting submission is rejected with the conflicting id; every non-conflicting one is accepted. Guards: ambiguous allocation.
- **M7 — Report fidelity.** Compaction, state filtering, ordering, and location ranking exactly per §19/§0.19. Guards: wrong restock priorities.
- **M8 — Group-total accounting.** A group with a catch-all sums to its true eligible inventory; without one, a shortfall is expected and not diagnosed as drift (§0.21). Guards: false drift alarms, missed real drift.

⸻

25. Review Doctrine — ratified 2026-09-01

This project runs with a **single reviewer session per phase** (the orchestrator model also reviews; a different model implements). Because automated tests are descoped (§22.10), the reviewer's job is adversarial **correctness verification of the code against the ratified artifacts** — re-deriving each acceptance criterion against the implementation, running the manual instruments, and hunting real logic defects.

Four binding principles:

1. **Findings are bounded by ratified artifacts.** A blocking finding must cite the specific plan criterion row, intention/context contract section, or architecture-contract rule it violates — or demonstrate a concrete incorrect behavior (specific input/state → wrong output) on the production path. Anything else is advisory at most.
2. **Ratified decisions are not findings.** Every decision recorded in context §0 and §23 — including every accepted risk, residual race, and descoped concern — is settled. The master plan §11 maintains the enumerated non-findings list; the reviewer must not raise them as defects, "risks", or requests for defensive code.
3. **Disagreement escalates, never blocks.** A reviewer who believes a ratified decision is itself wrong routes a decision card to the owner via the coordinator. The phase's verdict is computed as if the decision stands.
4. **No invented scope.** The reviewer never requests tests, features, endpoints, fields, refactors, or hardening beyond the phase plan's criteria and file perimeter. Real defects noticed in passing inside the perimeter are reportable (charter rule) but must satisfy principle 1.

The operational review contract — finding format, severity ladder, reviewer obligations, and the full non-findings enumeration — is master plan §11 and binds every reviewer prompt.
