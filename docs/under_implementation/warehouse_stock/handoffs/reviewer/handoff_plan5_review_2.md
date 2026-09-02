---
plan: 5
role: review
round: 2
state: CLOSED
verdict: APPROVED
date: 2026-09-02
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P5 review (round 2) — APPROVED

Tree reviewed: **`c65dca7`** (`CHECKPOINT (not approved): implement P5 report restock distance`),
handoff at `98ba7bf`. No blocking finding, no should-fix, no fix cycle. **Phase 5 is closed.**

## ⚠ OWNER DECISIONS REQUIRED (0)

## Perimeter

Exactly the three permitted files: `queries/get-stock-report.query.ts`,
`contracts/stock.contract.ts` (two added type fields), `scripts/verify-stock-report.ts`, plus
plan 5's Review log. **The controller, the routes and `verify-all.ts` were not touched** — lint
L3 said their presence would be a finding, and they are absent.

*`contracts/frontend-api-contract.md` appears in a naive `d4d3758..HEAD` diff. It is **mine**,
from `8df102a`, which sits between the tracker commit and the checkpoint. Isolating
`8df102a..c65dca7` for that file returns empty: the implementer did not touch the frontend
contract. Checked before filing, not assumed.*

## Instruments

| Instrument | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| purity grep | empty |
| `verify-all.ts` on scratch copy | `SUMMARY PASS 3 script(s)` — 58 P1 + 20 P2 + **19 P5** |
| P5 row count | **19** (was 14; C4 added 5) |
| refusal guard | exit **3** against the configured dev.db |
| `prisma/dev.db` | untouched — 0 definitions, 1 shop |

## The code

```ts
const normalThreshold = configuration.thresholds.find(({ state }) => state === "normal_in_stock");
…
unitsToNormalThreshold: Math.max(0, normalThreshold.thresholdQuantity - configuration.quantity)
```

**By state, not by index** (hazard 1). **Clamped** (hazard 2). `thresholds` projected to
`{state, thresholdQuantity}` only — no `id`, no `shopId`, no audit fields (hazard 5). Round 1's
`mergeKey`, ordering, parameterlessness and entry set are untouched (§27.5). The C4 fixtures use
their own 10/15/20 and the round-1 1/3/5 set is unchanged, including its `quantity 2 →
medium_in_stock` row, which is correct under 1/3/5 and was correctly left alone (lint L1).

A definition with no `normal_in_stock` threshold throws. Unreachable through the API — zod
requires three thresholds at create and `replaceThresholds` rewrites all three inside one
transaction — and consistent with P2's ratified fail-loud doctrine. Correct as written.

## Live verification — real inventory, running server

```
location  qty  state              thresholds   needs
LC1       221  medium_in_stock    200/250/300     79
H1         34  high_in_stock       10/15/20        0
ZZ0         0  out_of_stock        10/15/20       20
```

`300 − 221 = 79` · `34 > 20` clamps to `0` · an empty definition asks for a full shelf of `20`.
Eight fields per entry; threshold rows carry exactly `state` and `thresholdQuantity`.

## Reviewer mutation probes — four, independent of the implementer's

| Mutation | Rows reddened |
|---|---|
| **M1** — the plan's probe: `medium + 1` instead of the normal threshold | C4(a) 13→9 · C4(b) 20→16 · C4(c) 2→0 |
| **M2** — `thresholds[2]` instead of the state lookup | **none** |
| **M3** — `thresholds[0]` | C4(a), C4(b), C4(c) |
| **M4** — drop the `max(0, …)` clamp | C4(d), −5 instead of 0 |

All reverted; tree verified clean. **No repository file was modified by this review.**

**M1 discriminates, which is the headline.** Round 1's named probe reddened nothing and was
recorded as a false green; this round's reddens three rows on two independently reachable
inputs. The lesson folded into the plan after round 1 — *"what reachable input makes the mutant
and the original differ?"* — produced a probe that works.

## Findings

### N1 — note — the by-state hazard is obeyed but unguarded

**M2 is the finding.** Replacing the state lookup with `configuration.thresholds[2]` — exactly
the mistake the plan's hazard 1 warns about — **passes all 19 rows.**

It passes because the repository returns thresholds `orderBy: { state: "asc" }`, which is
**alphabetical**: `low_in_stock, medium_in_stock, normal_in_stock`. For these three values
alphabetical order coincides with severity order, so index 2 *is* normal — today, by accident.
M3 shows the instrument is not blind to indices in general; index `0` reddens three rows. It is
specifically index `2` that is invisible.

**Not blocking.** The shipped code uses the state lookup, so nothing is wrong. What is missing is
a row that would notice if it stopped. The exposure is narrow but real: add a configurable state,
rename one, change the `orderBy`, or reorder the include, and `thresholds[2]` silently returns a
different number while all 19 rows stay green — and a wrong restock quantity errors nowhere.

**Disposition:** recorded, no fix cycle (§9.7 — correct code, coverage gap). Cheapest fix if ever
wanted: one assertion that the entry's `unitsToNormalThreshold` still matches when the fixture's
thresholds are seeded in a non-alphabetical severity order, or simply a row asserting
`thresholds` is looked up by name. **Routed to P6's sweep as an optional row, not an obligation.**

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan5_review_2.md` (this file)
- `plans/plan_5_report.md` (Review log entry)
- `master_plan.md` (tracker row)

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| N1 | `thresholds[2]` regression would pass all 19 rows | P6, optional row | no |
| — | `shopId` asymmetry (`applyIncrement`, `updateState`) | P6 sweep | no |
| — | P2/P4 threshold-throw doctrine collision | P6 or an intention amendment | no |
| — | end-to-end runbook | **P6 C3 — P4's hooks' only runtime verification** | no |
| — | contract v1.5 + v1.6 routing to `main`; stale v1.1 decoy | owner | no |

## Lessons for the plans

1. **The round-1 lesson worked, and that is worth recording as much as the original failure.**
   After round 1's probe produced a false green, the plan gained one question — *what reachable
   input makes the mutant and the original differ?* — and round 2's probe reddens three rows.
   The same question applied to M2 would have found N1 at planning time.
2. **A hazard named in a plan is not a hazard covered by a criterion.** Hazard 1 was written,
   read, and obeyed; no row tests it. Naming a hazard makes the implementer avoid it once;
   only a row keeps it avoided.
