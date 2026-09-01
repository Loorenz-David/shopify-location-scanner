---
plan: 4
role: implementer
state: IMPLEMENTED
verdict: IMPLEMENTED
date: 2026-09-02
actor: Codex
---

# Plan 4 implementation handoff — round 1

The non-visual stock feature runtime is implemented and ready for coordinator consumption.
Settings, report, and wizard state now have zustand stores and controller paths; the actions
facade gives future screens one imperative entry point. Creates use the backend response’s
real quantity and state, edits refresh both sides of a location move, deletes refresh the
affected detail, and report hydration includes the options vocabulary needed for correct
property ordering. The stock report and settings-detail flows reload on every scan-history
event, and the internal navigation stack handles all registered stock views.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

## Coverage map

“Exact” means the assertion has the shape stated by the criterion row, not merely a weaker
proxy. The six new P4 test files contain 23 tests; every one is mapped below.

| criterion row | test id | assertion shape |
|---|---|---|
| C1 root hydration | `C1(root): hydrates the settings root and toggles loading around the call` + `C1(root error): stores the error string and clears loading when root hydration rejects` | Exact: observes loading `true` while the deferred API call is pending, stores the returned root rows, then observes the specified error and loading `false` on rejection. |
| C1 detail hydration | `C1(detail): hydrates a location detail and toggles loading around the call` + `C1(detail error): stores the error string and clears loading when detail hydration rejects` | Exact: observes the detail loading window, stores the location-keyed DTOs, and asserts the detail error plus cleared loading. |
| C1 report hydration | `C1(report): hydrates entries and options while toggling loading` + `C1(report error): stores the error string and clears loading when report hydration rejects` | Exact: stores report entries and options after the deferred call, and separately asserts the report error plus cleared loading. |
| C2 create request/response | `C2: submits one exact draft, keeps response quantity/state, and refetches detail` | Exact: asserts one `configurations` entry with the complete thresholds triple, response quantity `17` and state from the response, and one detail refetch. `C2(wizard submit path): submits the selected draft through the single-entry create path` also proves the wizard-to-controller path and return navigation. |
| C3 changed location | `C3(changed): patch refetches both the old and new location details` | Exact: mock calls are exactly `LC1`, then `H1`; both locations are refetched after the patch. |
| C3 unchanged location | `C3(unchanged): patch refetches exactly one location when location does not change` | Exact: one call, to `LC1`, with no duplicate same-location refetch. |
| C4 delete | `C4: deletes through the API, refetches detail, and leaves the store row gone` | Exact: DELETE is called with the id, detail is refetched, and the location store contains an empty detail result. |
| C5 create conflict, id present | `C5(create/present): maps a stored-definition conflict with category and criteria and makes one call` | Exact: the loaded definition id maps to `{message, conflicting: {category, properties}}`, including rendered criteria chips; API call count is 1. |
| C5 create conflict, id absent | `C5(create/absent): uses only the envelope message for a conflict without an id` | Exact: the v1.4 intra-batch-shaped details produce `{message}` only and the create call count is 1. |
| C5 patch conflict, id present | `C5(patch/present): maps a stored-definition conflict on the patch path and makes one call` | Exact: the patch path produces the same structured stored-definition mapping and exactly one update call. |
| C5 patch conflict, id absent | `C5(patch/absent): uses only the envelope message on an id-less patch conflict` | Exact: the patch path produces `{message}` only and exactly one update call. |
| C6 report WS | `C6(report): loads on mount and refetches on arbitrary scan history events` | Exact: mount performs one report fetch; two arbitrary payloads trigger two additional fetches, proving payload-ignore and no debounce. |
| C6 settings-detail WS | `C6(settings detail): loads on mount and refetches the mounted detail on every event` | Exact: mount performs one detail fetch and one arbitrary payload triggers the second detail fetch. |
| C7 instance-less selector | `C7: subtracts occupied root locations and returns all bootstrap locations when the root is empty` | Exact: `{L1,L2,L3} - {L1}` is `{L2,L3}`, then empty 4.2 returns all three. |
| C7 edit-prefill task clause | `C7(edit-prefill): reuses the criteria renderer for an edited wildcard definition` | Exact task-clause proof: raw location/category/properties/thresholds and id are prefilled, and the wildcard chip is produced by P3’s renderer. |
| C8 navigation store | `C8: pushes, pops, resets, and treats an empty stack as the root` | Exact: pushes every registry view id, pops the top, resets to a new root, and asserts empty-stack pop is a no-op returning root. |
| C8 actions facade | `C8: exposes the navigation transitions through the single facade` | Exact: the facade’s push/pop/reset methods produce and consume the same navigation transitions. |
| C9 composition and vocabulary | `C9: exposes the direct report-domain composition and a non-empty options-derived key order` | Exact: computes `buildReportView(entries, appliedFilter, keyOrder)` independently from store inputs and compares the full exposed view; key order is mapped from loaded options and is non-empty. |
| C9 filter recomposition | `C9(filter): updates the exposed view through the same composed domain call` | Exact: after a filter mutation, computes the direct domain result from the same entries/filter/options-derived key order and compares the full view. |

Reverse map: the settings controller file covers C1(root/detail), C2, C3, C4, and C5;
the report controller file covers C1(report) and C9; the wizard controller file covers C2,
C7, and the explicit edit-prefill task clause; the two flow files cover C6; the navigation
store and facade cover C8. There are no orphan tests in the six P4 test files.

## Pre-edit baseline

After adding the executable P4 cases and before the first production edit, the unfiltered
domain-scope command was:

`npx vitest run src/features/stock`

It recorded 6 failed suites with 0 executed P4 tests because the six new implementation
entry points were absent. The inherited stock suites were 6 files / 82 tests passing in the
same run. No failing P4 case was reconstructed from the unresolved imports; the baseline is
reported as collection failure, not fabricated test-level failures.

## Mutation ledger

Declared summands: C3/M1 = 1. Executed = 1, restored = 1, so `executed == declared`.

1. **C3 / M1 — old-location refetch**

   - Site: `src/features/stock/controllers/stock-settings.controller.ts:182`, inside the
     `updateStockConfigurationController` definition, the `locationsToRefresh` construction.
   - Mutation: deleted the `previousLocation` element, leaving only `response.location`.
   - Scope and command: unfiltered L2, `npx vitest run src/features/stock`.
   - Observed red: `C3(changed): patch refetches both the old and new location details` failed;
     the received mock call locations were `['H1']`, while the assertion required `['LC1',
     'H1']`. This was the only red row: 1 failed / 104 passed across 12 files.
   - Restoration: restored `previousLocation` at the same definition site. The unfiltered
     stock suite then returned 12 files / 105 tests passing. Mutation-probe file list,
     separate from the fix’s intended changes: `src/features/stock/controllers/stock-settings.controller.ts`
     (applied and reverted; no mutant remains).

## Evidence and closing stamp

- P4 targeted run after implementation: 6 files / 23 tests passing.
- Final stock-domain scope before the closing stamp: `npx vitest run src/features/stock` —
  12 files / 105 tests passing.
- Scoped lint over `src/features/stock`: 0 errors / 0 warnings. The S2 name/hex scan continues
  to find state literals and hexes only in the existing domain/DTO/fixture allowlist.
- Closing L4 stamp on the clean checkpoint commit containing this handoff: `npm test` 12 files / 105 tests
  passing; `npm run typecheck` passed with no diagnostics; `npm run lint` reported the
  documented repository baseline of 48 errors / 14 warnings, unchanged, with zero problems
  in any P4 file created or touched.
- No architecture graph exists in this repository, so no graph delta was applicable.

## Full write perimeter

Intended source and test changes:

- `apps/frontend/src/features/stock/types/stock.types.ts`
- `apps/frontend/src/features/stock/stores/stock-settings.store.ts`
- `apps/frontend/src/features/stock/stores/stock-report.store.ts`
- `apps/frontend/src/features/stock/stores/stock-wizard.store.ts`
- `apps/frontend/src/features/stock/stores/stock-navigation.store.ts`
- `apps/frontend/src/features/stock/stores/stock-navigation.store.test.ts`
- `apps/frontend/src/features/stock/controllers/stock-settings.controller.ts`
- `apps/frontend/src/features/stock/controllers/stock-settings.controller.test.ts`
- `apps/frontend/src/features/stock/controllers/stock-report.controller.ts`
- `apps/frontend/src/features/stock/controllers/stock-report.controller.test.ts`
- `apps/frontend/src/features/stock/controllers/stock-wizard.controller.ts`
- `apps/frontend/src/features/stock/controllers/stock-wizard.controller.test.ts`
- `apps/frontend/src/features/stock/actions/stock.actions.ts`
- `apps/frontend/src/features/stock/actions/stock.actions.test.ts`
- `apps/frontend/src/features/stock/flows/use-stock-report.flow.ts`
- `apps/frontend/src/features/stock/flows/use-stock-settings.flow.ts`
- `apps/frontend/src/features/stock/flows/stock-flows.test.ts`

Required documentation changes:

- `apps/frontend/docs/under_development/stock_locations/plans/plan_4_orchestration.md` —
  implementation Review log entry.
- `apps/frontend/docs/under_development/stock_locations/handoffs/implementer/handoff_plan_4_implement_1.md` —
  this handoff.

Mutation probes, applied and reverted separately from the intended source/test changes:

- `apps/frontend/src/features/stock/controllers/stock-settings.controller.ts`

Not touched: `src/features/stock/stock-allowlist.test.ts`, all fixtures, all API files, all
P1–P3 domain files, the master-plan tracker, unrelated frontend files, the sibling
`Item-Scanner-Shopify-warehouse-stock-backend` worktree, and any architecture-graph state.

## Findings not changed

- The plan’s C5 names only the stored-definition and message-only branches. The v1.4
  intra-batch details shape is intentionally not given a separate client message because V1
  submits a single-entry batch; the plan’s inherited note and master-plan S9 record the
  future multi-entry obligation.
- The report controller’s report hydration also fetches GET 4.1 options as required by C9;
  this makes the vocabulary available to the report UI without a second report-screen fetch.
- The repository lint baseline remains 48 errors / 14 warnings, all outside this phase’s
  write perimeter. No unrelated lint cleanup was performed.
- The coordinator must consume this handoff, advance only P4’s tracker row, and make the
  phase gate commit. This session did not edit the tracker.
