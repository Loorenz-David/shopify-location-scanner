---
plan: 2
role: projection
round: 0
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: Claude Opus 5 — fresh projection session (no planning or coordinator context)
state: OWNER_DECISIONS_PENDING
---

# P2 projection (round 0) — decision ledger

## 1. Verdict

**AMENDMENTS_REQUIRED.** 16 ledger rows (10 plan gaps, 6 free choices), 8 findings, 1 owner
decision card.

## 2. Opening (owner-readable)

I did the first hour of the next build step on paper, without writing any code, to find the
places where the written plan does not actually decide what the builder must do. The plan is in
good shape on the parts that matter most — the counting rules, the safety guard on quantities,
and the double-check pass are all specified tightly enough to build and to check. What I found
is a cluster of smaller holes around the *edges*: the plan never says how stock thresholds get
saved and read back, and one of the pieces built in the previous step will crash rather than
cope if they are missing. Two of the self-check rules the plan writes down cannot actually be
observed as written, so a builder would either invent a way or quietly skip them. One question
needs you personally: whether an automatic recount should overwrite the "last edited by" name on
configurations nobody touched. Everything else is for the coordinator to patch into the
documents before the builder starts.

## 3. ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Should an automatic recount claim authorship of configurations nobody edited?

**Question.** When the system recounts a location's stock, should it stamp its own name as
"last edited by" on every configuration in that location, or only on the ones whose numbers
actually changed?

**Story.** In March, David configures four stock definitions for Dining Chairs at LC1 and the
screen shows "last edited by david" on all four. In April a colleague adds a fifth definition
for teak chairs. The moment they save, the system recounts the whole location — and all five
rows now read "last edited by system:stock-reconciliation", updated today. Nobody edited the
original four. Six months later, when a count looks wrong and David wants to know who last
touched that definition, the answer has been overwritten by a background recount.

**Branches.**
- *Stamp everything (the plan as written).* Simple, one rule; the "last edited by" column on
  stock definitions stops being useful as an audit trail.
- *Stamp only rows whose quantity or state actually changed.* The audit trail survives; the
  recount touches fewer rows; one extra comparison in the code.

**Recommendation.** Stamp only rows that actually changed — it costs one line while the plan is
still editable, and it is the only way the "last edited by" column keeps meaning anything.

**On silence.** The gate holds. The implementer prompt is not compiled until this is answered;
nothing is guessed.

*Trace: plan 2 task 3; master plan §6.6 sentinel; context §0.3, §0.17 step 4; §6.5 `LocationStockDto.updatedByUsername`.*

## 4. Decision ledger

| # | Decision point | Class | Proposed routing |
|---|---|---|---|
| D1 | **Thresholds are absent from the entire task list.** The Goal says the repository is "all Prisma access for **the two tables**", but task 1 names no method that reads or writes `StockThresholdsLocation`. Reconciliation and `recalculateState` both need a config's thresholds to compute a state; `createMany` may or may not write them. | plan gap | Amend plan 2 task 1: state explicitly (a) whether `createMany` writes threshold rows in the same transaction, (b) that `findById`/`listByGroup`/`listByShop` return each config **with** its thresholds, (c) whether a threshold-replacement method is P2's or is deferred. |
| D2 | **`calculateStockState` throws when thresholds are not exactly the three configurable states** (`stock-state.ts:65` calls `validateThresholds`, which throws `ValidationError` at `:27-29`). The plan never says what `reconcileGroup` or `recalculateState` does when a config in the group has 0 or 2 thresholds. Reachable in P2's own verify script, and in production one malformed sibling makes every later configuration change in that group fail with a 400. | plan gap | Amend plan 2 task 3 + task 1 with the chosen behaviour (propagate / skip the config / treat as `out_of_stock`) and add it as a criterion row if it is to be measured. Cite D2 in the fix. |
| D3 | **The between-pass seam contradicts the fixed registry.** Master plan §6.4 fixes `reconcileGroup(shopId, location, itemCategory)`; plan 2 Note 3 requires an optional fourth callback parameter, without which C4(b) cannot be built. §6 says a deviation is a stop-and-fold-back, so the implementer is told two incompatible things. Whether the callback is awaited is also open — a sync-only callback makes C4(b) unimplementable, since the probe must write to the database. | plan gap | Home-artifact rule: amend **master plan §6.4**'s `stock-reconciliation.service.ts` cell to carry the optional fourth parameter and state that it is awaited. Plan 2 Note 3 then merely explains it. |
| D4 | **C6(b) asks for a call count with no way to observe one.** `reconcileGroup` is an ESM module export; a script that imports the service cannot count its calls. Reconciling a group twice is idempotent, so 2 calls and 3 calls produce identical database state — the difference is unobservable by effect. | plan gap | Either give `reconcileAllGroups` an injected-`reconcileGroup` seam (the C4(b) precedent), or specify an entry `logger.info` per group whose lines the script counts, and say which. See finding F4. |
| D5 | **`REFUSED` cannot be distinguished from `FAIL`.** Task 6 fixes the vocabulary and says "the child's exit code is the verdict … do not parse child stdout for correctness", but reserves no exit code for refusal; P1's `verify-stock-domain.ts` establishes exit 1 = failure. Whether reading a refusal sentinel from stdout counts as "parsing for correctness" is also undetermined. | plan gap | Amend task 6 and task 5 with a reserved exit code for refusal (e.g. 3 = REFUSED, 1 = FAIL) and state that `verify-all.ts` maps it. Without this, C7(c) is not buildable. |
| D6 | **"Refuse when `DATABASE_URL` points at the default dev.db path" has no comparison rule.** Exact string, substring, resolved absolute path, or unset-`DATABASE_URL` (Prisma then falls back to `.env` → the real dev.db). A weak check lets the script seed and mutate the configured 304 MB dev.db, which §10.1's DB-safety rule forbids. | plan gap | Amend task 5 with the exact predicate, including the unset case. This is the one gap with a destructive failure mode. |
| D7 | **A discovered script that is not in `EXPECTED_SCRIPTS` has no defined effect on the exit code.** Task 6 runs the *discovered* set but gates exit 0 on the *expected* set, so a discovered-but-unlisted script may FAIL while `verify-all.ts` still exits 0. Not reachable at P2 (the two sets coincide), reachable at P5 if the constant is not extended. | plan gap | Amend task 6: state which set governs the exit code. Cheapest: any non-zero child, expected or not, makes the run non-zero. |
| D8 | **The repository's domain type and the `operation` union have no home file.** `toDomain` must return a named type (the zone idiom imports one from `domain/`), and `applyGuardedDecrement`'s `context.operation` needs the §6.6 closed set as a type — neither exists anywhere in the tree (`src/modules/stock/` holds only `domain/`), and §6.4 assigns DTOs to `contracts/stock.contract.ts`, which is **not** in P2's four-file perimeter. Adding a fifth file is an automatic finding at the perimeter check. | plan gap | Amend plan 2 "Files expected to change": either permit `src/modules/stock/contracts/stock.contract.ts` (types only) or state that P2 exports both types from the repository file and P3 relocates them. |
| D9 | **The item-property reduction is attached to the wrong function.** Master plan §6.2's fixed note puts the `Json → Record<string,string> \| null` reduction "on the way out of `toDomain`" — but `toDomain` maps `LocationStock.properties` (criteria, whose values are **arrays**); applying "drop non-string values" there would destroy every criterion. The item bag comes out of `listEligibleItems` (task 2), which mentions no reduction at all. | plan gap | Amend **master plan §6.2**'s note to name `listEligibleItems`, and add the reduction to plan 2 task 2. See finding F7. |
| D10 | **`normalizeLocation` is in Read-first and bound to nothing.** No task and no criterion in P2 mentions location trimming; §6.6 requires `trim()` + reject-empty "on config write", and P2's repository is the only write path that exists. Whether the repository trims, or P3's contract layer does, is undetermined — and the architecture contract says repositories must not implement domain decisions. | plan gap | Amend plan 2: say which layer normalises, or remove the Read-first entry if the answer is P3. See finding F8. |
| D11 | **`applyGuardedDecrement`'s read-back when the row does not exist.** `updateMany` returns `count === 0` both on a genuine shortfall and on a missing/wrong-shop id; §0.15 assumes the former. `currentQuantity` and `location` are then unavailable, and C2(c) requires both. | free choice | Delegate explicitly: implementer chooses (recommended: log the same one `logger.error` with the fields it has and a `currentQuantity: null`), recorded in the prompt so the freedom is granted, not taken. |
| D12 | **What "differs" means between pass 1 and pass 2.** Quantity only, or quantity **and** state (thresholds can change between passes, moving the state without moving the quantity)? And a config created or deleted between the passes has no pass-1 counterpart to compare against. | free choice | Delegate with a recommendation: compare the `(quantity, stockState)` pair per config id; treat a config present only in pass 2 as a difference. Record in the prompt. |
| D13 | **Pass 2's write scope on a difference** — rewrite every config in the group, or only the differing rows? §23.6 says "write the corrected values (again one transaction)", which reads as the latter but does not settle it. Interacts with owner card 1. | free choice | Delegate; resolve together with card 1. |
| D14 | **`listGroupSummaries` has no signature, no P2 caller and no criterion row.** §6.4 assigns the location-summary read to `queries/get-stock-locations-summary.query.ts`, a later phase's file. | free choice | Either cut it from task 1 or record an explicit delegation that its shape is the implementer's, unmeasured in P2. Recommend cutting — it is the only method in task 1 with no consumer and no row. |
| D15 | **`SHOP_ID` unset in the verify script** — fail, or use the single shop present in the database? | free choice | Delegate; recommend fail-fast with a clear message. |
| D16 | **C1(c): what the duplicate create is expected to produce.** Raw Prisma `P2002`, or a mapped `ConflictError`? The repository is the only layer in P2, and §6.5 defines conflict details for the §23.2 *domain* conflict (P3's `findConflict`), not for the index. | plan gap | Amend C1(c) with the exact expected outcome. See finding F2. |

## 5. Findings

### Reality checks — passed

Recorded so the coordinator can see the perimeter of what was verified:

- All four paths in "Files expected to change" are new; their parent directories exist
  (`src/modules/stock/`, `scripts/`), and `repositories/`, `services/`, `verify-all.ts` are
  absent as the gate requires.
- `src/modules/scanner/repositories/scan-history.repository.ts:79-82` **is** `normalizeLocation` — citation resolves.
- `src/shared/logging/logger.ts:12-13` **is** the `console.error` branch; `:17` is `console.log`.
  The plan's two-stream claim (Note 4, C2(c)) is correct as stated.
- P1's four domain files exist and export exactly what master plan §6.2 claims.
- `prisma/schema.prisma:419-455` matches §6.1 field-for-field, including the four-column unique
  index and `properties Json` (non-nullable, so `{}` cannot degrade to `null` at the column).
- The `stats` precedent task 2 invokes is real: `src/modules/stats/repositories/stats-items.repository.ts:273-329` reads `prisma.scanHistory` from another module's repository.
- `EXPECTED_SCRIPTS`'s two entries both resolve: `verify-stock-domain.ts` exists and exits 0/1.
- The criteria table holds exactly **24** lettered rows (3+4+5+4+2+2+4), matching the prompt.

### F1 — C7(c) and C7(d) have no declared instrument *(decidability)*

*plan_2_repository_reconciliation.md:32, 34, 37-40; master_plan.md:160-163*

§9.1 says every criterion is checked by a committed `verify-*.ts` (b) or by Manual Scenarios (c).
§6.4's instrument table scopes `verify-stock-reconciliation.ts` to **C1–C6**. C7(a) is covered by
the phase-close line ("verify-all all-PASS"); C7(b) by Manual scenario 1. **C7(c) (REFUSED) and
C7(d) (MISSING) are covered by neither** — and C7(d) additionally requires temporarily removing a
verify script from disk, a probe the Manual Scenarios section does not declare.
*Routing:* add the two probes to Manual Scenarios (C7(d) as a declared rename-and-restore of
`verify-stock-reconciliation.ts`, not of P1's frozen script).

### F2 — C1(c) states no exact expected outcome *(decidability, charter rule 2)*

*plan_2_repository_reconciliation.md:26*

"DB unique constraint rejects a second identical (…)" is satisfied by *any* throw. Two
implementers ship different observable behaviour (raw `P2002` vs `ConflictError`) and the
reviewer cannot call either wrong. See ledger D16.

### F3 — C2(a) and C2(d) say "state recalculated" without naming the state *(decidability)*

*plan_2_repository_reconciliation.md:27*

Charter rule 2 requires one exact expected outcome per row. The row becomes decidable only once
the script author picks thresholds; nothing in the plan pins them, so the assertion could
legitimately be `state !== undefined`, which cannot fail.
*Routing:* name the fixture thresholds and the expected state in the row (e.g. low 1 / medium 3 /
normal 5, quantity 2 → `medium_in_stock`).

### F4 — C6(b) is not observable as written *(decidability)*

*plan_2_repository_reconciliation.md:31*

"assert the call count is 2, not 3" — see ledger D4. Reconciling a group a second time is
idempotent, so the two worlds are byte-identical in the database. Without a seam this row is
either unimplementable or silently downgraded to "both groups ended up correct", which is C6(a)
again and cannot fail on the defect C6(b) exists to catch (charter rule 15).

### F5 — C7's trace cell names measurements none of its rows measures *(trace chain)*

*plan_2_repository_reconciliation.md:32; intention §24*

C7 traces to **M1/M2/M6** — allocation correctness, state-boundary correctness, conflict
prevention. Its four rows assert exit codes and status strings of a script runner; none of them
measures allocation, a threshold boundary, or a conflict. The chained *children* serve those
entries, the parent row does not.
Reverse direction: **M2 is claimed by P2 through C7 alone and is served by no P2 row.**
*Routing:* either retrace C7 to the §9.1d process obligation explicitly (recording that the
regression seam is an instrument-integrity row, not a product measurement), or drop M1/M2/M6 from
its cell. Do not leave a trace that reads as coverage it does not provide.

### F6 — master plan §6.4's fixed signature contradicts plan 2 Note 3 *(reality check)*

*master_plan.md:142 (`reconcileGroup(shopId, location, itemCategory)`) vs plan_2:45*

The registry is declared fixed (§6, §9.3); the plan requires a fourth parameter to satisfy C4(b).
See ledger D3. Fix in the registry, not in the plan.

### F7 — master plan §6.2's reduction note names a function that does not handle item bags *(reality check)*

*master_plan.md:122-130*

"Reducing the Prisma `Json` value to that type is the caller's job (P2's repository, on the way
out of `toDomain`)." `toDomain` maps `LocationStock.properties` — canonical **criteria**, whose
values are arrays or `null`. The prescribed reduction ("drop non-string values") applied there
would delete every criterion. The item bag it actually describes is produced by `listEligibleItems`.
An implementer following §6.2 literally corrupts criteria and leaves the item path unreduced;
`resolveBestMatch`'s `Record<string,string> | null` parameter then fails `npm run typecheck`,
which is the only thing that catches it. See ledger D9.
*Secondary, non-blocking:* the same note says "pass `null` for an absent bag" while calling it
"the same reduction `normalizeStoredProperties` performs" — that function returns `{}`, never
`null` (`scan-history.repository.ts:129-154`). The two are behaviourally identical against
`matchesCriteria` (`property-criteria.ts:59-64`), so this is a wording defect, not a behaviour
defect. Recorded, not routed.

### F8 — a Read-first citation with no task or criterion behind it *(reality check)*

*plan_2_repository_reconciliation.md:7*

`normalizeLocation` is prescribed reading; nothing in P2 uses it. §6.6 requires `trim()` +
reject-empty on config write and P2 owns the only write path in existence. See ledger D10.

### Depth-target notes (no finding)

- **`{}` round-trip (§0.21).** The column is `Json` non-nullable and `matchesCriteria`
  (`property-criteria.ts:58-61`) returns `true` for empty criteria **before** its `itemProperties === null`
  check, so a catch-all correctly claims property-less items. The mechanism holds.
- **Defeating the unique index.** The only path is reaching `canonicalCriteriaString` with
  unnormalised values (it sorts keys, not values — `property-criteria.ts:43-52`). Plan Note 1
  states this correctly and task 1 closes it by normalising on every write. No gap found; the
  residual risk is `updateConfig`, which must normalise the incoming criteria before deriving
  the column, and task 1's "on every create/update" covers it.
- **Guarded decrement (§0.15).** The `updateMany` + `gte` form, the no-throw contract, the single
  `logger.error`, and the read-back recompute are all determined. The only undetermined branch is
  D11.
- **C5(b) is an absence row** (charter rule 15). Its instrument is shown capable of observing a
  presence by C2(c), which asserts a real refusal on the same stderr capture in the same script.
  Acceptable as long as both rows live in `verify-stock-reconciliation.ts`; worth one line in the
  implementer prompt.

## 6. Write perimeter

**Exactly one file created, and no file modified:**

- `docs/under_implementation/warehouse_stock/handoffs/reviewer/handoff_plan2_projection_0.md` (this file).

No code, no plan, no intention, no context, no master plan, no tracker was touched. No scratch
file was created inside or outside the repository by this session; one tool-output capture was
written by the harness to its own session directory outside the repo
(`~/.claude/projects/…/tool-results/`) and is not part of any tree.

**Appendix (skeleton): deliberately not included.** The paper skeleton was derived and discarded
per doctrine; the implementer receives none of it.
