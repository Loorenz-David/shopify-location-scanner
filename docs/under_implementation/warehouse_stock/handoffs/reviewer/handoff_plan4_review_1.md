---
plan: 4
role: review
round: 1
state: OWNER_DECISIONS_PENDING
verdict: CHANGES_REQUESTED
date: 2026-09-01
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P4 review (round 1) — CHANGES_REQUESTED (no code defect found)

Tree reviewed: **`4da4579`** (`CHECKPOINT (not approved): implement item stock transition hooks`),
isolated from P3's concurrent checkpoint `7b86e53`.

**Read the verdict precisely: I found no defect in the code.** Everything I could verify is
correct, and some of it I verified by executing it, which is more than this phase's own
instruments do. The gate is held for one reason: **the instrument the plan designates for seven
of its criteria was never run**, and running it needs infrastructure only the owner can bring up.
That is not a Codex failure — the implementer reported the gap exactly as asked.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Bring up Redis and the worker so phase 4 can be verified, or approve it unverified?

**Question.** Phase 4's behaviour can only be checked against a running app with Redis, the
webhook worker, and one edit made in the Shopify admin. None of that was available. Do we stand
that up and run the checks, or approve the phase on code reading alone?

**Story.** This is the phase that reaches into the code handling every scan and every sale. I read
it closely and it is right, and I ran its core arithmetic myself — a move takes 2 off one shelf
and puts 2 on another; a webhook that changes both location and quantity moves the old count off
and the new count on. What nobody has watched is the moment it fires *inside your real flows*: a
chair actually scanned between two shelves, an actual order paid twice. If a hook is wired to the
wrong branch, every number it writes is still arithmetically perfect and consistently wrong, and
nothing errors.

**Branches.**
- **Stand it up and run the seven checks** — roughly an hour with Redis and the worker running.
  The phase closes on evidence.
- **Approve unverified and let phase 6's sweep catch it** — phase 6 re-runs all of this anyway,
  but a defect found there is four phases from where it was introduced.

**Recommendation.** Stand it up. This is the one phase where a wrong wiring is invisible and
expensive, and it is also the phase whose blast radius includes scanning and sales.

**On silence.** The gate holds; phase 4 stays CHANGES_REQUESTED and phase 6 remains blocked.

**Trace:** plan 4 Manual Scenarios 1–7; master plan §9.1(c); criteria C2, C3, C4(a)(b), C5.

## What I verified correct

- **Perimeter exact, and the parallel protocol held.** `git diff --name-only 7ebc7d6 4da4579` =
  precisely the five permitted files. P3's concurrent work is entirely in its own commit; neither
  session strayed, and neither committed the other's files.
- **C7(b)/(c) hold at source.** `scan-history.repository.ts`, `ws-broadcaster.ts` and
  `ws-server.ts` are **byte-identical** to their pre-phase state. The whole point of Option A was
  never to touch that repository, and it was not touched.
- **The owner's card-1 decision is implemented.** Both order commands now take a real
  `findByShopAndProduct` read **before** the sold write, not the fabricated
  `{...after, isSold:false}`. The location command's read is hoisted out of the `returnToStore`
  branch to run unconditionally, and it is named `existingHistory`, not `before` — the collision
  D10 warned about is avoided.
- **A replayed sale no-ops. Executed, not read:** `applyItemStockChange` with
  `before.isSold && after.isSold` returns `{ changed: false }`. That is the defect the owner's
  decision existed to prevent, and it is closed.
- **The resolution matrix, executed against seeded configurations on a scratch copy:**
  a qty-2 move took the source 10 → 8 and the destination 0 → 2; a cross-config change with
  `before.quantity = 2` and `after.quantity = 6` took the source 8 → 6 and the destination 2 → 8
  — **two quantities, not one** (C1(i)); a `before === null` increment took the destination 8 → 11
  with no decrement attempted (C1(j)); a null `itemCategory` resolved nothing (C1(k)).
- **Error isolation is total.** `applyItemStockChange` wraps its whole body in `try/catch`,
  logging *"Stock change failed; parent operation continues"*. The unrouted P2/P4 collision was
  handled the safe way **and reported**, exactly as the prompt required.
- **The decrement and increment are independent statements**, so a source guard refusal still
  lets the destination increment run — C1(h)/C6(c) hold structurally.
- **Eligibility includes `itemCategory !== null`** (D7), and the webhook call is placed after
  every branch (D8).
- **Instruments:** typecheck 0 · purity grep empty · `verify-all.ts` exit 0 on a scratch copy
  (P1's 58 + P2's 20 — note it covers **no** P4 row).
- **The handoff is exemplary about its own limits.** It marks every code-inspection row as such,
  never presents one as an executed test, and names each unexecuted scenario individually. That
  is the behaviour the prompt asked for and it is why this review could be precise.

## Findings

### B1 — blocking — seven criteria have no discharged instrument

**Authority:** master plan §9.1(c) — criteria needing the running app "are checked by the phase's
Manual Scenarios … executed by implementer **and re-executed by reviewer**". Plan 4 Manual
Scenarios 1–7.

**Not executed by anyone:** C2(a), C2(b), C3(a), C3(b), C4(a), C4(b), C5(a). These are the
behavioural core — a scan move, a same-location rescan, a return to store, a Shopify-admin
location edit, a winner-changing property sync, and a sale. The handoff records each as *"no
runtime assertion observed"*.

P4 authors no verify script by plan design, and `verify-all.ts` covers no P4 row, so **nothing
executable touches these criteria at all**. What remains is code inspection, which I did and
which found nothing wrong — but inspection cannot see a hook wired into the wrong branch of a
`if (!existingHistory || !existingHistory.isSold)`, and that is precisely the failure mode D8
identified in this very phase.

**This is not a request for a code change.** The correction is execution: Redis and the webhook
worker running, one Shopify admin edit, the seven scenarios run with expected-vs-observed
recorded. See owner card 1 — the blocker is infrastructure, not implementation.

### N1 — note — `applyIncrement` is not shop-scoped, and that is P2's code, not P4's

`applyIncrement(id, delta, tx?)` (`location-stock.repository.ts:408-419`) issues
`update({ where: { id } })` with **no `shopId`**, while its sibling `applyGuardedDecrement`
scopes `where: { id, shopId, quantity: { gte: delta } }`. Context §0.2 says `shopId`
"participates in every uniqueness constraint, every index, and **every query**".

**Not exploitable through any current call path** — every id reaching it comes from
`resolveBestMatch` over configurations loaded by `listByGroup(shopId, …)`, so it is already
shop-scoped by construction. No concrete incorrect behaviour can be demonstrated, so this is not
blocking under §11.2, and §11.3's non-finding 16 makes a pre-existing defect outside the phase
perimeter advisory at most.

**Recorded because it is a miss in my own P2 review**, found only because a probe of mine called
it with the wrong signature. The asymmetry between the two mutation methods is the kind of thing
that stays harmless until someone calls the increment from a path that did not do a scoped read.

## Mutation-probe declaration

**No mutations applied to repository files.** My probes were additive scripts executed against a
**scratch copy** (`sqlite3 … ".backup"`), seeding two throwaway configurations at locations
`QZ1`/`QZ2` and calling the shipped primitive directly. `prisma/dev.db` was read only; the
scratch copy is deleted. No file in the repository was modified by this review.

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan4_review_1.md` (this file)
- `plans/plan_4_item_transition_hooks.md` (Review log entry)
- `master_plan.md` (tracker row)

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| B1 | seven criteria unexecuted | **owner card 1** — infrastructure, then a fix cycle that runs and records them | **yes** |
| N1 | `applyIncrement` unscoped | P6's maintenance sweep, or a P2 note — advisory | no |
| — | the P2/P4 threshold-throw collision | handled safely and reported; **still unrouted as doctrine** — fold into P6 or a later intention amendment | no |

## Lessons for the plans

1. **A phase whose only instrument needs infrastructure should say so at planning time**, and the
   coordinator should confirm that infrastructure is available *before* dispatching the
   implementer — not discover at review that the phase cannot be verified. P4's plan named Redis
   and the worker in its scenarios; nothing gated on them being up.
2. **`verify-all.ts` covering no P4 row is a structural gap**, not an oversight of this session:
   the regression seam protects earlier phases from later ones, but P4 itself contributes nothing
   to it, so no future phase's close will ever re-check the hooks. Worth deciding at P6 whether
   the hook matrix deserves a committed script after all.
