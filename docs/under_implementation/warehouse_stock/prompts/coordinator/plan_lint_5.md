---
plan: 5
role: coordinator
artifact: plan lint (pre-dispatch)
date: 2026-09-02
verdict: PASS after 4 folds
---

# Plan 5 lint — report

Run against `plans/plan_5_report.md` as rewritten under intention §26. Gate: **P3 APPROVED
2026-09-02** ✓; intention header `**Status: RATIFIED**` ✓ (§26 re-opened and re-closed it,
changelog lines 10–11).

## Properties

| # | Property | Result |
|---|---|---|
| 1 | References resolve | **FAIL → L1.** Intention §26.1–§26.5 exist (lines 936–993), §19 carries its superseded marker (660), M7 is the amended text (909), context §0.19/§0.20/§0.21 exist (374/389/398), `listByShop` and the `propertiesCanonical` column exist, `STOCK_STATES` and `canonicalCriteriaString` exist, §6.5's `StockReportDto` matches contract §4.7 byte-for-meaning. **But §6.4's instrument row describes a plan that no longer exists** |
| 2 | Counts derived, never copied | **FAIL → L3.** The plan states no lettered-row total; §6.4 states "C1–C6", which is the pre-§26 criterion count |
| 3 | Every row addressable | **FAIL → L4.** C1(d) is vacuous against the only shop in the database |
| 4 | Exactly one outcome per row | PASS — each row names one observable; C3(c) pins byte-identity against a parameterized call |
| 5 | Traces resolve | PASS — M7 (as amended), §26.1/.2/.3, §23.1, §0.19 all live |
| 6 | Perimeter vs. standing instructions | **FAIL → L2.** §6.4 obliges the authoring phase to extend `EXPECTED_SCRIPTS` in the same commit; the perimeter does not include that file |
| 7 | Deletions / unused imports | PASS — additions only in the three shared P3 files; nothing is deleted |
| 8 | Gate self-test | PASS — dependency (P3 APPROVED) and intention header are both checkable in one command each |

## Folds

### L1 — §6.4's instrument row still describes the pre-amendment phase

`master_plan.md` §6.4 lists `scripts/verify-stock-report.ts` as covering **"P5 C1–C6
aggregation rows"**. After the §26 rewrite the phase has **C1–C3**, and *aggregation is exactly
what moved to the client*. §6 declares itself the fixed registry and plan 5's Read-first list
mandates §6.4–§6.5, so an implementer reading the registry is pointed at compaction rows the
plan calls "a defect, not a bonus". This is the P4-D11 / P3-D6 shape: plan and registry
disagreeing while §6 claims to be authoritative.

**Folded:** §6.4 row corrected to "P5 C1–C3 (completeness, `mergeKey` identity, entry shape) —
scratch DB copy", with a dated note that the pre-§26 wording said C1–C6 aggregation.

### L2 — perimeter forbids the file a standing instruction requires

§6.4: *"the phase authoring a new `verify-*.ts` adds it to that constant **in the same
commit**."* Plan 5 authors `scripts/verify-stock-report.ts`; its "Files expected to change"
lists five files and **not** `scripts/verify-all.ts`. The implementer must breach the perimeter
or breach the registry rule, and either is a review finding.

Practical harm is bounded — `verify-all.ts` auto-discovers `verify-*.ts` at runtime, so the new
script runs and a FAIL still reddens the summary — but `EXPECTED_SCRIPTS` is what makes a
*deleted or renamed* script report `MISSING` instead of vanishing silently, which is the entire
point of the seam (§9.1d).

**Folded:** `scripts/verify-all.ts` added to the file list, scoped **`EXPECTED_SCRIPTS` only**,
with the reason stated inline so it is not read as licence to touch the runner.

### L3 — no derived row count

Counted from the criteria table, not copied: **C1** (a)(b)(c)(d) = 4 · **C2** (a)(b)(c)(d)(e)(f)
= 6 · **C3** (a)(b)(c)(d) = 4 → **14 lettered rows**. Recorded in the plan so the implementer
prompt cites a derived number. *This lint property exists because the count has been wrong twice
— P3 reported 31 against 28, P4 25 against 28, the latter caught by the projection rather than
by me.*

**Folded:** "**14 lettered rows**" stated under the criteria table.

### L4 — C1(d) passes without asserting anything

C1(d): *"no definition belonging to another `shopId` appears."* `prisma/dev.db` contains
**exactly one `Shop`** (`68c5b4-6a.myshopify.com`). A verify script that seeds only that shop
has no foreign definition to leak, so C1(d) reports PASS while testing nothing — the
vacuous-truth failure P1's review found in `findConflict`'s empty key set, repeated in an
instrument.

Cheap to fix rather than to accept: `Shop` requires only a unique `shopDomain`, so the fixture
can create a throwaway second shop, give it one definition, and assert its absence.

**Folded:** C1(d) rewritten to require the fixture to seed a second shop and assert exclusion,
with the vacuity named so the implementer cannot satisfy it by omission.

## Not folded — recorded

- **`GET /stock/report` does not collide** with P3's `/locations/:location`; it lands on the
  existing `stockRouter`, which already carries `authenticateUserMiddleware` +
  `requireShopLinkMiddleware`, so C3(d) and auth come free from P3's mount.
- **§26.4's safety property** (client groups on `mergeKey` **+ `stockState`**) is correctly
  marked unobservable from this phase. The plan already says so; no criterion should be invented
  for it.
- **N1's `shopId` asymmetry** (P3 review) does not touch this phase — the report is a pure read
  through `listByShop(shopId)`.

## Verdict

**PASS after 4 folds.** The plan is dispatchable once the projection decision is recorded (§3
makes round 0 **waivable by the owner** for P5).
