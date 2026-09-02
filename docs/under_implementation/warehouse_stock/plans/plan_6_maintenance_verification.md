# P6 — Maintenance Scripts + End-to-End Verification Sweep

## Goal
Ship the two maintenance scripts (property-drift report, full stock rebuild) and execute the complete manual verification sweep that closes the project against the measurement ledger. **Not in this phase:** feature code changes (any defect found here routes back as a fix cycle on the owning phase).

## Read first
Master plan §5, §6.4, §9, §10 · intention §9, §20, §22.10a, §24 (full ledger) · context §0.4 (drift insurance), §0.17, §0.21 · `scripts/reconcile-active-sold-items.ts` (script conventions: `DRY_RUN`, `SHOP_ID`, tsx, direct `src/` imports) · all five prior plans' Review logs.

## Dependencies (gate)
P3, P4, P5 all APPROVED.

## Files expected to change
New `scripts/report-stock-property-drift.ts` · new `scripts/rebuild-location-stock.ts`. Nothing else.

## Tasks (ordered)
1. `report-stock-property-drift.ts` — scans all `ScanHistory.properties` for the shop; for every key in `ITEM_PROPERTY_OPTIONS`, reports stored atomic tokens absent from the map's values (and, separately, map keys never observed), with counts. Read-only; no `DRY_RUN` needed.
2. `rebuild-location-stock.ts` — `reconcileAllGroups(shopId)` wrapper with `DRY_RUN=1` mode that prints per-config current→computed deltas without writing; honors `SHOP_ID`.
3. Execute the verification sweep below; record every step's expected vs observed in the Review log. Defects → fix cycles on the owning phase's plan, not patches here.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Drift script: (a) a value planted in a scratch item (`wood_type: "Bamboo"`) is reported under `wood_type` with count; (b) map values all present in data produce no false positives; (c) read-only — dev.db byte-identical after a run (checksum before/after) | §0.4 |
| C2 | Rebuild script: (a) `DRY_RUN=1` prints deltas, writes nothing (checksum); (b) live run repairs a planted drifted quantity; (c) output lists every group touched | M5, §9/§20 |
| C3 | **DISCHARGED 2026-09-02 — owner attestation. Not implementer scope; do not attempt to run it.** The product owner (David) exercised the endpoints and the live functionality against the running system and approved this row on that basis. **What the attestation covers:** the owner's own use of the configuration API, the report, and live stock movement through the app. **What it is not:** a step-by-step expected-vs-observed execution of `verification/end-to-end-runbook.md`. C4 must cite it as an owner attestation and never as a recorded sweep — the two carry different evidentiary weight and the closeout record must not conflate them. The runbook remains committed and re-runnable at any time. *Original wording, retained for the record:* run `verification/end-to-end-runbook.md`, which is this row's instrument (owner, 2026-09-01: P4's seven unexecuted scenarios were re-routed here rather than gating P4, because they are end-to-end and easier to drive through the finished frontend). It carries the fixture set, live-derived expected values, and the §22.10a scenarios; **P4's hooks have never been observed firing in a real flow, so this is their first and only runtime verification** — every §22.10a scenario: scan into a configured location; scan out; a sale; a return to store; a Shopify-admin location edit; a config created against existing inventory; a config deleted with fallback to a broader one. Each with expected quantity AND state written before execution | M1–M5, §22.10a |
| C4 | Ledger closeout row per measurement: M1–M8 each marked verified with a pointer to the evidence (P1–P5 Review logs or C3 steps). M6→P1-C8/P3-C1–C2, M7→`verify-stock-report.ts` all-PASS plus the P5 curl steps, M8→the catch-all/no-catch-all totals check run once each way | M1–M8, §24 |
| C5 | Regression seam final run (§9.1d): `verify-all.ts` exits 0; the **three executed** scripts — `verify-stock-domain.ts`, `verify-stock-reconciliation.ts`, `verify-stock-report.ts` — each report `PASS`, none `REFUSED`, none `MISSING`; and the final line reads exactly **`SUMMARY PASS 3 script(s)`**. Expected totals: **58 + 20 + 19 = 97 rows**. *(Lint L1: this row previously demanded PASS for "every script in the §6.4 table". That table has **four** rows and one is `verify-all.ts` itself, which excludes itself from the run and never emits a PASS line for itself — making the phase's own close condition unsatisfiable in a file nobody may edit. It is the exact trap §6.4's earned note records, re-introduced here.)* Output pasted whole into the Review log, since this is the project's single strongest piece of evidence that no phase silently broke an earlier one | §9.1d |

**9 rows across 5 criteria** — C1 (a)–(c) = 3, C2 (a)–(c) = 3, C3 · C4 · C5 unlettered = 3. Derived at lint, not copied.
**Implementer scope is C1, C2 and C5** (6 rows): C3 is discharged by owner attestation and C4 is the coordinator's closeout.

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — the project's final regression run, chaining P1, P2 and P5's scripts), full output in the Review log; perimeter diff (2 files).

## Manual scenarios
`verification/end-to-end-runbook.md` IS the scenario list — self-contained, with setup, fixtures
and expected values. C3 is discharged by completing it and pasting the record into this Review log.
Two things it flags that a reader must not misread: a group without a catch-all legitimately sums
**short** of its physical inventory (§0.21), and a step that could not be run is recorded as such
rather than marked passed. Previously (the §22.10a set). M8 reminder for every totals check: a group without a catch-all legitimately sums short — expected, not drift (§0.21).

## Notes
- Scripts run with `npx tsx scripts/<name>.ts` from `apps/backend`; destructive steps (planted drift) on a scratch copy of dev.db per master plan §10.
- This phase is the project's approval gate: after C4, the coordinator archives per the charter closeout ritual.

## Review log
(append-only)

### 2026-09-02 — C3 discharged by owner attestation

**Owner decision (David), 2026-09-02.** The owner exercised the endpoints and the live
functionality against the running system, reported that all of it works, and approved C3 on that
basis rather than through a step-by-step run of `verification/end-to-end-runbook.md`.

**Recorded precisely, because C4 cites it.** What exists is an **owner attestation** covering the
owner's own use of the configuration API, the report, and live stock movement through the app.
What does not exist is a per-step expected-vs-observed record. The two carry different evidentiary
weight and the closeout ledger must not present the first as the second.

This is the **only** runtime evidence for P4's hooks, whose review was explicit that its
verification was code reading plus reviewer-executed arithmetic, and that the moment they fire
inside real flows had never been watched. The owner has now watched it in ordinary use.

The runbook remains committed, re-runnable, and annotated with its own status. The three steps
ordinary use is least likely to reach are named there: the `orders/create` + `orders/paid` pair
subtracting once, a refused source decrement still permitting the destination increment, and the
short-total-without-a-catch-all trap.

### 2026-09-02 — pre-dispatch lint · PASS after 3 folds

`prompts/coordinator/plan_lint_6.md`. **L1: C5 was unsatisfiable** — it required PASS for "every
script in the master plan §6.4 table", but that table has four rows and one is `verify-all.ts`
itself, which excludes itself from the run (`name !== "verify-all.ts"`) and emits
`SUMMARY PASS 3 script(s)` rather than a PASS line for itself. The phase could never have closed,
in a file the plan forbids editing — the same trap §6.4's earned note documents, re-introduced in
this row's wording. C5 now pins the three executed scripts, the summary line, and the expected
**58 + 20 + 19 = 97** rows. **L2:** row count derived — **9** across 5 criteria. **L3:** C3's
discharge and its boundary written into the plan.

Recorded, not folded: task 1's second output ("map keys never observed") has no criterion, and on
current data all eight map keys are observed (`extension_quantity` appears 109 times) so it is
legitimately empty — an implementation omitting it would still pass C1. Low stakes; optional.

Prompt compiled → `prompts/implementer/prompt_plan6_implement_r1.md`. Gate self-test 5/5.
Implementer scope: **C1, C2, C5** — six rows.
