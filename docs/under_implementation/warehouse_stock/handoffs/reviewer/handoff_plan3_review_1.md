---
plan: 3
role: review
round: 1
state: CLOSED
verdict: APPROVED
date: 2026-09-02
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P3 review (round 1) — APPROVED

Tree reviewed: **`7b86e53`** (`CHECKPOINT (not approved): implement warehouse stock
configuration API`), isolated from P4's checkpoint `4da4579`. Code at `HEAD` is byte-identical
to the checkpoint — nothing drifted in after the close.

**All 31 criterion rows were re-executed by the reviewer against a running server**, not read.
No blocking finding, no should-fix, no fix cycle. One defect was found and it is **in my own
artifact, not in the code**: the frontend contract's §4.4 worked example was factually wrong.
The implementer flagged it as a candidate upstream note and was right. It is fixed here as
contract **v1.5**.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing is blocked on you. One thing needs routing when convenient — see *What needs the owner*.

## How this phase was verified

A live server on a scratch copy — `sqlite3 prisma/dev.db ".backup"`, port 4405, two minted
tokens (admin `david`, worker `Nazar Harasym`). `prisma/dev.db` was read only; it still holds
**0** `LocationStock` rows and its mtime is unchanged. The scratch copy, the tokens and every
probe script are deleted.

| Instrument | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| purity grep (`domain/`, `item-property-options.ts`) | empty |
| `verify-all.ts` on scratch copy | exit 0 — 58 P1 + 20 P2, `SUMMARY PASS 2 script(s)` |
| perimeter `git diff --name-only 4da4579 7b86e53` | exactly the 11 permitted files |
| P1/P2/P4 frozen files | byte-identical (`domain/`, `scripts/`, `services/`, `scanner/`, `ws/` all empty in the diff) |
| Manual Scenarios 1–7 | executed by implementer, **re-executed by reviewer** |

### Executed criteria — expected vs. observed

**C1 validation (12 rows), over HTTP.** (a) `shape` on Dining Chairs → 400 · (b) unknown value
→ 400 · (c) two thresholds → 400 · (d) `[low, low, normal]` → 400 · (e) `0` → 400 · (f) low≥medium
→ 400 · (g) medium≥normal → 400 · (h) `{wood_type: []}` → 400 · (l) `itemCategory: "unknown"` →
400 · (i) `"TEAK"` → **201**, stored `{"wood_type":["teak"]}` · (k) `{"upholstery": null}` →
**201** · empty batch array → 400. (j) both directions: `PATCH {"properties":{"shape":[…]}}` onto
a Dining Chairs row → 400, **and** the mirror `PATCH {"itemCategory":"Sofas"}` with a stored
`upholstery` key → 400. D2's re-validation is real, not nominal.

**C2 batch.** (a) `ZZ7·{}` + `ZZ6·{}` — two catch-alls in **different** groups → **201, both
written**. This is D3's trap and it is avoided. (b) `ZZ8·{wood_type:["Oak","Teak"]}` +
`ZZ8·{wood_type:["Teak"]}` → **409**, `details` exactly `{"batchIndex":1,"conflictsWithBatchIndex":0}`,
**no `conflictingId`**, and `SELECT COUNT(*) … WHERE location='ZZ8'` = **0**. (c) existing sibling
→ 409 `{"conflictingId":"cmtj80l24…","batchIndex":0}`. Both shapes match contract §3 exactly.

**C3 / C4 / C5 / C7(d) — the reallocation chain, on live inventory.**

| Step | Expected | Observed |
|---|---|---|
| create `LC1 · Dining Chairs · {}` | 221, `high_in_stock`, `david`/`david` | **221, high_in_stock, david/david** |
| create `LC1 · … · {wood_type:["Teak"]}` | teak 107; catch-all 221 → 114 | **teak 107 (david); catch-all 114 (`system:stock-reconciliation`)** |
| PATCH thresholds only → 300/400/500 | qty stays 107, state high→low, sibling untouched | **107, `low_in_stock`, sibling 114 unchanged** |
| PATCH `{"location":"H1"}` | LC1 catch-all → 221; H1 teak 34 | **LC1 221, H1 teak 34** |
| worker creates `H1 · {}` | 46 (80 − 34) | **46, `Nazar Harasym`** |
| DELETE H1 teak | `{ok:true}`, thresholds cascade, catch-all → 80 | **`{ok:true}`, 3 → 0 threshold rows, catch-all 80** |
| DELETE the last H1 config | 200, no throw, other groups untouched | **200, H1 rows 0, LC1 still 221** |
| `ScanHistory` row count across all of it | unchanged | **1107 → 1107** |

C3(a)'s 221 and 107/114 are the live sums, re-derived at review time — not literals.
**C5(d)** is the empty-group path P2's review proved unguarded and routed here; it is now
exercised and it is fine.

**C7(d) is the owner's projection card 1, and it behaves exactly as decided:** the row the
person created or edited keeps their username through the post-commit recount; the sibling the
recount reallocated reads `system:stock-reconciliation`. Both halves observed on the same
request.

**C6.** Summary `[{H1,2},{LC1,1},{QQ1,2},{ZZ6,1},{ZZ7,1},{ZZ9,2}]` — location ascending (D12).
Detail sorted `createdAt` ascending. **The DTO field list is exactly the eleven §6.5 names —
no `shopId`, no `propertiesCanonical`** (D7 holds; the repository object never reaches the wire).
Options returns 28 categories, 8 property keys, correct `categories` arrays, and no `"unknown"`.

**C7(a)(b)(c).** `/api/stock/options` and `/stock/options` both 200. No token → 401
`UNAUTHORIZED` with `requestId`. A `worker`-role token created, read and deleted successfully.
404 on unknown id for both PATCH and DELETE.

### Reviewer planted-defect probe (charter rule 15)

Independent of the implementer's. **Mutation:** collapse the create command's group key from
`JSON.stringify([location, itemCategory])` to a single constant bucket — i.e. remove D3's
group partitioning. **Baseline (shipped):** `PB1·{}` + `PB2·{}` → created 2. **Mutant:** threw
*"Stock configurations conflict within the submitted batch"*. Reverted via `git checkout --`;
tree verified clean. The C2(a) row can fail, so its PASS means something.

**No mutations retained. No repository file modified by this review** — probes were additive
scripts under `scripts/__probe_*.ts`, deleted after use, run against the scratch copy.

## Findings

### B1 — blocking on the CONTRACT, not on P3 — the §4.4 worked example was wrong, and wrong in the expensive direction

**Fixed in this review as contract v1.5.** Recorded as blocking because the frontend is building
error handling against v1.4 right now.

v1.4 §4.4 taught that submitting `LC1 · Dining Chairs · {wood_type:["Teak"]}` together with
`LC1 · Dining Chairs · {}` is an intra-batch conflict returning 409. **It is not.** Executed
against the implemented endpoint: **HTTP 201, both rows created.** `findConflict` requires an
identical key set; `{}` has zero keys and `{wood_type:[…]}` has one, so they never compare.

That pair is not an error case at all — it is the **layering the entire feature exists for**:
a location-wide catch-all plus a narrower carve-out, which is precisely the LC1 221 → 114 + 107
split verified above, and precisely what §1 and §2 of the same document describe. My own §2
stated the rule correctly ("adding/removing a key dimension always avoids conflict"); only the
§4.4 example contradicted it.

**Why it matters more than a typo.** A frontend that pre-validates from the example rejects the
first thing a settings wizard will ever submit, with an error the backend would never raise, and
the user has no way to discover the rule is invented client-side. This is the same failure shape
as the v1.3 `itemCategories` elision: a section advertising itself as exact, teaching something
false, caught by the implementer rather than by us.

**Authority:** intention §23.2; `domain/conflict.ts` `sameKeySet`; executed 2026-09-02.
**Disposition:** contract reissued **v1.5** — the example replaced with a genuine conflict
(`{wood_type:["Oak","Teak"]}` vs `{wood_type:["Teak"]}`, same key set, overlapping values), plus
a block naming what v1.4 got wrong and telling a reader who built on it what to undo. The
correction is inside §4.4 where the error was, per the one-document convention.

### N1 — note — the shop-scoping asymmetry now has a second instance, still all in P2's code

P4's review recorded `applyIncrement(id, delta, tx?)` issuing `update({ where: { id } })` with no
`shopId`. Reviewing this file again for P3, `updateState` (behind `recalculateState`, which P3's
update command calls) does the same: `findUnique({ where: { id } })`, then `update({ where: { id } })`.

**Not exploitable through any current path** — every id reaching either one comes from a
shop-scoped read (`findById(id, shopId)` in the update command, `listByGroup(shopId, …)` in the
hooks). No incorrect behaviour can be demonstrated, so under §11.2 it is not a finding, and
§11.3 non-finding 16 makes pre-existing code outside the phase's criteria advisory at most.
P3 was right not to touch it.

Recorded because it is now a **pattern** rather than an oversight: this repository's read methods
take `shopId` and its two id-addressed mutation helpers do not. Carried to P6 alongside N1 from
P4, as one item, not two.

### N2 — note — the update command owns a transaction boundary through a repository primitive

`update-location-stock.command.ts` calls `locationStockRepository.runInTransaction(tx => …)` and
threads `tx` into `updateConfig`, `replaceThresholds` and `recalculateState`. The architecture
instructions say transaction boundaries belong in services, not controllers or repositories, and
"pass transactional clients into repositories when needed" — which is what this does; commands are
this codebase's write-side service layer, and the `$transaction` call is a repository primitive,
not a repository *decision*. It also extends P2's own `createMany(tx?)` shape. **Not a deviation
in my reading**, recorded only because it is the first place in the module where a command opens
a transaction, and a future reader will want to know it was looked at.

## What I checked that could have been silently wrong, and was not

- **D1's silent failure — thresholds that appear to save and never do.** Proven live: the
  threshold-only PATCH to 300/400/500 moved the row from `high_in_stock` to `low_in_stock` with
  quantity unchanged at 107. Had `thresholds` been dropped on the floor by `updateConfig`'s
  spread, the state would not have moved.
- **Un-normalized criteria reaching the database via PATCH.** The command hands `updateConfig`
  the *raw* body properties while conflict-checking the *normalized* ones — but `updateConfig`
  re-normalizes internally and derives `propertiesCanonical` from that, so the two agree. Verified
  by storage: `"TEAK"` in, `{"wood_type":["teak"]}` stored.
- **Re-normalization idempotency.** A threshold-only PATCH re-runs `validateStockCriteria` over
  the *stored* criteria. If that were not a fixed point, every threshold edit would be
  misclassified as an allocation change. Probed directly: stable.
- **Batch atomicity under a real 409** — zero rows at `ZZ8` after the intra-batch rejection.
- **Threshold cascade on delete** — 3 rows → 0, by `onDelete: Cascade` on the relation.
- **Items are never written by configuration work** — `ScanHistory` count identical across the
  whole chain.

## Write perimeter of this review

- `handoffs/reviewer/handoff_plan3_review_1.md` (this file)
- `contracts/frontend-api-contract.md` (**v1.5** — B1's correction)
- `plans/plan_3_configuration_api.md` (Review log entry)
- `master_plan.md` (tracker row, sources-of-truth version, standing instruction 9)

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| B1 | §4.4 worked example wrong | **fixed here — contract v1.5**; owner routes the file to `main` | no (P3), yes (frontend) |
| N1 | `applyIncrement` + `updateState` unscoped by `shopId` | P6 maintenance sweep, one item | no |
| N2 | command-owned transaction boundary | recorded only | no |
| — | P2/P4 threshold-throw doctrine collision | still unrouted — P6 or an intention amendment | no |

## Lessons for the plans

1. **A worked example in a contract is a specification, and it was never linted as one.** The
   plan-lint properties check that references resolve, counts derive and rows are addressable.
   Nothing checked that an *illustration* agrees with the rule it illustrates — and §2 and §4.4 of
   the same document said opposite things for a full version cycle. Both contract defects so far
   (v1.3's elision, v1.5's example) were in prose that no property covers, and both were caught by
   a reader downstream rather than by us. Master plan §9 gains a ninth standing instruction.
2. **The implementer's "candidate upstream note" section paid for itself.** It reported a
   contradiction between the contract and the intention, followed the ratified authority, made no
   silent deviation, and left the reconciliation to the coordinator. That is exactly the behaviour
   the prompt asked for, and it is the only reason this was caught before the frontend built on it.
