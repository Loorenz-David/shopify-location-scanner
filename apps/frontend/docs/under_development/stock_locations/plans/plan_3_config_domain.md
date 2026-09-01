# Plan 3 — Config domain (criteria builder, thresholds, bands)

**Implementer:** Codex · **Depends on:** P2 APPROVED · **Projection: mandatory** (MC6–MC8)

## Goal
Pure domain functions for the configuration area: property-criteria building and
rendering, threshold editing, five-band derivation. NOT here: wizard store/UI, API
calls.

## Read first
Master plan §6 (Domain) · intention §4 (properties row), §4A MC6, MC7, MC8 + §8 (M3,
M4) · contract v1.2 §2, §4.1.

## Files expected to change
`src/features/stock/domain/stock-criteria.domain.ts` (+test),
`src/features/stock/domain/stock-thresholds.domain.ts` (+test), view types as needed.

## Tasks
1. `buildCriteria(draft) → properties object` and `renderCriteriaChips(properties,
   options)` per MC6; `displayValueFor(key, wireValue, options)` (case-insensitive map,
   raw fallback). 2. `commitThreshold(draft, row, value) → draft` per MC7 (clamp,
   cascade both directions, D14). 3. `deriveBands(low, med, norm)` per MC8.

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Builder shapes — one row each: (a) selected values → `{key: ["Teak","Oak"]}` array, never scalar; (b) "Any value" → `{key: null}` (D9); (c) removed definition → key absent; (d) empty properties → `{}`. | MC6, M4 |
| C2 | Round-trip: wire `{wood_type:["teak"]}` renders chip `Teak` via options map; rebuilding from the rendered state and lower-casing both sides yields identical criteria; wildcard survives the trip. | MC6, M4 |
| C3 | Casing fallback: wire value absent from options (`["mystery"]`) renders raw, no throw. | MC6, M4 |
| C4 | Chip/key ordering: keys render in GET 4.1 `propertyOptions` order regardless of insertion order. | MC6 |
| C5 | Threshold cascade, enumerated per row × direction (fixture 5/15/39): (a) lower normal→14 ⇒ med 13, low 5; (b) lower normal→2 ⇒ clamped 3, med 2, low 1; (c) lower med→5 ⇒ low 4; (d) raise low→15 ⇒ med pushed to 16, norm untouched (assert exact triple 15/16/39); (e) raise low→39 ⇒ med 40, norm 41 (D14); (f) raise med→39 ⇒ norm 40; (g) typed non-numeric ⇒ draft unchanged; (h) typed 0 on low ⇒ clamped 1. Each row asserts its one exact output triple (charter rule 2). | MC7, M3 |
| C6 | Invariant property: for a generated sequence of 200 random commits, `1 ≤ low < medium < normal` holds after every step. **Named mutation:** delete the raising-cascade branch (`medium = max(...)`) in `commitThreshold` → C5(e) reds; delete the lowering branch → C5(a) reds (both listed so each branch has its own biting row — charter rule 12). | MC7, M3 |
| C7 | Bands (fixture 5/15/39 and minimal 1/2/3): labels `0`,`1–5`,`6–15`,`16–39`,`40+` and `0`,`1`,`2`,`3`,`4+`; bands partition 0..(norm+5) with no gap/overlap (checked by membership scan, both fixtures). | MC8, M3 |

## Notes
C5(d)'s inline question is resolved: raising low to 15 pushes med to 16; normal
already exceeds — assert `15/16/39` exactly. Draft is immutable (returns new object).

## Inherited hazard — the item-category vocabulary is 28, and 19 of them carry no property

*(Routed by the coordinator 2026-09-01 from contract v1.3; master plan S4a.)*

The category list is **28**, not the nine an earlier reading inferred, and **19 of the 28
have no category-specific property at all** — they are configured with the four universal
keys alone (`wood_type`, `years`, `weight_definition`, `country`). Only the six table types
and the three chair types appear in the property table's `categories` column.

So "a category with zero applicable property keys" never occurs (the four universal keys
always apply), but "a category whose property picker offers four options instead of eight"
is the **majority case, not the exception**. Any logic or layout that assumes at least one
category-specific key is wrong for 19 of 28 categories, and wrong silently — the picker
simply comes back shorter.

For this phase specifically: `buildCriteria` / `renderCriteriaChips` / `displayValueFor`
must be correct when the selected category binds **only** universal keys. That is the
common path, and a criterion covering it belongs here rather than in the wizard phase.

## Review log
(empty)
