# Plan 4 — Stores, controllers, actions, flows

**Implementer:** Codex · **Depends on:** P3 APPROVED

## Goal
The complete non-visual runtime: zustand stores, controllers orchestrating API + domain
+ stores, the actions facade, WS-bound flows, internal navigation store. After this
phase the whole feature is exercisable headlessly against mocks. NOT here: any UI.

## Read first
Master plan §6 (Stores/Controllers/Flows, navigation view ids) · intention §3 (W1–W4),
§4A MC11, MC12 + §6, §8 (M1, M5) · contract v1.2 §4.2–4.6, §5 ·
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
4. Report controller: hydrate (report fetch → store raw entries), filter mutations.
5. Flows: `use-stock-report.flow` / `use-stock-settings.flow` — load on mount +
   `scan_history_updated` refetch (MC12c, analytics idiom). 6. Navigation store (view
   stack push/pop/reset).

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Hydration: settings root and location detail land in the store from mocks; loading flag toggles around the call; a rejected api sets the error string and clears loading (one row per: root, detail, report). | M1, M5 |
| C2 | Create: submit builds the single-entry batch from the wizard draft (assert exact request payload incl. thresholds triple); the response DTO's quantity/state appear in the store (never 0-defaulted); location detail is refetched (mock call count). | M1 |
| C3 | Patch with changed location refetches BOTH old and new location details; patch without location change refetches one (call-count assertions on the mock). | M1 |
| C4 | Delete removes via 4.6 and refetches the detail; store row gone. | M1 |
| C5 | 409 mapping: an `ApiClientError` whose data carries `conflictingId` present in the loaded detail exposes `{message, conflicting: {category, properties}}`; absent id ⇒ message only; no retry issued (call count 1). Exercised on the create path and the patch path (two rows — contract error semantics, charter rule 2 on error contracts). | MC12b, M1 |
| C6 | WS: dispatching `scan_history_updated` through the flow triggers a report refetch and a settings-detail refetch when mounted; payload ignored (fires with arbitrary payload). | M5, MC12c |
| C7 | Instance-less selector: bootstrap options {L1,L2,L3} with 4.2 returning {L1} yields {L2,L3}; empty 4.2 yields all (D3). | M1 |
| C8 | Navigation store: push/pop/reset transitions across the registry's view ids; pop on empty stack is a no-op returning root. | M1 (enabler for W1/W2) |

## Notes
Controllers are tested through the store (production path, charter rule 3) with the
api layer in mock mode + spies. Wizard edit-prefill uses P3's render functions —
no duplicated mapping.

## Review log
(empty)
