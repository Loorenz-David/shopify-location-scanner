---
plan: 1
role: implement
state: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

# Plan 1 implementation handoff — round 2

## Summary

Applied the upstream contract v1.3 amendment for C4(b). The stock-options mock now carries
the complete 28-value `itemCategories` list in the contract's payload order, and the C4(b)
test asserts that full ordered list. No other implementation behavior changed; this round
has no review findings and no named mutations.

⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner.

## Task 0 coverage map

| criterion row | discharge | assertion shape |
|---|---|---|
| C1 | `npm test`, `npm run typecheck`, `npm run lint` | lifecycle commands and perimeter/baseline lint rule, not a test row |
| C2(a) | `C2(a): stock states are exactly the canonical five-state order` | exact five values and order, not weaker |
| C2(b) | `C2(b): metadata for %s matches the global design tokens` (`it.each`) | exact metadata fields and hexes for each state, not weaker |
| C2(c) | `C2(c): unknown metadata state throws the named error` | named unknown-state error, not weaker |
| C2(d) | `C2(d): unknown comparator state throws the named error` | named unknown-state error at comparator entry, not weaker |
| C2(e) | `C2(e): sorting distinct states reproduces canonical order` | distinct-state canonical ordering, not weaker |
| C2(f) | `C2(f): comparator returns exactly zero for equal %s values` (`it.each`) | exact numeric zero for each state, not weaker |
| C3(a) | `C3(a): every report entry has exactly the six contract fields` | exact six-key set with no extra/missing key, not weaker |
| C3(b) | `C3(b): the report has one same-state pair across two locations` | exact pair count, shared state, two locations, not weaker |
| C3(c) | `C3(c): the report has one different-state pair across two locations` | exact pair count, differing states, two locations, not weaker |
| C3(d) | `C3(d): exactly one zero-quantity entry is out of stock in a third group` | exact singleton, out-of-stock state, third merge key, not weaker |
| C4(a) | `C4(a): options expose the exact eight-key final vocabulary` | exact eight property entries, values, and category bindings, not weaker |
| C4(b) | `C4(b): options expose exactly the 28 item categories in order` | full ordered 28-value equality, not a length check |
| C5(a) | `C5(a): mock mode resolves all seven functions without fetch` | all seven resolve with zero fetch calls, not weaker |
| C5(b) | `C5(b): live mode calls each endpoint once at its resolved non-api-prefixed path` | seven calls with resolved non-api-prefixed paths, not weaker |
| C5(c) | `C5(c): an unset mode defaults observably to live` | unset mode observably behaves as live, not weaker |
| C5(d) | `C5(d): location detail URL-encodes its location path segment` | space encoded as `%20`, not weaker |
| C5(e) | `C5(e): mock mutations persist into reads and deletion removes the row` | create/read/delete session state, not weaker |
| C6(a) | `C6(a): the env flag is confined to its one read site` + `C6(a) probe: an injected env-flag violation changes the matched file set` | set equality plus observed synthetic red |
| C6(b) | `C6(b): state hexes are confined to the state domain` + `C6(b) probe: an injected hex violation changes the matched file set` | set equality plus observed synthetic red |
| C6(c) | `C6(c): state names are confined to the state union, domain, and report fixture` + `C6(c) probe: an injected state-name violation changes the matched file set` | set equality plus observed synthetic red |
| C6 shipped call site | `C6 shipped call site: the guard reads the real non-test feature file list` | actual injected-file-list call site is pinned, not a helper-only proof |

Reverse trace: all tests in the phase test files are represented above; no orphan test was
introduced in round 2. The renamed C4(b) test remains the sole test for that row.

## Baseline before production edits

`npx vitest run src/features/stock/api/stock-api.test.ts` → 1 file / 11 tests passed; 0
failing IDs. The old fixture and its nine-value assertion agreed, so there was no red baseline
for this upstream contract amendment. This result was captured before either allowed source
file was edited.

## What changed

- `src/features/stock/api/mocks/get-stock-options.fixture.ts`: replaced the nine categories
  with the exact 28 values from contract v1.3 §4.1 / master-plan S4a, in payload order.
- `src/features/stock/api/stock-api.test.ts`: renamed C4(b) to remove the obsolete nine-value
  wording and changed the assertion to the complete ordered 28-value list.

## Evidence

- L1 targeted post-edit: `npx vitest run src/features/stock/api/stock-api.test.ts` → 1 file /
  11 tests passed.
- L1 typecheck: `npm run typecheck` → passed with no diagnostics.
- `git diff --check` → passed.
- Named mutations: declared 0 (C4(b) names none); executed 0. No mutation probe files were
  touched.
- Closing L4 stamp (initial, on checkpoint `5ea7e30`): `npm test` → 3 files / 32 tests passed;
  `npm run typecheck` → passed with no diagnostics; `npm run lint` → 48 errors / 14 warnings
  (62 problems), unchanged from the documented repository baseline and all outside this round's
  two-file implementation perimeter. Failure-ID delta against the round-1 32-pass / 0-fail
  baseline: 0.

## Judgment calls and observations

- The contract's §4.1 payload order is authoritative, so the list includes all 28 values,
  including categories absent from the property-options `categories` column.
- The test compares the array itself rather than its length, preserving the C4(b) obligation
  to detect both omissions and ordering drift.
- This round follows the prompt's two-file implementation perimeter exactly. The plan review
  log, master-plan tracker row, and this handoff are required pipeline records, not product
  implementation changes.
- No architecture graph exists in this repository.

## Full write perimeter — cycle-scoped

Implementation files changed this session:

- `apps/frontend/src/features/stock/api/mocks/get-stock-options.fixture.ts`
- `apps/frontend/src/features/stock/api/stock-api.test.ts`

Required pipeline records changed this session:

- `apps/frontend/docs/under_development/stock_locations/master_plan.md` (P1 tracker row only)
- `apps/frontend/docs/under_development/stock_locations/plans/plan_1_foundations.md` (round-2 Review log entry only)
- `apps/frontend/docs/under_development/stock_locations/handoffs/implementer/handoff_plan_1_implement_2.md`

Mutation-probe perimeter: none; no files were applied-and-reverted.

No other tracker row was touched. Pre-existing owner changes remain unstaged and were not
included in the checkpoint.

## Post-checkpoint closing stamp

The handoff and plan-log evidence were added after the initial stamp, so the charter's
tree-identity rule requires a closing re-stamp. Final re-stamp: `npm test` → 3 files / 32 tests
passed; `npm run typecheck` → passed with no diagnostics; `npm run lint` → 48 errors / 14
warnings (62 problems), unchanged from baseline and all outside this round's implementation
perimeter. Failure-ID delta: 0 (32 passed / 0 failed before and after).

Final checkpoint identity: commit `9a3f84f8ec0562eebab04ea0ffbfee7df2babcfe`; the scoped
implementation files and handoff are clean at that checkpoint. The repository retains
unrelated pre-existing owner changes outside the cycle-scoped perimeter; for the dirty-tree
identity of the non-handoff paths, `git diff --binary -- .
':(exclude)docs/under_development/stock_locations/handoffs/implementer/handoff_plan_1_implement_2.md'
| shasum -a 256` was
`659e1849c6c83df75cdcc0d53253ff760db10e665435d54b2c8930df4f7fbf8c`.
