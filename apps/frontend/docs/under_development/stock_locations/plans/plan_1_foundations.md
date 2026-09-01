# Plan 1 — Test infra, types, state system, API seam

**Implementer:** Codex · **Depends on:** none · **State: see master plan tracker**

## Goal
Stand up the testing harness, the stock feature skeleton, the wire/view types, the MC1
state system, and the mock/live API seam with contract-verbatim fixtures. NOT in this
phase: any domain logic beyond MC1, any store/controller, any UI.

## Read first
Master plan **§3** (division of labor — it decides whether `ui/` is scaffolded here),
§5–§6, §9–§10 · intention §1–§2, §4, §4A (**MC1, MC11, MC12**), **§4B (MC1a, MC1b)**, §8 ·
contract v1.2 §§1, 3, 4.1–4.7 · `context/frontend-architecture.md` §2, §4 ·
**`design_handoff/00-global/00-global.md`** (the fifteen state hexes C2(b) asserts exist
in no other artifact).

*(Read-first amended 2026-09-01, projection F9. Intention §10 does not bind — it is the
pipeline's pre-implementation gate ordering, already discharged. §5 and §6 are omitted
deliberately: both are fully restated by contract §4.7 and §4.1–4.6, which are listed.)*

## Files expected to change
`package.json` (`test` script only — **devDeps are already installed**),
`vitest.config.ts`, `src/test/setup.ts`, `src/vite-env.d.ts` (declare
`VITE_STOCK_API_MODE` — the file enumerates all three existing vars and the repo pattern
is explicit declaration; projection L17), `src/features/stock/types/*`,
`src/features/stock/domain/stock-states.domain.ts` (+ test),
`src/features/stock/api/*` (all endpoint files, `stock-api-mode.ts`, `mocks/*`).

Not in the perimeter and not to be edited: `tsconfig.app.json` (see master plan §6's
explicit-imports decision, which exists to keep it out), `vite.config.ts`, `.env`
(the owner set the flag there already — master plan §10).

## Tasks
1. **Verify and configure** the already-installed test stack — vitest, jsdom,
   @testing-library/react, @testing-library/user-event, @testing-library/jest-dom are all
   present in `devDependencies` (master plan §10; verified 2026-09-01). **Do not run
   `npm install`** — it would bump versions and further dirty an already-modified
   `package-lock.json`. Add the `"test": "vitest run"` script; write `vitest.config.ts`
   and `src/test/setup.ts` per master plan §6 (Tests) — merged config, explicit imports,
   the `/vitest` jest-dom specifier.
2. Create the feature skeleton folders and the types files (registry names, master
   plan §6). DTOs mirror contract v1.2 exactly, incl. the report entry with `mergeKey`.
   The state union lives in `stock.dto.ts` as `StockStateDto`; `StockState` in
   `stock.types.ts` is the derived alias — see master plan §6, "The state union".
   Per master plan §3, Codex scaffolds only empty `ui/` exports the registry names, if any.
3. Implement `stock-states.domain.ts` per MC1 **and intention §4B**: `STOCK_STATES`
   readonly tuple, `STOCK_STATE_META` record, `getStockStateMeta`, `compareByStateIndex`
   with the MC1b signature returning exactly `0` for equals, and `UnknownStockStateError`
   thrown by **both** exported functions on an unknown state (MC1a).
4. Implement the API layer: the seven functions at the signatures fixed in master plan §6,
   live via shared `apiClient` at the contract §4 paths **minus their `/api` prefix**
   (master plan §6, "Endpoint paths carry no `/api` prefix" — the base URL already ends in
   `/api`); `stock-api-mode.ts` exporting `resolveStockApiMode()` read per call (not a
   module-level `const`); mocks holding module-level session state per master plan §6
   ("Mock mutation semantics") with `__resetMockState()`, over fixtures copied from the
   contract examples + the §4.1 vocabulary table (S4, S4a, S4b). Location path segments
   through `encodeURIComponent` (MC12a).

## Acceptance criteria

*All six rows were rewritten 2026-09-01 after the round-0 projection found none of them
writable as they stood. Row ids are stable; the sub-rows are the addressable obligations.*

| id | criterion | trace |
|---|---|---|
| C1 | `npm test` runs vitest and exits clean; `npm run typecheck` and `npm run lint` pass with all new files in place. **Charter rule 1 exemption:** this is an environment-lifecycle check, met by running commands rather than by a test. Its automated proxy is the rest of this phase's suite (a broken runner or config cannot produce a green C2–C6), and the implementer records the three commands with their output in the Review log at IMPLEMENTED. | infra-enabler row (master plan S7) — D8; charter rule 1 exemption |
| C2 | MC1 + intention §4B, one row per case: (a) `STOCK_STATES` holds exactly five states in contract §1 order; (b) `getStockStateMeta` returns label/text/tint/solid for each of the five — enumerated, one assertion row per state, exact hex from `design_handoff/00-global/00-global.md`; (c) `getStockStateMeta("not_a_state")` throws `UnknownStockStateError`; (d) `compareByStateIndex("not_a_state", "low_in_stock")` **also** throws `UnknownStockStateError` (MC1a — an untested comparator resolves it to index `-1` and ranks it ahead of `out_of_stock`); (e) sorting a shuffled array of the five distinct states with the comparator reproduces the canonical order; (f) `compareByStateIndex(s, s)` returns **exactly `0`** for each of the five states (MC1b — case (e) uses distinct values and can never observe this). **Named mutations, both applied at the `compareByStateIndex` *definition* in `stock-states.domain.ts`, not at a call site:** M1 — delete its unknown-state guard → (d) must redden; M2 — change its equal-state return from `0` to `1` → (f) must redden, and (e) must stay green, proving the two rows divide the labour. | MC1, MC1a, MC1b |
| C3 | Mock `get-stock-report` fixture, one row per case: (a) every entry carries exactly the six fields of contract §4.7 — `location`, `itemCategory`, `properties`, `mergeKey`, `quantity`, `stockState` — no extra key, no missing key; (b) **exactly two** entries share one `mergeKey` **with the same `stockState`**, in two different locations, reproducing the §4.7 example pair — "verbatim" governs the five non-opaque fields; the pair shares **one implementer-chosen opaque string**, because the contract's own two literals (`"<opaque>"`, `"<same opaque value>"`) are placeholders and are *different strings*, so copying them literally would produce entries that do not share a key at all; (c) **exactly two** entries share a second `mergeKey` **with differing `stockState`s**, in two different locations; (d) **exactly one** entry has `quantity: 0`, its `stockState` is `out_of_stock` (contract §1: `0 → out_of_stock`), and it sits under a **third** `mergeKey` so it cannot disturb (b) or (c)'s exact counts. | MC11, S4 |
| C4 | Mock `get-stock-options` returns the §4.1 vocabulary: (a) all 8 property keys with exact values and exact `categories` bindings, enumerated against the contract's **final vocabulary table**, which wins over the JSON example where they differ (S4b); (b) `itemCategories` holds exactly the nine categories fixed in master plan S4a, in that order. | MC11, M4 |
| C5 | Seam (MC11), one row per mode value, over each of the seven api functions at their master plan §6 signatures: (a) `VITE_STOCK_API_MODE="mock"` — every function resolves from fixtures and the fetch spy records **exactly zero** calls; (b) `VITE_STOCK_API_MODE="live"` — every function issues **exactly one** `apiClient` call, and the URL the spy observes is the contract §4 path **without** the `/api` prefix (e.g. `getStockOptions` → a URL ending `/stock/options`, **not** `/api/stock/options`; asserted against the resolved URL, so a doubled prefix reddens this row); (c) `VITE_STOCK_API_MODE` unset — observably identical to (b) (default `live`, MC11); (d) MC12a: `getStockLocationDetail("L 1")` requests the path segment `L%201`; (e) mock mutation state — `createStockConfigurations` followed by `getStockLocationDetail` for that location returns the created row, and `deleteStockConfiguration` followed by the same read does not (master plan §6, "Mock mutation semantics"; a constant-returning stub passes (a) and fails this). | MC11, MC12a |
| C6 | Three allowlist assertions over the scan input set fixed in master plan S2 (`**/*.ts(x)` under `src/features/stock`, **excluding `**/*.test.ts(x)`** — tests legitimately contain every forbidden string, and without the exclusion all three assertions fail on the tree this phase must produce), each asserting that the **set of files** containing a match **equals** its allowlist exactly — set equality, never an occurrence count (charter rule 15): (a) `VITE_STOCK_API_MODE` appears in `{api/stock-api-mode.ts}` and nowhere else (S3); (b) a state **hex** (case-insensitive) appears in `{domain/stock-states.domain.ts}` and nowhere else (S2); (c) a state **name string** appears in `{domain/stock-states.domain.ts, types/stock.dto.ts, api/mocks/*.fixture.ts}` and nowhere else (S2). Scan is raw source text. **Mechanism:** the scan is a pure function over an **injected file list**, so each probe passes a synthetic extra file; and one further assertion pins the **shipped call site** to the real file list, so the probes cannot be proving a helper production never uses (charter rule 15's fifth instance). *Planted-defect probe, one per assertion, three total: a synthetic violating file must turn that assertion red — an assertion whose red is never observed does not ship.* | MC11, MC1 |

## Notes
Charter rule 15 applies to C6 (absence claims prove their instrument). Mock fixtures
are the project's demo data until P10 — keep them realistic but contract-verbatim
(S4, incl. its population clause). C3(c) exists for that reason: the mock report is what
the running app shows during every UI phase and the owner's visual passes, so the
same-`mergeKey`/different-`stockState` case the contract obliges the client to keep
separate must be *visible* in the demo data. (The P2 domain tests build their own
fixtures and do not consume this one.)

**Mutation count for this phase: 5**, summands: C2 2 · C6 3.
C2 — M1 (drop the comparator's unknown-state guard, reddens C2(d)) · M2 (equal-state
return `0`→`1`, reddens C2(f), leaves C2(e) green). C6 — one planted violating file per
assertion: (a) env flag · (b) state hex · (c) state name. C1, C3, C4 and C5 name no
mutation; they are observational rows over fixtures, spies and resolved URLs.

## Review log

- **2026-09-01 · round 0 (projection) · Claude (Opus 5) · AMENDMENTS_REQUIRED · consumed by
  coordinator.** Handoff: `handoffs/reviewer/plan_1_round_0_projection_handoff.md`. 26-row
  decision ledger, 9 findings; the projection judged **zero of six criterion rows writable**
  as they stood. All 26 rows routed, none waived:
  - **Intention (§4B, new, lettered):** MC1a (loud-fail binds at both exported entry points,
    named `UnknownStockStateError`, validated at interpretation not at the wire) and MC1b
    (comparator compares state values, returns exactly `0` for equals) — L8, F4. Status
    header left RATIFIED; changelog round 7 records the call and the owner's option to
    declare it material.
  - **Master plan §6:** state-union home resolved (`StockStateDto` in the dto file,
    `StockState` a derived alias) — F3/L6; seven api signatures fixed — L15; the `/api`
    prefix rule — F1; flag read site — L10; mock session state + `__resetMockState()` — F7;
    vitest config merge, explicit imports, jest-dom `/vitest` specifier — L16/L18/L19.
  - **Master plan §9:** S2 narrowed (order indices dropped as unobservable — L5) and given an
    explicit scan input set excluding colocated tests — F2/L2/L3; S4a (the nine demo
    categories, owner decision) — L12/card 2; S4b (final table beats JSON example) — L26.
  - **Master plan §10:** the mock/live route recorded — F5/L11/card 1; the false "verify the
    `/api` dev proxy" line corrected — F1.
  - **`context/frontend-architecture.md` §4:** the sentence "absolute paths (`/api/stock/...`);
    Vite dev server proxies" was false in both halves — corrected at the home artifact — F1.
  - **Plan 10 Task 1:** inherited the same false proxy premise — amended — F1.
  - **This plan:** Read-first +3 sources (F9); Task 1 verb install→verify (L20); perimeter
    +`src/vite-env.d.ts` (L17) and an explicit do-not-edit list; all six criterion rows
    rewritten, C6 given three addressable ids (L24) and an injected-file-list probe
    mechanism with a shipped-call-site assertion (L4); C3 re-traced off M2/M2A to
    `MC11, S4` (F8) and its opaque-key and `quantity: 0` cases determined (F6, L23);
    C1 recorded as a charter rule-1 environment-lifecycle exemption (projection's C1 note).
  - **Delegations granted explicitly** (free choices, no longer silent): L9 tuple shape,
    L18 specifier, L23 zero-quantity placement, L25 fixture location codes `LC1`/`H1`,
    L26 table-over-example.
  - **Coordinator's own lint, for the record:** the pre-dispatch lint that preceded this
    projection amended C3, C5 and C6 and *introduced* the S2-vs-colocated-tests collision
    that became F2. The projection caught a defect the coordinator authored one step
    earlier. Recorded here rather than in the tracker note, where it would not be found.

- **2026-09-01 · round 1 (implementation) · Codex · IMPLEMENTED.** Built the Vitest/jsdom
  harness with merged Vite configuration, explicit imports, and the Vitest-specific
  jest-dom setup. Added the registered stock DTO/view type shells, the MC1 state tuple and
  metadata with the fifteen global design hexes, named unknown-state error, strict
  comparator, all seven API adapters, contract-verbatim options/report fixtures, and
  session-stateful mock mutations with reset support. Added the C2–C6 colocated tests and
  injected-file-list allowlist guard. No UI, store, controller, flow, or later-phase domain
  logic was added.

  Judgment calls granted by the prompt: `STOCK_STATES` is a readonly tuple with metadata in
  a separate record; the zero-quantity report fixture is the singleton `out_of_stock` entry
  under a third merge key; fixture locations use `LC1` and `H1`; the opaque same-state report
  pair uses `report-walnut-chairs`; the C6 guard uses Vite's eager `?raw` glob as its shipped
  real-file call site because the app tsconfig intentionally does not include Node types.
  The nine item categories and final vocabulary table follow master plan S4a/S4b. The
  location-detail fixture derives state values from the canonical tuple, leaving state-name
  literals in only the domain, DTO union, and report fixture as required by S2.

  Baseline was captured before production edits: `npx vitest run src/features/stock` found
  3 files, 7 tests in the allowlist file (4 failing call-site/absence assertions, 3 probe
  tests passing), plus 2 collection failures for the absent domain/API modules; total 6
  failing IDs. Closing evidence on the final code tree: `npm test` → 3 files / 32 tests
  passed; `npm run typecheck` → passed with no diagnostics; `npm run lint` → repository
  baseline failure of 48 errors and 14 warnings, all in unrelated pre-existing files (the
  command reported 62 problems); scoped lint over `src/features/stock`, `src/test/setup.ts`,
  `src/vite-env.d.ts`, and `vitest.config.ts` → passed. The lint baseline exception is
  documented rather than repaired outside this phase's perimeter.

  Named mutation ledger: 5 declared = C2 (2) + C6 (3), 5 executed. M1 removed both
  `requireStockState` calls at the `compareByStateIndex` definition; L1 command `npx
  vitest run src/features/stock/domain/stock-states.domain.test.ts -t 'unknown comparator
  state throws'` observed 1 failed / 13 skipped, C2(d)'s assertion reported that no error
  was thrown. M2 changed the equal return at that same definition from `0` to `1`; the
  `... -t 'comparator returns exactly zero'` run observed 5 failed / 9 skipped (expected 0,
  received 1), while `... -t 'sorting distinct states reproduces canonical order'` observed
  1 passed / 13 skipped. C6(a), C6(b), and C6(c) each injected one violating comment into
  `api/get-stock-options.api.ts`; their respective allowlist L1 runs each observed 1 failed
  assertion with the extra API file in the matched set. Every mutant was reverted.
