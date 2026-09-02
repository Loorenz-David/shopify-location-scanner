---
plan: 6
role: coordinator
artifact: plan lint (pre-dispatch)
date: 2026-09-02
verdict: PASS after 3 folds
---

# Plan 6 lint — maintenance scripts + verification sweep

Gate: **P3, P4, P5 all APPROVED** ✓ (P5 closed at round 2, 2026-09-02). Intention `RATIFIED` ✓.

## Properties

| # | Property | Result |
|---|---|---|
| 1 | References resolve | PASS — intention §9/§20/§22.10a/§24, context §0.4/§0.17/§0.21 all exist; `scripts/reconcile-active-sold-items.ts` exists (16 KB, the named convention source); C4's trace targets resolve (P1 C8 and P3 C1–C2 both exist) |
| 2 | Counts derived | **FAIL → L2** |
| 3 | Every row addressable | PASS for C1/C2 — `ScanHistory.properties` is a JSON object of `key → string`, `json_each` works, and a scratch copy makes the planted-drift steps safe. See also the L4 note |
| 4 | Exactly one outcome per row | PASS |
| 5 | Traces resolve | PASS — M1–M8 and §22.10a live |
| 6 | Perimeter vs. standing instructions | PASS — two new scripts, nothing else; `verify-all.ts` auto-discovers, so neither script needs it edited (they are not `verify-*`) |
| 7 | Deletions / unused imports | PASS |
| 8 | Gate self-test | PASS |
| — | **Phase-close satisfiability** | **FAIL → L1** |

## Folds

### L1 — C5 is unsatisfiable as worded, and it is the exact trap §6.4 already documents

C5 demands *"`verify-all.ts` exits 0 with **every script in the master plan §6.4 table** reported
PASS — none `REFUSED`, none `MISSING`."*

The §6.4 table has **four** script rows, and one of them is `verify-all.ts` itself. The runner
**excludes itself** (`name !== "verify-all.ts"`, line 52) and never emits a `PASS verify-all.ts`
line; it emits `SUMMARY PASS 3 script(s)`. So the phase's own close condition can never be met,
in a file the plan does not permit anyone to touch.

**This is the same defect §6.4's own earned note records** — keying a phase-close to that table
rather than to what the runner actually executes. P2's lint caught it once; C5's wording
re-introduced it.

**Folded:** C5 now reads — `verify-all.ts` exits 0, the **three executed** scripts
(`verify-stock-domain.ts`, `verify-stock-reconciliation.ts`, `verify-stock-report.ts`) each report
`PASS`, none is `REFUSED` or `MISSING`, and the final line reads exactly
`SUMMARY PASS 3 script(s)`. Expected totals stated: **58 + 20 + 19 = 97 rows.**

### L2 — no derived row count

Counted here: **C1** (a)(b)(c) = 3 · **C2** (a)(b)(c) = 3 · **C3**, **C4**, **C5** unlettered = 3.
**9 rows across 5 criteria.**

**Folded** into the plan under the criteria table.

### L3 — C3 is discharged by owner attestation, and the plan must say so

**Owner decision, 2026-09-02:** the owner has exercised the endpoints and the live functionality
against the running system and approves C3 on that basis. The runbook is **not** being executed as
a recorded expected-vs-observed pass.

Left unstated, an implementer would try to run C3 (it cannot — it needs the frontend, Redis, the
worker and a Shopify admin edit) and the closeout ledger would record "sweep executed" when what
exists is an owner attestation. Those are different evidentiary weights and the record must not
conflate them.

**Folded:** C3 marked `DISCHARGED — owner attestation`, out of the implementer's scope, with the
attestation's own boundary written into the plan so C4's ledger cites it accurately.

## Not folded — recorded

- **L4 (note, optional).** Task 1 specifies **two** outputs — stored tokens absent from the map's
  values, *and* map keys never observed — but C1 only measures the first. On current data all
  eight map keys **are** observed (`extension_quantity` appears 109 times), so the second output
  is legitimately empty and an implementation that omits it entirely would still pass C1. Low
  stakes: the script is read-only and diagnostic. Recorded, not made an obligation (§9.7).
- **Not a defect, but the drift report will surface it and someone will ask:** live data carries
  keys outside the map, including `extensions_quantity` (plural) alongside the map's
  `extension_quantity`, plus `dimensionss`, `designer`, `material_type` and others. The map defines
  what is *configurable*, not what Shopify sends, so these are correctly ignored. Worth expecting
  in the output rather than mistaking for drift.
- **P5 review N1** (a `thresholds[2]` regression would pass all 19 rows) is available to P6 as an
  **optional** row. Not an obligation.

## Verdict

**PASS after 3 folds.** Dispatchable for C1, C2 and C5. C3 is the owner's, already given; C4 is
the coordinator's.
