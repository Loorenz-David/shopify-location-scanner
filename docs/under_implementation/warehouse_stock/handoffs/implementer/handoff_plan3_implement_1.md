---
plan: 3
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-01
actor: Codex (GPT-5)
---

Implemented the Location Stock configuration API and checkpointed the code at
`7b86e53`. The session added category-aware zod contracts, canonical response mapping,
batch create, update with atomic threshold replacement, delete, summary/detail/options
queries, authenticated routes at both `/stock` and `/api/stock`, and both server mounts.

⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner for this implementation session.

## Coverage map — 31 criterion rows

The project has no test runner, P3 authors no `verify-*.ts` script, and no P3 executable
cases existed before implementation. Therefore no fabricated P3 red baseline is claimed.
The pre-change executable baselines were `npm run typecheck` exit 0 and
`npx tsx scripts/verify-stock-domain.ts` 58 PASS / exit 0. No test files were added.

| Criterion row | Executable case / instrument | Assertion shape |
|---|---|---|
| C1(a) | curl C1-unknown-key | Exact: HTTP 400, `VALIDATION_ERROR` |
| C1(b) | curl C1-unknown-value | Exact: HTTP 400, `VALIDATION_ERROR` |
| C1(c) | curl C1-missing-threshold | Exact: HTTP 400 |
| C1(d) | curl C1-duplicate-threshold | Exact: HTTP 400 |
| C1(e) | curl C1-non-positive | Exact: HTTP 400 |
| C1(f) | curl C1-low-medium-order | Exact: HTTP 400 |
| C1(g) | curl C1-medium-normal-order | Exact: HTTP 400 |
| C1(h) | curl C1-empty-array | Exact: HTTP 400 |
| C1(i) | curl C1-casing: scalar `teak`, `Teak`, `TEAK`; array `Teak`,`Oak` | Exact: HTTP 201 and canonical lowercase arrays |
| C1(j) | curl C1-patch-unknown-key | Exact: PATCH HTTP 400 |
| C1(k) | curl C1-wildcard | Exact: HTTP 201 with `upholstery: null` |
| C1(l) | curl C1-unknown-category | Exact: HTTP 400, including `unknown` |
| C2(a) | curl C2-different-groups | Exact: HTTP 201, both rows and `{}` canonical |
| C2(b) | curl C2-intra-batch-overlap | Exact: HTTP 409; details exactly `{batchIndex:1, conflictsWithBatchIndex:0}` and no `conflictingId`; detail read was empty |
| C2(c) | curl C2-existing-sibling | Exact: HTTP 409 with existing `conflictingId` |
| C3(a) | curl C3-live-inventory plus sqlite sum | Exact: LC1 sum 221 and response quantity 221 |
| C3(b) | curl C3-live-inventory | Exact: thresholds 10/15/20 yield `high_in_stock` |
| C4(a) | curl C4-threshold-only | Exact: quantity 193 unchanged; state recomputed high→low; LC1 sibling quantity 28 unchanged |
| C4(b) | curl C4-criteria-move | Exact: moved Teak quantity 34 to H1 and LC1 catch-all reabsorbed the allocation |
| C4(c) | curl C4-location-move | Exact: old LC1 and new H1 groups both reflected the move |
| C5(a) | curl C5-delete plus detail reads | Exact: `{ok:true}`; deleted DTO/thresholds absent and inventory rows untouched |
| C5(b) | curl C5-delete | Exact: response body `{ok:true}` |
| C5(c) | curl C5-delete-fallback | Exact: LC1 catch-all returned to quantity 221 |
| C5(d) | curl C5-last-config | Exact: deleting the only P3A config returned HTTP 200 without reconciliation failure |
| C6(a) | curl C6-summary-three | Exact: P3J summary entry had `stockCount:3`; locations sorted ascending |
| C6(b) | curl C6-detail | Exact: full DTO fields, canonical properties, thresholds, and audit fields; detail sorted by `createdAt` |
| C6(c) | curl C6-options | Exact: 28 item categories and complete 8-entry property map |
| C7(a) | curl API and bare mounts | Exact: authenticated requests reached `/api/stock/...` and `/stock/...` |
| C7(b) | curl without bearer | Exact: HTTP 401 with `UNAUTHORIZED` and request id |
| C7(c) | curl using worker-role token | Exact: worker-role user could read and write |
| C7(d) | curl audit reads after create/move/reallocation | Exact: edited rows kept `davidSeller`; reallocated LC1 sibling read `system:stock-reconciliation` |

Every executable case used here maps to a criterion row above. There are no shipped test
files and therefore no orphan tests.

## Implementation details

- `stock.contract.ts` was extended rather than replaced, preserving every P2 export.
  It now owns request schemas, the named `(itemCategory, criteria)` whitelist validator,
  DTO type, mapper, and static options projection. Criteria values are compared
  case-insensitively against display-cased options; wildcard `null` values skip the value
  membership check.
- Create normalizes and validates each member, reads existing siblings per distinct
  `(location,itemCategory)` group, checks intra-batch and existing conflicts, writes the
  entire batch transactionally, reconciles each affected group once, then restores the
  acting user's audit stamp on created definitions before re-reading DTOs.
- Update validates the effective stored-plus-patch pair, excludes the edited row from
  conflict checks, uses the repository transaction callback so config mutation and
  `replaceThresholds` share one transaction, recalculates only the edited row for
  threshold-only edits, and reconciles old/new groups for allocation changes.
- Delete captures the old group, removes the shop-scoped row (with cascade), then
  reconciles after commit. Empty post-delete groups rely on P2's explicit no-op path.
- Controllers only parse, call commands/queries, envelope, and map. Routes only compose
  authentication and shop-link middleware plus path registration. No controller imports
  a repository and no command calls Prisma directly.

## Named mutation ledger

The plan names one planted-defect mutation. It was applied at the call site, observed, and
reverted before the checkpoint.

| Mutation | Site and scope | Command / observed result | Reverted |
|---|---|---|---|
| Skip intra-batch conflict guard | `src/modules/stock/commands/create-location-stocks.command.ts`, call site in `createLocationStocksCommand`, L1 HTTP curl against disposable DB | Submit P3E entries `{wood_type:["Oak","Teak"]}` and `{wood_type:["Teak"]}`. Mutant incorrectly returned HTTP 201 and wrote both rows, proving the guard can fail; restored code returned HTTP 409 with exact index details. | Yes |

Mutation probe files/resources, listed separately from the implementation perimeter:

- `apps/backend/src/modules/stock/commands/create-location-stocks.command.ts` — temporary
  guard mutation, applied and reverted.
- `/private/tmp/p3-manual.osnNf9/dev.db` — disposable DB state used by the probe; not a
  configured database and not committed.

Mutation arithmetic: declared 1 named mutation (C2 / Notes planted-defect probe); executed
1; retained 0. No test file was edited, so no retained test mutation expired.

## Closing evidence

Final authoritative close used the clean code checkpoint and a scratch copy made with
`sqlite3 prisma/dev.db ".backup '/private/tmp/p3-final-close.ESCevr/dev.db'"`:

- `npm run typecheck` — exit 0.
- Purity grep `rg -n 'prisma|@prisma' src/modules/stock/domain src/shared/item-properties/item-property-options.ts` — empty (`PURITY_GREP=empty`).
- `DATABASE_URL=file:/private/tmp/p3-final-close.ESCevr/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts` — exit 0; 58 P1 rows and 20 P2 rows all PASS; `SUMMARY PASS 2 script(s)`.
- Manual HTTP server runs used `DATABASE_URL=file:/private/tmp/p3-manual.osnNf9/dev.db`
  on port 4403, then were stopped. The configured `prisma/dev.db` was not written.

The complete verify transcript and the seven plan scenarios' observations are appended to
the phase plan's Review log.

## Full write perimeter

Code:

- `apps/backend/src/modules/stock/contracts/stock.contract.ts`
- `apps/backend/src/modules/stock/repositories/location-stock.repository.ts`
- `apps/backend/src/modules/stock/commands/create-location-stocks.command.ts`
- `apps/backend/src/modules/stock/commands/update-location-stock.command.ts`
- `apps/backend/src/modules/stock/commands/delete-location-stock.command.ts`
- `apps/backend/src/modules/stock/queries/get-stock-locations-summary.query.ts`
- `apps/backend/src/modules/stock/queries/get-location-stock-detail.query.ts`
- `apps/backend/src/modules/stock/queries/get-stock-configuration-options.query.ts`
- `apps/backend/src/modules/stock/controllers/stock.controller.ts`
- `apps/backend/src/modules/stock/routes/stock.routes.ts`
- `apps/backend/src/server.ts`

Pipeline artifacts:

- `docs/under_implementation/warehouse_stock/master_plan.md` — P3 tracker row only.
- `docs/under_implementation/warehouse_stock/plans/plan_3_configuration_api.md` — this
  round's append-only Review log entry only.
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan3_implement_1.md`
  — this handoff.

Tool-recorded state: checkpoint commit `7b86e53`; no architecture-graph delta (the repo has
no `.archgraph`); no configured DB writes; no persistent server or worker process left
running.

## Delegations exercised

- D10: create/update/delete commit first and reconcile post-commit; reconciliation errors
  propagate rather than being swallowed.
- D11: zod owns threshold shape and arity; `validateThresholds` owns duplicate, positivity,
  required-state, and ordering semantics.
- D12: summary results are location ascending and detail results are `createdAt` ascending
  with id tie-break.

## Candidate upstream note

The v1.4 frontend contract's §4.4 worked example says that `{}` plus
`{wood_type:["Teak"]}` in one batch conflicts. Ratified intention §23.2 says different
criterion key sets avoid conflict, and this plan's manual scenario 3 explicitly creates
that pair sequentially. The implementation follows §23.2 and the plan. The coordinator
should reconcile the frontend example before frontend integration; no code deviation was
made silently.
