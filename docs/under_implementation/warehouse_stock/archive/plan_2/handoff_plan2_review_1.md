---
plan: 2
role: review
round: 1
state: IMPLEMENTED
verdict: APPROVED
date: 2026-09-01
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P2 review (round 1) — APPROVED

Tree reviewed: `e3eb367` (`CHECKPOINT (not approved): implement stock repository reconciliation`).

**Verdict: APPROVED.** No blocking finding stands under master plan §11.2. Every criterion row
I re-derived holds; all instruments pass on my own run; the perimeter is exact. Two should-fix
items follow — **one is a defect in the plan that I authored, not in the implementation** — plus
one note.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs you. Both should-fix items route to plan text; neither is a P2 fix cycle, and the
recommendation for each is to fold forward rather than reopen this phase (master plan §9.7).

## What I verified correct

- **Perimeter exact.** `git diff --name-only 50e410a e3eb367` = precisely the five permitted
  files. No tracked file outside it. All **six** of P1's frozen files (`domain/*.ts`,
  `item-property-options.ts`, `verify-stock-domain.ts`) are byte-identical to `e30a44d`.
- **Instruments, re-run by me on the handed-over tree:** `npm run typecheck` exit 0 · purity grep
  empty · `verify-all.ts` **exit 0** on a scratch copy made with `sqlite3 … ".backup"`, chaining
  P1's 58 rows and P2's 20 for 78 case PASSes plus 2 script-level PASSes. The 20/24 split is
  correct arithmetic, not a shortfall: C7(b)–(d) are Manual Scenarios by plan design and C7(a) is
  the phase-close line.
- **The double-pass (§23.6).** Exactly two `computeGroup` calls, no loop. `betweenPasses` is
  awaited. Pass 2 compares the `(quantity, stockState)` pair per config id and treats a config
  present only in pass 2 as a difference (`from: null`) — D12 as folded. One `logger.warn`
  carrying group and per-config delta.
- **Owner card 1 implemented as decided.** `writeChangedValues` skips any config whose quantity
  *and* state are unchanged, so a recount re-attributes only rows it actually moved. Untouched
  siblings keep their human `updatedByUsername`.
- **Allocation.** Tally is by `item.quantity`, not row count. The C3 fixture genuinely
  discriminates: it seeds a wrong-location item (qty 9), a wrong-category item (qty 8), a sold
  item (qty 6) and an item matching nothing (qty 7) alongside the two that should count. Any
  eligibility leak moves an asserted total, so C3(a)/(b)/(c)/(e) are real assertions, not
  decoration.
- **The guarded decrement (§0.15).** `updateMany` with `quantity: { gte: delta }` — one atomic
  statement, no read-then-write window. On `count === 0` it reads back, emits exactly one
  `logger.error` with the repository-owned fields plus the caller's `context` spread, returns
  `false`, and **throws nothing**. State recomputed after a successful mutation.
- **D9 landed where the corrected registry says.** The `Json → Record<string,string> | null`
  reduction is in `listEligibleItems` (`location-stock.repository.ts:298-304`), **not** in
  `toDomain`. This was the fix to a note I had written wrongly; the implementation followed the
  corrected version, so criteria are not being destroyed.
- **`{}` round-trip (§0.21).** Zero occurrences of `Prisma.JsonNull` or `toPropertiesUpdateValue`
  anywhere in the repository. `propertiesCanonical` is derived from `canonicalCriteriaString` on
  create (`:107`) and from **normalised** criteria on update (`:204`).
- **`contracts/stock.contract.ts` is types only**, as the perimeter permits — type aliases plus
  the `STOCK_OPERATIONS` `as const` set. No zod; P3 adds the schemas.
- **The refusal predicate (projection D6, the one with a destructive failure mode).** Refuses on
  unset/empty `DATABASE_URL` **before** any path comparison, then compares resolved absolute
  paths, and exits **3** so refusal cannot read as failure.
- **Honest Task 0.** The handoff records that the pre-edit executable baseline was **not
  captured**, and why — the instrument did not exist at the gate. Recorded rather than
  reconstructed, which is the right call.
- **Probe perimeter declared and clean.** The transient probe script, the renamed script, and
  three mistaken root-level authoring paths are all declared and all absent from the tree.

## Findings

### S1 — should-fix — C3(d) contradicts task 3, and the contradiction is mine

**Authority:** plan 2 task 3 (owner card 1, 2026-09-01) vs plan 2 C3(d).

C3(d) reads *"all configs in the group written in one transaction"*. Task 3, as amended by the
owner's card-1 answer, says the opposite: **write only the configs whose `(quantity, stockState)`
actually changed.** I folded card 1 into task 3 and did not update C3(d).

The implementation follows task 3, which is correct. But the plan now tells two stories, and the
cheaper misreading is the damaging one: an implementer obeying C3(d) literally writes every row
in the group, which re-attributes untouched siblings to `system:stock-reconciliation` — exactly
the audit-trail loss card 1 exists to prevent. A future reviewer reading C3(d) could also fail a
correct implementation.

**Correction:** amend C3(d) to *"every config in the group ends the transaction at its recounted
`(quantity, stockState)`; configs already at their recounted values are **not** written — a
config matching zero items reads quantity 0 / `out_of_stock`."* No implementation change.

### S2 — should-fix — the empty-group path has never been executed

**Authority:** plan 2 task 4 (coordinator amendment); context §0.17.

`computeGroup` returns early when a group holds no configurations — no item query, no
transaction, no pass 2. It is implemented exactly as specified. **No criterion row exercises it.**

**Proven, not asserted.** Deleting both early returns leaves the suite at **20 PASS / 0 FAIL /
exit 0**. File reverted, checksum verified identical.

This is not the durability shape §9.7 covers. The path is not frozen and not hypothetical: it is
**never run today and P3 runs it on its first delete** — context §0.17 reconciles a deleted
config's group *after* the row is removed, so removing the last configuration in a group calls it
immediately. What is untested is current behaviour that a later phase depends on, not a
regression that might arrive.

**Correction, and the cheap direction:** do **not** reopen P2. Fold a row into **P3's** plan,
where the delete command and its reconciliation call actually live — deleting the last
configuration in a group leaves siblings untouched, throws nothing, and writes nothing. That is
the same "cheap where the work is ahead of you" reasoning §9.7 records, applied forward.

### N1 — note — five criterion rows share one check, so failures do not localise

Twenty rows are discharged by nine functions: C1(a)–(c) share `verifyC1`, C3(a)–(e) share
`verifyC3`, C2(b)/(c), C5(a)/(b) and C6(a)/(b) likewise. The fixtures discriminate correctly, so
this is reporting granularity rather than decoration — but a single broken assertion reddens
every row in its group with an identical message. Observed during probe R2: one zero-match
failure printed as `FAIL C3(a)`, `FAIL C3(b)`, `FAIL C3(c)` … all reading *"zero-match
configuration was not reset to zero"*, which is not what C3(a) or C3(b) assert.

Not a defect and not worth a round here. Recorded because P5's script will copy this shape, and
because a reviewer reading a future failure log will be misdirected by the row ids.

## Mutation-probe declaration

| Probe | File | Mutation | Observed |
|---|---|---|---|
| R1 | `services/stock-reconciliation.service.ts` | removed both empty-group early returns | 20 PASS / 0 FAIL / exit 0 — **no bite** (S2) |
| R2 | `services/stock-reconciliation.service.ts` | omitted zero-quantity configs from the computed values | 15 PASS / **5 FAIL** — bites, but all five messages identical (N1) |

Both applied and reverted; `shasum -c` confirms the file is byte-identical to `e3eb367`.
**Database side effects: none to the configured database.** All runs used a scratch copy at
`/private/tmp/p2-review.*/dev.db` created with `sqlite3 … ".backup"`; `prisma/dev.db` was read
only. **I did not re-run Codex's own probes** — its evidence is tree-bound to the tree I
reviewed and is consumed by citation per the charter's test-evidence section. The budget went to
variation, which is what produced S2 and N1.

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan2_review_1.md` (this file, created)
- `plans/plan_2_repository_reconciliation.md` (Review log entry appended)
- `master_plan.md` (tracker row P2 → APPROVED)

No source file, script, migration or database was modified.

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| S1 | C3(d) contradicts task 3 | **plan 2 C3(d)**, corrected at fold — text only | no |
| S2 | empty-group path unexercised | **P3 plan** — a delete-last-config row | no, but must land before P3 dispatches |
| N1 | shared check functions blur row ids | **P5 plan** — its script must not copy the shape | no |

## Lessons for the plans

1. **An owner decision folded into a task must be swept against that task's criteria.** Card 1
   changed how reconciliation writes; C3(d) still described the old behaviour one screen away.
   The fold checklist needs a step: after amending a task, grep the criteria table for rows
   asserting what the task just changed.
2. **A coordinator amendment added after the projection gets no gate.** The empty-group rule was
   folded by me *after* both the lint and the projection had run, so nothing checked whether a
   criterion covered it — and none does. Amendments landing post-projection should carry their
   own criterion row, or be explicitly recorded as unmeasured.
3. **Row ids are a diagnostic surface, not just an accounting one.** N1's shape passes every
   count-based check while making a future failure log misleading.
