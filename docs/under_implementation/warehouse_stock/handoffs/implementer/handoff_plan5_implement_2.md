---
plan: 5
role: implement
round: 2
state: IMPLEMENTED
date: 2026-09-02
actor: Codex (GPT-5)
---

# P5 implementer handoff

Implemented the approved round-2 report amendment. Report entries now expose the definition's
three configured threshold rows and the backend-derived `unitsToNormalThreshold`. The query
looks up `normal_in_stock` by state name, projects only `{state, thresholdQuantity}`, and
computes `max(0, normal threshold - quantity)`. The report remains one uncompacted,
unfiltered, unordered entry per definition, with the existing stored-column `mergeKey`
unchanged.

The implementation checkpoint is `c65dca73848b492e1a3c1d2cbdc8b0615d6ad523`
(`CHECKPOINT (not approved): implement P5 report restock distance`).

## ⚠ OWNER DECISIONS REQUIRED (0)

None. No semantic decision was left open.

## Task 0 coverage map — 19 rows

The opening gate baseline before the round-2 instrument amendment was typecheck exit 0 and
`SUMMARY PASS 3 script(s)` with all 14 round-1 P5 rows PASS on
`/private/tmp/warehouse-stock-p5-r2-baseline.qgMv9Q/dev.db`. After adding the five C4 cases
and updating C3(a) to the eight-field contract, but before editing production code, the
executable red baseline had 6 failures: C3(a) and C4(a)–C4(e); all inherited C1/C2/C3(b-d)
rows remained PASS. No baseline was reconstructed.

Every phase row has its own executable case and assertion shape is stated explicitly:

| Row | Discharging case / instrument | Assertion shape |
|---|---|---|
| C1(a) | `verify-stock-report.ts` C1(a) | Exact: report count equals all 15 requested-shop fixtures and every definition matches exactly once. |
| C1(b) | `verify-stock-report.ts` C1(b) | Exact: zero-match definition is present with quantity `0` and `out_of_stock`. |
| C1(c) | `verify-stock-report.ts` C1(c) | Exact: definitions across the Dining Chairs/Easy Chairs categories and distinct locations are present. |
| C1(d) | `verify-stock-report.ts` C1(d) | Exact: a definition seeded under a second shop is absent from the requested-shop report. |
| C2(a) | `verify-stock-report.ts` C2(a) | Exact: same category and criteria at different locations produce equal merge keys. |
| C2(b) | `verify-stock-report.ts` C2(b) | Exact: scalar-created and array-created equivalent criteria produce equal merge keys. |
| C2(c) | `verify-stock-report.ts` C2(c) | Exact: different criteria in one category produce different merge keys. |
| C2(d) | `verify-stock-report.ts` C2(d) | Exact: identical criteria in different categories produce different merge keys. |
| C2(e) | `verify-stock-report.ts` C2(e) | Exact: same-category catch-alls at different locations produce equal merge keys. |
| C2(f) | `verify-stock-report.ts` C2(f) | Exact: reversed member order in equivalent arrays produces equal merge keys. |
| C3(a) | `verify-stock-report.ts` C3(a) | Exact: every entry has only the eight fields `location`, `itemCategory`, `properties`, `mergeKey`, `quantity`, `stockState`, `thresholds`, and `unitsToNormalThreshold`. |
| C3(b) | `verify-stock-report.ts` C3(b) | Exact: configuration criteria are returned canonically as `{wood_type:["teak"]}`, not as an item property bag. |
| C3(c) | `verify-stock-report.ts` C3(c) plus HTTP evidence | Exact: extra query arguments do not change the payload; the parameterized HTTP response is 200 and byte-identical. |
| C3(d) | `verify-stock-report.ts` C3(d) plus HTTP evidence | Exact: route registration and both mounts are present; the live request reached the API mount. |
| C4(a) | `verify-stock-report.ts` C4(a) | Exact: 10/15/20 thresholds with quantity 7 yield `low_in_stock` and exactly 13 units. |
| C4(b) | `verify-stock-report.ts` C4(b) | Exact: quantity 0 derives `out_of_stock` and yields exactly 20 units. |
| C4(c) | `verify-stock-report.ts` C4(c) | Exact: quantity 18 first asserts `normal_in_stock`, then asserts the deliberate gap is exactly 2. |
| C4(d) | `verify-stock-report.ts` C4(d) | Exact: quantity 25 derives `high_in_stock` and clamps the result to exactly 0. |
| C4(e) | `verify-stock-report.ts` C4(e) | Exact: all three threshold values are retrieved from the entry by state name, never array index, and equal 10/15/20. |

The instrument contains exactly these 19 phase cases and no orphan test case. The four C4
fixtures use their own 10/15/20 thresholds. They write quantity only and call the existing
repository `recalculateState` path; the round-1 1/3/5 fixture and its quantity-2 medium row
are unchanged.

## Named mutation ledger

The round-2 plan declares one planted-defect mutation: executed = 1, reverted = 1, observed
red = 3 rows. The mutation was applied at the report query's threshold-selection/arithmetic
site, changing the lookup to `medium_in_stock` and the formula to
`max(0, medium + 1 - quantity)`. It was run at L1 with:

```text
DATABASE_URL=file:/private/tmp/warehouse-stock-p5-r2-baseline.qgMv9Q/dev.db
SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-stock-report.ts
```

Observed output, before immediate reversion:

- C4(a) failed independently: expected 13, got 9.
- C4(b) failed as the same rejected reading's zero-quantity consequence: expected 20, got 16.
- C4(c) failed independently: expected 2, got 0.
- C4(d) and C4(e) stayed PASS.

The required C4(a) and C4(c) red observations are separate assertion failures. The mutation
landed in the intended query expression and was reverted; the final source uses the
state-named `normal_in_stock` lookup and the fill formula.

Mutation-probe files, listed separately from the implementation changes:

- `apps/backend/src/modules/stock/queries/get-stock-report.query.ts` — the one temporary
  mutation above, applied and reverted.
- `/private/tmp/warehouse-stock-p5-r2-baseline.qgMv9Q/dev.db` — disposable probe database,
  created with SQLite `.backup` and cleaned by the verifier.

## Closing evidence

Final instruments passed on scratch copy `/private/tmp/warehouse-stock-p5-r2-close.fBxWxg/dev.db`:

- `npm run typecheck` — exit 0.
- Purity grep `rg -n "prisma|@prisma" src/modules/stock/domain/ src/shared/item-properties/item-property-options.ts` — exit 1 with no matches/output.
- Development database refusal with `DATABASE_URL=file:./dev.db` — exit 3 and the expected `REFUSED DATABASE_URL resolves to the configured development database` message.
- `DATABASE_URL=file:/private/tmp/warehouse-stock-p5-r2-close.fBxWxg/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts` — exit 0, all 58 P1 rows, all 20 P2 rows, and all 19 P5 rows PASS; `SUMMARY PASS 3 script(s)`.

Authenticated HTTP evidence used scratch copy `/private/tmp/warehouse-stock-p5-r2-http.SqQgvE/dev.db`.
One curl to the running server's `/api/stock/report` returned HTTP 200 and a real `P5HTTP`
entry with quantity 7, state `low_in_stock`, thresholds 10/15/20, and
`unitsToNormalThreshold: 13`.

## Full write perimeter

Implementation changes:

- `apps/backend/src/modules/stock/queries/get-stock-report.query.ts`
- `apps/backend/src/modules/stock/contracts/stock.contract.ts`
- `apps/backend/scripts/verify-stock-report.ts`
- `docs/under_implementation/warehouse_stock/plans/plan_5_report.md` — appended Review log entry only
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan5_implement_2.md` — this handoff

No controller, route, `verify-all.ts`, migration, index, master-plan tracker row, earlier
phase file, or architecture-graph state was changed. There is no architecture graph in this
repository. No candidate upstream plan defect was found in this round.
