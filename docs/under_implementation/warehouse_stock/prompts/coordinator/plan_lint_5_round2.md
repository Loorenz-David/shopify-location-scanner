---
plan: 5
role: coordinator
artifact: plan lint (pre-dispatch, round 2)
date: 2026-09-02
verdict: PASS after 3 folds
---

# Plan 5 lint — round 2 (§27 restock distance)

Run against `plans/plan_5_report.md` as amended for intention **§27** (ratified 2026-09-02).
Gate: intention header `**Status: RATIFIED**` ✓ (re-stamped after round 4 re-opened it); P5
round 1 **APPROVED** ✓; P3 APPROVED ✓.

## Properties

| # | Property | Result |
|---|---|---|
| 1 | References resolve | PASS — §27.2/§27.3 exist; §6.5's `StockReportDto` updated to eight fields ahead of this lint; `GET /locations/:location` (C4(e)'s cross-check) shipped in P3 |
| 2 | Counts derived | PASS — **19** (C1 4 · C2 6 · C3 4 · C4 5), counted here, not carried from round 1's 14 |
| 3 | Every row addressable | **FAIL → L1, L2** |
| 4 | Exactly one outcome per row | PASS — C4(a)–(d) each pin a single integer against a single quantity |
| 5 | Traces resolve | PASS — M7 (as amended), §27.2, §27.3 |
| 6 | Perimeter vs. standing instructions | **FAIL → L3.** The file list is still round 1's |
| 7 | Deletions / unused imports | PASS — additive; no field removed, no round-1 row deleted |
| 8 | Gate self-test | PASS |

## Folds

### L1 — C4's thresholds contradict the shipped fixture's

C4 pins **10/15/20** and derives every expected value from those bands. The shipped
`verify-stock-report.ts` seeds **1/3/5** (`const thresholds`, line 46). Left unresolved the
implementer must either change the shared constant — which reddens round-1 rows that depend on
it, including the `quantity 2 → medium_in_stock` fixture that is correct **only** under 1/3/5 —
or silently reinterpret C4's numbers against 1/3/5, where "7 → 13" is meaningless.

*Checked before filing: the existing `quantity: 2, stockState: "medium_in_stock"` write is
**consistent** under 1/3/5 (bands `1 low`, `2–3 medium`, `4–5 normal`, `>5 high`). Round 1's
fixture is not defective and must not be "corrected".*

**Folded:** C4 gets its **own fixture set at 10/15/20**, added alongside the existing one, which
stays at 1/3/5 untouched. The reason to insist on 10/15/20 rather than re-deriving C4 against
1/3/5: those are the numbers in intention §27.3's table, in contract §4.7's table, and in the
end-to-end runbook, so a human cross-checking the criterion against any of them reads the same
integers.

### L2 — C4(c)'s premise is fabricated unless the state is derived

C4(c) asserts that a definition at **quantity 18** is **already `normal_in_stock`** and still
reports a gap of 2. That premise is only true if the row's stored `stockState` agrees with its
stored `quantity`. The fixture sets both by hand (`prisma.locationStock.update({ data: { quantity,
stockState } })`), so a hand-typed state makes the row assert its own setup rather than the
system's behaviour — and C4(c) is precisely the row a future reader will challenge.

**Folded:** the C4 fixture writes **quantity only**, then derives the state — either
`locationStockRepository.recalculateState(id)` or P1's `calculateStockState(quantity, thresholds)`
— and C4(c) additionally **asserts the entry's `stockState` is `normal_in_stock`** before
asserting the gap is 2. The premise becomes established, not assumed.

### L3 — the file list is round 1's

Round 2 touches `queries/get-stock-report.query.ts`, `contracts/stock.contract.ts` (additive
types) and `scripts/verify-stock-report.ts`. It does **not** touch the controller, the routes, or
`verify-all.ts` — the route exists, the envelope is unchanged, and `verify-stock-report.ts` is
already in `EXPECTED_SCRIPTS`.

**Folded:** a round-2 file list added, with the three untouched files named explicitly so their
absence from the diff is a pass and their presence is a finding.

## Not folded — recorded

- **C4(e)'s cross-check against `GET /locations/:location`** is legitimate and cheap: both read
  the same rows through the same repository, so a mismatch means the report is mapping thresholds
  wrongly, which is exactly what the row is for.
- **The round-2 probe discriminates**, unlike round 1's. Mutating to `max(0, medium + 1 − quantity)`
  changes C4(a) from 13 to 9 and C4(c) from 2 to 0 — both reachable, both asserted. The
  "what reachable input makes mutant and original differ?" test passes.

## Verdict

**PASS after 3 folds.** Dispatchable.
