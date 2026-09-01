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
| Wire contract (endpoints, shapes, errors) | `backend_handoff/frontend-api-contract.md` (**v1.2**) |
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
| P1 | Test infra, types, state system, API seam | Codex | IMPLEMENTED | 2026-09-01 | Codex | round-1 implementation: 32 tests pass; typecheck pass; scoped lint pass; repo lint has documented pre-existing failures |
| P2 | Report domain (compaction, ordering, filters) | Codex | NOT_STARTED | — | — | — |
| P3 | Config domain (criteria, thresholds, bands) | Codex | NOT_STARTED | — | — | — |
| P4 | Stores, controllers, flows | Codex | NOT_STARTED | — | — | — |
| P5 | Settings UI (screens 06–07) + stock design tokens | Claude | NOT_STARTED | — | — | — |
| P6 | Instance wizard UI (screens 08–09) | Claude | NOT_STARTED | — | — | — |
| P7 | Report UI (screens 01–04) | Claude | NOT_STARTED | — | — | — |
| P8 | PDF data assembly + delivery | Codex | NOT_STARTED | — | — | — |
| P9 | PDF document + Generate sheet UI (screens 05, 10) | Claude | NOT_STARTED | — | — | — |
| P10 | Live integration (gated on backend P3/P5) | Codex | NOT_STARTED | — | — | — |

**Projection gate:** mandatory for P2 and P3 (silent-failure mechanisms MC2–MC9 —
charter rule 6); waivable with recorded justification elsewhere. Self-retiring per
charter. **P1 amendment (owner directive, 2026-09-01):** the coordinator proposed
waiving P1's projection; the owner directed it be run. P1 therefore runs round 0 —
justified independently by MC1's ordering comparator (charter rule 6 names ordering)
and by P1 being the foundation every later phase binds to. This does not change the
gate's status elsewhere.

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
`UnknownStockStateError` on a string outside `STOCK_STATES` (MC1a). · `domain/stock-report.domain.ts`
(MC2–MC5, MC9: `compactEntries`, `compareCompactRows`, `compareGroups`,
`applyStockFilters`, `countPendingRows`, `computeCounterTiles`,
`deriveEntryDetail`) · `domain/stock-criteria.domain.ts` (MC6: `buildCriteria`,
`renderCriteriaChips`, `displayValueFor`) · `domain/stock-thresholds.domain.ts`
(MC7+MC8: `commitThreshold`, `deriveBands`) · `domain/stock-pdf.domain.ts` (MC10:
`buildPdfModel`, `pdfFilename`).

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
`<endpoint>.fixture.ts`, encoding contract v1.2 examples + §4.1 vocabulary verbatim).

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

Linear: P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10. A phase starts only when the
previous is APPROVED. Rationale for the block order (logic P1–P4, then UI P5–P7, then
PDF P8–P9, then integration): every Claude phase starts with its entire interface
APPROVED, so the owner can dispatch Claude exactly at P5, P6, P7, P9 and review UI
without logic churn underneath. P10 additionally gates on backend availability
(config endpoints after backend P3; report endpoint after backend P5 — contract §7).

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
- **S4:** Mock fixtures copy contract v1.2 examples verbatim — a fixture that "improves"
  on the contract is a defect. **Scope clause:** S4 governs *shape and vocabulary* — no
  invented field, no value outside the contract's own vocabulary. It does **not** freeze
  the fixture *population*: a fixture may contain additional entries built entirely from
  contract-legal values in order to exercise an obligation the contract places on the
  client (e.g. §4.7's same-`mergeKey`/different-`stockState` case, which the contract
  demands the client handle and its example does not itself contain). Such an entry is
  contract-faithful; inventing a field or a value is not.
- **S4a — the demo item-category list (owner decision, 2026-09-01).** Contract §4.1 elides
  `itemCategories` with `...`, so the mock must supply it. The owner chose **the nine
  categories already written down in the contract**, and no others. Derived from
  §4.1's `categories` bindings, in the contract's own order — the six table types bound to
  `shape`/`extension_*`, then the three chair types bound to `upholstery`:
  `Dining Tables, Bedside Tables, Coffee Tables, Side Tables, Hall Tables, Nest Of Tables,
  Dining Chairs, Easy Chairs, Armchairs` (count: 9, derived by scan of the §4.1 table).
  A confirmation request is filed to the backend track; if it returns a longer list, this
  rule and the fixture change together, and nothing else does.
- **S4b — example vs. final table** *(projection L26)*: where contract §4.1's JSON example
  and its "final vocabulary" table disagree (the example gives `shape` one category, the
  table gives six), **the table wins** — it says of itself that it is "the exact payload
  content, safe to hardcode in mocks". Recorded so no reviewer re-derives it.
- **S7:** A criterion row whose subject is build/test infrastructure rather than product
  behavior (a runner starting, typecheck/lint passing) is an **infra-enabler row**: it
  traces to no measurement-ledger entry because it measures no product outcome. Its trace
  cell reads `infra-enabler row (S7)` plus its origin. This is an exemption from the
  charter trace chain, granted once and named — not a blank trace cell. Enabler rows are
  rare; a row asserting anything a user could observe is not one.
- **S5:** UI phases: RTL criteria prove behavior/structure; visual fidelity is the
  owner's approval pass (master plan §3). Screenshot comparison is not automated.
- **S6:** `dist/` is never edited; `npm run typecheck` and `npm run lint` must pass at
  every IMPLEMENTED stamp alongside the test suite.

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
- Backend endpoints: NOT live (mock-first). Report contract v1.2 is authoritative; the
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
