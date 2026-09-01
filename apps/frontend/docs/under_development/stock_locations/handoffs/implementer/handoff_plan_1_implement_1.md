---
plan: 1
role: implement
state: IMPLEMENTING
date: 2026-09-01
actor: Codex
---

# Plan 1 implementation handoff — round 1

## Summary

P1 is implemented. The test harness, stock types, MC1 state system, seven-endpoint
mock/live API seam, contract fixtures, session-stateful mock mutation layer, and C2–C6
tests are present. No UI, store, controller, flow, or later-phase domain logic was added.

⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

Task 0 coverage map (created before production edits):

| criterion row | discharge | assertion shape |
|---|---|---|
| C1 | `npm test`, `npm run typecheck`, `npm run lint` | lifecycle commands, exact row shape |
| C2(a) | `stockStatesAreCanonical` | exact five values and order |
| C2(b) | `stateMetadataMatchesDesignTokens` (one generated case per state) | exact metadata fields and hexes, not weaker |
| C2(c) | `unknownMetadataStateThrows` | named error type, not weaker |
| C2(d) | `unknownComparatorStateThrows` | named error type at comparator entry point, not weaker |
| C2(e) | `comparatorSortsCanonicalOrder` | distinct-state canonical ordering, not weaker |
| C2(f) | `comparatorReturnsZeroForEqualStates` (one generated case per state) | exact numeric zero, not weaker |
| C3(a) | `reportFixtureHasExactShape` | exact six-key set, no extra/missing key, not weaker |
| C3(b) | `reportFixtureHasSameStatePair` | exact count, shared state, two locations, not weaker |
| C3(c) | `reportFixtureHasDifferentStatePair` | exact count, differing states, two locations, not weaker |
| C3(d) | `reportFixtureHasSingleZeroQuantityEntry` | exact count, out-of-stock state, third merge key, not weaker |
| C4(a) | `optionsFixtureHasExactVocabulary` | exact eight entries, values, and category bindings, not weaker |
| C4(b) | `optionsFixtureHasNineItemCategories` | exact nine categories and order, not weaker |
| C5(a) | `mockModeUsesMocksWithoutFetch` | all seven resolve with zero fetch calls, not weaker |
| C5(b) | `liveModeUsesExpectedEndpointUrls` | all seven issue one call and resolve non-api-prefixed URLs, not weaker |
| C5(c) | `unsetModeDefaultsToLive` | unset mode is observably live, not weaker |
| C5(d) | `locationDetailEncodesLocation` | space encoded as `%20`, not weaker |
| C5(e) | `mockMutationStateSurvivesReadAndDelete` | create/read/delete session state, not weaker |
| C6(a) | `envAllowlistIsExact` + `envAllowlistProbe` | set equality plus observed synthetic red |
| C6(b) | `hexAllowlistIsExact` + `hexAllowlistProbe` | set equality plus observed synthetic red |
| C6(c) | `stateNameAllowlistIsExact` + `stateNameAllowlistProbe` | set equality plus observed synthetic red |
| C6 shipped call site | `realScanCallSiteUsesFeatureFiles` | actual injected-file-list call site is pinned |

Reverse trace: every planned test case above is mapped to a criterion row; no orphan test
is shipped. The three C6 probe tests are criterion evidence, not extra behavior.

Baseline before production edits: `npx vitest run src/features/stock` on the test skeleton
reported 3 files; 2 collection failures for the absent domain/API modules; and 4 failed
allowlist call-site/absence assertions in the seven-test allowlist file, with its 3 synthetic
probe tests passing. Baseline total: 6 failing IDs. This is the captured red baseline, not a
reconstructed result.

## What was built

- `vitest.config.ts`, `src/test/setup.ts`, the `test` package script, and the declared stock
  environment flag. The Vitest config merges the app Vite config.
- `src/features/stock/types/stock.dto.ts` and `stock.types.ts` with the registry names and
  derived state alias.
- `src/features/stock/domain/stock-states.domain.ts` with canonical order, exact metadata,
  strict interpretation guards, and exact-zero equal comparison.
- All seven `src/features/stock/api/*.api.ts` adapters, the per-call mock/live resolver,
  mock endpoint modules, four fixtures, and shared session mutation state.
- Colocated C2–C6 tests, including raw-source set-equality scans over an injected file list
  and a shipped Vite raw-glob call site over the real non-test feature files.

## Evidence

Final code-tree stamp before documentation/tracker edits: `npm test` passed 3 files / 32
tests; `npm run typecheck` passed; `npm run lint` reported 48 pre-existing errors and 14
warnings (62 problems), all outside the P1 write perimeter; scoped lint over all new files
passed. The post-checkpoint stamp is re-taken after the checkpoint commit and recorded in
the final handoff update below.

Named mutations: declared 5 = C2 (2) + C6 (3); executed 5 = declared 5.

| mutation | site | command and observed result |
|---|---|---|
| C2 M1 | `src/features/stock/domain/stock-states.domain.ts`, `compareByStateIndex` definition; removed both state guards | `npx vitest run src/features/stock/domain/stock-states.domain.test.ts -t 'unknown comparator state throws'` → 1 failed / 13 skipped; C2(d) observed no thrown error |
| C2 M2 | same comparator definition; equal return changed from `0` to `1` | `npx vitest run src/features/stock/domain/stock-states.domain.test.ts -t 'comparator returns exactly zero'` → 5 failed / 9 skipped; C2(f) observed 1 instead of 0; control `-t 'sorting distinct states reproduces canonical order'` → 1 passed / 13 skipped |
| C6(a) | synthetic violating comment in `src/features/stock/api/get-stock-options.api.ts` | `npx vitest run src/features/stock/stock-allowlist.test.ts -t 'the env flag is confined'` → 1 failed / 6 skipped; extra API file observed |
| C6(b) | synthetic violating comment in `src/features/stock/api/get-stock-options.api.ts` | `npx vitest run src/features/stock/stock-allowlist.test.ts -t 'state hexes are confined'` → 1 failed / 6 skipped; extra API file observed |
| C6(c) | synthetic violating comment in `src/features/stock/api/get-stock-options.api.ts` | `npx vitest run src/features/stock/stock-allowlist.test.ts -t 'state names are confined'` → 1 failed / 6 skipped; extra API file observed |

All mutation probes were reverted. The three C6 probes were rerun after the allowlist test
switched from Node filesystem imports to the Vite raw glob; each remained red as recorded.

## Implementation judgments and observations

- The delegated `STOCK_STATES` shape is a readonly tuple plus a separate metadata record.
- The zero-quantity report entry is the singleton `out_of_stock` row under a third merge key.
- Fixture locations are `LC1` and `H1`; the report pair uses one implementer-chosen opaque
  key, `report-walnut-chairs`.
- Options use the final contract vocabulary table and the nine S4a categories in order.
- Detail fixture state values are tuple-derived, keeping literal state names in only the
  domain, DTO union, and report fixture. Hexes remain only in the state domain.
- Mock create/update/delete operations share module-level session state and reset through
  `__resetMockState()`; create produces a non-zero quantity as required.
- The repository-wide lint errors predate this phase and occur in unrelated files. No owner
  decision is needed to proceed; the scoped P1 lint is clean.

## Checkpoint and tracker

Master plan P1 row is `IMPLEMENTED` on 2026-09-01 under Codex. Checkpoint commit subject is
`CHECKPOINT (not approved): implement stock locations plan 1`.

## Full write perimeter — this session's intended changes

- `apps/frontend/package.json`
- `apps/frontend/vitest.config.ts`
- `apps/frontend/src/vite-env.d.ts`
- `apps/frontend/src/test/setup.ts`
- `apps/frontend/src/features/stock/api/create-stock-configurations.api.ts`
- `apps/frontend/src/features/stock/api/delete-stock-configuration.api.ts`
- `apps/frontend/src/features/stock/api/get-stock-location-detail.api.ts`
- `apps/frontend/src/features/stock/api/get-stock-locations.api.ts`
- `apps/frontend/src/features/stock/api/get-stock-options.api.ts`
- `apps/frontend/src/features/stock/api/get-stock-report.api.ts`
- `apps/frontend/src/features/stock/api/index.ts`
- `apps/frontend/src/features/stock/api/stock-api-mode.ts`
- `apps/frontend/src/features/stock/api/stock-api.test.ts`
- `apps/frontend/src/features/stock/api/mocks/create-stock-configurations.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/delete-stock-configuration.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-location-detail.fixture.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-location-detail.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-locations.fixture.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-locations.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-options.fixture.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-options.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-report.fixture.ts`
- `apps/frontend/src/features/stock/api/mocks/get-stock-report.mock.ts`
- `apps/frontend/src/features/stock/api/mocks/mock-state.ts`
- `apps/frontend/src/features/stock/api/mocks/update-stock-configuration.mock.ts`
- `apps/frontend/src/features/stock/domain/stock-states.domain.test.ts`
- `apps/frontend/src/features/stock/domain/stock-states.domain.ts`
- `apps/frontend/src/features/stock/stock-allowlist.test.ts`
- `apps/frontend/src/features/stock/types/stock.dto.ts`
- `apps/frontend/src/features/stock/types/stock.types.ts`
- `apps/frontend/docs/under_development/stock_locations/master_plan.md`
- `apps/frontend/docs/under_development/stock_locations/plans/plan_1_foundations.md`
- `apps/frontend/docs/under_development/stock_locations/handoffs/implementer/handoff_plan_1_implement_1.md`

## Mutation-probe perimeter — applied and reverted separately

- `apps/frontend/src/features/stock/domain/stock-states.domain.ts` (C2 M1/M2)
- `apps/frontend/src/features/stock/api/get-stock-options.api.ts` (C6(a)/(b)/(c) synthetic comments)

No architecture graph exists in this repository. No other tracker row was touched. Pre-existing
owner changes remain unstaged and were not included in the checkpoint.
