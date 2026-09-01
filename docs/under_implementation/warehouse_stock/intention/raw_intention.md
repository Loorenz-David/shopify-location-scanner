Intention — Location Stock System

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

[INSERT EXISTING SOLD-STATE FILE PATH HERE]

The planning agent should inspect this flow before determining the exact hook location.

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

[INSERT EXISTING SOLD-STATE FILE PATH HERE]

Inspect the existing sold-state machinery before planning this integration.

⸻

13. Stock Events / Frontend Reactivity

Stock mutations should communicate through the application’s existing event/realtime system so frontend consumers can react accordingly.

Determine whether an existing event can represent stock changes or whether a new event key/type is required.

Events should represent successfully committed stock changes and should not be emitted for stock no-ops.

The planning phase should inspect existing event conventions and define the appropriate payload and emission point.

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
10. Define tests for:

- every threshold boundary,
- property normalization,
- wildcard matching,
- multi-value matching,
- best-match precedence,
- ambiguous/conflicting configurations,
- duplicate prevention,
- zero quantity,
- reconciliation,
- create/update/delete reallocation,
- location transitions,
- sold-item removal,
- negative-quantity protection,
- report aggregation,
- report state filtering,
- location grouping and ranking.

11. Preserve existing behavior outside this feature.
12. Surface contradictions or missing domain decisions before implementation rather than silently choosing behavior.

for the event emition to the client this happens at: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/ws/ws-server.ts
