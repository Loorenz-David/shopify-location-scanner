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
| Frontend-facing API contract | `contracts/frontend-api-contract.md` — regenerated from this file's registry on any change, never hand-drifted |
| Session prompts / handoffs | `prompts/<role>/`, `handoffs/<role>/`, archived per charter — tables created 2026-09-01, semantics in each folder's `README.md` |
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
| P1 schema + domain | NOT_STARTED | 2026-09-01 | coordinator | gate SATISFIED (owner selection final); pre-dispatch lint **PASS** → `prompts/coordinator/plan_lint_1.md`; projection r0 dispatched → `prompts/reviewer/prompt_plan1_projection_r0.md`. Implementer prompt compiles only after that ledger is routed (§3) |
| P2 repository + reconciliation | NOT_STARTED | | | |
| P3 configuration API | NOT_STARTED | | | |
| P4 item-transition hooks | NOT_STARTED | | | |
| P5 report | NOT_STARTED | | | after P3 (shares controller/routes files) |
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
| `property-criteria.ts` | `StockCriteria` (`Record<string, string[] \| null>` — canonical), `StockCriteriaInput` (`Record<string, string \| string[] \| null>`), `tokenizePropertyValue(stored): Set<string>` (§0.5), `normalizeCriteria(input): StockCriteria` (§23.1; throws on empty-array-after-normalization), `canonicalCriteriaString(criteria): string` (key-sorted JSON), `matchesCriteria(itemProperties, criteria): boolean` (§0.5/§0.8/§0.21) |
| `best-match.ts` | `specificityScore(criteria)` (§0.13 components), `resolveBestMatch(candidates, itemProperties)` — candidates carry `{ id, createdAt, criteria }`; returns winner or null |
| `conflict.ts` | `findConflict(candidate: StockCriteria, siblings: Array<{id, criteria}>): { conflictingId } \| null` (§23.2; caller excludes self on update) |

Threshold shape everywhere in domain/service code: `{ state: StockState; thresholdQuantity: number }`.

### 6.3 Options map (`src/shared/item-properties/item-property-options.ts`)

`ITEM_PROPERTY_OPTIONS: ReadonlyArray<{ key: string; values: readonly string[]; categories: "universal" | readonly ItemCategory[] }>` per §23.3, `as const`, content from the owner's selection sheet. Helper `getPropertyOptionsForCategory(itemCategory)` returns universal + category-listed entries.

### 6.4 Module layout (`src/modules/stock/`)

| File | Responsibility |
|---|---|
| `contracts/stock.contract.ts` | zod schemas + DTO types (below) |
| `repositories/location-stock.repository.ts` | `locationStockRepository` object literal; ALL Prisma access; guarded decrement (§0.15); `{}` round-trips as `{}` (§0.21); accepts optional `tx` |
| `services/stock-reconciliation.service.ts` | `reconcileGroup(shopId, location, itemCategory)` double-pass (§0.17 + §23.6), `reconcileAllGroups(shopId)` |
| `services/apply-item-stock-change.service.ts` | `applyItemStockChange({ shopId, before, after, operation })` (§0.7/§0.10/§0.15); `before/after: { location, itemCategory, properties, quantity, isSold } | null` |
| `commands/create-location-stocks.command.ts` | batch create, all-or-nothing (§23.5) |
| `commands/update-location-stock.command.ts` | update incl. full threshold replacement, 1–2 group reconciliation |
| `commands/delete-location-stock.command.ts` | delete + group reconciliation |
| `queries/get-stock-locations-summary.query.ts` | §17 |
| `queries/get-location-stock-detail.query.ts` | §18 |
| `queries/get-stock-configuration-options.query.ts` | §0.4/§23.3 |
| `queries/get-stock-report.query.ts` | §19/§0.19 (P5) |
| `controllers/stock.controller.ts` | zod parse, envelopes |
| `routes/stock.routes.ts` | `authenticateUserMiddleware` + `requireShopLinkMiddleware` (§0.18); no admin gate |

Maintenance scripts (P6): `scripts/report-stock-property-drift.ts`, `scripts/rebuild-location-stock.ts` (env `DRY_RUN`, `SHOP_ID` per `scripts/reconcile-active-sold-items.ts` convention). Domain verification script (P1, committed): `scripts/verify-stock-domain.ts`.

### 6.5 HTTP surface (mounted in `server.ts` at BOTH `/stock` and `/api/stock`)

| Method + path | Handler | Response |
|---|---|---|
| `GET /stock/options` | options query | `200 { data: { itemCategories, propertyOptions } }` |
| `GET /stock/locations` | summary query | `200 { data: [{ location, stockCount }] }` |
| `GET /stock/locations/:location` | detail query (URL-encoded location) | `200 { data: LocationStockDto[] }` |
| `POST /stock/configurations` | batch create `{ configurations: CreateLocationStockInput[] }` | `201 { data: LocationStockDto[] }` |
| `PATCH /stock/configurations/:id` | update | `200 { data: LocationStockDto }` |
| `DELETE /stock/configurations/:id` | delete | `200 { ok: true }` |
| `GET /stock/report` | report query (`states?` CSV of StockState, `groupByLocation?` boolean) | `200 { data: StockReportDto }` (P5) |

**DTOs** (`stock.contract.ts`):

```
LocationStockDto = { id, location, itemCategory, properties: StockCriteria (canonical),
  quantity, stockState, thresholds: [{ state, thresholdQuantity }],
  createdAt, createdByUsername, updatedAt, updatedByUsername }

CreateLocationStockInput = { location, itemCategory, properties?: StockCriteriaInput,
  thresholds: [{ state, thresholdQuantity }] }   // exactly the three configurable states

UpdateLocationStockInput = { location?, itemCategory?, properties?, thresholds? }  // thresholds = full replacement

StockReportDto = { rows: [{ itemCategory, properties, quantity, stockState, locations: string[] }] }
  | { groups: [{ location, entries: [{ itemCategory, properties, quantity, stockState }] }] }
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

1. **No automated tests (§0.11 / intention §22.10).** Charter rule 1 is exempted project-wide. Replacements, binding: (a) `npm run typecheck` green is the automated gate for every phase; (b) enumerated pure-domain criteria are checked by the **committed** `scripts/verify-stock-domain.ts` (prints one PASS/FAIL line per criterion row, exits non-zero on failure) run manually with output pasted into the Review log; (c) API/integration criteria are checked by the phase's Manual Scenarios section (curl/UI steps with expected quantity + state after each), executed by implementer and re-executed by reviewer.
2. **Domain purity (intention §22.10b):** `src/modules/stock/domain/` and `item-property-options.ts` import no Prisma and no I/O. Instrument: `grep -rn "prisma\|@prisma" src/modules/stock/domain/ src/shared/item-properties/item-property-options.ts` → empty; run at every phase close.
3. **One review round** per phase is the target; sizing and full-checklist first reviews serve it.
4. **`{}` is never collapsed to `null`** on `LocationStock.properties` (§0.21) — the repository must not reuse `toPropertiesUpdateValue`.
5. **Group totals:** a short group total without a catch-all is expected, not drift (§0.21/M8) — every Manual Scenarios section states this.
6. **`scan-history.repository.ts` is out of perimeter for every phase** (§0.10). Any need to touch it is a fold-back, not an edit.

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

### 11.4 One-round discipline

The owner's target is one review round per phase. Accordingly: the first review is full-checklist and exhaustive — every valid blocking finding surfaces in round 1, not incrementally. A fix cycle, if one happens, is delta-scoped per the charter re-review protocol (perimeter diff + full depth on the changed seam only). The reviewer never expands a fix-cycle review into a fresh full review of settled areas.
