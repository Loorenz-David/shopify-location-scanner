# Plan 3 — Config domain (criteria builder, thresholds, bands)

**Implementer:** Codex · **Depends on:** P1 APPROVED · **Projection: none** (§3A)

*(Amended 2026-09-01, plan-2 projection F5: this phase was swapped ahead of P2 — master
plan §7. Its declared dependency on P2 was never real; nothing here touches the report
domain, while P2's MC9 config label needs `displayValueFor`, built in task 1 below.)*

## Goal
Pure domain functions for the configuration area: property-criteria building and
rendering, threshold editing, five-band derivation. NOT here: wizard store/UI, API
calls.

## Read first
Master plan §6 (Domain) · intention §4 (properties row), §4A MC6, MC7, MC8 + §8 (M3,
M4) · contract v1.3 §2 (value normalization and casing), §4.1.

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
| C2 | Round-trip: wire `{wood_type:["teak"]}` renders chip `Teak` via options map; rebuilding from the rendered state and lower-casing both sides yields identical criteria; wildcard survives the trip **and renders the chip `UPHOLSTERY · any` (D9's ratified form — assert the literal)**. | MC6, M4 |
| C3 | Casing fallback: wire value absent from options (`["mystery"]`) renders raw, no throw. | MC6, M4 |
| C4 | Chip/key ordering: keys render in GET 4.1 `propertyOptions` order regardless of insertion order. | MC6 |
| C5 | Threshold cascade, enumerated per row × direction (fixture 5/15/39): (a) lower normal→14 ⇒ med 13, low 5; (b) lower normal→2 ⇒ clamped 3, med 2, low 1; (c) lower med→5 ⇒ low 4; (d) raise low→15 ⇒ med pushed to 16, norm untouched (assert exact triple 15/16/39); (e) raise low→39 ⇒ med 40, norm 41 (D14); (f) raise med→39 ⇒ norm 40; (g) typed non-numeric ⇒ draft unchanged; (h) typed 0 on low ⇒ clamped 1. Each row asserts its one exact output triple (charter rule 2). | MC7, M3 |
| C6 | Invariant property: for a generated sequence of 200 random commits, `1 ≤ low < medium < normal` holds after every step. **Named mutation:** delete the raising-cascade branch (`medium = max(...)`) in `commitThreshold` → C5(e) reds; delete the lowering branch → C5(a) reds (both listed so each branch has its own biting row — charter rule 12). | MC7, M3 |
| C7 | Bands (fixture 5/15/39 and minimal 1/2/3): labels `0`,`1–5`,`6–15`,`16–39`,`40+` and `0`,`1`,`2`,`3`,`4+`; bands partition 0..(norm+5) with no gap/overlap (checked by membership scan, both fixtures). | MC8, M3 |

## Notes
C5(d)'s inline question is resolved: raising low to 15 pushes med to 16; normal
already exceeds — assert `15/16/39` exactly. Draft is immutable (returns new object).

**Mutation count 2** — both in C6 (raising-cascade branch, lowering-cascade branch), each
with its own biting row.

**Two wildcard renderings exist on purpose, do not harmonize them** *(coordinator, 2026-09-01)*. The wizard **chip** is `UPHOLSTERY · any` (D9, ratified, this phase). The entry-detail **config label** is MC9's `{key name} any` using the key exactly as it appears in `propertyOptions` (plan 2 C8). Two ratified texts, two surfaces. Neither implementer nor reviewer should make one match the other; if the owner wants them aligned it is a UI decision taken in P5/P7, not a domain change.

**Value casing** *(master plan S4c)*: values are **submitted** display-cased and come back **lowercase** — the backend normalizes (contract §2). C2's round-trip depends on that direction, so read the fixtures as wire data, not as display data.

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
- **2026-09-01 · round 1 (implementation) · Codex · IMPLEMENTED pending coordinator
  consumption.** Added the pure MC6 criteria builder/rendering functions and the MC7/MC8
  threshold/band functions, with colocated tests. The implementation accepts a criteria draft
  as an ordered list of property rows (`key`, selected display-cased values, optional
  `anyValue`); omitted rows and empty selections are omitted from the request, while an
  explicit wildcard is `null`. Chips use the supplied options vocabulary for case-insensitive
  display casing, preserve property-option order, and render the ratified wildcard text.
  Threshold commits return new drafts, reject non-integer/non-numeric input, clamp absolute
  floors, and cascade in the ratified direction. Bands return state metadata plus numeric
  bounds so consumers can render labels/colors and verify membership without duplicating
  state constants.

  Judgment calls: normal-value chips are one display-cased value per chip; wildcard chips
  identify their key in uppercase because D9 fixes that wizard-surface text. Unknown keys are
  retained after known vocabulary keys and sorted deterministically; unknown values fall back
  to the raw wire value. Numeric threshold input accepts integer numbers and integer strings;
  empty strings are treated as invalid typed input and revert. No changes were made to the
  P1 types, fixtures, state domain, API seam, or any UI/store/controller file.

  Pre-edit baseline after adding the executable phase tests but before production edits:
  targeted collection run found the two new test files but could not resolve the two absent
  domain modules, so it recorded 0 executed test IDs and 2 failed test suites. The existing
  stock suite before adding those tests was 3 files / 32 tests passing. After implementation,
  the phase tests passed at 2 files / 18 tests and the stock-domain suite passed at 5 files /
  50 tests. The two named mutations were both executed at the `commitThreshold` definition,
  each observed red on its prescribed row, and restored; details are in the implementer
  handoff.

  Closing L4 stamp on clean checkpoint `4b64c46`: `npm test` passed with 5 files / 50 tests;
  `npm run typecheck` passed with no diagnostics; `npm run lint` reported the unchanged
  repository baseline of 48 errors / 14 warnings (62 problems), all outside this phase's
  perimeter, with zero problems in the four phase files. An earlier closing attempt found
  one test-only spread typing error and was superseded by checkpoint `4b64c46`; the final
  stamp was taken after that correction. No tracker row was edited by the implementer.

- **APPROVED (coordinator, 2026-09-01) — no independent review session ran.** Per master plan
  §3A this phase was approved on coordinator consumption of the implementer handoff. Stated
  plainly so the record is not read as more scrutiny than it had.

  **Verified independently against the tree, not taken from the handoff:** write perimeter
  matched `git status` exactly (6 declared files, 6 changed, nothing else, tree clean); the
  closing stamp re-run by hand — 50/50 tests, typecheck clean, lint **48 errors / 14 warnings**
  precisely at the recorded baseline, and **0 errors / 0 warnings** across all four phase files;
  all 50 test names enumerated with **no orphans** (18 new, every one mapping to a criterion
  row); both production modules confirmed pure by grep for `fetch`/`import.meta`/store/storage;
  and all eight C5 triples re-derived from MC7 against the plan — `5/13/14`, `1/2/3`, `4/5/39`,
  `15/16/39`, `39/40/41`, `5/39/40`, unchanged-on-non-numeric, `1/15/39` — all matching.

  **`displayValueFor(key: string, wireValue: string, options: StockOptionsDto): string`** is the
  signature master plan §6 fixed, checked in the source because plan 2's C8 binds to it. C4 was
  read rather than trusted: it inserts keys as country/wood_type/weight_definition/years and
  expects wood_type/years/weight_definition/country, so it genuinely proves vocabulary order
  beats insertion order. C2 asserts the `UPHOLSTERY · any` literal directly.

  **Mutation 1 re-planted by the coordinator**, not accepted on report: deleting
  `next.medium = Math.max(next.medium, next.low + 1)` reddened C5(d), C5(e) **and** C6, with
  C5(e) receiving exactly `{low: 39, medium: 15, normal: 39}` as the handoff stated. The handoff
  reported only C5(e) because it probed under a `-t 'C5\(e\)'` filter — narrower than reality,
  not wrong. Tree restored and re-verified green.

  **The S2 state-name/hex allowlist survived untouched**, which C7's color assertions made a
  real question: the shipped P1 guard still passes, so the threshold domain derives its band
  colors from the state domain rather than restating hexes. That was proven by the guard
  itself, not by inspection.

  **Known and accepted, not fixed** *(§3A — neither produces a wrong number)*:
  1. **Mutation 2 (lowering cascade) was verified arithmetically, not re-planted.** Its reported
     receipt `{5, 15, 14}` is exactly what deleting that branch produces from the 5/15/39
     fixture, and mutation 1's independent re-plant established the probe protocol was really
     followed. A second re-plant would buy little.
  2. **`comparePropertyKeys` falls back to `localeCompare` for keys absent from the vocabulary.**
     Locale collation is device-dependent, so two devices could order *drifted* keys' chips
     differently. Cosmetic, only under vocabulary drift, and it never changes a quantity.
     Recorded because P2's MC2a deliberately chose code points for the analogous case; if these
     are ever unified, this is the site.
  3. **C2's round-trip filters chips with the same literal it later asserts.** Mildly
     self-referential; the separate `toContain("UPHOLSTERY · any")` assertion carries the real
     proof, so the row still bites.
