---
plan: 6
role: review
round: 1
state: CLOSED
verdict: APPROVED
date: 2026-09-02
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P6 review (round 1) — APPROVED · project closeout

Tree reviewed: **`4a0d5ef`** (`CHECKPOINT (not approved): implement P6 maintenance scripts`),
handoff at `8a2e29b`. No blocking finding, no should-fix, no fix cycle.

**This closes the Location Stock System pipeline. All six phases APPROVED.**

## ⚠ OWNER DECISIONS REQUIRED (0)

## Perimeter

Exactly the two new scripts, plus plan 6's Review log and the handoff. **`verify-all.ts` and
`EXPECTED_SCRIPTS` untouched**, correctly — neither new file is a `verify-*.ts`, so the runner's
auto-discovery must not pick them up and the constant must not grow. No feature code, no
migration, no index, no prior-phase file.

## Instruments

| Instrument | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| purity grep | empty |
| **C5 — `verify-all.ts` on a scratch copy** | `SUMMARY PASS 3 script(s)` · **97 rows** (58 P1 + 20 P2 + 19 P5) · none `REFUSED`, none `MISSING` |
| rebuild refusal guard | exit **3** in all three forms — `DATABASE_URL` unset, `file:./dev.db`, and the absolute path |
| `prisma/dev.db` | SHA-256 `be5906923b4ed7e2…` **identical** before and after the full review |

## Executed verification — reviewer, not read

### C1 — the drift script

Run against the **real `prisma/dev.db`**, which C1(c) requires, with a checksum either side:

- **1107 rows scanned, 8 configured keys, `driftEntries: 0`, `unobservedKeys: 0`** — no false
  positives on live data (C1(b)).
- **Checksum identical** before and after: `be5906923b4ed7e2…` (C1(c)). Read-only confirmed.

On a scratch copy I then drove it through four states:

| Planted | Reported |
|---|---|
| `wood_type: "Bamboo"` | `{key: wood_type, token: bamboo, count: 1}` — C1(a) ✓ |
| `wood_type: "Oak, Bamboo / Teak"` | **only `bamboo`** — `oak` and `teak` correctly recognised through P1's tokenizer, so hazard 4 holds and the multi-value case does not false-positive |
| `wood_type: "Oak, Teak"` | `driftEntries: 0` — returns clean |
| every `upholstery` key removed | `{event: property-key-unobserved, key: upholstery, observedCount: 0}`, `unobservedKeys: 1` |

**That last row is the un-required half.** Lint L4 recorded that task 1's second output — map keys
never observed — has no criterion, is empty on current data, and could have been omitted with C1
still passing. The implementer built it anyway, and I made it fire. Recorded because doing
unmeasured work correctly is worth as much in the record as a caught defect.

### C2 — the rebuild script, and the question the code raised

The dry run does **not** call P2's `reconcileGroup`. It re-implements the group computation, because
P2's service exposes no non-writing preview and P6's perimeter forbids changing it. Two
implementations of the same allocation must agree or the preview lies, so I tested it rather than
reasoned about it.

On a scratch copy: seeded three real definitions, reconciled to ground truth, **corrupted every
quantity to 99**, then compared.

```
                       preview            actual after live run
H1  · catch-all        99 → 80                     80
LC1 · teak             99 → 107                    107
LC1 · catch-all        99 → 114                    114
```

**The preview predicted the live write exactly**, and both match the ground-truth figures from P3's
review and the end-to-end runbook (LC1 221 splitting 114 + 107; H1 80). Checksum identical across
the dry run — `writes: 0` is true, not merely printed (C2(a)). The live run repaired all three
(C2(b)) and emitted one `location-stock-group-reconciled` event per group, `groupsTouched: 2`
(C2(c)).

Reading the two `computeGroup` implementations side by side confirms what the numbers show: same
`listEligibleItems`, same `{id, createdAt, criteria}` candidates, same `resolveBestMatch` loop, same
`calculateStockState`. The service's extra machinery is its §23.6 **double pass**, which exists to
catch concurrent change; in a quiescent system pass two equals pass one, so a single-pass preview is
the correct thing for a dry run to show.

**Recorded as N1 below**, not as a finding: the duplication is a maintainability cost in an
acknowledged interim system (§9.7), the alternative required editing an approved file, and the
implementer named the trade-off rather than hiding it.

## Findings

### N1 — note — the dry run duplicates P2's group computation

`rebuild-location-stock.ts` carries its own `computeGroup`, semantically identical to the private
one in `stock-reconciliation.service.ts`. If the allocation rule ever changes, two places must
change, and only one of them is covered by `verify-stock-reconciliation.ts`.

**Not blocking, and not worth a fix cycle** (§9.7): the two are proven equivalent by execution
above, the script is an operator tool rather than a request path, and the clean alternative —
adding a preview mode to P2's service — is outside this phase's perimeter and would re-open an
approved file for a durability gain in a system due to be rebuilt. **Named here so the rebuild is
the first thing to re-check if allocation semantics are ever amended.**

## C4 — measurement ledger closeout

| # | Measurement | Verified by | Weight |
|---|---|---|---|
| **M1** | Allocation correctness | `verify-stock-domain.ts` C4–C6 (best-match, specificity, wildcard/catch-all) · `verify-stock-reconciliation.ts` C1–C6 · P3 review, **live**: LC1 221 → 114 + 107 when a teak carve-out joins a catch-all · reproduced in this review's rebuild probe | executed |
| **M2** | State boundary correctness | `verify-stock-domain.ts` C2 + C7 — every band edge including 0, low, low+1, medium, medium+1, normal, normal+1 · P3 review, live: a thresholds-only edit moved `high → low` with quantity unchanged · P5 C4 exercises the same bands from the report side | executed |
| **M3** | Quantity conservation on transitions | P4 review, **reviewer-executed**: a qty-2 move took source 10 → 8 and destination 0 → 2; a cross-config change with differing before/after quantities moved **two** quantities (8 → 6, 2 → 8); `before === null` incremented only · **plus the owner's C3 attestation for real scan/sale flows** | executed + attested |
| **M4** | Non-negative integrity | `verify-stock-reconciliation.ts` guarded-decrement rows (refusal at the boundary, no negative) · P4 review: the whole primitive is wrapped so a stock failure never fails the parent operation, and decrement/increment are independent statements · P5 C4(d): the report clamps at 0 | executed |
| **M5** | Configuration-lifecycle reconciliation | P3 review, **live**: thresholds-only leaves siblings untouched; a criteria edit reallocates; a location change reconciles **both** groups (LC1 back to 221, H1 teak 34); deleting the last configuration in a group succeeds · **P6, this review**: a full rebuild from corrupted state reproduces a fresh recount exactly | executed |
| **M6** | Conflict prevention | `verify-stock-domain.ts` C8–C9 (`findConflict`, incl. the empty-key-set case) · P3 review, live: all twelve C1 validation rows, plus **all three** 409 shapes with 0 rows written after the intra-batch rejection | executed |
| **M7** | Report fidelity *(as amended by §26/§27)* | `verify-stock-report.ts` — **19 rows** · P5 reviews r1 and r2, **live**: a scalar-created and an array-created teak definition returned the **same `mergeKey`** on real inventory; a zero-match definition appeared at `0`/`out_of_stock`; a parameterized call was byte-identical; restock distances 79 / 0 / 20 correct | executed |
| **M8** | Group-total accounting | **Both ways.** *With* a catch-all: LC1's definitions sum to 114 + 107 = **221**, the group's true eligible inventory (P3 review, reproduced in this review). *Without* one: H1 holding only a teak carve-out summed **34** against 80 physically present — a legitimate shortfall, not drift (P3 review) · the runbook §8 and the drift script both document the distinction | executed |

**All eight measurements verified.** M3 is the only one resting partly on attestation rather than
recorded execution, and that boundary is stated rather than smoothed over.

## Knowingly open at closeout

Recorded so the next person inherits facts, not a clean-looking silence.

| Item | Status |
|---|---|
| Three runbook steps ordinary use is least likely to reach — the `orders/create` + `orders/paid` pair subtracting **once**, a refused source decrement still permitting the destination increment, and the short-total trap | covered by the owner's general attestation, **not** step-verified. The runbook stays committed and re-runnable |
| `applyIncrement` and `updateState` take an id without `shopId`, while every sibling method is shop-scoped | not exploitable through any current call path — every id arrives from a shop-scoped read. Advisory |
| A regression from the by-state threshold lookup to `thresholds[2]` would pass all 19 P5 rows | shipped code is correct; the coverage gap is real and narrow (alphabetical ordering makes index 2 *be* normal today) |
| The P2-propagates / P4-swallows doctrine collision on a malformed-threshold throw | handled the safe way in code and reported, but **never routed as doctrine**. The one item I would put first in any follow-up |
| `rebuild-location-stock.ts` duplicates P2's group computation | N1 above |

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan6_review_1.md` (this file)
- `plans/plan_6_maintenance_verification.md` (Review log)
- `master_plan.md` (tracker row, closeout)

## Lessons for the plans

1. **Three consecutive rounds had a defect caught by the implementer's "candidate upstream note",
   and none by a lint property**: P3's contract example, P5 round 1's false-green probe, and — had
   it existed — this phase's duplication trade-off, which was volunteered rather than hidden. The
   section earns its place in every prompt.
2. **The single most valuable review technique in this project was executing the thing rather than
   reading it.** Every phase where I ran the code found something reading had missed, or converted
   an argument into a fact — this phase's dry-run-equals-live check being the last example.
3. **Two of the six phases shipped with a phase-close condition that could not be met** (P2's, via
   §6.4's table; P6's C5, the same trap in different words). Both were caught at lint, neither by
   the plan's author. A close condition deserves the same "can this actually pass?" scrutiny as a
   criterion.
