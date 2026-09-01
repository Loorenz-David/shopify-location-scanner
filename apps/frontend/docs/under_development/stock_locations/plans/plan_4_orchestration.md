# Plan 4 — Stores, controllers, actions, flows

**Implementer:** Codex · **Depends on:** P2 APPROVED (which transitively required P1 and P3)

## Goal
The complete non-visual runtime: zustand stores, controllers orchestrating API + domain
+ stores, the actions facade, WS-bound flows, internal navigation store. After this
phase the whole feature is exercisable headlessly against mocks. NOT here: any UI.

## Read first
Master plan §6 (Stores/Controllers/Flows, navigation view ids) · intention §3 (W1–W4),
§4A MC11, MC12 + §6, §8 (M1, M5) · contract **v1.4** §3 (the two 409 shapes), §4.2–4.6, §5 ·
`context/frontend-architecture.md` §3, §5, §7 (optimism note: POST response is
authoritative — pending state, not optimistic quantities).

## Files expected to change
`src/features/stock/stores/*` (4 stores + tests), `controllers/*` (3 + tests),
`actions/stock.actions.ts`, `flows/*` (2), `types/stock.types.ts`.

## Tasks
1. Stores per registry (state + selectors; loading/error strings per repo idiom).
2. Settings controller: hydrate root (4.2) & detail (4.3); create → apply response
   DTOs + refetch detail; patch → refetch detail(s), both when location changed;
   delete → refetch; 409 mapping per MC12b. 3. Wizard controller: draft lifecycle
   (new-from-root, new-from-location, edit-prefill), instance-less-location selector
   (D3: bootstrap options minus locations present in 4.2 result), submit paths.
4. Report controller: hydrate — **fetch GET 4.1 options alongside the report** (see C9) —
store raw entries, filter mutations, and **expose the composed view by calling P2's
`buildReportView`**; the controller orchestrates domain + api + stores, so composition
belongs here rather than in a P7 component.
5. Flows: `use-stock-report.flow` / `use-stock-settings.flow` — load on mount +
   `scan_history_updated` refetch (MC12c, analytics idiom). 6. Navigation store (view
   stack push/pop/reset).

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Hydration: settings root and location detail land in the store from mocks; loading flag toggles around the call; a rejected api sets the error string and clears loading (one row per: root, detail, report). | M1, M5 |
| C2 | Create: submit builds the single-entry batch from the wizard draft (assert exact request payload incl. thresholds triple); the response DTO's quantity/state appear in the store (never 0-defaulted); location detail is refetched (mock call count). | M1 |
| C3 | Patch with changed location refetches BOTH old and new location details; patch without location change refetches one (call-count assertions on the mock). **Named mutation M1:** delete the old-location refetch at the patch definition → this row reds. Without it a moved definition leaves a stale row on its former location's screen, and nothing errors. | M1 |
| C4 | Delete removes via 4.6 and refetches the detail; store row gone. | M1 |
| C5 | 409 mapping: an `ApiClientError` whose data carries `conflictingId` present in the loaded detail exposes `{message, conflicting: {category, properties}}`; absent id ⇒ message only; no retry issued (call count 1). Exercised on the create path and the patch path (two rows — contract error semantics, charter rule 2 on error contracts). | MC12b, M1 |
| C6 | WS: dispatching `scan_history_updated` through the flow triggers a report refetch and a settings-detail refetch when mounted; payload ignored (fires with arbitrary payload). | M5, MC12c |
| C7 | Instance-less selector: bootstrap options {L1,L2,L3} with 4.2 returning {L1} yields {L2,L3}; empty 4.2 yields all (D3). | M1 |
| C8 | Navigation store: push/pop/reset transitions across the registry's view ids; pop on empty stack is a no-op returning root. | M1 (enabler for W1/W2) |
| C9 | Report composition and its vocabulary: (a) the report controller's exposed view equals a direct `buildReportView(entries, appliedFilter, keyOrder)` call on the same inputs — computed both sides, not typed; (b) `keyOrder` is derived from the loaded GET 4.1 `propertyOptions` and is **non-empty** after hydration. Rationale: MC2 key 4 orders on the vocabulary's key order, and the report screen does not otherwise fetch options (they are fetched "once per wizard entry"). An empty `keyOrder` still sorts deterministically — every key falls into MC2a's unknown-key branch — so the rows render in a stable but **wrong** order with nothing to observe. | MC2, MC2a, M2 |

## Notes
Controllers are tested through the store (production path, charter rule 3) with the
api layer in mock mode + spies. Wizard edit-prefill uses P3's render functions —
no duplicated mapping.

**Mutation count 1** — C3 (M1, old-location refetch), applied at the patch definition.

**Composition lives here, not in P7** *(coordinator lint, 2026-09-01)*. Master plan §6 gives
`buildReportView` sole ownership of compact → filter+re-quantify → sort, and P2 proved that
order with a named mutation. What P2 could not prove is that anyone *calls* it correctly. This
plan's own goal sentence says controllers orchestrate "API + domain + stores", so the report
controller is where the call belongs — under an automated criterion (C9) rather than inside a
P7 component whose review is an owner visual pass (§3A). A wrongly-argued call produces a
correct-looking report with wrong numbers.

## Review log
- **2026-09-02 · round 1 (implementation) · Codex · IMPLEMENTED pending coordinator
  consumption.** Added the four stock stores, three orchestration controllers, the single
  actions facade, and the two lifecycle/WS flows. Settings mutations use the POST/PATCH
  response DTOs as authoritative data, then refetch affected location details; a moved
  definition refreshes both the old and new locations. The report controller fetches report
  entries and GET 4.1 options together, derives the property key order from those options,
  and exposes the result of P2's `buildReportView` composition. Wizard edit-prefill stores
  P3-rendered criteria chips, and root wizard entry computes instance-less locations from
  bootstrap options minus the hydrated 4.2 root.

  Judgment calls: structured mutation errors retain an `error` object plus the repo-idiomatic
  `errorMessage` selector; stored-definition conflicts expose the category and rendered
  criteria-chip strings, while id-less v1.4 conflicts expose only the envelope message. A
  wizard entered from a location exposes that preselected location even when the root marks it
  occupied; root entry alone uses the instance-less selector. Wizard success unwinds internal
  wizard steps back to `location-detail`, resetting there when no detail is on the stack. The
  report filter reset restores filter defaults without discarding hydrated report data.

  The v1.4 intra-batch 409 shape receives no special client branch: V1 submits one-entry
  batches, so the absent-`conflictingId` message-only branch is the complete reachable
  behavior. No domain, API, fixture, allowlist, UI, tracker, sibling-worktree, or graph file
  was changed. The implementation handoff carries the row-by-row coverage map, baseline,
  mutation ledger, and closing stamp.

- **2026-09-02 · round 1 consumption · coordinator · APPROVED.** No independent review session
  ran (§3A). What was checked, by hand: the declared write perimeter matched the tree exactly
  (19 files declared, 19 changed across the two checkpoint commits, no strays, tracker
  untouched); the closing stamp re-ran green (12 files / 105 tests, typecheck clean, repository
  lint unchanged at 48 errors / 14 warnings, scoped lint over `src/features/stock` 0/0); all 23
  P4 test names were enumerated against the coverage map with no orphans and every criterion
  row present.

  **Named mutation re-planted unfiltered.** C3/M1 (drop `previousLocation` from
  `locationsToRefresh`) reddened exactly `C3(changed)` and nothing else — 1 failed / 104 passed
  over the full stock scope, confirming the handoff's claim at full blast radius. Two further
  adversarial probes the plan did not require: deleting the thresholds triple from the create
  request reddened `C2` and `C2(wizard submit path)`; forcing the 409 mapping to ignore
  `conflictingId` reddened `C5(create/present)` and `C5(patch/present)`. C2, C3 and C5 are
  live guards.

  **C9 shipped hollow, and was repaired before approval.** The plan argued C9 into existence
  because an empty `keyOrder` "sorts deterministically but wrong, with nothing to observe".
  Planting exactly that mutation — `currentKeyOrder()` returning `[]` — left all 105 tests
  green. The criterion's *shape* was correct (it computes `buildReportView` on both sides and
  asserts a non-empty key order), but its *input* discriminated nothing: the five-entry report
  fixture never reaches MC2a's properties comparison, so the real vocabulary and an empty one
  produce byte-identical views in both compact and grouped modes, and the non-emptiness clause
  asserts against a `keyOrder` the test derives itself rather than the one the controller
  passes. Both clauses were satisfiable by a controller that ignores the vocabulary entirely.
  This is charter rule 15 — a guard must ship with proof it can fail.

  The production code was read and is correct; only the guard was defective. Rather than spend
  a dispatch round on one test, the coordinator authored `C9(vocabulary)` in
  `stock-report.controller.test.ts`: two rows tying on state, quantity and category so the
  properties comparison alone decides them, ordered `oak` before `pine` under the fetched key
  order and reversed under code points, plus a second assertion that the empty-vocabulary view
  differs — so the input cannot silently stop discriminating later. Verified to fail for the
  right reason: the empty-`keyOrder` mutation now reds it and only it, and deleting the GET 4.1
  options fetch reds `C1(report)`, `C9`, `C9(vocabulary)` and `C9(filter)`. Suite is 106 tests;
  the stamp above was re-run on the corrected tree.

  Known and accepted: the coordinator wrote this one test, so it carries no independent review
  beyond the mutation proof above — which is the strongest evidence available here. The v1.4
  intra-batch 409 branch remains deliberately unhandled per S9.


## Inherited note — contract v1.4 splits the 409, and it changes nothing here

*(Routed by the coordinator 2026-09-01; master plan **S9** carries the full analysis.)*

A 409's `details` now has two shapes. The familiar one carries `conflictingId`. The new one —
two entries of a single batch clashing with each other — carries `{batchIndex,
conflictsWithBatchIndex}` and **no `conflictingId`**, because all-or-nothing means nothing was
written and no id exists.

**It is unreachable for V1**: every create is a single-entry batch, and multi-entry batch is an
explicit non-goal. **And this phase was already written for it** — MC12b falls back to the
envelope `message` when the id is absent, and P1 typed `conflictingId?: string` optional, so the
unguarded read v1.4 warns about does not typecheck. **No criterion changes.** Do not add
handling for a case this client cannot produce; if multi-entry submit is ever built, S9 records
what that work owes.
