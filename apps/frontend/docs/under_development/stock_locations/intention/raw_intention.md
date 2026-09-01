# Intention — Stock Locations frontend (report + settings + PDF export)

**Status: RATIFIED** (2026-09-01, by the owner — see changelog round 3)
**Owner:** David
**Date:** 2026-09-01
**Semantic authorities:** `../backend_handoff/frontend-api-contract.md` (**v1.2** — API + domain semantics; §4.7 replaced per our request case, see changelog round 6), `../design_handoff/` (visual target, screens 00–10), `../context/` (repo grounding: `frontend-architecture.md`, `design-language.md`, `pdf-library.md`)

## 1. Objective and hard constraints

Build the frontend for the location-stock capability in the scanner PWA: users
**configure stock definitions** (location + item category + property criteria + three
thresholds) and **read a stock report** (severity-ordered, compacted or grouped by
location, filterable, exportable as an A4 PDF shared through the OS share sheet).

Hard constraints:

- **C1 — Contract-faithful:** every request/response shape, error envelope, state enum,
  severity order, compaction/conflict semantics come from the backend contract v1.1.
  If a design element has no data behind it, the contract wins and the divergence is
  recorded here — never improvised in code.
- **C2 — Mock-first:** endpoints 4.1–4.6 land after backend phase P3, 4.7 after P5
  (contract §7). The feature is built and demonstrable against local mocks that encode
  the contract exactly (the §4.1 vocabulary is final and safe to hardcode in mocks);
  swapping mocks for the live client must touch only the `api/` layer. The report
  endpoint's amended shape **landed as contract v1.2** (round 6) — report mocks encode
  v1.2 §4.7 verbatim; the endpoint goes live after backend phase P5.
- **C3 — Architecture-conformant:** the feature follows the layered feature-module
  pattern, home-shell registration, shared `apiClient`, `useWsEvent`, and bootstrap
  location source documented in `context/frontend-architecture.md`.
- **C4 — Design-target fidelity:** screens implement the design handoff (tokens, type,
  chrome, per-state color system of `00-global.md`) within the divergences resolved in
  §9 / the changelog.

## 2. Grounding (what exists that this builds on)

- Navigation shell: page registry in `src/features/home/HomeFeature.tsx`, settings rows
  in `src/features/settings/domain/settings-options.domain.ts`, lazy chunks in
  `src/features/home/lazy-pages.tsx`.
- HTTP: fetch-based `apiClient` (`src/core/api-client/`) with Bearer/refresh and
  `ApiClientError` carrying the backend error envelope. (The contract's "axios client"
  phrase denotes this shared client; no axios exists — reported per contract §3, not guessed.)
- Realtime: `useWsEvent("scan_history_updated", …)` exists; refetch idiom at
  `src/features/analytics/flows/use-analytics-page.flow.ts:138-142`.
- Locations: `useBootstrapStore` → `payload.shopify.metafields.options`
  (`{label,value}` — plain code strings, no zone names).
- PDF: `@react-pdf/renderer@^4.9.0` installed by the owner (D6). No test runner is
  installed yet — vitest + React Testing Library are to be added by this project (D8).

## 3. Core workflows

**W1 — Configure (screens 06→07→08→09).** Settings → *Stock locations* root lists
locations having ≥1 definition with definition counts (GET 4.2). Location detail lists
that location's definitions as instance cards with derived five-band threshold strips
(GET 4.3). Create runs the strict two-step wizard — step 1: location (preselected when
entered from a location detail), item category, optional properties from the options
vocabulary (GET 4.1); step 2: threshold ladder (three editable limits, High/Out
derived) — submitting POST 4.4 as a one-entry batch. Tapping an instance card opens the
same wizard prefilled for edit (PATCH 4.5); delete uses DELETE 4.6. A 409 conflict is
surfaced on the form naming the conflicting definition; the form never pre-computes
conflicts. After any successful mutation the affected location detail(s) are refetched
in full (sibling reallocation).

**W2 — Read (screens 01→02→03→04).** Settings → *Stock report* lands on the compacted
report (GET 4.7 default), severity-ordered, with the four counter tiles computed from
the unfiltered result. Segmented control switches to grouped-by-location.
The filter sheet composes states / locations / grouping with a live result count on the
CTA. Tapping a row opens the entry detail (contributing locations, matched
configuration, merge-explainer note; note omitted for single-location entries). No
threshold numbers anywhere in the report area. **The entry detail carries no action
buttons** — the mockup's `Scanned items` / `Add task` row is a design error (owner
decision D4) and is removed, not deferred.

**W3 — Export (screens 05→10).** From the report, the Generate PDF sheet mirrors the
active query (state chips inherited from the filter; toggles change the export only),
shows the computed page count and dated filename, offers Preview (open blob) and
Generate & share (Web Share API with file; download fallback). Output is the A4
document of `10-pdf-a4` — sections per state (worst first, "produce first" tag on the
most severe non-empty section), repeated table headers, header/footer with `Page x of y`,
report-settings box, no thumbnails, no thresholds.

**W4 — Stay current.** Report and location-detail views refetch on
`scan_history_updated` (payload ignored). Configuration mutations rely on their HTTP
responses; other users see changes on next load (deliberate V1, contract §5).

## 4. Domain model and state ownership

| field / value | owner (writes it) | frontend may |
|---|---|---|
| `quantity`, `stockState` | backend only | display; never compute or cache across refetches |
| `thresholds` (3 rows, strictly increasing) | user via wizard | edit; validate low < medium < normal, each ≥ 1 |
| `properties` criteria | user via wizard, keys/values only from GET 4.1 | build `{key: values[]}` / `{key: null}` wildcard / `{}` catch-all; display casing from the options map (backend normalizes to lowercase) |
| `itemCategory` | user via wizard, from GET 4.1 | select only |
| `location` | user via wizard, from bootstrap metafield options | select only |
| state enum + severity order | contract §1 (fixed) | one domain-layer constant: `out_of_stock → low → medium → normal → high`, with per-state label/text/tint/solid map |
| `createdBy/updatedBy/At` | backend | display |

**Facts vs derived (never stored, always recomputed for display):**

- Five-band strip bounds on instance cards: `0 | 1–low | low+1–med | med+1–norm | norm+1+` from the three thresholds.
- Counter tiles: counts per state over the current report result **as filtered by location, ignoring the state filter** (D13 = A; §4B MC3a records why the group ranking differs). The earlier "unfiltered result" wording predates D13.
- Filter CTA count: size of the result under the pending filter selection.
- Threshold ladder derived rows: High = above normal limit; Out of stock = 0. Never rendered as inputs.
- PDF page count: measured from the actual render, never assumed.

## 4A. Mechanism contracts (mechanism-inventory, round 4)

Load-bearing mechanisms, ranked by silent-failure risk. Planner criteria may cite these
IDs (`MC1`…) as trace targets alongside M1–M6. All twelve are fully defined; the ⚠ cards they
referenced were answered by the owner (see §9A resolutions). Every invariant below must be proven on
the production code path (the real domain functions over real DTO shapes).

**MC1 — State order and display map.** One exported domain constant: the ordered array
`[out_of_stock, low_in_stock, medium_in_stock, normal_in_stock, high_in_stock]`
(index 0 = worst; contract §1) with, per state: label ("Out of stock", "Low", "Medium",
"Normal", "High" — `_in_stock` dropped per design), `text`/`tint`/`solid` hex from
`00-global.md`. Every sort, badge, tile, rail, and PDF color derives from this constant;
no other file may restate a state name, order index, or state hex. Unknown state strings
from the wire fail loud (thrown error), never default-colored.
*Invariant:* a lookup exists for all five states and only five; sorting any permutation
of states by index reproduces the canonical order. → M2.

**MC2 — Compact-view entry ordering (total).** (D10: ratified.) Sort compacted rows by:
(1) state index ascending (worst first); (2) quantity ascending; (3) `itemCategory`
ascending, case-insensitive; (4) canonical `properties` rendered to a comparison string
(keys in GET 4.1 order, values as returned) ascending; (5) joined location list
ascending. Comparisons (3)–(5) by Unicode code points (no locale collation — stable
across devices). The PDF mockup's row order (0, 1, 0 within Out) is ruled
non-authoritative: it satisfies no consistent rule. The same total order applies inside
PDF sections. *Invariant:* the comparator is total — no two distinct rows compare
equal; same input always yields the same order. → M2.

**MC3 — Grouped-view ordering (total).** (D11: ratified — contract's stepwise rule.) Groups: compare count vectors
lexicographically — `count(out_of_stock)` desc, then `count(low)` desc, then
`count(medium)` desc, then location ascending by code points (contract §4.7's rule made
total; design 02's looser "number of problematic entries" sum reading is overridden).
Entries within a group: MC2's comparator minus keys (5). *Invariant:* total order;
ties beyond the three counts always broken by location. → M2.

**MC4 — Compaction.** Input: the amended report's per-location entries (request case
R1–R3). Group by `(mergeKey, stockState)`; per group: `quantity` = sum;
`locations` = deduped location codes sorted ascending (code points), rendered joined
with ` · `; `itemCategory`/`properties` taken from any member (equal by mergeKey
definition). The client never parses or constructs `mergeKey` and never compares
`properties` objects for identity. *Invariants:* (a) per state, the sum of compacted
quantities equals the sum of input quantities; (b) no `(mergeKey, stockState)` pair
appears in two output rows; (c) a single-entry group is byte-identical to its entry
apart from the locations wrapper. → M2, **M2A** (the grouping key's `stockState`
component carries its own ledger entry and named mutation — v1.2 notice §3).

**MC5 — Filter model and counts.** (D12, D13: ratified.) Filter state = `{ states: Set<State>
(default: all five), locations: Set<string> (default: empty = All), groupByLocation:
boolean (default: false) }`. `Reset` restores all three defaults. A report row/entry is
included iff its state ∈ states AND (locations empty OR its location ∈ locations —
for compacted rows: at least one contributing location selected, quantity then summed
over the **selected** contributing locations only). Filter-pill badge = |states| when
states ≠ all, else hidden. CTA count = number of rows the list will render under the
*pending* selection in the *pending* grouping mode (compacted rows when merge is on;
per-location entries when grouped). Counter tiles: Out, Low, Medium, Rest where
Rest = Normal + High; computed in the current grouping mode ignoring the state filter;
tiles respect the location filter and ignore the state filter (D13 = A). *Invariant:* CTA count always equals the row count
actually rendered after Apply, for every filter/grouping combination. → M2.

**MC6 — Property-criteria builder.** (D9: A — wildcard affordance ships.) Mapping from wizard
state to the request `properties` object: each chosen property definition with selected
values → `key: [display-cased values]` — always an array, never the scalar shorthand;
a definition-level "Any value" selection → `key: null` (D9 = A: the picker offers it); a removed row →
key omitted entirely (omission ≠ wildcard — wildcard requires the item to have the
key). Catch-all = `{}` (properties section left empty). Submit display casing verbatim
(backend normalizes); render fetched values by case-insensitive match into the GET 4.1
options map, falling back to the raw wire value when unmatched (vocabulary drift stays
visible, never crashes). Key display order everywhere (chips, config labels, PDF) =
key order in GET 4.1 `propertyOptions`. *Invariant (round-trip):* for any fetched
definition, rebuilding the request from its rendered wizard state and normalizing both
sides yields semantically identical criteria (same keys, same value sets
case-insensitively, wildcards preserved). → M4.

**MC7 — Threshold editing.** (D14: ratified — symmetric push.) Values are integers; floors:
low ≥ 1 ⇒ medium ≥ 2 ⇒ normal ≥ 3. Stepper step = 1. Committing value `v` on a row
(stepper tap, or typed input on blur/enter — clamped to the row's floor, non-numeric
input reverts): assign, then cascade minimally: lowering — `medium = min(medium,
normal−1)`, `low = min(low, medium−1)`; raising — `medium = max(medium, low+1)`,
`normal = max(normal, medium+1)` (symmetric push ratified, D14). `−` is disabled at a
row's absolute floor. Derived rows re-render from the three values on every commit.
*Invariant:* after any sequence of commits, `1 ≤ low < medium < normal` holds — the
form can never submit a 400-invalid ladder. → M3.

**MC8 — Five-band strip.** From thresholds (L, M, N), bands and labels:
`0` · `1–L` · `L+1–M` · `M+1–N` · `N+1+` — a range whose ends are equal renders the
single number (L=1 → `1`); the high band always renders `${N+1}+`. Colors: tint
backgrounds with `text` colored labels per MC1, worst left. *Invariant:* the five
bands partition 0…∞ with no gap or overlap for every valid ladder, including the
minimal `1/2/3`. → M3.

**MC9 — Entry-detail derivation.** For a compacted row: contributing rows = the
member entries of its `(mergeKey, stockState)` group, ordered by location ascending;
each shows its own quantity + state (all states equal by construction) and a config
label `Config: {itemCategory} / {property values, display-cased, keys in MC6 order,
values joined ", "}` (catch-all: `Config: {itemCategory}`; wildcard key renders its
key name + "any"). The merge-explainer note renders only when contributing locations
> 1. All derived from the already-fetched dataset — no additional request. → M2.

**MC10 — PDF data mapping.** The export renders the report dataset under the sheet's
own copy of the filter/grouping state (initialized from the active report query;
sheet toggles mutate the copy only). Sections: states in the export set, MC1 order,
skipping empty states; `· produce first` on the first non-empty section only. Summary
tiles (when enabled): five tiles, full counts per state in the export's grouping mode.
Rows within sections: MC2 order. Report settings box: states included (labels),
grouping ("Compacted across locations" / "Grouped by location"), locations (selected
codes, or all), source line naming the entry count. Filename:
`beyo-stock-YYYY-MM-DD.pdf`, user-local date. Page count in the sheet subtitle is read
from the rendered document. *Invariant:* the PDF's rows equal the app's rows under the
same query (same filter, same order, same quantities). → M6.

**MC11 — Mock/live API seam.** Every stock endpoint function lives in the feature's
`api/` layer with exactly two implementations behind one module boundary: live
(shared `apiClient`) and mock (in-feature fixtures encoding the contract + request
case verbatim). Selection by a single build-time flag (`VITE_STOCK_API_MODE`,
values `mock` | `live`); **the shipped default is `live`** (charter rule 10 —
config-gated code the defaults never reach is not done); development uses `mock`
until backend phases land. *Invariant:* both implementations satisfy the same
TypeScript signatures; grep for the flag outside the `api/` layer returns nothing. → M1.

**MC12 — Transport mechanics.** (a) Location path segments always pass through
`encodeURIComponent` (codes are free case-sensitive strings). (b) 409 handling: read
`error.data.error.details.conflictingId`; if that definition is present in the loaded
location detail, name it (category + criteria chips) in the conflict message, else show
the envelope `message` alone; never retry. (c) WS policy: refetch visible stock data on
every `scan_history_updated`, payload ignored, no debounce — the repo's established
idiom; redundant refetches are accepted (contract §5). → M1, M5.

## 4B. Mechanism contract addenda (coordinator fold-back, 2026-09-01, round 7)

Completions of §4A contracts found under-determined by the plan-1 projection (round 0).
These specify behavior §4A already declared; they introduce no new product semantics, so
the ratification gate is not re-opened. Lettered rather than renumbered per charter.

**MC1a — Loud-fail scope, site and type.** MC1 says unknown wire state strings "fail loud
(thrown error)". That obligation binds at **every exported entry point of
`domain/stock-states.domain.ts`** — `getStockStateMeta` *and* `compareByStateIndex` — not
the display lookup alone. A comparator that tolerates an unknown state resolves its index
to `-1` and sorts it **ahead of `out_of_stock`**: presented as more urgent than an
empty shelf, silently, with no error anywhere. That is the ordering family charter rule 6
names, and it is the precise defect this addendum exists to forbid.

- **Error type:** one exported named class, `UnknownStockStateError extends Error`,
  carrying the offending string. Downstream layers (P4 controllers, P7 badges) must be
  able to discriminate it from any other throw; a bare `Error` makes that impossible.
- **Boundary:** validation is **not** performed at the `api/` wire boundary. Unknown
  states throw where a state is *interpreted* — at the two domain entry points above.
  Rationale: the mock layer and the live layer would otherwise each need their own
  validator, and P2's compaction key would still pass an unknown state through untouched.
  One interpretation site, one throw.
- *Invariant:* for each of the two exported functions, passing a string outside
  `STOCK_STATES` throws `UnknownStockStateError`. → M2.

**MC1b — Comparator contract.** `compareByStateIndex` compares **state values**, not rows:
`(a: StockState, b: StockState) => number`. It returns **exactly `0`** when both states are
equal. MC1's stated invariant ("sorting any permutation of states reproduces the canonical
order") is satisfied by a permutation of five *distinct* values and therefore cannot observe
the equal case; a comparator returning a non-zero constant for equals passes it while
destabilising every downstream sort that uses this as the first key of a chain — MC2 uses it
as key 1 of 5, MC3 as key 1 of 2. Row-level comparators are P2's (MC2/MC3) and compose over
this one. → M2.

**MC2a — The properties comparison string (MC2 key 4).** MC2 orders on "canonical
`properties` rendered to a comparison string (keys in GET 4.1 order, values as returned)".
That sentence does not determine one string: key-order source, value shape, wildcard
rendering, separators and casing are all open, and two implementers would produce two
different total orders while every row still renders. This addendum fixes the rendering.

- **Signature.** `propertiesComparisonString(properties: StockPropertiesDto, keyOrder:
  readonly string[]): string`, pure. `keyOrder` is `StockOptionsDto.propertyOptions`
  mapped to its keys, in payload order, passed in by the caller. Receiving vocabulary as
  a parameter is **not** IO: plan 2's "no IO" clause forbids the function fetching it,
  not being given it. The row comparators are therefore produced by factories —
  `makeCompactRowComparator(keyOrder)`, `makeGroupEntryComparator(keyOrder)` — each
  returning a plain `(a, b) => number` suitable for `sort`.
- **Which keys, in which order.** The keys present on the row, ordered by their index in
  `keyOrder`. A key absent from `keyOrder` (vocabulary drift) is not an error: such keys
  follow all known keys, ordered among themselves by code points. Never throw here — MC6
  already fixed the direction for drift (render, stay visible, never crash).
- **Value tokens.** `null` (wildcard) renders the single token `*` (U+002A). A scalar
  string renders as itself. An array renders its values **in the order returned** — the
  backend canonicalizes (lowercase, dedupe, sort; contract §2), and the client never
  re-sorts.
- **Assembly.** Each key group is the key followed by its value tokens, joined with
  U+001F. Groups are joined with U+001E. Both separators are C0 controls that cannot
  occur in a wire key or value, so no value can imitate a separator; this is what closes
  the collision a printable separator would open, where `{a: ["x,y"]}` and
  `{a: ["x","y"]}` render identically and tie.
- **Comparison.** The assembled string is lowercased, then compared by code points
  (`<` / `>`, never `localeCompare`) — consistent with MC2 key 3's case-insensitive
  category comparison, and it removes casing from the ordering question entirely.
- **Catch-all.** `{}` renders the empty string, which sorts first.
- *Invariant:* equal `properties` objects produce equal strings; objects differing in any
  key, any value, or a wildcard produce different strings. *Residual, accepted:* a wire
  value literally equal to `*` would tie with a wildcard on that key. Unreachable from the
  current vocabulary, and its consequence is an ordering wobble, never a wrong quantity.
  → M2.

**MC3a — Group ranking is computed after the filter.** (Owner decision, 2026-09-01,
plan-2 projection card 1 = A.) The three counts MC3 ranks groups on — `count(out)`,
`count(low)`, `count(medium)` — are computed over the entries that **remain after the
active filter**, not over the group's unfiltered contents. A group with no surviving
entries does not appear.

Recorded rationale, because this reads at first glance as contradicting D13: tiles and
group ranking do different jobs. The counter tiles are a navigation surface, and ignoring
the state filter is precisely what lets them tell you what exists *outside* the view you
have narrowed to (D13 = A). The group ranking orders the rows immediately beneath it; if
it ranked on rows the filter has hidden, the order would argue with the filter just set.
The sharpest case: filter to `{low_in_stock}`; a warehouse with three empty shelves and no
low rows at all would head your low-stock list on the strength of `count(out)`, while
rendering no rows underneath itself. (The projection's card argued A from a summed
problem-count example — design 02's reading, which D11 overrode; the conclusion holds, the
arithmetic in it did not.) Both rules
serve "match what the user is looking at"; they differ because one summarizes the whole
report and the other orders the visible list.

*Invariant:* for any filter selection, group order is a function of the rendered entries
alone. → M2.

## 5. Report data mechanism (owner decision D7 — backend amendment)

The contract-v1.1 report endpoint cannot serve the designed filter sheet without round
trips: compacted rows arrive with quantities pre-merged across locations (so a location
filter is impossible client-side) and GET 4.7 accepts no location parameter; the live
CTA count would cost a request per toggle.

**Resolution:** the owner amends the backend. The frontend's needs are specified in
`../backend_handoff/frontend-report-endpoint-request.md` (the request case, authored
frontend-side, consumed by the backend pipeline). **Landed:** accepted in full as
contract **v1.2** (round 6) — v1.2 §4.7 is now the wire authority for everything below.
In summary the frontend needs **one
unparameterized fetch** returning per-location, uncompacted entries where each entry
carries a backend-computed **merge identity** (`mergeKey`: equal iff `itemCategory` +
canonical `properties` are equal). From that single payload the frontend derives, in its
domain layer: state filtering, location filtering, live CTA counts, the counter tiles,
and the compacted view (group by `mergeKey` + `stockState`, sum quantities, collect
locations) — without re-implementing the backend's property-canonicalization or
equality semantics, which stay backend-owned via the key. Ordering rules (severity
ascending §1; group ordering by problem counts) remain as contract §4.7 defines and are
applied client-side. Covered by M2.

## 6. Operations (API usage summary)

GET 4.1 options (once per wizard entry, cacheable per session) · GET 4.2 locations root ·
GET 4.3 location detail (URL-encoded location) · POST 4.4 create (single-entry batch;
response DTO carries real initial quantity/state — display it, no polling) · PATCH 4.5
update (thresholds always sent as the complete three-row list; refetch both locations
when location changed) · DELETE 4.6 (refetch location detail) · GET report (amended
shape per §5, one unparameterized call).
All errors surface the envelope's `message`; 409 additionally names the conflicting
definition; batch `batchIndex` is irrelevant while creates are single-entry.

## 7. Scope ladder

**Must ship:** screens 01–10 as specified in §3; state color/severity domain module;
mock layer (C2); WS refetch; PDF export; settings entries; conflict + validation
surfacing; empty states (no definitions yet → settings root onboarding framing; empty
report).

**Only if cheap:** catch-all hint in the settings UI (contract §6 suggests it); a
"nothing counted" hint when a location's definitions can miss items; property-options
picker polish (per-category filtering is required, search is optional).

**Mockup corrections (owner-ruled design errors — not product scope, no follow-up):**
location zone display names (`Aisle A`) — codes are the only shared truth (D2);
`Rename` on location detail — the location string *is* the label, renaming it is not a
stock concern (D3); entry-detail `Scanned items` and `Add task` actions — removed
entirely (D4). Layouts adapt to their absence.

**Explicitly deferred (V1 non-goals):** deep links/URL routing; multi-entry batch
create UI; live updates for other users' configuration edits; PDF thumbnails.
`New location` on screen 06 means "open the wizard offering the bootstrap locations
that have no stock instances yet" — never location creation (D3).

## 8. Measurement ledger (root of the trace chain — to ratify)

- **M1 — Definition lifecycle integrity.** A user can create, edit and delete a stock
  definition end-to-end; the created card shows the backend-computed initial quantity
  and state; edits refetch affected locations; a 409 shows the conflict naming the
  existing definition. *Guards: broken CRUD wiring, stale sibling quantities, swallowed
  conflicts.*
- **M2 — Report semantics fidelity.** For a fixed dataset, the rendered report (both
  groupings, any filter combination) equals the contract's ordering, merge and
  count rules — a shortage in one location is never hidden by stock elsewhere.
  *Guards: mis-sorting, wrong compaction, double counting.*
- **M2A — Compaction key integrity** *(added round 6 at the backend's explicit demand —
  contract v1.2 notice §3; under v1.2 no backend check can observe a violation).*
  Compaction groups on `mergeKey` **and** `stockState`, never `mergeKey` alone: identical
  category+properties in different states stay separate rows, so low stock at one
  location is never absorbed into healthy stock elsewhere. **Named mutation:** removing
  `stockState` from the grouping key in the compaction function (at its definition) must
  turn this test red on a fixture holding same-key entries in two states. *Guards: the
  silent shortage-hiding merge — the exact defect the report exists to prevent.*
- **M3 — Threshold ladder correctness.** Only three limits are ever editable; strict
  low < medium < normal (≥ 1) is enforced with the design's push-down behavior; derived
  High/Out rows and the five-band strips agree with the saved limits everywhere they
  appear. *Guards: invalid threshold submissions (400s), inconsistent derived displays.*
- **M4 — Vocabulary closure.** Every selectable location, item category, property key
  and value comes from the bootstrap payload or GET 4.1; free text is impossible in
  criteria; display casing follows the options map while requests carry backend-accepted
  values. *Guards: 400 rejections, phantom keys, casing drift.*
- **M5 — Reactivity.** Report and location-detail views refetch on
  `scan_history_updated` and render the new quantities without user action.
  *Guards: stale stock displays after scans/sales.*
- **M6 — Export correctness.** The generated PDF reflects the active report query and
  sheet toggles, is valid A4 with correct `Page x of y`, repeated headers, and no row
  split across pages, and reaches the OS share sheet (or download fallback) under the
  dated filename. *Guards: query/export divergence, broken pagination, unshareable output.*

*(8A — trace targets: downstream criteria cite either a ledger ID above or a mechanism
contract ID from §4A; nothing else is a legitimate trace root.)*

## 9. Owner decisions — resolved (2026-09-01, round 1)

All eight round-0 cards were answered by the owner in one review pass. No decisions
remain open.

| id | question | owner's answer |
|---|---|---|
| D1 | Fonts | **A** — load Poppins + IBM Plex Mono, scoped to the stock screens. |
| D2 | Zone names | **A** — codes only; the mockups' zone labels ("Aisle A") are incorrect, no such data exists. |
| D3 | `New location` / `Rename` | **A** — dashed row opens the wizard limited to instance-less bootstrap locations; `Rename` is a mockup error (the location string *is* the label) and is dropped. |
| D4 | Entry-detail actions | Mockup error — `Scanned items` and `Add task` are removed entirely; **not even a follow-up**. |
| D5 | Settings entry points | Two row buttons — `Stock report` and `Stock locations` — rendered among the existing rows of the Settings page (`settingsOptionSubscriptions`). |
| D6 | PDF library | **@react-pdf/renderer confirmed**; owner already installed it (`^4.9.0` in package.json). |
| D7 | Report data mechanism | Owner amends the **backend** to serve a round-trip-free shape; the frontend authors a request case stating its needs (see §5 and `../backend_handoff/frontend-report-endpoint-request.md`); the amended contract returns via the backend pipeline as a new contract version. |
| D8 | Test infrastructure | **A** — add vitest + React Testing Library, domain-layer coverage first. |

⚠ OWNER DECISIONS REQUIRED (0) — no decision needs the owner.

**~~Acknowledged external dependency~~ — RESOLVED (round 6):** contract **v1.2**
landed, accepting the request case **in full, unmodified** (notice:
`../backend_handoff/handoff_report_contract_v1_2_notice.md`; our contract copy is now
v1.2). Shape-identical to the request → per this block's own rule, the gate stays
closed and the request case is closed. The endpoint goes live only after backend phase
P5 (unchanged); mock-first building continues, now against the real contract. Original
acknowledgment kept below for the record.

The backend's amended report
contract — the new version of `frontend-api-contract.md` answering
`../backend_handoff/frontend-report-endpoint-request.md` — is still pending. The owner
acknowledges ratifying with it outstanding, on the stated expectation that the counts
and entries the report UI derives all come from **the same single endpoint call** (the
request case's R1–R3). Consequences: report mocks encode the request case's shape until
the amendment lands (C2); implementation phases that hit the live report endpoint gate
on its arrival; and if the amended contract **diverges materially** from the request
case, that is a semantic change that re-opens this gate per the charter (status back to
COLLABORATING) — a shape-identical confirmation just closes the request case.

## 9A. Mechanism-inventory decisions — resolved (2026-09-01, round 5)

All six round-4 cards were answered **A** by the owner (D11 after a plain-language
walkthrough of the two ordering rules — the owner explicitly chose the contract's
out-of-stock-first triage over the problem-sum reading). Answers are folded into the
§4A contracts; the cards are kept below as the decision record.

⚠ OWNER DECISIONS REQUIRED (0) — nothing needs the owner.

**Resolved:** D9 A (wildcard "Any value" ships in the picker) · D10 A (within-state
order: quantity asc, then type, properties, locations — app and PDF alike) · D11 A
(group order: out-of-stock count first, ties by low then medium counts, then name) ·
D12 A (CTA counts the rows actually rendered in the pending mode) · D13 A (tiles
respect the location filter, ignore the state filter) · D14 A (symmetric threshold
push, raising never blocks).

--- original cards (record) ---

**D9 — Wildcard criteria in the wizard.**
**Question:** Should the value picker offer an "Any value" option (creating
`{key: null}` wildcard criteria) in V1?
**Story:** "Chairs with *any* upholstery value" is a real definition the backend
supports — layered under a catch-all it splits upholstered chairs from plain ones. The
wizard mockup shows no way to say it, so without an affordance users simply can't
create wildcards (though we must still *display* ones that exist).
**Branches:** A) one "Any value" row in the picker; chip renders `UPHOLSTERY · any`.
B) display-only in V1; creation deferred.
**Recommendation:** A — one row of UI buys full contract coverage.
**On silence:** gate holds; the criteria-builder contract stays incomplete.
**Trace:** MC6, M4.

**D10 — Row order within a state.**
**Question:** Ratify: within each state, rows sort by quantity ascending (most urgent
first), then item type A–Z, then properties, then locations — everywhere, PDF included?
**Story:** The contract only says "worst state first". Without a total rule the app and
the PDF shuffle equal-state rows differently, and a manager comparing screen to
printout sees two different lists. The PDF mockup itself orders one section 0, 1, 0 —
it follows no consistent rule, so it can't be the spec.
**Branches:** A) ratify. B) name a different rule.
**Recommendation:** A.
**On silence:** gate holds.
**Trace:** MC2, M2.

**D11 — Group ordering interpretation.**
**Question:** Ratify the backend contract's reading — compare groups count-by-count
(most out-of-stock first, ties by most low, then most medium, then location name) —
over the design note's "number of problematic entries" sum?
**Story:** A location with 3 out-of-stock and 0 low would rank above one with 1
out-of-stock and 4 low under the contract's rule, below it under the sum rule. The two
documents disagree; the backend computes nothing here (it's client-side), so we must
pick one.
**Branches:** A) contract's stepwise rule. B) sum of problematic entries.
**Recommendation:** A — the contract is the ratified semantic authority.
**On silence:** gate holds.
**Trace:** MC3, M2.

**D12 — What "Show N entries" counts.**
**Question:** Ratify: the filter CTA counts the rows the list will actually render
under the pending selection — compacted rows when merge is on, per-location entries
when grouped?
**Story:** With merge on, 5 per-location rows may collapse to 2. If the button said
"Show 5" and the list shows 2, the button lies.
**Branches:** A) count rendered rows (mode-dependent). B) always count per-location
entries (mode-independent, may disagree with the visible list).
**Recommendation:** A.
**On silence:** gate holds.
**Trace:** MC5, M2.

**D13 — What the counter tiles ignore.**
**Question:** Do the Out/Low/Medium/Rest tiles respect the location filter (ignoring
only the state filter), or ignore both filters?
**Story:** You filter the report to warehouse L2 to plan its restock. With option A the
tiles summarize L2 — matching the list below them. With option B they keep showing
all-location totals while the list shows only L2, and the numbers stop matching what
you see.
**Branches:** A) respect location filter, ignore state filter. B) ignore both (the
design line "from the unfiltered result" read literally).
**Recommendation:** A — tiles should describe the report you're looking at.
**On silence:** gate holds.
**Trace:** MC5, M2.

**D14 — Raising a threshold.**
**Question:** Ratify symmetric pushing — raising a limit pushes the limits above it up,
just as lowering pushes the ones below down?
**Story:** Low is 5, Medium 15. You tap Low up to 15. Symmetric: Medium slides to 16
and you keep tapping. Clamped: the + button dies at 14 and you must first go raise
Medium, then come back.
**Branches:** A) symmetric push (never blocks). B) clamp at the neighbor (design
mentions only the lowering direction).
**Recommendation:** A — the ladder reads as one scale; dead-end steppers fight that.
**On silence:** gate holds.
**Trace:** MC7, M3.

## 10. Pre-implementation protocol

RATIFIED here → mechanism-inventory (expected load-bearing mechanisms: client-side
compaction/order, property-criteria builder incl. wildcard-vs-omitted, threshold
push-down validation, PDF pagination, mock/live API seam) → implementation-planner.
No plan, prompt or code before this document's header reads RATIFIED.

## 11. Shaping changelog

- **2026-09-01 (round 0, agent draft):** First grounded shaping from backend contract
  v1.1, design handoff 00–10, and repo context docs. Resolutions made without owner
  input (repo-derivable): report-area thumbnails render the mockups' neutral placeholder
  — no image data exists in the report contract and the mockups themselves show
  placeholders; tab-bar visibility mapped to shell mechanics (plain registry pages for
  01/02/06/07, feature-internal pushed views/sheets for 03/04/05/08/09); creates are
  submitted as single-entry batches (no multi-entry UI is designed). All material
  ambiguities routed to §9 cards. Status set to DRAFT pending owner review.
- **2026-09-01 (round 1, owner review):** Owner answered all eight cards in one pass —
  recorded verbatim as D1–D8 in §9. Material consequences folded in: §3 W2 loses the
  entry-detail action row (D4, mockup error); §5 rewritten from "client derives from
  grouped fetch" to "backend amendment + request case" (D7) — the owner corrects the
  backend so the report renders without round trips, against a frontend-authored
  request case at `../backend_handoff/frontend-report-endpoint-request.md`; §7 gains a
  "mockup corrections" tier (D2, D3, D4 are design errors, not deferrals); C2 extended
  to cover the pending report-shape amendment; §2 updated for the installed
  `@react-pdf/renderer` (D6). Status advanced DRAFT → COLLABORATING. The frontend's
  request case for the report shape was authored at
  `../backend_handoff/frontend-report-endpoint-request.md` for the owner to carry to
  the backend pipeline. With zero decisions open, the shaper claims
  READY_FOR_RATIFICATION and presents the ratification surface in-session; RATIFIED
  awaits the owner's explicit approval of that surface.
- **2026-09-01 (round 2, owner review):** Owner confirmed surface points 1–3 (outcome,
  measurement ledger, scope boundaries) and clarified point 4: the empty decision list
  is correct, but the backend's amended report contract is still outstanding — recorded
  in §9 as an acknowledged external dependency (same-single-call expectation, mock
  authority until it lands, material divergence re-opens the gate). Ratification
  awaits the owner's explicit final approval.
- **2026-09-01 (round 3, RATIFICATION):** Owner **David** explicitly approved
  ("perfect, it is approved") the ratification surface presented in-session:
  (1) the outcome statement of §1; (2) the measurement ledger M1–M6 verbatim (§8);
  (3) the scope boundaries incl. the mockup-corrections tier (§7); (4) the empty
  decision list with the acknowledged external dependency of §9. Status written
  RATIFIED. Any material semantic change from here re-opens the gate per the charter.
  Next gate: mechanism-inventory.
- **2026-09-01 (round 4, mechanism-inventory):** Adversarial inventory of the ratified
  intention. Twelve load-bearing mechanisms identified and given contracts in new §4A
  (MC1–MC12), ranked by silent-failure risk (criteria builder, compaction, ordering,
  filter counts, threshold editing at the top). Trace-target note added as §8A. Six
  owner cards opened in §9A: one scope call (D9 wildcard affordance) and five
  ratifications of unilateral resolutions — within-state total ordering incl. ruling
  the PDF mockup's row order non-authoritative (D10), contract-over-design group
  ordering (D11), mode-dependent CTA count (D12), tiles' filter treatment (D13),
  symmetric threshold pushing (D14). No change to ratified product semantics — the
  RATIFIED header stands; the inventory's exit gate (hand to implementation-planner)
  is blocked until the §9A cards are answered.
- **2026-09-01 (round 5, owner review):** Owner answered all six §9A cards: **A on
  every card** (D11 confirmed after an in-session explanation of the two group-ordering
  rules). §4A contracts finalized — no ⚠ remains; §9A converted to a resolution record.
  Mechanism-inventory **exit gate passes**: every silent-failure mechanism carries a
  contract-grade definition. The intention is plan-ready; hand to
  implementation-planner.
- **2026-09-01 (round 6, contract v1.2 landed):** The backend accepted the request case
  **in full, unmodified** — contract reissued as v1.2 (notice at
  `../backend_handoff/handoff_report_contract_v1_2_notice.md`; our stale v1.1 copy
  replaced with v1.2 from branch `warehouse-stock-backend`). Shape-identical to the
  request, so the gate stays closed (per the round-2 dependency rule). Notice
  obligations discharged: ledger entry **M2A** added (compaction on
  `mergeKey`+`stockState`, with the named drop-`stockState` mutation) and cross-linked
  from MC4; §9 dependency marked RESOLVED; request case marked CLOSED. Process lessons
  recorded: future cross-track requests are filed at
  `docs/under_implementation/warehouse_stock/handoffs/frontend/` (not in ad-hoc
  folders), and cross-track citations must be self-contained (the request's
  "intention §9 D7" citation resolved to the wrong document from the backend's reading
  position; its authority claim predated round-3 ratification by hours). Endpoint
  sequencing unchanged: 4.1–4.6 after backend P3, report after P5.

- **2026-09-01 (round 7, coordinator fold-back from plan-1 projection round 0):** Added
  **§4B** (lettered, nothing renumbered) with **MC1a** — loud-fail binds at both exported
  entry points of the state domain, throws a named `UnknownStockStateError`, validated at
  interpretation rather than at the wire boundary — and **MC1b** — `compareByStateIndex`
  compares state values and returns exactly `0` for equals. Both complete obligations §4A
  already declared; the projection showed MC1's stated invariant cannot observe either gap
  (a permutation of five distinct states never compares equals, and an unknown state
  resolves to index `-1`, sorting ahead of `out_of_stock` — silently ranked more urgent
  than an empty shelf). **Status header unchanged (RATIFIED):** these specify declared
  behavior and add no product semantics. Owner notified in the same relay and may declare
  the change material, which re-opens the gate. Owner decisions the same projection
  raised were answered in conversation and folded downstream, not here: the mock/live
  route is an environment fact (master plan §10) and the demo item-category list is
  fixture population (master plan §9 S4a), neither of which is intention content.

- **2026-09-01 (round 8, coordinator fold-back from plan-2 projection round 0):** Added to
  **§4B**: **MC2a** — the properties comparison string, fixing key-order source, value
  tokens, wildcard rendering, separators and casing, because MC2 key 4 as written admits
  several different total orders in which every row still renders correctly and only the
  sequence differs; and **MC3a** — group ranking counts are computed after the active
  filter (**owner card 1 = A**, answered in conversation), with the rationale recorded for
  why this coexists with D13 rather than contradicting it (tiles summarize the whole
  report and so ignore the state filter; the group ranking orders the visible list and so
  must not rank on hidden rows). MC2a completes declared behavior and adds no semantics.
  MC3a resolves an ambiguity §4A left open and was decided by the owner, so it is a
  ratified addition rather than a completion. **Status header unchanged (RATIFIED).**
  Also corrected two lines predating D13's ratification which still described the counter
  tiles as computed "from the unfiltered result": §4's domain line and design handoff
  01 line 10. D13 makes the tiles respect the location filter; only the state filter is
  ignored. Left uncorrected, P7 would have computed the tiles over all locations while
  the list below showed one, which is the precise mismatch D13's story rejected.
