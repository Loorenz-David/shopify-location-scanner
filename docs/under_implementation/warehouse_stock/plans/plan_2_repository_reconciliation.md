# P2 — Stock Repository + Reconciliation Service

## Goal
Implement `locationStockRepository` (all Prisma access for the two tables, including the §0.15 guarded decrement) and the group reconciliation service with the §23.6 double-pass. **Not in this phase:** HTTP endpoints, commands, item-flow hooks, `applyItemStockChange`.

## Read first
Master plan §5, §6.2, §6.4, §6.6, §9, §10 · intention §8–§9, §23.6, §24 · context §0.6, §0.15, §0.16, §0.17, §0.21 (persistence requirement), §3.3, §3.6, §12.4 · `.github/instructions/backend-contracts.instructions.md` · `src/modules/zones/repositories/zone.repository.ts` (repository idiom) · `src/modules/scanner/repositories/scan-history.repository.ts:79-82` (`normalizeLocation` — read only, as the **shape** to mirror; see the Notes on which layer normalises) · P1's domain modules.

## Dependencies (gate)
P1 APPROVED.

## Files expected to change
New `src/modules/stock/contracts/stock.contract.ts` (**types only in P2** — the repository's domain type and the `operation` closed set from §6.6; P3 adds the zod schemas to this same file. Permitted here per P2 projection D8: `toDomain` must return a named type and `context.operation` needs one, and neither has a home otherwise) · new `src/modules/stock/repositories/location-stock.repository.ts` · new `src/modules/stock/services/stock-reconciliation.service.ts` · new `scripts/verify-stock-reconciliation.ts` (committed manual instrument; operates only on a **copy** of dev.db via `DATABASE_URL` override) · new `scripts/verify-all.ts` (the §9.1d regression seam).

## Tasks (ordered)
1. Repository: `createMany` (tx-aware), `updateConfig`, `deleteById`, `listByGroup(shopId, location, itemCategory)`, `listByShop`, `findById`,
   **Thresholds (P2 projection D1 — the Goal says "all Prisma access for the two tables" and the first draft named no method touching `StockThresholdsLocation`):** (a) `createMany` writes each config's three threshold rows **in the same transaction as the config**, so a config never exists without them; (b) `findById`, `listByGroup` and `listByShop` all return each config **with its thresholds included** — every caller that computes a state needs them, and a second round-trip per config during reconciliation is the shape to avoid; (c) **threshold replacement is P3's**, not P2's — P2 writes them only at create. `deleteById` relies on the schema cascade.
   Then: `applyGuardedDecrement(id, shopId, delta, context)` (§0.15 `updateMany` + `gte`; `context` carries the caller-known diagnostic fields per master plan §6.2 — the repository owns `locationStockId`/`location`/`requestedDecrement`/`currentQuantity`, the caller owns the item and operation identifiers), `applyIncrement`, `writeAbsolute(id, quantity, stockState, updatedByUsername, tx)`, `recalculateState(id)` (read-back + shared `calculateStockState`). `toDomain` maps `properties` through `normalizeCriteria` defensively and **round-trips `{}` as `{}`** — never `Prisma.JsonNull`, never `toPropertiesUpdateValue` (master plan §9.4). `propertiesCanonical` is written by the repository from `canonicalCriteriaString` on every create/update.
2. Eligible-items read: `listEligibleItems(shopId, location, itemCategory)` → `prisma.scanHistory.findMany({ where: { shopId, latestLocation: location, itemCategory, isSold: false } })` projected to `{ id, productId, quantity, properties }`. Lives in the stock repository (read-only touch of another module's table is the `stats` precedent; do NOT edit scanner files).
3. `reconcileGroup(shopId, location, itemCategory, hooks?)` — **malformed-threshold behaviour (P2 projection D2, binding):** `calculateStockState` calls `validateThresholds` and **throws** when a config's thresholds are not exactly the three configurable states (`stock-state.ts:65`, `:27-29`). Because P2 task 1(a) makes a config-without-thresholds unreachable through the repository, this can only arise from direct database editing — so **let it propagate**. Do not swallow it, do not skip the config, do not substitute `out_of_stock`: a group containing a malformed config is a data-integrity fault, and failing loudly in the one place that reads every config in the group is better than silently reporting a wrong total. This is a deliberate choice against the alternatives, recorded so a reviewer does not read it as an oversight. Pass 1 per §0.17 (configs + eligible items, `resolveBestMatch` per item, tally by **item quantity**, one transaction writing every config's absolute quantity + recomputed state; **write only the configs whose `(quantity, stockState)` pair actually changed, and stamp `updatedByUsername = "system:stock-reconciliation"` on those rows only** — owner decision 2026-09-01 (projection card 1). A recount that stamps every config in the group destroys the "last edited by" audit trail on rows nobody touched: adding one definition would re-attribute all its siblings to the system, and six months later the question "who last changed this?" has no answer. Unchanged rows are not written at all, which also resolves D13 (pass 2 writes only differing rows); pass 2 per §23.6 (fresh recompute post-commit; write again only on difference; `logger.warn` with group + per-config delta when it differs; exactly two passes). **"Differs" means the `(quantity, stockState)` pair differs for a given config id (P2 projection D12);** a config id present in pass 2 but not pass 1 — created concurrently — counts as a difference, and one present in pass 1 but not pass 2 is dropped without a write. Returns pass-2 values keyed by config id.
4. `reconcileAllGroups(shopId, hooks?)` — distinct groups from `listByShop`, sequential `reconcileGroup` calls, invoking `hooks.onGroupReconciled` once per group.
   **Empty group (coordinator amendment, 2026-09-01 — this case reached the implementer through neither the lint nor the projection):** `reconcileGroup` on a `(shopId, location, itemCategory)` with **zero configurations** returns an empty result immediately — it does **not** query eligible items, does **not** open a transaction, and does **not** run pass 2 or log a drift warning. `reconcileAllGroups` cannot reach this state (its groups come from existing configs), but **P3's delete command can and will**: context §0.17 reconciles the deleted config's group *after* the row is removed, so deleting the last config in a group calls this path on the first delete. Without this rule an empty transaction and a spurious pass-2 comparison are both plausible readings.
5. `scripts/verify-stock-reconciliation.ts` — seeds a scratch copy of dev.db (`SHOP_ID` env) with temporary configs across the C3/C4 rows below, runs reconciliation, prints PASS/FAIL per row, exits non-zero on FAIL. **It must refuse to run against the configured development database, and the predicate is exact (P2 projection D6 — the one gap here with a destructive failure mode; `prisma/dev.db` is 290 MB of real data):** resolve `process.env.DATABASE_URL` to an absolute filesystem path, resolve `apps/backend/prisma/dev.db` to an absolute path, and **refuse when they are equal**. Refuse **also when `DATABASE_URL` is unset or empty** — Prisma then falls back to `.env`, which points at exactly that file, so an unset variable is the most dangerous case and not the safest. Substring matching is not sufficient. Refusal exits **3** (see task 6) with a message naming both paths.
6. `scripts/verify-all.ts` (master plan §9.1d) — discovers every `scripts/verify-*.ts` except itself, runs each as a child process passing the environment through, and prints one status line per script plus a summary. Status vocabulary is exactly `PASS` · `FAIL` · `REFUSED` (child exited on its own dev.db guard) · `MISSING` (a script named in `verify-all.ts`'s own `EXPECTED_SCRIPTS` constant is absent from disk). **`EXPECTED_SCRIPTS` at P2 is exactly `["verify-stock-domain.ts", "verify-stock-reconciliation.ts"]`** — master plan §6.4's table is the *eventual* set and lists a P5 script that does not exist yet, so keying `MISSING` to the table would make this instrument exit non-zero at every close before P5 and no phase could close green. The phase that authors a new verify script extends the constant in the same commit. **Exit codes are reserved (P2 projection D5), because the child's exit code is the verdict and refusal must not read as failure:** a `verify-*.ts` exits **0** = PASS, **1** = FAIL, **3** = REFUSED (its own dev.db guard fired). `verify-stock-reconciliation.ts` (task 5) must exit 3, not 1, when it refuses. `verify-all.ts` maps those codes to its status words without parsing any child's stdout. **Any non-zero child makes the run non-zero — whether or not it is in `EXPECTED_SCRIPTS` (P2 projection D7)**, so a script discovered on disk but not yet listed can never fail silently. Additionally, **exit 0 requires every script in `EXPECTED_SCRIPTS` to be present, to have run, and to have passed** — `REFUSED` and `MISSING` are non-zero, because a script that did not run must never read as green. Do not parse child stdout for correctness; the child's exit code is the verdict, and its output is echoed verbatim under its heading.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Persistence round-trip: (a) config created with `{}` reads back `properties = {}` (not null); (b) `propertiesCanonical` equals `canonicalCriteriaString(properties)` after every create and update; (c) a second create with an identical `(shopId, location, itemCategory, propertiesCanonical)` rejects with **Prisma error code `P2002`** propagated unmapped out of the repository (P2 projection D16/F2 — the row previously said only "rejects", which any throw satisfies). Mapping it to `ConflictError` is **P3's** job, where the §23.2 domain conflict check runs first and supplies `conflictingId`; the index is P2's last-resort backstop, not its error surface | M6/M8, §0.21/§23.1 |
| C2 | Guarded decrement — **all rows use fixture thresholds low 1 / medium 3 / normal 5** so every expected state is exact (P2 projection F3): (a) quantity 5, delta 3 → quantity **2** and `stockState` **`medium_in_stock`**; (b) quantity 2, delta 3 → refused, quantity stays 2, no exception thrown to caller; (c) refusal emits **one** `logger.error` whose context contains exactly: `locationStockId`, `location`, `shopId`, `requestedDecrement`, `currentQuantity` (read back after the refusal), plus every field the caller supplied in `context` — asserted by passing a `context` of `{ productId, itemCategory, operation: "reconciliation" }` and requiring all eight keys present with those exact values. **`logger.error` writes to stderr** (`shared/logging/logger.ts:12-13`) while `warn`/`info` write to stdout, so the script must capture **both** streams or this row silently observes nothing; (d) increment path has no guard: quantity 2, increment 4 → quantity **6** and `stockState` **`high_in_stock`** | M4, §0.15 |
| C3 | reconcileGroup pass 1: (a) only unsold items at exact location+category are loaded; (b) each item allocated to its `resolveBestMatch` winner only; (c) quantities tally item `quantity`, not row count (seed one qty-4 row); (d) all configs in the group written in one transaction — a config matching zero items gets quantity 0 / out_of_stock; (e) an item matching no config contributes nowhere and causes no error | M1/M5/M8, §0.17 |
| C4 | Double-pass: (a) with no interleaved write, pass 2 computes identical values and performs no second write; (b) with a simulated interleaved item write between passes (script mutates between pass boundaries via injected callback), pass 2 writes corrected values and logs `logger.warn` naming group + delta; (c) exactly two passes — no loop; (d) return value reflects pass 2 | M5, §23.6 |
| C5 | Reconciliation writes are absolute: (a) seed a drifted quantity (manually set 99), reconcile → the recounted value is restored, and (b) no guard refusal is logged during it (absolute writes bypass §0.15 by contract) | M5, §0.15/§0.17 |
| C6 | `reconcileAllGroups`: (a) every distinct `(location, itemCategory)` group for the shop is reconciled; (b) each exactly once — seed two groups, one holding two configs, pass a counting `hooks.onGroupReconciled` and assert it fires **exactly 2 times** with the two distinct groups (P2 projection D4/F4: reconciling a group twice is idempotent, so 2 calls and 3 calls leave byte-identical data — without the hook this row cannot fail on the per-config-loop defect it exists to catch) | M5, §0.17 |
| C7 | `verify-all.ts` — **an instrument-integrity criterion, not a product measurement (P2 projection F5).** Its rows assert exit codes and status words; they measure no allocation, boundary or conflict. The scripts it chains serve M1/M2/M6; this row serves only §9.1d, and its trace says so rather than borrowing coverage from its children. (§9.1d): (a) with both verify scripts passing on a scratch copy, it exits 0 and prints one PASS line per script; (b) when any child script exits non-zero it prints FAIL for that script and exits non-zero; (c) run against the configured dev.db (no scratch override) it prints REFUSED for the reconciliation script and exits non-zero — an unrun script never reads as green; (d) a script listed in `EXPECTED_SCRIPTS` but absent from disk prints MISSING and exits non-zero | §9.1d (instrument integrity — no `M` id by design) |

Phase-close instruments: typecheck green; purity grep empty (domain untouched or still pure); **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (this is the §9.1d seam's first run — it must chain P1's `verify-stock-domain.ts` as well as this phase's script), output + the copy's path in Review log; `git diff` perimeter = the **five** files above (+ no scanner/shopify files, and no edit to P1's frozen `domain/` or `verify-stock-domain.ts`).

## Manual scenarios
Covered by `scripts/verify-stock-reconciliation.ts` (this phase's behavior is not reachable from the UI yet). Reviewer re-runs `verify-all.ts` on a fresh scratch copy and plants **two** defects, reverting each:

**C7(c) and C7(d) are discharged here, not by any verify script (P2 projection F1)** — §6.4 scopes `verify-stock-reconciliation.ts` to C1–C6, and C7(d) needs a script to be absent from disk, which no script can arrange for itself:

- **C7(c) REFUSED:** run `npx tsx scripts/verify-all.ts` with `DATABASE_URL` unset → the reconciliation child exits 3, `verify-all` prints REFUSED for it and exits non-zero. Record the output.
- **C7(d) MISSING:** temporarily rename `scripts/verify-stock-reconciliation.ts` → `.bak`, run `verify-all`, observe MISSING for it and a non-zero exit, **restore the name**. Rename **this phase's own script, never P1's frozen `verify-stock-domain.ts`** — P1 is APPROVED and outside this phase's perimeter.

Then the two planted defects, reverting each:

1. Temporarily tally row count instead of item quantity → C3(c) must FAIL, and `verify-all.ts` must exit non-zero (proves the reconciliation instrument bites and that the seam propagates a child failure).
2. Temporarily break a P1 domain rule the *reconciliation* script never touches (e.g. make `-` a separator in `tokenizePropertyValue`) → `verify-stock-domain.ts` must FAIL **through `verify-all.ts`**. This is the seam's own reason to exist: it proves a P1 regression is caught at a later phase's close rather than surviving to P6.

## Notes
- **Granted delegations (P2 projection D11, D14, D15) — the implementer's call, on purpose, and not review findings:** (D11) when `applyGuardedDecrement`'s `updateMany` returns `count === 0` because the row does not exist or belongs to another shop — indistinguishable from a genuine shortfall — emit the same single `logger.error` with the fields available and `currentQuantity: null`; (D14) **`listGroupSummaries` is cut from task 1** — it had no P2 caller, no criterion row, and §6.4 assigns the location-summary read to a later phase's query file, so it is P3's to write where its consumer lives; (D15) with `SHOP_ID` unset the verify script fails fast with a message naming the variable rather than guessing the single shop.
- **Which layer normalises `location` (P2 projection D10/F8).** §6.6 requires `trim()` + reject-empty on config write. **That belongs to P3's contract layer**, not to this repository — the architecture contract forbids repositories implementing domain decisions, and P3 already validates every other field of the same payload. P2's repository stores what it is given. `normalizeLocation` stays in Read-first as the **shape** to mirror (`trim`, empty → reject), not as code to call; the citation is now labelled that way so it is not a reference bound to nothing.
- **`toDomain`'s `normalizeCriteria` pass is load-bearing, not defensive (P1 review N3).** `canonicalCriteriaString` sorts *keys* but not *values*, and assumes its input already came through `normalizeCriteria` — given `{wood:["teak","oak"]}` it emits `{"wood":["teak","oak"]}`, where the canonical form is `{"wood":["oak","teak"]}`. `propertiesCanonical` is written from it and the four-column unique index depends on it, and P5's `mergeKey` (intention §26.2) is built on that stored column. A path that reaches `canonicalCriteriaString` without normalizing first silently produces a row identity that neither dedupes nor merges correctly. Normalize on every write path, not just the obvious one.
- `$transaction` default timeout is fine at this data size (context §0.6).
- The injected between-pass callback for C4(b) is a test seam on the service (optional param, default no-op) — document it in a block comment; it is the §23.6 instrument, not scaffolding (it has a required caller: the verify script).
- **Log capture crosses two streams (P2 lint L5).** `logger.error` goes to **stderr**, `logger.warn`/`info` to **stdout** (`shared/logging/logger.ts:10-18`). C2(c) asserts on an error and C4(b) on a warning, so a script that captures only one stream will find nothing for the other row — and a row that asserts "no exception was thrown" instead of "the log was emitted" passes vacuously. Capture both, and assert on the parsed JSON context object, not on substring matches of the line.
- Repository methods accept an optional `tx` (Prisma transaction client) per the architecture contract.

## Review log
(append-only)

### 2026-09-01 — projection round 0 · AMENDMENTS_REQUIRED · consumed by coordinator

Handoff: `handoffs/reviewer/handoff_plan2_projection_0.md` (fresh Opus session, master plan §3).
16 ledger rows, 8 findings, 1 owner card. **All folded**; the plan grew from 4 to 5 perimeter
files and kept 7 criteria / 24 rows.

**Owner card 1 — answered 2026-09-01: stamp only rows that actually changed.** A recount now
writes, and re-attributes, only configs whose `(quantity, stockState)` pair moved. Stamping
every config in the group would have re-attributed untouched siblings to
`system:stock-reconciliation` on every neighbouring edit, destroying the audit trail the
`updatedByUsername` column exists for. Also resolves D13.

**Two findings landed on the master plan, both against notes this coordinator wrote:**

| # | What was wrong | Fix |
|---|---|---|
| D9/F7 | §6.2 put the item-property reduction "on the way out of `toDomain`" — but `toDomain` maps *criteria*, whose values are arrays. "Drop non-string values" there **deletes every criterion**, while the item path stays unreduced. Two shapes share the word "properties". | §6.2 now names `listEligibleItems`, with the correction and its consequence recorded |
| D3/F6 | §6.4 fixed `reconcileGroup(shopId, location, itemCategory)` while this plan required a fourth callback parameter for C4(b) — the registry is declared fixed, so the implementer was told two incompatible things | §6.4 registers `hooks?` on both service functions, **awaited**, and states they are instruments with required callers |

**Plan-level folds:** D1 thresholds (created in the config's transaction; returned with every
read; replacement deferred to P3) · D2 malformed thresholds **propagate**, deliberately, since
task 1(a) makes them unreachable through the repository · D5 reserved exit codes (0 PASS /
1 FAIL / **3 REFUSED**) so refusal cannot read as failure · D6 the exact refusal predicate,
**including the unset-`DATABASE_URL` case**, which is the most dangerous one and was the only
gap with a destructive failure mode against a 290 MB real database · D7 any non-zero child
fails the run, listed or not · D8 a types-only `contracts/stock.contract.ts` enters the
perimeter, since `toDomain`'s return type and the `operation` closed set had no home and a
fifth file would otherwise be an automatic perimeter finding · D12 "differs" is the
`(quantity, stockState)` pair per config id · D16/F2 C1(c) now names `P2002` propagated
unmapped, with mapping deferred to P3.

**Decidability folds:** F1 C7(c)/(d) now have declared Manual Scenario probes — REFUSED via an
unset `DATABASE_URL`, MISSING via a declared rename-and-restore of **this phase's own** script,
never P1's frozen one · F3 C2 rows now carry fixture thresholds (1/3/5) and name their exact
expected state, replacing "state recalculated", which `state !== undefined` satisfied · F4 C6(b)
counts `hooks.onGroupReconciled` firings, because reconciling twice is idempotent and the two
worlds are otherwise byte-identical · F5 C7's trace no longer claims M1/M2/M6; it is an
instrument-integrity row serving §9.1d alone. **Note this retired a defect this coordinator
introduced at the P2 lint**: the L2 fix gave C7 those ledger ids, which made P2 appear to serve
M2 while no row measured a threshold boundary.

**Granted delegations (D11, D14, D15) recorded in Notes** so the freedom is given, not taken.
D14 cut `listGroupSummaries` — no caller, no row, and §6.4 assigns that read to a later phase.
D10/F8 resolved: `location` normalisation is **P3's contract layer**, not this repository, per
the architecture contract's rule that repositories implement no domain decisions.

**Coordinator amendment the projection did not find.** `reconcileGroup` on a group with **zero
configurations** was undefined. Not hypothetical: context §0.17 reconciles a deleted config's
group *after* the row is gone, so P3's first delete of a last-config-in-group hits it. Now
specified — return empty, no item query, no transaction, no pass 2, no drift warning.

**Seal scored, then deleted.** Two probes were sealed before dispatch. **Probe A surfaced**
(`recalculateState`'s thresholds — as D1 and D2, more thoroughly than the seal framed it).
**Probe B did not** (the empty-group case above). Per the seal's own rule, one of two is normal:
fold both, no doctrine change. The projection gate stays mandatory for P4 as master plan §3
already provides.

