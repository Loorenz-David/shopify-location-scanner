---
plan: 2
role: coordinator
round: "-"
date: 2026-09-01
---

# Pre-dispatch lint — `plans/plan_2_repository_reconciliation.md`

Coordinator Responsibility 1c. Every property checked **by running a command against the
tree**, not from memory. **Five defects found and folded; verdict at the bottom.**

## Precondition — the intention gate

`intention/raw_intention.md:3` reads `**Status: RATIFIED**` (re-stamped at round 3 after the
§26 report amendment). Gate open. P1 is APPROVED, so P2's dependency gate is satisfied.

## Property 1 — every reference resolves

| Reference | Check | Result |
|---|---|---|
| `scan-history.repository.ts:79-82` `normalizeLocation` | `sed -n '79,82p'` | **exact** — the four cited lines are the function |
| `toPropertiesUpdateValue` (named as forbidden) | `grep -n` | exists at `:188`, used at `:689` — the prohibition names a real thing |
| `zone.repository.ts` (repository idiom) | `wc -l` | 152 lines, present |
| `ScanHistory` columns P2 queries | `schema.prisma` | `itemCategory:130`, `latestLocation:140`, `isSold:142` — all present and indexed |
| `logger.warn` / `logger.error` | `shared/logging/logger.ts` | present |
| P1's domain modules | filesystem | all four present and APPROVED |
| The four new files | filesystem | all four correctly absent |

## Property 2 — every count is derived

`grep -c '^| C[0-9]'` → **7** criteria (at target). Summands, printed:
`C1 3 · C2 4 · C3 5 · C4 4 · C5 2 · C6 2 · C7 4` = **24** lettered rows.
"the four files above" → the perimeter list holds exactly **4** entries.

## Property 3 — every criterion row is addressable

**FAILED on first pass — L3, fixed.** C5 and C6 carried no lettered rows at all; each was a
single unlabelled sentence. The verify script prints one line per *row*, so both would have
produced an unaddressable label. Both are now split: C5(a)/(b) separate the restored value from
the absence of a guard refusal; C6(a)/(b) separate "every group reconciled" from "each exactly
once" — and (b) now names its fixture (two groups, one holding two configs, expect **2** calls,
not 3), which is the case that catches a per-config loop masquerading as a per-group one.

## Property 4 — every row states one exact expected outcome

Disjunction sweep over the criteria table (`>=`, "at least", "one of", "may", "might", "or
more") → **zero hits**.

**FAILED on a deeper check — L4, fixed.** C2(c) required the refusal log to carry "ALL §0.15
context fields", enumerating `productId/scanHistoryId`, `itemCategory`, `operation` among them.
But task 1 declared the signature `applyGuardedDecrement(id, shopId, delta)` — **the function
cannot log fields it never receives.** The row was unsatisfiable without a registry deviation,
which the implementer is forbidden to make. Note §0.15's own wording is "each field included
where available", so the criterion was also stricter than the contract it cites.

Fixed at the registry (master plan §6.2): the signature gains a fourth `context` argument
carrying the caller-known fields, matching what P4's `applyItemStockChange` already promises to
supply "solely for §0.15 log context". C2(c) now enumerates exactly eight keys and names the
`context` value the fixture passes, so the row has one exact expected outcome.

## Property 5 — every trace cell resolves

**FAILED — L2, fixed.** C7's trace cell read `§9.1d` alone — a master plan process rule, which
is neither a measurement-ledger ID nor a mechanism contract. Intention §24 requires every phase
acceptance criterion to trace to a ledger ID. Same shape as P1's F7. Now `M1/M2/M6, §9.1d`:
the regression seam exists to keep P1's evidence for those three entries valid at later closes,
which is the measurement it actually serves. `grep` for trace cells lacking an `M` id → **0**.

Reverse direction: P2 claims M1, M2, M4, M5, M6, M8. All are served by ≥1 row.

## The three checks that belong to no property

- **Perimeter-vs-guard collision — FAILED, and this was the expensive one (L1).** Task 6 and
  C7(d) keyed `MISSING` to "a script named in the master plan §6.4 table". That table lists
  `verify-stock-report.ts`, authored by **P5**. So at P2's close `verify-all.ts` would report
  MISSING for a script that cannot exist yet and exit non-zero — making P2's own phase-close
  instrument ("`verify-all.ts` all-PASS") **unsatisfiable by construction**. Every phase before
  P5 would have failed to close, in a file no plan permits anyone to change.
  Fixed: `verify-all.ts` carries its own `EXPECTED_SCRIPTS` constant, which at P2 is exactly
  the two scripts that exist; the phase authoring a new verify script extends it in the same
  commit. §6.4 now states that the table is the eventual set and that `MISSING` is judged
  against the constant, never the table.
  **Recorded honestly: this defect was authored by the coordinator**, in the same fold that
  added the regression seam. It is the exact shape the doctrine names — a guard that turns the
  phase red through something the phase cannot touch — and it was caught only because this lint
  re-derives instead of re-reading.
- **A deletion task leaves no unused import.** P2 has no deletion task. N/A.
- **Standing instructions naming plan 2.** Master plan §3 (projection **mandatory** for P1, P2,
  P4 — being honoured, prompt compiled below), §7 (P2 gate-in = P1 APPROVED, satisfied),
  §9.1(d) (P2 authors `verify-all.ts` — in the plan), §9.7 (durability-only findings are notes
  — will be quoted into the review prompt). All four applied.

## Sixth finding — L5, a decidability hazard not covered by any property

`logger.error` writes to **stderr** and `logger.warn`/`info` to **stdout**
(`shared/logging/logger.ts:10-18`). C2(c) asserts on an error log and C4(b) on a warning, so a
verify script capturing a single stream finds nothing for one of them — and a row written as
"no exception was thrown" instead of "the log was emitted" passes vacuously, which is charter
rule 15's family. Folded into the plan's Notes: capture both streams, assert on the parsed JSON
context object, never on a substring of the line.

## Sizing

7 criteria, at the charter's ≤8 target. No exception needed.

## Verdict

**LINT PASS after five folds — plan 2 may proceed to projection.** L1 and L4 were blocking as
written: one made the phase impossible to close, the other made a criterion impossible to
satisfy. L2, L3 and L5 were real but cheaper.

Recorded limit, unchanged: this lint catches omission, arithmetic and contradiction. It cannot
see a criterion row whose assertion is weaker than the row, and it has never caught a guard that
cannot fail. That is what the projection gate is for, and two calibration probes are sealed
outside the repository before dispatch.

---

## Re-lint before dispatch — 2026-09-01 (post-projection fold)

The plan changed materially after the first lint: 16 ledger rows and 8 findings folded, the
perimeter grew 4 → 5 files, two amendments landed on the master plan registry. Fresh run of the
five properties at source, not a re-reading of the earlier verdict.

| Property | Result |
|---|---|
| 1 — references | all 5 perimeter files correctly absent; `reconcileGroup(…, hooks?)` present in §6.4; §6.2 now names `listEligibleItems`; P1's 4 frozen domain files present and untouched |
| 2 — counts | **7** criteria · **24** lettered rows (`C1 3 · C2 4 · C3 5 · C4 4 · C5 2 · C6 2 · C7 4`) · **5** perimeter files, and the phase-close line now says five |
| 3 — addressable | every row `C<n>(<letter>)`; whole-file sweep finds no acceptance claim stranded in a task |
| 4 — exact outcomes | disjunction sweep → **zero hits**. F3's fold removed the last soft row ("state recalculated", satisfied by `state !== undefined`) |
| 5 — traces | cells: C1 M6/M8 · C2 M4 · C3 M1/M5/M8 · C4 M5 · C5 M5 · C6 M5 · C7 §9.1d. Reverse: P2 claims **M1, M4, M5, M6, M8**, each served by ≥1 row |

**One recorded exception to property 5.** C7's cell carries **no `M` id, by design**. Its rows
assert exit codes and status words of a script runner; they measure no allocation, boundary or
conflict. The scripts it chains serve M1/M2/M6 — the parent does not, and a trace saying
otherwise reads as coverage it does not provide (P2 projection F5). Recorded here rather than
silently tolerated, because the charter's manifest expects every row to trace: an
instrument-integrity criterion is the one shape where the honest cell is a process rule.
This also **retired a defect this lint's first pass introduced** — L2 gave C7 `M1/M2/M6`, which
made P2 appear to serve M2 while no P2 row measured a threshold boundary. M2 is served by P1 C6,
verified at source.

**The three extra checks.** Perimeter-vs-guard collision: still none — zero occurrence-count or
absence assertions exist anywhere in `src` (no test infrastructure), and `EXPECTED_SCRIPTS` at
P2 lists exactly the two scripts that will exist, which is the specific collision the first pass
caught and fixed. No deletion task. Standing instructions naming plan 2: §3 (projection —
**done**, folded), §7 (gate satisfied), §9.1(d) (P2 authors `verify-all.ts` — in the plan),
§9.7 and §9.8 (reviewer rules, quoted into the review prompt when that compiles).

**Gate self-test, run from `apps/backend` against the tree the session will open:** intention
RATIFIED · branch `warehouse-stock-backend` · P1 APPROVED in the tracker with its four domain
files present · `npm run typecheck` exit 0 · `verify-stock-domain.ts` 58/58 exit 0. All pass.
Content-only, so dispatching cannot invalidate it.

**Sizing.** 7 criteria, at target.

**Verdict: RE-LINT PASS — `prompts/implementer/prompt_plan2_implement_r1.md` may be dispatched.**
