# Master Plan — Stock Locations frontend

**Date:** 2026-09-01 · **Planner:** Claude (Fable 5) · **Charter:** `/Users/davidloorenz/agent-skills/pipeline-charter.md`

## 1. Goal

Implement the stock-locations frontend (configuration area + report area + A4 PDF
export) in `apps/frontend`, per the ratified intention at
`intention/raw_intention.md` — the single authority for product semantics, measurement
ledger (M1–M6, M2A) and mechanism contracts (§4A MC1–MC12). This document never
restates semantics; it fixes the shared skeleton so parallel sessions cannot diverge.

## 2. Sources of truth

| content | artifact |
|---|---|
| Product semantics, ledger, mechanism contracts | `intention/raw_intention.md` |
| Wire contract (endpoints, shapes, errors) | `backend_handoff/frontend-api-contract.md` (**v1.4** — §3/§4.4 the two 409 shapes, 2026-09-01; v1.3 un-elided §4.1 `itemCategories`; v1.2 replaced §4.7) |
| Visual target | `design_handoff/` (00-global once per session + the phase's screen folders) |
| Repo grounding (architecture, design language, PDF lib) | `context/*.md` |
| Shared skeleton, naming registry, environment, tracker | this file |
| Phase goal/tasks/criteria/Review log | `plans/plan_<n>_*.md` (one per phase) |
| Session framing | `prompts/<role>/`, just-in-time, never reused stale |

**Fold-back rule:** semantic changes amend the intention (re-opening its gate if
material); skeleton/naming/environment changes amend this file; a phase plan is never
patched into divergence from either. Cross-track (backend) requests are filed at
`docs/under_implementation/warehouse_stock/handoffs/frontend/` with self-contained
citations (earned: intention changelog round 6).

## 3. Roles, division of labor, session workflow

Roles per the charter: implementer / reviewer / coordinator; prompts compiled
just-in-time by the coordinator; phase state machine `NOT_STARTED → (PROJECTED) →
PROMPT_READY → IMPLEMENTING → IMPLEMENTED → REVIEWING → CHANGES_REQUESTED* → APPROVED`;
checkpoint commit at every IMPLEMENTED (`CHECKPOINT (not approved):` prefix); re-reviews
delta-scoped with verified perimeter.

**Division of labor (owner directive, 2026-09-01) — the implementer is chosen per
phase and is part of the phase's identity:**

| implementer | owns | never touches |
|---|---|---|
| **Codex** (logic phases) | `types/`, `domain/`, `api/`, `stores/`, `controllers/`, `actions/`, `flows/`, test infra, PDF *data assembly* | `ui/` (except scaffolding empty exports the registry names) |
| **Claude** (Fable/Opus — UI phases) | `ui/` components/pages, `index.css` stock additions, shell/settings registration, PDF *document components* | domain/controller/store logic — UI binds through the actions/selectors/domain functions the Codex phases shipped; a gap found there is a finding routed back, never an inline fix |

The seam is enforced by sequencing: every UI phase depends on the APPROVED logic
phase(s) that export its interface. Codex prompts are compiled per the
implementation-executor spec as fully self-contained documents. **UI phases carry an
additional owner gate:** automated criteria prove structure/behavior (RTL), but visual
fidelity to the design screenshots is approved by the owner looking at the running app
— a UI phase reaches APPROVED only after both the review and the owner's visual pass.

## 4. Progress tracker (agents update only their own row)

| phase | title | implementer | state | date | actor | note |
|---|---|---|---|---|---|---|
| P1 | Test infra, types, state system, API seam | Codex | APPROVED | 2026-09-01 | coordinator | approved on coordinator verification (no independent review session — see §3A); 32 tests, 5/5 mutations, lint clean in perimeter |
| P2 | Report domain (compaction, ordering, filters) | Codex | APPROVED | 2026-09-01 | coordinator | approved on coordinator verification (no independent review session — see §3A); round 0 projection routed all 15 ledger rows; 82 tests, 31 new, no orphans; both named mutations re-planted **unfiltered** by the coordinator plus one adversarial third probe, each reddening exactly its predicted row; lint 0/0 in perimeter |
| P3 | Config domain (criteria, thresholds, bands) | Codex | APPROVED | 2026-09-01 | coordinator | approved on coordinator verification (no independent review session — see §3A); 50 tests, 18 new, no orphans, 2/2 mutations (1 re-planted by the coordinator), lint 0/0 in perimeter |
| P4 | Stores, controllers, flows | Codex | APPROVED | 2026-09-02 | coordinator | approved on coordinator verification (no independent review session — see §3A); 106 tests, 24 new, no orphans; C3's named mutation re-planted **unfiltered** by the coordinator plus two adversarial probes (C2, C5), each reddening exactly its row; **C9 shipped hollow** — its fixture reached no properties comparison, so an empty `keyOrder` passed — repaired by the coordinator with `C9(vocabulary)` and proved to fail; lint 0/0 in perimeter |
| P5 | Settings UI (screens 06–07) + stock design tokens | Claude | APPROVED | 2026-09-02 | coordinator | approved on coordinator verification plus **the owner's visual pass** (S5), which is this phase's real gate; no independent review session (§3A); 114 tests, 7 new + 1 coordinator guard, no orphans; C4's named mutation re-planted **unfiltered** (reds C4 alone) and three absence-guard probes recorded; authorized fixture edit confirmed thresholds-only; **F1 fixed by the coordinator** — the settings path never fetched the GET 4.1 vocabulary, so screen 07 rendered wire casing (`teak`) on a cold visit and display casing (`Teak`) after a wizard or report visit; guarded by `C4(cold)` and proved to fail; F2 routed to P6, F3/F5 accepted and recorded; lint 0 in perimeter |
| P6 | Instance wizard UI (screens 08–09) | Claude | APPROVED | 2026-09-02 | coordinator | approved on coordinator verification plus **the owner's visual pass** (S5); no independent review (§3A); 124 tests, 9 new + 1 coordinator guard, no orphans; C8's mutation re-planted **unfiltered** plus a coordinator **reverse** probe proving both entry points are guarded (it reds C8 *and* P5's C3); four guard proofs incl. an S10 argument probe the session designed itself; **F1 fixed before the merge** — a 409 banner outlived the × discard and followed the user onto screens 06/07, unreachable against mocks and routine against the real backend; NUL sentinel fixed and the whole tree byte-scanned clean |
| P7 | Report UI (screens 01–04) | Claude | APPROVED | 2026-09-02 | coordinator | approved on coordinator verification plus **the owner's acceptance pass** (S5; polish deferred, §7D); no independent review (§3A); 133 tests, 9 new, no orphans; C1's mutation re-planted **unfiltered** reddening C1–C8 as reported; seven guard/argument probes recorded; the coordinator's own probe deleted the `settings-stock-report` registry entry — the exact defect P5 shipped — and reds C9 alone, so the dead-row class is finally guarded; run on a **shared tree** with the owner's parallel visual work, handled per **S11** on both sides; lint 0 in perimeter |
| P8 | PDF data assembly + delivery | Codex | APPROVED | 2026-09-02 | coordinator | approved on **two** coordinator passes (no visual gate, §3A); 146 tests, 13 new, no orphans; the first pass (`b908c10`, a different session) found and repaired an **S10 hole** — the initializer's `propertyKeyOrder` was unobserved, 12/12 green with it deleted — adding `C5(keyOrder)`; the second re-ran every probe **unfiltered** (M1 reds C5 alone, PA reds C5(keyOrder) alone) and found one more: a UTC `pdfFilename` did **not** red C6, whose inputs were both `23:30` and so discriminated only under a negative UTC offset — **a test whose power depends on the machine's timezone**; C6 now asserts both ends of the day, no production change; owner card answered **B**, recorded as **§4B MC10a**; lint 0 in perimeter |
| P9 | PDF document + Generate sheet UI (screens 05, 10) | Claude | NOT_STARTED | — | — | — |
| P10 | Live integration (gated on backend P3/P5) | Codex | NOT_STARTED | — | — | **Backend gate met** — the backend track finished on `warehouse-stock-backend` (owner, 2026-09-02). Branch merges into `main` **after P6 is APPROVED**, before P7 (§7A): zero-file overlap, all seven routes and the `{data}` envelope match the shipped api layer. P10 is now live-data verification and repair, not a wait — §7A lists the seven checks a green frontend suite cannot make |

**Projection gate (owner decision, 2026-09-01 — revised):** **P2 only.** It was mandatory
for P2 and P3 and was additionally run on P1 by owner directive, where it earned its keep
(26 routed decisions, zero of six criterion rows writable as they stood). It is now retained
only for P2, whose compaction mechanism is the project's one silent-failure-critical
mechanism, and waived for every other phase. Waiver rationale: P1 was the foundation nine
phases bind to; the remaining phases have no comparable leverage, and the owner's scope
decision in §3A applies.

## 3A. Review policy (owner decision, 2026-09-01)

**Standing constraint from the owner:** this app is a working interim build, to be rebuilt
from scratch later. The goal is software that works for its users, not a codebase optimised
for long-term maintenance. Review effort is therefore spent only where a defect would be
**silent and user-visible**, never on process hygiene whose cost lands on future maintainers
who will not exist.

| phase | review |
|---|---|
| P2 | **Independent review session**, scoped to the compaction and ordering mechanisms — not a full checklist |
| P1, P3, P4, P8, P10 | **No review session.** The coordinator consumes the implementer handoff adversarially: perimeter against the tree, named mutations executed and correctly sited, orphan-test enumeration, and independent re-derivation of any measured claim |
| P5, P6, P7, P9 (UI) | **No review session.** The owner's visual pass against the running app is the gate, alongside the phase's RTL criteria |

Why P2 keeps its review: compaction groups on `mergeKey` **and** `stockState`. Grouping on
`mergeKey` alone merges a shortage in one location into healthy stock in another — the report
shows a comfortable number, nobody reorders, the shelf is empty. No backend check can observe
it (contract v1.2 §4.7 moved the obligation to the client), and it does not announce itself in
testing unless someone looks for it. That is the one place where being wrong is both silent
and expensive.

**Honesty rule for this policy:** a phase approved without an independent review says so in
its tracker note and Review log. "APPROVED" here means the coordinator verified it, not that
a second agent re-derived it — the record must never imply more scrutiny than was bought.

## 5. Contract resolution

The repo has no `architecture/*.md` contract system (verified — `context/frontend-architecture.md`).
Baseline = charter standing rules + the conventions extracted into
`context/frontend-architecture.md` §2–§7, which implementing sessions treat as the
pattern authority (read implementation files only to learn what exists).

## 6. Shared skeleton & naming registry (fixed — do not improvise)

**One feature module:** `src/features/stock/`.

**Types** — `types/stock.dto.ts` (wire: `StockStateDto`, `StockOptionsDto`,
`StockLocationSummaryDto`, `LocationStockDto`, `StockThresholdDto`,
`CreateStockConfigurationsRequestDto`, `StockReportEntryDto`, `StockReportResponseDto`,
`StockErrorEnvelope`) · `types/stock.types.ts` (view: `StockState`, `StockStateMeta`,
`CompactedReportRow`, `ReportLocationGroup`, `StockFilterState`, `WizardDraft`,
`ThresholdDraft`, `StockInternalView`).

**The state union — exactly one literal-bearing home** *(amended 2026-09-01, projection
F3: the registry and S2 previously disagreed, and no reading of the two satisfied both)*:
`StockStateDto` in `types/stock.dto.ts` is the wire union written out as string literals
(`"out_of_stock" | … | "high_in_stock"`), and it is the **only** type that names them.
`StockState` in `types/stock.types.ts` is a derived alias — `type StockState =
(typeof STOCK_STATES)[number]` — carrying no literals, so `stock.types.ts` stays off the
S2 allowlist. Domain, stores, controllers, UI and PDF all import `StockState`.

**Domain** — `domain/stock-states.domain.ts` (MC1 + MC1a/MC1b: `STOCK_STATES`,
`STOCK_STATE_META`, `getStockStateMeta`, `compareByStateIndex`, `UnknownStockStateError`).
`STOCK_STATES` is a `readonly` tuple of the five state-name strings in contract §1 order
(**not** an array of meta objects — that keeps the derived alias above literal-free and
makes "exactly five and only five" a type-level fact); `STOCK_STATE_META` is a
`Record<StockState, StockStateMeta>` holding the fifteen design hexes. Exact comparator
signature, per intention MC1b: `compareByStateIndex(a: StockState, b: StockState): number`,
returning exactly `0` for equal states. Both exported functions throw
`UnknownStockStateError` on a string outside `STOCK_STATES` (MC1a). It additionally exports
`countByStateBucket(states: Iterable<StockState>) => { out: number; low: number; medium: number;
rest: number }` *(added 2026-09-01, plan-2 projection L11)* — the single place that knows which
states are problems and which make up "Rest". MC5's tiles and MC3's group ranking both need that
split; without this export the report domain would have to spell state names or restate order
indices, which MC1 forbids and which the shipped C6(c) allowlist guard would turn red. Bucket keys
are deliberately `out`/`low`/`medium`/`rest`, not the wire names, so the allowlist stays satisfied
unchanged. · `domain/stock-report.domain.ts`
(MC2–MC5, MC9: `compactEntries`, `makeCompactRowComparator`, `makeGroupEntryComparator`,
`compareGroups`, `applyStockFilters`, `countPendingRows`, `computeCounterTiles`,
`deriveEntryDetail`, `buildReportView`) · `domain/stock-criteria.domain.ts` (MC6: `buildCriteria`,
`renderCriteriaChips`, `displayValueFor`) · `domain/stock-thresholds.domain.ts`
(MC7+MC8: `commitThreshold`, `deriveBands`) · `domain/stock-pdf.domain.ts` (MC10:
`buildPdfModel`, `pdfFilename`).

**The report pipeline has one owner** *(added 2026-09-01, plan-2 projection F1)*.
`buildReportView(entries, filter, keyOrder)` composes the report in this order and no
other: **compact → filter (re-quantifying over the selected contributing locations only)
→ sort**. Without it the composition lands inline in a P7 component, whose review is an
owner visual pass, and compact-then-filter *without* re-quantification returns each row's
full cross-location quantity — the row renders, the number is simply too high, and nothing
errors. That is M2A's defect family arriving through a second door while C2 guards the
first. `countPendingRows` compares against what this function returns.

**`CompactedReportRow` carries its contributions** *(plan-2 projection F3)*. The P1 shape
kept only `locations: string` — the rendered `H1 · LC1` join — so per-location quantities
were gone by the time MC5's re-quantification and MC9's entry detail needed them. The type
gains `contributions: { location: string; quantity: number }[]`, sorted by location code
points, and `locations` is derived from it rather than stored independently.

**The report controller owns the `buildReportView` call** *(added 2026-09-01, coordinator lint
of plan 4)*. P2 proved the composition *order* with a named mutation; nothing proved that the
call is made correctly. Plan 4 C9 puts it under an automated criterion in the controller —
which is where this plan's own goal sentence puts orchestration of "API + domain + stores" —
rather than in a P7 component whose review is an owner visual pass. The controller also hydrates
GET 4.1 options, because `buildReportView` needs `propertyOptions` key order for MC2 key 4 and
the report screen has no other reason to fetch them; an empty `keyOrder` sorts deterministically
in the *wrong* order, observable nowhere.

**Comparators are factories, not bare functions** *(intention §4B MC2a)*. MC2's key 4
renders `properties` against the GET 4.1 key order, which the comparator cannot fetch.
`makeCompactRowComparator(keyOrder)` and `makeGroupEntryComparator(keyOrder)` take that key
list and return a plain `(a, b) => number`. Receiving vocabulary as a parameter is not IO.

**API** — one file per endpoint, one exported function each. **Signatures are fixed here**
(added 2026-09-01, projection L15 — P4's controllers and every UI phase bind to them, and
the P1 seam criteria cannot be written without them). Every function returns the payload
**unwrapped** — the `{ data: … }` envelope is stripped inside `api/` and never travels:

| file | function | signature |
|---|---|---|
| `get-stock-options.api.ts` | `getStockOptions` | `() => Promise<StockOptionsDto>` |
| `get-stock-locations.api.ts` | `getStockLocations` | `() => Promise<StockLocationSummaryDto[]>` |
| `get-stock-location-detail.api.ts` | `getStockLocationDetail` | `(location: string) => Promise<LocationStockDto[]>` |
| `create-stock-configurations.api.ts` | `createStockConfigurations` | `(body: CreateStockConfigurationsRequestDto) => Promise<LocationStockDto[]>` |
| `update-stock-configuration.api.ts` | `updateStockConfiguration` | `(id: string, patch: Partial<Pick<LocationStockDto, "location" \| "itemCategory" \| "properties">> & { thresholds?: StockThresholdDto[] }) => Promise<LocationStockDto>` |
| `delete-stock-configuration.api.ts` | `deleteStockConfiguration` | `(id: string) => Promise<void>` |
| `get-stock-report.api.ts` | `getStockReport` | `() => Promise<StockReportEntryDto[]>` |

**Endpoint paths carry no `/api` prefix** *(amended 2026-09-01, projection F1 — the
highest-severity finding of round 0)*. `VITE_API_BASE_URL` already ends in `/api`
(`http://192.168.1.246:4000/api`), and `apiClient` prepends it. Verified: of every
endpoint literal in `src/`, **zero** begin with `/api`. So the argument passed to
`apiClient` is the contract §4 path **minus** its leading `/api`:
`/stock/options` · `/stock/locations` · `/stock/locations/:location` ·
`/stock/configurations` · `/stock/configurations/:id` · `/stock/report`.
Writing the contract path verbatim yields `…/api/api/stock/…`, which no P1 test can
observe and which first breaks at P10.

Seam: `api/stock-api-mode.ts` reading `import.meta.env.VITE_STOCK_API_MODE`
(`"mock" | "live"`, **default `"live"`**, MC11) · mocks in `api/mocks/` (fixtures named
`<endpoint>.fixture.ts`, encoding contract v1.4 examples + §4.1 vocabulary verbatim).

**Flag read site** *(projection L10)*: `stock-api-mode.ts` exports a **function**
(`resolveStockApiMode(): "mock" | "live"`) that reads `import.meta.env` **on each call**,
not a module-level `const`. A top-level constant makes the three C5 mode rows untestable in
one run without `vi.resetModules()` + dynamic import; the tempting alternative — a mutable
module variable with a setter — would create a runtime switch the UI could reach, which is
exactly what S3 exists to prevent.

**Mock mutation semantics** *(projection F7)*: the mock layer holds **module-level in-memory
state for the session**. `createStockConfigurations` appends and returns the created
`LocationStockDto[]` with a plausible non-zero `quantity`/`stockState` (contract §4.4: the
real response never returns 0 by default); `updateStockConfiguration` mutates and returns
the row; `deleteStockConfiguration` removes it; the GET mocks read that same store, so a
refetch after a mutation reflects it. Constant-returning stubs satisfy the seam criteria
perfectly and leave the demo incoherent — a definition created in the P6 wizard would vanish
from the P5 location detail that refetches a moment later, discovered at an owner visual
pass five phases downstream. Each mock module exports a `__resetMockState()` used by test
setup so state never leaks between tests.

**Stores** — `stores/stock-settings.store.ts` · `stores/stock-report.store.ts` ·
`stores/stock-wizard.store.ts` · `stores/stock-navigation.store.ts` (internal view
stack for pushed screens/sheets; view ids: `report`, `report-entry-detail`,
`report-filter-sheet`, `report-pdf-sheet`, `locations-root`, `location-detail`,
`wizard-step1`, `wizard-step2`).

**Controllers / actions / flows** — `controllers/stock-settings.controller.ts`,
`controllers/stock-report.controller.ts`, `controllers/stock-wizard.controller.ts` ·
`actions/stock.actions.ts` (single facade) · `flows/use-stock-report.flow.ts`,
`flows/use-stock-settings.flow.ts` (both subscribe `scan_history_updated`, MC12c).

**The vocabulary has three loaders, not two** *(amended 2026-09-02, P5 consumption)*. GET 4.1
options are needed by anything that renders a property value, because `displayValueFor` maps wire
casing to display casing. The wizard controller (`ensureWizardOptions`, cached) and the report
controller (alongside the report, plan 4 C9) both load it — and `use-stock-settings.flow` now does
too, through the facade's `ensureOptions`, because screen 07 renders chips and previously showed
`teak` where every other screen shows `Teak`. **A new screen that renders a property value owns
loading the vocabulary**; inheriting it from wherever the user happened to go first is the defect,
not the design.

**UI** (Claude phases) — pages `ui/StockReportPage.tsx`, `ui/StockLocationsPage.tsx`;
pushed views `ui/StockLocationDetailView.tsx`, `ui/StockWizardStep1View.tsx`,
`ui/StockWizardStep2View.tsx`, `ui/StockEntryDetailView.tsx`; sheets
`ui/StockFilterSheet.tsx`, `ui/GeneratePdfSheet.tsx`; parts `ui/StockStateBadge.tsx`,
`ui/StockPropertyChips.tsx`, `ui/StockCounterTiles.tsx`, `ui/StockThresholdStrip.tsx`,
`ui/StockThresholdLadder.tsx`, `ui/StockFloatingPill.tsx`; PDF components under
`ui/pdf/StockReportPdf.tsx` (+ registered fonts in `src/assets/fonts/`).

**Shell wiring** — page ids `settings-stock-report`, `settings-stock-locations`; both
registered as **plain pages** (tab bar stays visible — design 00-global) in
`HomeFeature.tsx` via `lazy-pages.tsx` (`LazyStockReportPage`,
`LazyStockLocationsPage`); settings rows appended to `settingsOptionSubscriptions`:
`{ id: "settings-stock-report", label: "Stock report" }`,
`{ id: "settings-stock-locations", label: "Stock locations" }` (D5).

**Fonts/typography** — Google-Fonts import for Poppins (400/500/600/700) + IBM Plex
Mono (400/500) added to `index.css`; scope class `.stock-area-font` (precedent:
`.auth-modern-font`); PDF uses subsetted TTFs in `src/assets/fonts/` via
`Font.register` (CSS imports are unusable in PDF — context/pdf-library.md).

**Tests** — vitest + @testing-library/react + @testing-library/user-event + jsdom (all
already installed — §10). Setup `src/test/setup.ts`; test files colocated as
`<name>.test.ts(x)` beside their source. Script: `"test": "vitest run"`.

*Config* — `vitest.config.ts` **merges** the app's vite config rather than replacing it
*(amended 2026-09-01, projection L19)*:
`export default mergeConfig(viteConfig, defineConfig({ test: { … } }))`. A standalone
config silently drops the react, tailwind and svgr plugins inside tests — harmless in P1,
which has no JSX and no `?react` import, and fatal to every RTL phase from P5 on.

*Globals* — **explicit imports**, not `globals: true` *(projection L16)*:
`import { describe, it, expect, vi } from "vitest"`. `globals: true` requires
`"vitest/globals"` in `tsconfig.app.json`'s `types` array (currently `["vite/client"]`) —
a file outside P1's declared perimeter, so the typecheck criterion would force an
undeclared edit.

*jest-dom setup specifier* — `import "@testing-library/jest-dom/vitest"` *(projection L18)*.
The bare `@testing-library/jest-dom` entry point (v7) augments jest's namespace, not
vitest's: silent in P1, which makes no DOM assertions, and a typecheck failure at P5.

**Naming rules:** kebab-case files with layer suffixes exactly as above; booleans
`is`/`has`/`can` prefixed; no new abbreviations; every exported helper has a caller in
the same phase (charter rule 4).

## 7. Sequencing & gates

Linear: P1 → **P3 → P2** → P4 → P5 → P6 → P7 → P8 → P9 → P10. A phase starts only when the
previous is APPROVED. **P2 and P3 were swapped on 2026-09-01** (plan-2 projection F5); phase
IDs are unchanged, only their order. The declared dependency ran backwards: plan 3's content
(`stock-criteria.domain.ts`, `stock-thresholds.domain.ts`, reading MC6–MC8 and contract
§2/§4.1) touches nothing plan 2 produces, while plan 2's MC9 config label needs
`displayValueFor` — which plan 3 builds, and which MC6's round-trip invariant forbids
copying. Building the report domain first would have forced either a second casing map or
an invented parameter convention. Rationale for the block order (logic P1–P4, then UI P5–P7, then
PDF P8–P9, then integration): every Claude phase starts with its entire interface
APPROVED, so the owner can dispatch Claude exactly at P5, P6, P7, P9 and review UI
without logic churn underneath.

### 7A. The backend merge — a step between P6 and P7 *(owner instruction, 2026-09-02)*

The backend track **finished** on branch `warehouse-stock-backend`. The owner wants it merged
into `main` **after P6 is APPROVED**, before P7 — not at P10 — so real endpoints, real
interactions and real data can be exercised as soon as the settings and wizard flows exist.
That is the right moment: after P6 the create / edit / delete workflows are complete, and those
are the ones that need real data. P7–P9 (report UI, PDF) then continue on a merged tree.

**The merge itself is trivial, verified read-only on 2026-09-02** (frontend worktree only; the
backend branch was not touched):

- Merge base `4424a3b`. `main` is 26 commits ahead, `warehouse-stock-backend` 29.
- `main` changed **117 files, all under `apps/frontend/`**. The backend branch changed **74
  files, all under `apps/backend/` and `docs/under_implementation/`**.
- **The intersection of the two change sets is empty.** Zero files were touched on both sides,
  so there is no textual conflict surface at all. Root configs and lockfiles are untouched by
  both.

**The seams line up too**, checked against the shipped frontend api layer:

- Router mounted at both `/stock` and `/api/stock` (`apps/backend/src/server.ts`).
- All seven routes match what the frontend calls, one for one: `GET /options`, `GET /locations`,
  `GET /locations/:location`, `GET /report`, `POST /configurations`,
  `PATCH /configurations/:id`, `DELETE /configurations/:id`.
- Response envelope is `{ data }`, which is what `apiClient` unwraps.

**So the merge is not the work — verification after it is.** A clean merge proves only that no
two edits collided; it proves nothing about whether the backend's payloads match contract v1.4.
What P10 must check on real data, none of which a green frontend suite can tell us:

1. **Property value casing.** Contract line 34 says the backend normalizes to lowercase. Our
   fixtures were corrected to wire casing (S4c) and `displayValueFor` maps back up. If live
   payloads come back capitalized, chips still render — just via the fallback branch — and
   nothing errors.
2. **`mergeKey` stability and semantics.** The entire P2 compaction groups on it. A `mergeKey`
   that varies per row, or that already includes state, silently changes every quantity on the
   report.
3. **`stockState` vocabulary** must be exactly the five MC1 values; anything else throws through
   `requireStockState`.
4. **`propertyOptions` key order**, which is the report's sort vocabulary (plan 4 C9 / MC2a).
   Order is meaningful, not decorative.
5. **The 409 envelope** — `details.conflictingId` present on stored-definition conflicts (S9).
6. **DELETE returns `{ ok: true }`**, not a `{ data }` envelope; confirm `apiClient` tolerates
   that on a void return.
7. **`VITE_STOCK_API_MODE`** must move off `mock` for any of this to be exercised at all.

P10's original gate (config endpoints after backend P3, report after backend P5 — contract §7)
is **met**; P10 is now verification-and-repair against live data rather than a wait.

### 7B. The merge is done *(2026-09-02)*

`warehouse-stock-backend` was merged into `main` immediately after P6 was APPROVED, as a
`--no-ff` merge commit. **It applied with zero conflicts**, exactly as the reconnaissance
predicted. Pre-merge `main` was `e1073aa`; reverting is `git reset --hard e1073aa` if it is ever
needed. The backend branch itself was not modified.

Post-merge state, verified:

- **Frontend: 19 files / 124 tests passing, typecheck clean** — unchanged by the merge, as
  expected from the empty file intersection.
- **Backend: typecheck clean, but only after `npm run prisma:generate`.** On the merged tree it
  first failed with 8× `Property 'locationStock' does not exist on type 'TransactionClient'`.
  That is a stale generated Prisma client, not a merge defect: `model LocationStock` is present
  in `prisma/schema.prisma` and migration `20260901180407_add_location_stock` exists, but the
  client in `node_modules` predates them. **Anyone else pulling this merge must run
  `prisma:generate` too**, and a database that has not seen that migration needs
  `prisma:migrate:deploy`.
- `apps/backend` has **no test script** (`npm test` exits 1 by design), so the backend carries no
  automated suite to run here. Its verification is the runbook below.

**The backend track shipped its own end-to-end runbook** at
`docs/under_implementation/warehouse_stock/verification/end-to-end-runbook.md` — fixtures, the
scanner movement path, return-to-store, the Shopify webhook and sales paths (both worker-gated),
failure isolation, deletion/fallback, and a totals check that names its own trap. It is the right
companion to §7A's seven checks: §7A is what the *frontend* needs proven about the payloads, the
runbook is what the *backend* needs proven about the data underneath them.

### 7C. The seven live-data checks are discharged *(2026-09-02)*

Verified against the real SQLite database and the merged backend source, after the owner applied
migration `20260901180407_add_location_stock` and created three real definitions through the
wizard (two on `H1`, one on `O2`). **All seven §7A checks pass; no frontend change was needed.**

| # | check | result |
|---|---|---|
| 1 | property value casing | **Lowercase on the wire, as contract line 34 promised.** Stored rows carry `"cherry"`, `"elm"`, `"inside extension"`, `"down"`, `"up"`. The vocabulary carries display casing (`Cherry`, `Inside Extension`, `Down`), and `displayValueFor` matches case-insensitively, so multi-word values round-trip. S4c's fixture correction was right. |
| 2 | `mergeKey` semantics | **`itemCategory` + `\|` + `propertiesCanonical`** (`get-stock-report.query.ts:14`) — **no location, no stockState.** Exactly what P2 assumed: the client appends `stockState` itself and compacts the same definition across locations into one row with contributions. |
| 3 | `stockState` vocabulary | `out_of_stock` on all three rows — `STOCK_STATES[0]`. In the MC1 vocabulary, so `requireStockState` does not throw. |
| 4 | `propertyOptions` key order | **Identical to the fixture**, key for key: `wood_type, years, weight_definition, country, shape, extension_type, extension_quantity, upholstery`. MC2a's ordering and plan 4's C9 `keyOrder` are safe. |
| 5 | the 409 envelope | Both v1.4 shapes exist and are built where expected: stored-definition conflicts throw `{conflictingId, batchIndex}` — **`conflictingId` present** — and intra-batch conflicts throw `{batchIndex, conflictsWithBatchIndex}` with no id. **S9 was right**: the second is unreachable while every create is a single-entry batch. |
| 6 | DELETE's response | Backend returns `{ ok: true }`; the frontend already types it `{ ok: boolean }` and returns `void`. No mismatch. |
| 7 | `VITE_STOCK_API_MODE` | Live — anything but `mock` resolves to `live`. |

**Two operational notes learned here, not predicted by §7B.** The stale Prisma *client* and the
unapplied *migration* are separate failures with different symptoms: the client shows up as
`Property 'locationStock' does not exist on type 'TransactionClient'` at **typecheck**, the
migration as `The table main.LocationStock does not exist` as a **500 at runtime** on the settings
screen's first call. And `prisma migrate deploy` fails with `database is locked` while the dev
server holds the SQLite file — **stop the backend, migrate, restart**.

**What the real data does not yet show.** All three definitions sit at `quantity 0` /
`out_of_stock` because nothing has been scanned into them. So the report screen has no non-zero
row, the counter tiles are degenerate, and **MC3a's group ranking cannot be seen**. P7's owner
visual pass needs at least one definition holding stock; the backend track's
`verification/end-to-end-runbook.md` §2 (the scanner path) is how to get one.

### 7D. Visual polish is deferred to a pass after implementation *(owner, 2026-09-02)*

The owner exercised the duplicate-definition path against the real backend and **saw the conflict
banner** — so P6's finding **F3 is discharged**: the 409 UI, which the mock layer could never
render, works end to end. The owner also has visual changes they want, and has decided to
**collect them and apply them after the implementation phases are finished** rather than round-trip
each phase now.

**What this means for the record.** A UI phase's `APPROVED` (P5, P6, and P7–P9 to come) means
*the owner accepted it as functionally correct and good enough to keep building on* — **not** that
it is visually final. S5 said the owner's visual pass is the gate; that gate is still the gate, but
it is now explicitly a two-stage one: acceptance during the phase, polish in a single later pass.
No phase should be reopened for appearance alone in the meantime, and no later session should read
`APPROVED` as "the design is signed off".

The polish runs **concurrently with the implementation phases**, not only after them — the owner
edits screens while later phases build; **S12** carries the protocol that makes that safe.

Findings already parked for that pass, so it does not start from a blank page: P5 F3 (Settings tab
not highlighted on the stock pages), P5's approximations list, P6 F4 (tab bar visible on screens
08/09 where the design hides it; Poppins italic not loaded, so "Any value" is synthesized), and P6's
own approximations list. Each is recorded in its phase's Review log and handoff.

## 8. Tool protocols

No archgraph in this repo — skip silently. No other per-session tools. Checkpoint
commits per charter review protocol (standing owner authorization assumed from the
pipeline; the gate commit closes each phase).

## 9. Standing rules

Charter standing rules 1–16 apply. Project-specific additions:

- **S1:** UI code never imports from `api/` directly — only actions/selectors/flows.
- **S2:** State **hex** values appear in `domain/stock-states.domain.ts` and nowhere else.
  State **name strings** appear only in `domain/stock-states.domain.ts`,
  `types/stock.dto.ts` (the wire union) and `api/mocks/*.fixture.ts` (contract-verbatim
  data). Every other file — domain, store, controller, action, flow, ui, pdf — reaches a
  state through `STOCK_STATES` / `STOCK_STATE_META` / `getStockStateMeta` /
  `compareByStateIndex` (MC1). The scan is an allowlist **set equality** over
  `src/features/stock`, never an occurrence count, and is part of review.
  - **Scan input set:** `**/*.ts` and `**/*.tsx` under `src/features/stock`, **excluding
    `**/*.test.ts` and `**/*.test.tsx`**. Tests are colocated with their sources and
    legitimately contain the forbidden strings — C2(b) must assert the fifteen hexes,
    C2(a) the five names, and the scan's own test file must contain the search terms.
    Without this exclusion every assertion fails on the tree P1 itself must produce
    (projection F2). Raw source text, case-insensitive for hex.
  - **Order indices are NOT a scan subject** *(projection L5)*: `STOCK_STATES` array
    position *is* the index, so no numeric literal encodes it anywhere and a scan for one
    would have no honest target. A rule whose scan cannot observe a violation is
    decoration (charter rule 15).
  *(Amended twice on 2026-09-01: the original blanket ban collided with the report fixture,
  which cannot carry `stockState` values without state name strings; the amended version
  then collided with the phase's own colocated tests. Both were guards no phase could pass.)*
- **S3:** `VITE_STOCK_API_MODE` is read in exactly one file (`api/stock-api-mode.ts`).
- **S4:** Mock fixtures copy contract v1.4 examples verbatim — a fixture that "improves"
  on the contract is a defect. **Scope clause:** S4 governs *shape and vocabulary* — no
  invented field, no value outside the contract's own vocabulary. It does **not** freeze
  the fixture *population*: a fixture may contain additional entries built entirely from
  contract-legal values in order to exercise an obligation the contract places on the
  client (e.g. §4.7's same-`mergeKey`/different-`stockState` case, which the contract
  demands the client handle and its example does not itself contain). Such an entry is
  contract-faithful; inventing a field or a value is not.
- **S4a — the item-category list (contract v1.3, 2026-09-01).** `itemCategories` is
  **28 values**, in payload order, taken verbatim from contract §4.1:
  `Dining Chairs, Easy Chairs, Armchairs, Sofas, Stools, Seating Benches, Serving Trolleys,
  Dining Tables, Bedside Tables, Coffee Tables, Side Tables, Hall Tables, Writing Desks,
  Nest Of Tables, Sideboards, Highboards, Bookshelves, Shelving Units, Chest of Drawers,
  Secretary Cabinets, Bar Cabinets, Wardrobes, Storage Cabinets, Posters, Mirrors,
  Porcelain, Carpets, Lamps` (count 28, derived by parsing the §4.1 payload; all distinct).
  It is a static `as const` list on the backend — not derived from Shopify product types,
  does not vary by shop, does not grow on its own.
  - **Superseded: the nine-category rule.** Until 2026-09-01 this rule named nine categories,
    inferred from the `categories` column of §4.1's property table because the payload example
    elided the list with a literal `...`. **The inference was wrong** — that column answers
    "which categories get an extra property", not "which categories exist", and is a strict
    subset by construction. The backend confirmed 28 and reissued the contract as v1.3 with
    the list written out. Against current data the 19 missing categories hold **152 unsold
    units** (largest: Sideboards 41, Mirrors 19, Chest of Drawers 17); a wizard offering only
    nine would have made them permanently unconfigurable **with nothing erroring** — the user
    simply never finds `Sideboards` and cannot learn why.
  - **The "22 of 28" wording in the backend's answer document is closed, not routed** *(owner
    ruling, 2026-09-02)*. That document says "twenty-two of the 28" in prose where its own two
    other statements say 19. The owner has ruled it out of scope: the vocabulary reaches the
    client **only** through `GET /stock/options` at runtime, and the frontend hard-codes neither
    the list nor any count — verified on the tree, where the sole occurrences outside mock
    fixtures are empty-array fallbacks. A prose miscount in a backend document therefore cannot
    produce a wrong number in this app, and the real endpoint settles the question at P10
    integration. **No cross-track handoff will be filed.** What survives is the *shape* hazard
    below, which holds whether the number is 19 or 22.
  - **The sentinel `"unknown"` is deliberately absent** and cannot be configured. Items whose
    Shopify product type matches nothing land on it and are counted by no definition.
  - **19 of the 28 carry no category-specific property at all** and are configured with the
    four universal keys alone (`wood_type`, `years`, `weight_definition`, `country`). Only the
    six table types and three chair types appear in the property table's `categories` column.
    *(The backend's answer document states "twenty-two" in one line; that contradicts its own
    text twice and our own derivation — 28 total minus 9 with category-specific properties is
    **19**. Correction sent to the backend track; 19 is the number this project uses.)*
- **S4b — example vs. final table** *(projection L26)*: where contract §4.1's JSON example
  and its "final vocabulary" table disagree (the example gives `shape` one category, the
  table gives six), **the table wins** — it says of itself that it is "the exact payload
  content, safe to hardcode in mocks". Recorded so no reviewer re-derives it.
- **S4c — fixtures carry wire casing, not display casing** *(added 2026-09-01, plan-2
  projection F6)*. Contract §2 states the backend normalizes property values (lowercase,
  dedupe, sort) and that responses return that canonical form — `"Teak"` becomes
  `["teak"]`. Display casing lives in exactly one place, GET 4.1's `propertyOptions.values`,
  and is recovered by MC6's case-insensitive match. So a **response** fixture writes
  lowercase values; only the options fixture is display-cased. Two report fixtures carried
  `shape: ["Oval"]` beside correctly lowercased siblings; corrected. All 32 tests stayed
  green before and after, which is the point: the defect is invisible to the suite. Left in
  place it would have made P3's display-casing map read as a correct no-op in every test —
  because the input was already display-cased — and the first live payload would render
  `oval` in the entry detail.
- **S8 — a prompt gate is tested against the tree the session will meet, not the tree the
  coordinator is standing in** *(added 2026-09-01, after the P3 round-1 halt)*. The P3 prompt's
  gate demanded `NOT_STARTED`; it was self-tested and passed, and then the very next commit
  advanced the tracker to `PROMPT_READY` and invalidated it. The session halted, correctly, and
  reported. Before queueing any prompt, re-run its gates **after** the last commit that touches
  the artifacts they read — a gate self-tested mid-amendment proves nothing about dispatch time.
  Tracker gates in particular should assert the state the coordinator is about to leave the phase
  in, and should also exclude the already-ran states (`IMPLEMENTING`, `IMPLEMENTED`, `APPROVED`),
  which is the check that actually protects against a double dispatch. **State that the check
  reads the state *cell*, not the row** — a note cell legitimately mentions other phases' states,
  and a row-wide match on `APPROVED` will trip on it. That variant was caught in self-test on
  the P2 prompt, one phase after the halt that produced this rule.
- **S9 — contract v1.4's second 409 shape is unreachable in V1, and our handling was already
  correct** *(added 2026-09-01 on adopting v1.4)*. v1.4 splits a 409's `details` in two: a clash
  with a **stored** definition carries `conflictingId`; a clash **between two entries of one
  batch** carries `{batchIndex, conflictsWithBatchIndex}` and **no `conflictingId`**, because
  all-or-nothing means nothing was written and no id exists. v1.4 warns against dereferencing
  `conflictingId` unconditionally.
  - **Reachability: nil for V1.** Every create is submitted as a **single-entry batch**
    (intention §6; multi-entry batch is an explicit §7 non-goal). Two entries cannot clash inside
    a batch of one, so the second shape cannot occur against this client as designed.
  - **And the handling was already right, by design rather than luck.** MC12b reads
    `conflictingId` and says "**else show the envelope `message` alone**"; plan 4 C5 already
    enumerates both branches ("absent id ⇒ message only"); and P1 typed the field
    `conflictingId?: string` — optional — so TypeScript already forbids the unguarded read v1.4
    warns about. No plan, criterion, type or line of code changes.
  - **Forward hazard, owned by whoever un-defers multi-entry batch.** The moment the wizard can
    submit more than one entry, the second shape becomes reachable and there is no id to name:
    the message must be built from the two indices ("row 2 overlaps row 1"). MC12b would then
    need a third branch, and plan 4 C5 a third row. Recorded here so that work is not discovered
    at integration time.
- **S10 — a criterion that recomputes the production expression proves the call site, not the
  argument** *(added 2026-09-02, plan-4 consumption)*. Plan 4's C9 asserted that the report
  controller's view equals `buildReportView(entries, filter, keyOrder)` computed directly, plus a
  non-empty `keyOrder`. Both clauses passed with the controller hard-wired to `[]`. Two reasons,
  and both generalize:
  - **The input discriminated nothing.** The five-entry report fixture never ties far enough to
    reach MC2a's properties comparison, so the real vocabulary and an empty one produce
    byte-identical views. A comparison between two computations is only evidence if the inputs
    can tell the two computations apart.
  - **The test derived the argument itself.** `keyOrder` was mapped from the store's options
    inside the test, not read from what the controller passed, so its non-emptiness said
    nothing about the controller.
  **The rule:** when a criterion's subject is a *value flowing into* a proven function, assert on
  an input where a wrong value changes the output, and pin the assertion to observable output
  rather than to a quantity the test reconstructs. Ship it with the mutation that reds it — this
  is charter rule 15 applied to arguments rather than to guards. The repaired row,
  `C9(vocabulary)`, additionally asserts that its own input still discriminates, so it cannot
  quietly decay into the same state.

  **Third occurrence, and a second sub-shape** *(P5, 2026-09-02)*. Plan 5's C4 asserted screen 07's
  chips against `renderCriteriaChips(properties, options)` — and passed, because its render helper
  called `setOptions(stockOptionsFixture)` first. **The test supplied an argument the production
  path never fetches**: nothing on the settings side hydrated the GET 4.1 vocabulary, so a real cold
  visit rendered `teak` where the wizard and report screens render `Teak`. The rule generalizes: a
  test that *seeds* state to make a component work is asserting on a world the user may never be in.
  Seed only what a user's own path would have already loaded, or add a row that renders cold.
  Plan 5's `C4(cold)` is that row.
- **S11 — never `git add -A` from the repo root while an implementation session is running**
  *(added 2026-09-02, coordinator's own error)*. Commit `75cfbb5` was meant to be a `master_plan.md`
  amendment (§7A, the backend merge sequencing). It was staged with `git add -A` from the repo root
  while the P6 session was concurrently writing to the same tree, so it swept in **11 of that
  session's uncommitted source files** — including, at that moment, a file containing a NUL byte the
  session had not yet found. Nothing was lost and no file was mixed: the P6 perimeter is still
  exactly verifiable as `git diff 4b4c652..HEAD -- src`, and `75cfbb5`'s only non-P6 content is
  `master_plan.md`. But the commit does not describe what it contains, and a coordinator commit
  claiming to be documentation shipped someone else's work-in-progress.
  - **The rule:** the coordinator stages **explicit paths** — `git add docs/...` — never `-A`, and
    never from the repo root, unless the tree is known to be quiet. A phase gate commit made *after*
    a session has handed off may use `-A` safely; an amendment made *during* one may not.
  - **Do not rewrite the history to tidy this.** Checkpoints are never squashed, the tree is
    correct, and the implementer documented the sweep in its own handoff. The record is the fix.
- **S12 — the owner edits UI in parallel with logic phases; a session never repairs someone else's
  red** *(added 2026-09-02)*. From P7 onward the owner has run a continuous visual-polish stream
  against the stock screens while implementation phases run: the wizard screens during P7, the
  report screens during P8, and further passes to come (§7D collects the polish itself). This is
  normal here, not an incident, and every prompt from P8 onward must say so plainly rather than
  describe it as a possibility.
  - **Perimeter is what keeps it safe.** Logic phases own domain, controllers, stores and actions;
    the owner's stream owns UI and `index.css`. Overlap should be nil. Where a logic phase extends
    something the UI *reads* — P8 extends `stock-report.store.ts`, which the report page reads —
    the extension must be **purely additive**, so the screen keeps working whatever is being done
    to it. Needing to change what a screen already reads is a stop-and-report, not an edit.
  - **A red outside your perimeter is a report, never a repair.** The likeliest failure mode is a
    session "helpfully" fixing an approved phase's test that the owner has just moved. That
    destroys the signal that something is mid-flight and can silently weaken a criterion that was
    proven with a mutation. Name the test and the file, say it is not yours, and stop.
  - **Never `git checkout` a file you did not write** to undo a probe — restore from a byte copy
    you made yourself. A checkout on a file the owner is editing destroys uncommitted work
    permanently. The coordinator follows this rule too, and verifies the owner's working tree
    intact after consuming a handoff.
  - **Stage explicit paths** (**S11**), record the digest of any foreign diff at the closing stamp,
    and **measure the baseline from the tree you are given** — test counts recorded in this
    document go stale between phases as the owner's stream lands.
- **S7:** A criterion row whose subject is build/test infrastructure rather than product
  behavior (a runner starting, typecheck/lint passing) is an **infra-enabler row**: it
  traces to no measurement-ledger entry because it measures no product outcome. Its trace
  cell reads `infra-enabler row (S7)` plus its origin. This is an exemption from the
  charter trace chain, granted once and named — not a blank trace cell. Enabler rows are
  rare; a row asserting anything a user could observe is not one.
- **S5:** UI phases: RTL criteria prove behavior/structure; visual fidelity is the
  owner's approval pass (master plan §3). Screenshot comparison is not automated.
- **S6:** `dist/` is never edited. `npm test` and `npm run typecheck` must pass cleanly at
  every IMPLEMENTED stamp. **Lint is measured against a baseline, not required to be zero**
  *(amended 2026-09-01, round 1 — the original "`npm run lint` must pass" was unsatisfiable
  on this repo and no baseline had been recorded, so the first phase to reach a stamp had to
  discover it)*. The repo baseline is **48 errors / 14 warnings**, all in files that predate
  this project; independently verified at round 1 with **zero** problems in any file P1
  created or touched. The obligation at each stamp is therefore: **no lint problem in the
  phase's own write perimeter, and the repo totals do not grow.** A phase that raises the
  totals reports which file and why; cleaning up unrelated pre-existing errors is not this
  project's work and would put edits outside every phase perimeter.

## 10. Environment topology (verified 2026-09-01; if reality disagrees, update here)

- Workspace: `apps/frontend` (npm; `package-lock.json`). Node scripts (verified in
  `package.json`): `dev` (vite), `typecheck` (`tsc -b`), `build`, `lint`, `preview`.
  **No `test` script yet** — P1 adds it. **Test devDeps already installed by the owner
  (2026-09-01):** vitest, jsdom, @testing-library/react, @testing-library/user-event,
  @testing-library/jest-dom — P1 verifies versions and configures; it does not install.
  **Font TTFs already in place (2026-09-01):** `src/assets/fonts/` holds
  Poppins-{Regular,Medium,SemiBold,Bold}.ttf + IBMPlexMono-{Regular,Medium}.ttf
  (verified TrueType; fetched from google/fonts OFL sources) — P9 registers them, it
  does not download. React 19, TS ~6.0, Vite 8, Tailwind v4 (via
  `@tailwindcss/vite`; single `@import "tailwindcss"` in `src/index.css`), zustand 5,
  framer-motion 12, `@react-pdf/renderer@^4.9.0` (installed, unused).
- **Test scopes** (after P1): L1 `npx vitest run <file>` · L2
  `npx vitest run src/features/stock` · L4 `npm test` (full suite) + `npm run
  typecheck` + `npm run lint`. Baseline caveat: repo has zero pre-existing tests, so
  the first L4 baseline is P1's own enumeration.
- Backend endpoints: NOT live (mock-first). Contract **v1.4** is authoritative; the
  live copy sits on branch `warehouse-stock-backend`
  (`docs/under_implementation/warehouse_stock/contracts/frontend-api-contract.md`);
  our copy in `backend_handoff/` matches it (synced round 6).
- **Mock/live switch — how the demo is actually reached (owner decision, 2026-09-01).**
  The flag lives in `apps/frontend/.env`, and is **on now**:
  ```
  VITE_STOCK_API_MODE=mock
  ```
  Added to this machine's `.env` on 2026-09-01. MC11's ratified vocabulary is
  `"mock" | "live"`, so "on" is spelled `mock`; the shipped **default remains `live`**
  (MC11, charter rule 10) — `.env` overrides it per machine, builds do not inherit it.
  **`.env` is gitignored** (`.gitignore:8` `**/*.env`), so this line cannot be committed:
  every machine and every agent session that runs the app must add it, or the stock screens
  will error on a backend that does not exist yet. This is the route master plan §3 and S5
  depend on — the owner's visual approval of P5, P6, P7 and P9 happens against this
  running demo (projection F5).
- **No dev-server proxy is needed, at P10 or before** *(corrected 2026-09-01, projection
  F1)*. The previous line here told P10 to "verify the `/api` proxy in `vite.config.ts`".
  There is no proxy and none is required: `VITE_API_BASE_URL` is an absolute URL that
  already ends in `/api`, and `vite.config.ts` defines no `server.proxy`. Plan 10 Task 1
  is amended to match.
- No CI. No pre-commit hooks observed. Platform: darwin, zsh.
