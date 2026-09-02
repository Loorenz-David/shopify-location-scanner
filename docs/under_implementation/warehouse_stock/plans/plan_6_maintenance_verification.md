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

### 2026-09-02 — P6 implementation round 1

Implemented the two maintenance scripts within the declared code perimeter:
`scripts/report-stock-property-drift.ts` and `scripts/rebuild-location-stock.ts`.
The drift report reads only map-declared property keys, tokenizes stored values through
`tokenizePropertyValue`, counts unknown atomic tokens, and reports configured keys with no
observed value. The rebuild script previews from read-only repository/domain reads when
`DRY_RUN=1` and delegates live repair to `reconcileAllGroups(SHOP_ID)`. It refuses the
configured development database with exit 3 before database work.

Judgment calls recorded for review:

- Drift counts are occurrences of each unknown token across ScanHistory rows; map-key
  `observedCount` is the number of rows with a non-empty tokenized value. This makes a planted
  value's count visible while keeping the separate unobserved-key report meaningful.
- Map values are tokenized with the same shared splitter as stored values, so comparison is
  case-insensitive and treats comma/slash/ampersand-separated values atomically. Keys outside
  the map are deliberately ignored, including Shopify fields that are not configurable.
- The service's public `reconcileAllGroups` API writes and returns no computed values, so the
  dry-run preview reuses its repository/domain matching and state-calculation path without
  invoking the writer. Live mode calls the service directly. Dry-run accepts the requested
  `DRY_RUN=1` spelling and the existing scripts' `true` spelling.
- No `verify-all.ts` or `EXPECTED_SCRIPTS` edit was made: neither new file is a `verify-*.ts`.

#### C1 Drift report

| Row | Expected | Observed |
|---|---|---|
| C1(a) | A scratch ScanHistory row with `wood_type: "Bamboo"` is reported under `wood_type` with a count. | PASS: `{"event":"property-value-drift","key":"wood_type","token":"bamboo","count":1}`; the summary reported `driftEntries: 1`. |
| C1(b) | Existing configured values do not create false positives, and configured keys are separately accounted for. | PASS on the unmodified development data: 1107 rows, `driftEntries: 0`, `unobservedKeys: 0`, and all 8 configured keys observed. |
| C1(c) | The read-only report leaves `prisma/dev.db` byte-identical. | PASS: SHA-256 before `be5906923b4ed7e2dbe6a8d90964d99f47d3c3926b3875d9bd03cd2fe04f2b22`; after identical. |

#### C2 Rebuild

| Row | Expected | Observed |
|---|---|---|
| C2(a) | `DRY_RUN=1` prints current→computed deltas and writes nothing. | PASS on a SQLite `.backup` fixture: `p6-dry-stock` printed `99/high_in_stock → 7/high_in_stock`, `groupsTouched: 1`, `writes: 0`; checksum before `85c9d70175e7c6517e609bd35668fd2dd25f7faf3ff578c04be0335c98d13d2a` and after identical. |
| C2(b) | A live run repairs a planted drifted quantity. | PASS on a separate SQLite `.backup`: planted `p6-live-stock` quantity 99; live run repaired it to `7|high_in_stock`. |
| C2(c) | Output lists every group touched. | PASS: live fixture output contained `location-stock-group-reconciled` for `P6_LIVE_LOCATION / Dining Chairs` and completed with `groupsTouched: 1`; the dry-run preview likewise emitted one group preview. |

The configured-development-database safety probe also passed: running the rebuild with
`DATABASE_URL=file:./dev.db` printed the refusal message and exited 3. All destructive fixture
operations used disposable SQLite backups made with `.backup`; the configured database was not
modified by them.

#### C5 Final regression seam

`npm run typecheck` exited 0. The purity grep for `prisma|@prisma` in
`src/modules/stock/domain/` and `src/shared/item-properties/item-property-options.ts` was
empty. The final `verify-all.ts` run used a fresh SQLite `.backup` and exited 0. Full output:

```text
--- verify-stock-domain.ts ---
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C3(e)
PASS C3(f) (empty array)
PASS C3(f) (blank scalar)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
PASS C4(f)
PASS C5(a)
PASS C5(b)
PASS C5(c)
PASS C5(d)
PASS C5(e)
PASS C5(f)
PASS C6(a)
PASS C6(b)
PASS C6(c)
PASS C6(d)
PASS C6(e)
PASS C6(f)
PASS C6(g)
PASS C6(h)
PASS C7(a)
PASS C7(b)
PASS C7(c) (zero)
PASS C7(c) (negative)
PASS C7(c) (non-integer)
PASS C7(d)
PASS C7(e)
PASS C7(f)
PASS C7(g)
PASS C8(a)
PASS C8(b)
PASS C8(c)
PASS C8(d)
PASS C8(e)
PASS C8(f)
PASS C8(g)
PASS C8(h)
PASS C9(a)
PASS C9(b)
PASS C9(c)
PASS C9(d)
PASS C9(e)
PASS C9(f)
PASS C9(g)
PASS C9(h)
PASS verify-stock-domain.ts
--- verify-stock-reconciliation.ts ---
PASS C1(a)
PASS C1(b)
PASS C1(c)
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C2(d)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C3(e)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C5(a)
PASS C5(b)
PASS C6(a)
PASS C6(b)
PASS verify-stock-reconciliation.ts
--- verify-stock-report.ts ---
PASS C1(a)
PASS C1(b)
PASS C1(c)
PASS C1(d)
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C2(d)
PASS C2(e)
PASS C2(f)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
PASS verify-stock-report.ts
SUMMARY PASS 3 script(s)
```

The implementation checkpoint is `4a0d5ef` (`CHECKPOINT (not approved): implement P6
maintenance scripts`).

### 2026-09-02 — review round 1 · APPROVED · phase and project closed

Handoff: `handoffs/reviewer/handoff_plan6_review_1.md`. Tree `4a0d5ef`. Perimeter exactly the two
new scripts; `verify-all.ts` and `EXPECTED_SCRIPTS` untouched, correctly.

**C5:** `SUMMARY PASS 3 script(s)` — **97 rows** (58 + 20 + 19), none REFUSED, none MISSING.
Typecheck 0, purity empty. `prisma/dev.db` SHA-256 `be5906923b4ed7e2…` identical before and after
the entire review.

**C1 executed by the reviewer**, against the real dev.db as C1(c) requires: 1107 rows, 0 drift, 0
unobserved keys, checksum unchanged. On a scratch copy: planted `Bamboo` → reported; planted
`"Oak, Bamboo / Teak"` → **only `bamboo`** reported, proving the tokenizer path; restored legal
values → 0; removed every `upholstery` value → the un-required `property-key-unobserved` output
fired. Lint L4 had recorded that second output as optional and empty on current data — it was
built anyway and it works.

**C2 executed by the reviewer.** The dry run re-implements the group computation rather than
calling `reconcileGroup`, so it was tested rather than argued. Seeded three real definitions,
reconciled to truth, corrupted every quantity to 99: the preview said H1 99→80, LC1 teak 99→107,
LC1 catch-all 99→114, and the live run wrote exactly **80 / 107 / 114** — matching P3's review
figures and the runbook. Checksum identical across the dry run (`writes: 0` is true, not just
printed); one group event per group, `groupsTouched: 2`. Refusal guard exit 3 in all three forms.

**N1 (note, not blocking):** `rebuild-location-stock.ts` duplicates P2's private `computeGroup`.
Proven equivalent by execution; the clean alternative needed an approved file re-opened for a
durability gain (§9.7). Named as the first thing to re-check if allocation semantics ever change.

**C4 — measurement ledger closed. M1–M8 all verified**, with evidence pointers in the review
handoff. M3 is the only measurement resting partly on the owner's attestation rather than recorded
execution, and that boundary is stated rather than smoothed over.

**Knowingly open at closeout**, carried in the review handoff: the three runbook steps ordinary use
is least likely to reach; the `shopId` asymmetry on `applyIncrement`/`updateState`; the
`thresholds[2]` coverage gap; and — the one worth doing first — the P2-propagates / P4-swallows
doctrine collision, handled safely in code but never routed.

Phase closed. **Project closed: all six phases APPROVED.**

### 2026-09-02 — N1 discharged by P7
The rebuild script's duplicated allocation loop (review N1: "first thing to re-check if allocation
semantics ever change") was the first thing P7 changed. Both `computeGroup` copies now call the one
`domain/allocation.ts` `allocateGroup`; P7 C5 re-executed C2's dry-run/live-run rows under the new
shape (checksum-identical dry run, live run wrote both numbers). See `plan_7_per_instance_count.md`.
