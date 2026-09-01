# Location Stock System — Master Plan

Status: planning complete 2026-09-01. Coordinator: pipeline-coordinator sessions. Owner: David.

## 1. Goal

Extend the location domain so users configure per-location stock definitions (`location + item_type + properties`), each an independently monitored stock instance with quantity, thresholds, and derived state, maintained automatically as items move, sell, and return. Semantics live in the **intention** (`intention/raw_intention.md`, RATIFIED, incl. §23 mechanism contracts and §24 measurement ledger) and the **context** (`context/context.md`, §0 binding decisions). This document never restates them.

**Scope note (intention §23.4):** this pipeline is backend-only. The frontend is planned by a separate agent against `contracts/frontend-api-contract.md`, which this pipeline owns and freezes.

## 2. Sources of truth

| Content | Artifact |
|---|---|
| Product semantics, invariants, mechanism contracts, measurement ledger | `intention/raw_intention.md` (§23 wins over everything; context §0 wins over §1–§22) |
| System-as-it-is: conventions, integration points, data reality | `context/context.md` |
| Property-options map content (owner selection) | `context/property-options-selection.md` |
| Shared skeleton, naming registry, environment, tracker | this file |
| Phase goal/tasks/criteria/review log | `plans/plan_<n>_*.md` |
| Frontend-facing API contract | `contracts/frontend-api-contract.md` (**v1.3**) — regenerated from this file's registry on any change, never hand-drifted. **Delivery is not automatic:** the frontend track works from a copy under `apps/frontend/` on `main`, the coordinator never writes there, and a version is undelivered until the owner routes the file across branches |
| Session prompts / handoffs | `prompts/<role>/`, `handoffs/<role>/`, archived per charter — tables created 2026-09-01, semantics in each folder's `README.md` |
| Cross-track traffic with the frontend (both directions) | `handoffs/frontend/` — **not a charter table**; its README records the deviation and the direction column. Created 2026-09-01 after a frontend request arrived at a non-table path and was found only by a manual sweep |
| Actor assignment, doctrine paths, coordinator failure modes | `prompts/coordinator/coordinator_role.md` (standing, never archives) |

**Fold-back rule:** semantic changes amend the intention (lettered sections, never renumber); skeleton/naming changes amend this file; phase plans are never patched into divergence. Any registry change that touches an endpoint or DTO **must** regenerate the frontend contract doc in the same session and note it in the tracker row.

## 3. Roles & session workflow

Charter state machine per phase: `NOT_STARTED → (PROJECTED) → PROMPT_READY → IMPLEMENTING → IMPLEMENTED → REVIEWING → CHANGES_REQUESTED/APPROVED`. Prompts are compiled just-in-time by the coordinator; every session is stateless and reads its plan's Read-first list.

**Actor assignment (owner, 2026-09-01):** orchestrator/coordinator = Claude Opus; **reviewer = the same Opus setup** (no independent reviewer session — ratified in intention §25, since there is no test suite to referee); **implementer = Codex**, driven by self-contained prompts the coordinator compiles per the implementation-executor specification (charter interop principle — artifacts and prompt documents, never shared conversation state). Reviewer prompts embed §11 below verbatim.

**Owner constraint — one review round per phase.** Phases are sized (≤8 criteria) so a single full-checklist review can close them. If a review finds blocking defects, the fix cycle + re-review is the accepted overrun, not the norm. Checkpoint commits at every IMPLEMENTED per charter (`CHECKPOINT (not approved):` prefix; standing owner authorization).

**Projection (round 0):** mandatory for P1, P2, P4 (silent-failure mechanisms: canonical form, matching, guard, reconciliation, hooks); waivable by the owner for P3, P5, P6 with a recorded line. **Actor (owner, 2026-09-01): a fresh Claude Opus session** — a *new* session, never a resume of a coordinator session, because the emptiness of its context is the instrument. Deliberately not the implementing model: projection is a reviewer-role judgment act, and projecting a phase would make the implementer's first exposure to it an anchored one. Its read scope excludes `prompts/` and `handoffs/`, and its skeleton is discarded rather than handed to the implementer.

## 4. Progress tracker

| Phase | State | Date | Actor | Note |
|---|---|---|---|---|
| P1 schema + domain | **APPROVED** | 2026-09-01 | reviewer | round 1, no blocking findings. Instruments re-run: typecheck 0, purity grep empty, verify 58/58, perimeter exact. 2 should-fix (S1 §23.2 conjunction untested, S2 delegation D4 unguarded — both proven by reviewer mutation), 4 notes incl. 2 forward hazards for P2/P3. Owner **declined** the fix cycle (§9.7): code verified correct, and no later phase's perimeter contains P1's files. S1/S2 closed as notes |
| P2 repository + reconciliation | **APPROVED** | 2026-09-01 | coordinator | lint PASS after 5 folds (L1 made the phase impossible to close, L4 a criterion impossible to satisfy); projection r0 AMENDMENTS_REQUIRED, all 16 ledger rows + 8 findings folded, owner card 1 answered (recount stamps only changed rows); two findings hit §6.2/§6.4. Re-lint PASS post-fold → `prompts/coordinator/plan_lint_2.md`; prompt compiled → `prompts/implementer/prompt_plan2_implement_r1.md`, gate self-tested 5/5. Review r1 **APPROVED**, no blocking findings; instruments re-run (typecheck 0, purity empty, verify-all 58+20 exit 0, perimeter exact, P1 frozen files identical). 2 should-fix — S1 a coordinator-authored contradiction between C3(d) and card 1 (fixed in text), S2 the empty-group path unexercised (routed to P3 C5(d)) — plus N1 routed to P5. No fix cycle |
| P3 configuration API | **PROJECTED (fold in progress)** | 2026-09-01 | coordinator | gate SATISFIED (P2 APPROVED); lint **PASS after 3 folds** → `prompts/coordinator/plan_lint_3.md` (C1's non-standard `(b2)` label, C3 with no addressable rows, C7 untraced); 7 criteria / 28 rows. Projection r0 dispatched → `prompts/reviewer/prompt_plan3_projection_r0.md` — **owner elected it though §3 makes it waivable here**, so no waiver line is needed. Projection returned AMENDMENTS_REQUIRED: 12 ledger rows, owner card 1 answered (edited row keeps the person; siblings keep the sentinel). **Card + row counts folded; the remaining ledger rows are not yet routed** — implementer prompt compiles only when they are |
| P4 item-transition hooks | **PROJECTED (fold in progress)** | 2026-09-01 | coordinator | gate SATISFIED (P2 APPROVED); lint **PASS after 2 folds** → `prompts/coordinator/plan_lint_4.md` (**six of seven criteria had no addressable rows**; C7 untraced; a drifted line citation de-drifted); 7 criteria / 25 rows. Projection r0 dispatched (**mandatory**, §3) → `prompts/reviewer/prompt_plan4_projection_r0.md`. May run parallel to P3. Projection returned AMENDMENTS_REQUIRED: 11 ledger rows + 9 findings, owner card 1 answered (**read the stored row on the sale path** — amends §0.10 for those two call sites). Its F6 caught a coordinator row-count error in both plans. **Card + counts folded; remaining ledger rows not yet routed** |
| P5 report | NOT_STARTED | 2026-09-01 | coordinator | after P3 (shares controller/routes files). **Plan rewritten** under intention §26 (owner-approved report amendment): 6 criteria → 3, contract reissued v1.2 |
| P6 maintenance + verification sweep | NOT_STARTED | | | closeout |

## 5. Contract resolution

The repo has a written architecture contract: `.github/instructions/backend-contracts.instructions.md` — **authoritative** for the new module (layering, Prisma-only-in-repositories, transactions in services, zod contracts, error mapping). Implementing sessions read it in full and re-emit compliance before coding. Known departures in existing code are catalogued in context §3.8; the stock module complies fully, and P4 explicitly does **not** modify the departing file (`scan-history.repository.ts`, per §0.10). Charter standing rules apply as baseline where the repo contract is silent, with the project deviations in §9 below.

## 6. Shared skeleton & naming registry

Everything below is **fixed**. A session that needs to deviate stops and routes a fold-back to the coordinator.

### 6.1 Prisma (`prisma/schema.prisma`; migration name `add_location_stock`)

```prisma
enum StockState {
  out_of_stock
  low_in_stock
  medium_in_stock
  normal_in_stock
  high_in_stock
}

model LocationStock {
  id                  String  @id @default(cuid())
  shopId              String
  shop                Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  location            String
  itemCategory        String
  properties          Json                    // canonical criteria (§23.1); {} = catch-all, NEVER collapsed to null (§0.21)
  propertiesCanonical String                  // canonical JSON string of `properties` — the §23.1 identity; kept in sync by the repository
  quantity            Int     @default(0)
  stockState          StockState @default(out_of_stock)
  createdAt           DateTime @default(now())
  createdByUsername   String
  updatedAt           DateTime @updatedAt
  updatedByUsername   String
  thresholds          StockThresholdsLocation[]

  @@unique([shopId, location, itemCategory, propertiesCanonical])
  @@index([shopId, location, itemCategory])
}

model StockThresholdsLocation {
  id                String  @id @default(cuid())
  shopId            String
  shop              Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  locationStockId   String
  locationStock     LocationStock @relation(fields: [locationStockId], references: [id], onDelete: Cascade)
  state             StockState    // only low/medium/normal are valid; enforced in domain + contract, not schema
  thresholdQuantity Int
  createdAt         DateTime @default(now())
  createdByUsername String
  updatedAt         DateTime @updatedAt
  updatedByUsername String

  @@unique([locationStockId, state])
  @@index([shopId])
}
```

`Shop` gains two back-relation fields: `locationStocks LocationStock[]`, `stockThresholds StockThresholdsLocation[]`.

### 6.2 Domain types & functions (`src/modules/stock/domain/` — pure, zero Prisma imports)

| File | Exports |
|---|---|
| `stock-state.ts` | `STOCK_STATES` (`as const`, severity-ascending, single source for sorting §0.20), `StockState`, `CONFIGURABLE_THRESHOLD_STATES` (`["low_in_stock","medium_in_stock","normal_in_stock"] as const`), `calculateStockState(quantity, thresholds)`, `validateThresholds(thresholds)` |
| `property-criteria.ts` | `StockCriteria` (`Record<string, string[] \| null>` — canonical), `StockCriteriaInput` (`Record<string, string \| string[] \| null>`), `tokenizePropertyValue(stored): Set<string>` (§0.5), `normalizeCriteria(input): StockCriteria` (§23.1; throws on empty-array-after-normalization), `canonicalCriteriaString(criteria): string` (key-sorted JSON), `matchesCriteria(itemProperties: Record<string, string> \| null, criteria: StockCriteria): boolean` (§0.5/§0.8/§0.21) |
| `best-match.ts` | `specificityScore(criteria)` (§0.13 components), `resolveBestMatch(candidates, itemProperties)` — candidates carry `{ id, createdAt, criteria }`; returns winner or null |
| `conflict.ts` | `findConflict(candidate: StockCriteria, siblings: Array<{id, criteria}>): { conflictingId } \| null` (§23.2; caller excludes self on update) |

Threshold shape everywhere in domain/service code: `{ state: StockState; thresholdQuantity: number }`.

**Reconciliation hooks — fixed 2026-09-01 (P2 projection D3/F6).** `reconcileGroup` and
`reconcileAllGroups` take a final **optional** `hooks` argument, defaulting to no-op:
`hooks?: { betweenPasses?: () => Promise<void>; onGroupReconciled?: (group) => void }`.
`betweenPasses` is **awaited** between pass 1's commit and pass 2's read — without that it
cannot write to the database, and P2's C4(b) (the interleaved-write probe that is §23.6's only
instrument) is unbuildable. `onGroupReconciled` makes `reconcileAllGroups`' per-group work
observable, which C6(b) requires and idempotence otherwise hides.
This is registered here rather than left in a plan note because §6 is declared fixed and §9.3
makes any deviation a stop-and-fold-back: a plan requiring a parameter the registry forbids
tells the implementer two incompatible things. **These hooks are instruments with required
callers (the verify script), not scaffolding** — charter rule 4 is satisfied.

**Guarded-decrement log context — fixed 2026-09-01 (P2 lint L4).** `applyGuardedDecrement` takes a fourth argument carrying the §0.15 diagnostic fields the *caller* knows:
`applyGuardedDecrement(id, shopId, delta, context: { productId?, scanHistoryId?, itemCategory?, locationFrom?, locationTo?, operation })`.
The repository supplies the fields it owns (`locationStockId`, `location`, `requestedDecrement`, `currentQuantity` read back after refusal); everything identifying the *item* and the *triggering operation* is only knowable by the caller, which is why P4's `applyItemStockChange` already carries `operation` and `itemIdentifiers` "solely for §0.15 log context". Without this parameter the §0.15 field list is unreachable from a three-argument signature, and a criterion demanding it cannot be satisfied.

**Item-properties input type — fixed 2026-09-01 (P1 projection F1), corrected 2026-09-01 (P2 projection D9/F7).** Everywhere the domain
or a service receives an *item's* property bag it is typed `Record<string, string> | null`,
never `Json`, never `Record<string, unknown>`. **Reducing the Prisma `Json` value to that
type is the caller's job**, and the caller is **`listEligibleItems`** (P2 task 2), which is
where an *item's* `ScanHistory.properties` enters the stock module: drop non-string values,
drop empty-after-trim values, and pass `null` for an absent bag — the same reduction
`normalizeStoredProperties` performs inside `scan-history.repository.ts`, which is **not
exported and out of perimeter (§9.6)**, so the stock module re-implements it rather than
importing it. This keeps `domain/` pure and makes the "property present but tokenizes to
nothing" case identical to key-absent (P1 projection D4).

> **Correction, and why it mattered.** This note first said the reduction belonged "on the way
> out of `toDomain`". That was wrong and actively dangerous: `toDomain` maps
> `LocationStock.properties` — *criteria*, whose values are string **arrays** or `null` — so
> "drop non-string values" applied there deletes every criterion, while the item path it was
> meant to describe stays unreduced. An implementer following the old wording literally would
> have corrupted the allocator's input, caught only by `npm run typecheck` failing on
> `resolveBestMatch`'s parameter type. Two different property shapes share the word
> "properties"; the registry now names the function for each.
> *Secondary wording fix:* `normalizeStoredProperties` returns `{}` for an absent bag, never
> `null`. Against `matchesCriteria` the two are equivalent (`property-criteria.ts:59-64` returns
> `true` for empty criteria before consulting the bag), so `null` remains the specified value
> here — but the "same reduction" phrasing overstated the correspondence.

### 6.3 Options map (`src/shared/item-properties/item-property-options.ts`)

`ITEM_PROPERTY_OPTIONS: ReadonlyArray<{ key: string; values: readonly string[]; categories: "universal" | readonly ItemCategory[] }>` per §23.3, `as const`, content from the owner's selection sheet. Helper `getPropertyOptionsForCategory(itemCategory)` returns universal + category-listed entries.

### 6.4 Module layout (`src/modules/stock/`)

| File | Responsibility |
|---|---|
| `contracts/stock.contract.ts` | zod schemas + DTO types (below) |
| `repositories/location-stock.repository.ts` | `locationStockRepository` object literal; ALL Prisma access; guarded decrement (§0.15); `{}` round-trips as `{}` (§0.21); accepts optional `tx` |
| `services/stock-reconciliation.service.ts` | `reconcileGroup(shopId, location, itemCategory, hooks?)` double-pass (§0.17 + §23.6), `reconcileAllGroups(shopId, hooks?)` |
| `services/apply-item-stock-change.service.ts` | `applyItemStockChange({ shopId, before, after, operation })` (§0.7/§0.10/§0.15); `before/after: { location: string \| null, itemCategory: string \| null, properties: Record<string, string> \| null, quantity: number, isSold: boolean } | null` — `properties` typed per §6.2's fixed input type |
| `commands/create-location-stocks.command.ts` | batch create, all-or-nothing (§23.5) |
| `commands/update-location-stock.command.ts` | update incl. full threshold replacement, 1–2 group reconciliation |
| `commands/delete-location-stock.command.ts` | delete + group reconciliation |
| `queries/get-stock-locations-summary.query.ts` | §17 |
| `queries/get-location-stock-detail.query.ts` | §18 |
| `queries/get-stock-configuration-options.query.ts` | §0.4/§23.3 |
| `queries/get-stock-report.query.ts` | §19/§0.19 (P5) |
| `controllers/stock.controller.ts` | zod parse, envelopes |
| `routes/stock.routes.ts` | `authenticateUserMiddleware` + `requireShopLinkMiddleware` (§0.18); no admin gate |

Maintenance scripts (P6): `scripts/report-stock-property-drift.ts`, `scripts/rebuild-location-stock.ts` (env `DRY_RUN`, `SHOP_ID` per `scripts/reconcile-active-sold-items.ts` convention).

**Committed criterion instruments** (the §9.1b scripts — all committed, all re-runnable):

| Script | Authored by | Covers |
|---|---|---|
| `scripts/verify-stock-domain.ts` | P1 | P1 C2–C8 (pure domain; no DB) |
| `scripts/verify-stock-reconciliation.ts` | P2 | P2 C1–C6 (scratch DB copy) |
| `scripts/verify-stock-report.ts` | P5 | P5 C1–C6 aggregation rows (scratch DB copy) |
| `scripts/verify-all.ts` | P2 | runs every `verify-*.ts` above in sequence — the regression seam (§9.1d) |

**This table is the *eventual* set, not the set expected at any given moment.** `verify-stock-report.ts` does not exist until P5. `verify-all.ts` therefore carries its **own** `EXPECTED_SCRIPTS` constant, which lists only the scripts that exist as of the phase that last edited it; the phase authoring a new `verify-*.ts` adds it to that constant **in the same commit**. `MISSING` is judged against `EXPECTED_SCRIPTS`, never against this table.
*Earned at P2's pre-dispatch lint: keying `MISSING` to this table would have made `verify-all` exit non-zero at every close before P5 — because a P5 script is listed here — so P2's own phase-close instrument ("verify-all all-PASS") was unsatisfiable by construction. The guard would have turned the phase red in a file the plan does not permit anyone to touch.*

### 6.5 HTTP surface (mounted in `server.ts` at BOTH `/stock` and `/api/stock`)

| Method + path | Handler | Response |
|---|---|---|
| `GET /stock/options` | options query | `200 { data: { itemCategories, propertyOptions } }` |
| `GET /stock/locations` | summary query | `200 { data: [{ location, stockCount }] }` |
| `GET /stock/locations/:location` | detail query (URL-encoded location) | `200 { data: LocationStockDto[] }` |
| `POST /stock/configurations` | batch create `{ configurations: CreateLocationStockInput[] }` | `201 { data: LocationStockDto[] }` |
| `PATCH /stock/configurations/:id` | update | `200 { data: LocationStockDto }` |
| `DELETE /stock/configurations/:id` | delete | `200 { ok: true }` |
| `GET /stock/report` | report query — **no query parameters** (intention §26.1) | `200 { data: StockReportDto }` (P5) |

**DTOs** (`stock.contract.ts`):

```
LocationStockDto = { id, location, itemCategory, properties: StockCriteria (canonical),
  quantity, stockState, thresholds: [{ state, thresholdQuantity }],
  createdAt, createdByUsername, updatedAt, updatedByUsername }

CreateLocationStockInput = { location, itemCategory, properties?: StockCriteriaInput,
  thresholds: [{ state, thresholdQuantity }] }   // exactly the three configurable states

UpdateLocationStockInput = { location?, itemCategory?, properties?, thresholds? }  // thresholds = full replacement

StockReportDto = { entries: [{ location, itemCategory, properties, mergeKey, quantity, stockState }] }
  // intention §26. One entry per definition — uncompacted, unfiltered, unordered.
  // mergeKey: opaque string, equal iff itemCategory + canonical properties are equal.
  //   Derived as `${itemCategory}|${propertiesCanonical}` from the stored §6.1 column;
  //   the client groups on mergeKey + stockState and never parses the key (§26.2, §26.4).
  // The v1.1 `rows`/`groups` dual shape and `locations[]` are removed.
```

Errors: existing `ValidationError`/`NotFoundError`/`ConflictError`; conflict details carry `{ conflictingId, batchIndex? }`. Envelope + error shape per context §3.4.

### 6.6 Fixed constants

- Reconciliation sentinel username: `"system:stock-reconciliation"` (§0.3).
- Guard-log `operation` set: `"location_move" | "sold" | "return_to_store" | "products_update_sync" | "reconciliation"` (§0.15).
- Location normalization on config write: `trim()`, reject empty (§0.12/§0.14). Case-sensitive everywhere.

## 7. Sequencing & gates

```
P1 ──► P2 ──►┬─► P3 ──► P5 ─┐
             └─► P4 ────────┴─► P6
```

- P1 gate-in: owner has answered `context/property-options-selection.md`.
- A phase starts only when its predecessors are APPROVED.
- P3 and P4 may run in parallel after P2 (disjoint file perimeters). P5 follows P3 (same controller/routes files). P6 requires P3+P4+P5.
- The frontend track is external: it starts immediately from `contracts/frontend-api-contract.md` and integrates live once P3 is APPROVED (report endpoint after P5).

## 8. Tool protocols

No archgraph in this repo — skip silently. Sessions verify write perimeters via `git diff` against their plan's file list; checkpoint commits per charter.

## 9. Standing rules — project deviations from charter (each owner-ratified)

1. **No automated tests (§0.11 / intention §22.10).** Charter rule 1 is exempted project-wide. Replacements, binding: (a) `npm run typecheck` green is the automated gate for every phase; (b) enumerated criteria decidable without a live HTTP surface are checked by a **committed** `scripts/verify-*.ts` (one PASS/FAIL line per criterion row, exits non-zero on failure), run with output pasted into the Review log — the §6.4 instrument table names which script covers which phase; (c) criteria needing the running app, the worker, or Shopify are checked by the phase's Manual Scenarios section (curl/UI steps with expected quantity + state after each), executed by implementer and re-executed by reviewer.

   **(d) The regression seam — owner decision, 2026-09-01.** `scripts/verify-all.ts` runs every committed `verify-*.ts` in sequence and is a **phase-close instrument for P2 and every phase after it**, so a later phase cannot silently break an earlier phase's rules. Without it, the next full re-check of P1's domain rules is P6 — five phases of latency on exactly the defect class phase gating exists to contain.

   Binding on its construction: **a script that did not run must never read as green.** A child script that refuses (P2's and P5's refuse when `DATABASE_URL` points at the configured dev.db) reports `REFUSED`, and `verify-all.ts` exits non-zero. A missing script file is `MISSING`, also non-zero. The only zero exit is every script present, run, and all-PASS.

   Rationale recorded so a later session does not re-open it: this project already pays the expensive half of a test suite — the assertions and the scratch-DB fixtures live inside these scripts. What §0.11 descoped is a *runner*, not the checks. Chaining scripts that already exist is therefore near-zero cost and buys the one property the manual scheme structurally lacks. **This is not a reversal of §0.11:** no runner, no test framework, no CI, no new dependency, and §11.3 non-finding 1 stands unchanged — the absence of test infrastructure remains a non-finding, and no reviewer may request one.
2. **Domain purity (intention §22.10b):** `src/modules/stock/domain/` and `item-property-options.ts` import no Prisma and no I/O. Instrument: `grep -rn "prisma\|@prisma" src/modules/stock/domain/ src/shared/item-properties/item-property-options.ts` → empty; run at every phase close.
3. **One review round** per phase is the target; sizing and full-checklist first reviews serve it.
4. **`{}` is never collapsed to `null`** on `LocationStock.properties` (§0.21) — the repository must not reuse `toPropertiesUpdateValue`.
5. **Group totals:** a short group total without a catch-all is expected, not drift (§0.21/M8) — every Manual Scenarios section states this.
6. **`scan-history.repository.ts` is out of perimeter for every phase** (§0.10). Any need to touch it is a fold-back, not an edit.
7. **Working beats lasting — owner decision, 2026-09-01.** This backend is an acknowledged interim system pending a rebuild (context §0.11). The bar for this project is **correct now**, not **durable later**. Concretely, and binding on every reviewer:
   - A finding must show the code is **wrong**, or that a *ratified* contract is violated. "This would break if someone later changed X" is **not** a finding when nothing in the plan set changes X.
   - **Perimeters already carry the regression argument.** No phase after P1 has P1's domain files, the options map, or `verify-stock-domain.ts` in its "Files expected to change" list — verified 2026-09-01, zero occurrences across P2–P6 — and every phase close diffs `git diff --name-only` against that list with anything outside an automatic finding. A regression in an earlier phase's code therefore requires an edit the process forbids and would catch first, by a mechanism that does not depend on test coverage.
   - So **instrument-coverage gaps on frozen code are notes, never fix cycles.** Coverage earns a round only where the code is *live* — the phase being built, or a phase a fix cycle reopens.
   - This does **not** relax correctness. A forward hazard in work **not yet written** (P1 review N2 and N3 are the worked examples) is folded into the target plan immediately and costs nothing, because the plan is still being edited. That is the distinction: cheap where the work is ahead of you, expensive where it is behind you.

   *Earned: P1 review round 1 recommended a fix cycle for two proven-unguarded behaviours whose code was verified correct. The owner declined, correctly — the guarded regression could only arrive through a perimeter violation that a different, stronger mechanism already blocks. The recommendation cost a round of the owner's attention that the project's own framing had already answered.*
8. **No closed vocabulary is ever elided in the frontend contract (earned 2026-09-01).** Every enumerable list in `contracts/frontend-api-contract.md` is written out in full; `...` never appears in an example payload that any section describes as exact. *Earned: §4.1 wrote `itemCategories` as `["Dining Chairs", "Easy Chairs", ...]` directly above a table advertising itself as "the exact payload content, safe to hardcode in mocks". The frontend reasonably inferred the vocabulary from the only complete list nearby — the property table's `categories` column — and got **9** of **28**. The 19 missing categories hold 152 unsold units (Sideboards 41, Mirrors 19, Chest of Drawers 17); a wizard built on that list would have made them permanently unconfigurable with no error anywhere. Caught by the frontend asking, not by any check on our side.* Regenerating the contract from §6's registry (§2's fold-back rule) means regenerating **content**, not shape: a registry list becomes a written-out list.

## 10. Environment topology (verified 2026-09-01; if reality disagrees, update this section)

### 10.0 Working tree — this pipeline runs in a git worktree (owner, 2026-09-01)

The frontend for this feature is built in parallel on `main`, so the backend pipeline was
moved to its own worktree to keep the two commit streams clean.

| | Path | Branch | Owns |
|---|---|---|---|
| **Backend pipeline (this project)** | `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend` | `warehouse-stock-backend` | **every session of this pipeline works here** |
| Frontend track | `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify` | `main` | the frontend feature; owner-driven |

Both worktrees were created from `4424a3b`, which already contains the full planning set
(intention, context, master plan, plans, contracts, prompts, handoffs tables) — so the two
copies started identical. **After that commit they diverge, and only the worktree copy is
live.** A session that edits the planning documents in the `main` checkout is editing a
dead copy; check your path before writing.

Worktrees share one `.git`, so branches and history are common, but **untracked and ignored
files are not shared**. The worktree's backend runtime was therefore reconstructed by hand
(2026-09-01) and is now complete: `.env` copied, `prisma/dev.db` restored via
`sqlite3 … ".backup"`, `npm install` (173 packages), `npm run prisma:generate`. Verified:
`npx prisma migrate status` → *Database schema is up to date*, 33 migrations, head
`20260729084212_add_restocked_at_and_returned_to_store_event`; DB parity with `main`'s copy
at 1107 items / 518 unsold.

**Baseline for the automated gate, taken before P1 touches anything:** `npm run typecheck`
exits **0** on this worktree. Any typecheck failure a phase reports is that phase's own.

**The two databases are independent copies, not one shared file.** Scans or edits made
against one do not appear in the other. Run the backend from the worktree during this
project; the `main` checkout's `dev.db` will go stale and that is expected, not drift.

### 10.1 Commands and runtime

- Backend root: `apps/backend` **inside the worktree**. Node ESM, TS, `tsx` dev. **All commands run from `apps/backend`.**
- Automated gate: `npm run typecheck` (tsc --noEmit). `npm test` fails by design — never run it as a gate.
- Migrations: `npm run prisma:migrate:dev -- --name add_location_stock` (local), applies to `prisma/dev.db` (SQLite; 1107 ScanHistory rows, 518 unsold, 1 shop). Deploy uses `prisma:migrate:deploy`. Never rewrite an applied migration.
- **DB safety:** destructive manual verification runs against a copy in a scratch dir; scripts honor `DRY_RUN=1`. The configured dev.db is left at migration head with its data intact. **Copy with `sqlite3 prisma/dev.db ".backup '<dest>'"`, never a plain `cp`** — the database runs in WAL mode, so `cp` of the `.db` file alone can capture a torn state that omits committed pages still living in `dev.db-wal`. (Learned while provisioning the worktree, 2026-09-01.) The file is ~304 MB; budget the disk.
- Processes: API `src/server.ts`; webhook worker `src/workers/webhook-worker.ts` (BullMQ, needs Redis). Startup: `docs/guides/BACKEND_WORKERS_GUIDE.md`. Worker-path manual scenarios need Redis + worker running.
- Routers mount twice in `server.ts` (bare + `/api`) — context §2.
- SQLite: JSON not queryable via Prisma (§12.1); single-writer, WAL; `SQLITE_BUSY` retry exists only in the worker.
- No test runner, no archgraph. `git` present; default branch `main`; **this pipeline commits on `warehouse-stock-backend`** (§10.0) — checkpoint and approval-gate commits both land there, never on `main`.

## 11. Review scope contract (binding on every reviewer prompt — authority: intention §25)

### 11.1 What a review IS

Adversarial verification that the implementation satisfies its phase plan, criterion row by criterion row, against the ratified contracts. Obligations, all mandatory:

1. **Re-derive every criterion row against the code** — read the implementation and confirm the row holds by reasoning about the actual code path, not by trusting the implementer's handoff. Cite `file:line` per row verdict.
2. **Run the instruments:** `npm run typecheck`; the purity grep (§9.2); the phase's committed `verify-*` script(s) where the phase has one; `git diff --name-only` against the phase's file perimeter (anything outside it is an automatic finding).
3. **Execute the phase's Manual Scenarios checklist** where the environment permits; record expected vs observed per step. Where a step needs infrastructure that isn't running (e.g. Redis + worker), say so explicitly rather than skipping silently.
4. **Plant one defect per phase** (charter rule 15, adapted): temporarily introduce the phase plan's named planted-defect probe, confirm the verify script/instrument goes red, revert. This proves the instrument can fail.
5. **Hunt real logic defects** inside the perimeter: off-by-one against the §3 boundaries, a missed §0.15 log field, a wrong reconciliation scope, an unhandled canonical form — this is the core job. A genuine defect noticed in passing is reportable even if no criterion row names it, provided it meets 11.2.

### 11.2 Finding validity — the admission rule

A **BLOCKING** finding must satisfy at least one of:
- (a) a named plan criterion row is not met (cite the row);
- (b) a ratified contract is violated (cite intention §/context §0.x/§23.x, or `.github/instructions/backend-contracts.instructions.md` rule);
- (c) a concrete incorrect behavior is demonstrated: named input/state → wrong output/effect, on the production code path, with `file:line`;
- (d) the write perimeter or an instrument (typecheck, purity grep, verify script) fails.

Everything else is **ADVISORY**: logged in the plan's Review log for the coordinator to fold upstream (or discard), never a fix-cycle trigger. A finding phrased as "could", "might", "consider", or "best practice" without a concrete failing scenario is advisory by definition. The coordinator returns invalid blocking findings to the reviewer rather than dispatching a fix.

**Verdict rule:** CHANGES_REQUESTED only when ≥1 valid BLOCKING finding stands; otherwise APPROVED (advisories notwithstanding).

### 11.3 Enumerated NON-FINDINGS — settled decisions the reviewer must not raise

Each is ratified; raising it as a defect, risk, or hardening request is itself a review error. If the reviewer believes one is genuinely wrong, the path is a decision card to the owner via the coordinator (intention §25.3) — the verdict is computed as if the decision stands.

1. Absence of automated tests, test infrastructure, coverage, or CI — §0.11 / intention §22.10.
2. Hook placement outside the item transaction; the crash window between item commit and stock update; any request to move hooks into `scan-history.repository.ts` or into a shared transaction — §0.10 (Option A ratified; reconciliation is the remedy).
3. Absence of a stock WebSocket event; config changes emitting nothing; over-firing refetches — §0.9.
4. In-memory full-scan matching/reconciliation performance at the current data size; absence of JSON indexing or denormalized match columns — §0.6 (threshold for revisiting is recorded there).
5. Missing server-side location validation; a typo'd location silently matching nothing — §0.12.
6. Exact-equality location matching; no `H1`/`H1:2` hierarchical rule; legacy suffixed/retired locations falling through — §0.14.
7. Benign fall-through eligibility: `unknown` category, null location, unmapped property values, items matching no config — §0.16, §0.4, §0.8.
8. DRAFT/ARCHIVED Shopify products counting as stock — §0.22.
9. Ratified race residuals: a concurrent write after reconciliation pass 2 (§23.6, bounded at two passes by contract — suggesting a third pass or a loop is a non-finding); stale counters repaired by reconciliation rather than prevented (§20/§0.15).
10. Guard-refusal semantics: continue-don't-rollback, no clamping, parent operation succeeds — §0.15.
11. `{}` stored as `{}` diverging from the item-side `Prisma.JsonNull` convention — §0.21 (the reverse — collapsing `{}` to null — IS a blocking defect).
12. Denormalized username audit columns instead of user-ID FKs — §0.3. Any-authenticated-user authorization on stock routes — §0.18.
13. The hand-maintained property-options map being static code rather than DB/Shopify-derived, and its silent-mismatch consequence — §0.4 (the drift script is the ratified insurance).
14. Style preferences beyond the repo's own conventions and the architecture contract: envelope shapes other modules use, naming tastes, file-splitting opinions where the registry (§6) already fixed names.
15. Speculative future-proofing: Postgres readiness, event-system extensibility, test-runner scaffolding, config knobs, abstraction layers "for later" — and generally any code, endpoint, or field beyond the naming registry and the phase's criteria.
16. Pre-existing defects or contract departures in files outside the phase perimeter (context §3.8 catalogues them) — advisory at most, and only when actually encountered.
17. **The report endpoint performing no compaction, no state filtering, no ordering and no location ranking** — intention **§26** (owner-approved 2026-09-01) moved all four to the client and §26 wins over §19 and context §0.19. Reading §19's prose as still binding on the endpoint, or reporting P5 as incomplete against it, is a review error. The inverse *is* blocking: a P5 implementation that adds any of them back has built scope the contract does not have. Equally settled — the report takes **no query parameters** and ignores rather than rejects any that arrive (§26.1), and `mergeKey`'s encoding is opaque and unversioned (§26.2).
19. **Durability-only findings on code outside the phase's perimeter** — §9.7. Missing coverage, hardening, or "this would break if someone later changed X" against frozen earlier-phase code is a note at most, never blocking and never a fix cycle. The regression it imagines requires a perimeter violation the phase-close diff already catches.
18. **The client-side compaction key (`mergeKey` + `stockState`) not being enforceable by the backend** — §26.4. The safety property crossed the wire by owner decision; no backend criterion can observe a violation, and asking P5 for one is asking for something the architecture cannot provide.

### 11.4 One-round discipline

The owner's target is one review round per phase. Accordingly: the first review is full-checklist and exhaustive — every valid blocking finding surfaces in round 1, not incrementally. A fix cycle, if one happens, is delta-scoped per the charter re-review protocol (perimeter diff + full depth on the changed seam only). The reviewer never expands a fix-cycle review into a fresh full review of settled areas.
