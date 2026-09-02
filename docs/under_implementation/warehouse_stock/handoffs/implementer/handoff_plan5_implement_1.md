---
plan: 5
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-02
actor: Codex (GPT-5)
---

# P5 implementer handoff

Implemented the stock report as one unparameterized read. `getStockReportQuery` delegates
shop scoping to P2's `listByShop`, emits one uncompacted entry per definition, and builds
`mergeKey` as `${itemCategory}|${propertiesCanonical}` from the stored identity column.
The controller and route preserve the existing auth/shop-link middleware and the server's
two mounts. No mutation, compaction, filtering, ordering, ranking, or stored-value change
was added.

The code checkpoint is `dedf415` (`CHECKPOINT (not approved): implement P5 stock report`).

## ⚠ OWNER DECISIONS REQUIRED (0)

None. The named merge-key probe exposed an instrument limitation, not a product decision;
the upstream note is recorded below.

## Task 0 coverage map — 14 rows

The pre-edit red baseline was not captured. At the opening gate the report query and its
criterion instrument did not exist, so there were no executable P5 cases to run; no baseline
has been reconstructed after implementation. Every phase row and every shipped instrument
case is mapped below, with assertion strength stated explicitly.

| Row | Discharging case / instrument | Assertion shape |
|---|---|---|
| C1(a) | `verify-stock-report.ts` C1(a) — executed | Exact: report count equals the 11 primary fixture definitions and each definition matches exactly once, including canonical properties. |
| C1(b) | `verify-stock-report.ts` C1(b) — executed | Exact: the zero-match definition is present with quantity `0` and `out_of_stock`. |
| C1(c) | `verify-stock-report.ts` C1(c) — executed | Exact: the fixture's Dining Chairs and Easy Chairs definitions at distinct locations are both present. |
| C1(d) | `verify-stock-report.ts` C1(d) — executed | Exact: the seeded second-shop definition is absent from the requested-shop report. |
| C2(a) | `verify-stock-report.ts` C2(a) — executed | Exact: same category and criteria at different locations produce equal `mergeKey` values. |
| C2(b) | `verify-stock-report.ts` C2(b) — executed | Exact: scalar-created and array-created equivalent criteria produce equal `mergeKey` values. |
| C2(c) | `verify-stock-report.ts` C2(c) — executed | Exact: same category with different criteria produces different `mergeKey` values. |
| C2(d) | `verify-stock-report.ts` C2(d) — executed | Exact: different categories with identical criteria produce different `mergeKey` values. |
| C2(e) | `verify-stock-report.ts` C2(e) — executed | Exact: two same-category catch-alls at different locations produce equal `mergeKey` values. |
| C2(f) | `verify-stock-report.ts` C2(f) — executed | Exact: equivalent arrays with reversed member order produce equal `mergeKey` values. |
| C3(a) | `verify-stock-report.ts` C3(a) — executed | Exact: every entry has only `location`, `itemCategory`, `properties`, `mergeKey`, `quantity`, and `stockState`. |
| C3(b) | `verify-stock-report.ts` C3(b) — executed | Exact: a scalar-created configuration is returned as canonical criteria `{wood_type:["teak"]}`, not an item property bag. |
| C3(c) | `verify-stock-report.ts` C3(c) plus authenticated curl — executed | Exact: direct extra-argument payload is unchanged; HTTP parameterized response is 200 and byte-identical to the unparameterized response. |
| C3(d) | `verify-stock-report.ts` C3(d) plus authenticated curl — executed | Exact: route and both server mounts are present; `/api/stock/report` and `/stock/report` each returned 200. |

All 14 cases are in `verify-stock-report.ts`; there are no test files and no orphan tests.

## Named mutation ledger

The plan named one planted-defect mutation. Declared = 1; executed = 1; observed red = 0;
reverted = 1. The mutation was applied at the report query call site by replacing the
stored-column key with `JSON.stringify(configuration.properties)`, then run against a
SQLite backup. It returned exit 0, a false green, because P2's frozen `listByShop` maps
both scalar and array stored shapes through `normalizeCriteria` before the report query
receives them. The exact mutation was reverted immediately.

An independent call-site probe was also applied and reverted: substituting
`"wrong-shop-id"` for the query's `shopId` caused exit 1 with C1(a), C1(b), C1(c),
C2(a)–C2(f), and C3(b) failing. This proves the isolation/completeness assertions can
redden, while the named merge-key probe's inability to do so is a candidate upstream
instrument note, not a production deviation.

Mutation-probe files, listed separately from implementation changes:

- `apps/backend/src/modules/stock/queries/get-stock-report.query.ts` — stored-column
  mutation and wrong-shop-id mutation, both applied and reverted.
- `/private/tmp/warehouse-stock-p5-mutant-*/dev.db` and
  `/private/tmp/warehouse-stock-p5-mutant-shop-*/dev.db` — disposable probe databases.

## Closing evidence

The final closing tree was checked after the last source adjustment and before the checkpoint:

- `npm run typecheck` — exit 0.
- Purity grep over `src/modules/stock/domain/` and
  `src/shared/item-properties/item-property-options.ts` — empty.
- `git diff --check` — clean.
- Live-development DB refusal — exit 3 with
  `REFUSED DATABASE_URL resolves to the configured development database`.
- `DATABASE_URL=file:/private/tmp/warehouse-stock-p5-close-54LnLO/dev.db
  SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts` — exit 0; P1 and P2
  rows all PASS, all 14 P5 rows PASS, `SUMMARY PASS 3 script(s)`.
- HTTP scratch run used `/private/tmp/warehouse-stock-p5-http-O54u70/dev.db` on port
  4578; the server stopped cleanly and the configured `prisma/dev.db` was not written.

Manual expected-versus-observed:

| Scenario | Expected | Observed |
|---|---|---|
| `/api/stock/report` | 200; 3 fixture entries; A = 2 / `medium_in_stock`, B = 0 / `out_of_stock`, C = 4 / `normal_in_stock` | `200`; `CURL1_ENTRY_COUNT=3`; `CURL1_SPOT_CHECKS=3 PASS` |
| `/api/stock/report?states=out_of_stock&groupByLocation=true` | 200 and byte-identical payload | `200`; `CURL2_BYTE_IDENTICAL=YES` |
| `/stock/report` | Bare mount reachable | `200` |

## Full write perimeter

Implementation and instrument files in checkpoint `dedf415`:

- `apps/backend/src/modules/stock/queries/get-stock-report.query.ts` — new query.
- `apps/backend/src/modules/stock/contracts/stock.contract.ts` — additive report DTO types only.
- `apps/backend/src/modules/stock/controllers/stock.controller.ts` — additive report controller only.
- `apps/backend/src/modules/stock/routes/stock.routes.ts` — additive report route only.
- `apps/backend/scripts/verify-stock-report.ts` — new committed criterion instrument.
- `apps/backend/scripts/verify-all.ts` — `EXPECTED_SCRIPTS` entry only.

Pipeline artifacts:

- `docs/under_implementation/warehouse_stock/plans/plan_5_report.md` — append-only Review log entry.
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan5_implement_1.md` — this handoff.

No master-plan tracker row was edited, no architecture graph exists, no earlier-phase file
was changed, and no configured database or persistent process was left modified/running.

## Candidate upstream note

The plan's named `JSON.stringify(configuration.properties)` probe cannot redden C2(b) at
the P5 query boundary because P2's domain mapping canonicalizes `properties` before P5
sees it. The stored-column implementation is still required by the contract and remains
the correct production code; the criterion instrument needs a future seam that can observe
stored-column versus property-object derivation, or the probe should be replaced with a
mutation that is observable at this boundary. This was reported rather than silently
changing P2 or weakening the report contract.
