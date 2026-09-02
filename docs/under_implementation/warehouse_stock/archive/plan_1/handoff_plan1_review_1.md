---
plan: 1
role: review
round: 1
state: IMPLEMENTED
verdict: APPROVED
date: 2026-09-01
actor: Claude Opus 5 (1M context) — plan-reviewer doctrine, single-reviewer flow (intention §25)
---

# P1 review (round 1) — APPROVED

Tree reviewed: `afed53a` (`CHECKPOINT (not approved): implement P1 schema and stock domain`),
working tree carrying only the two expected coordination documents.

**Verdict: APPROVED.** No blocking finding stands under master plan §11.2. Every criterion
row re-derived against the code holds; all four instruments pass on my own run; the write
perimeter is exact. Two **should-fix** findings and four notes follow — all of them about the
*instrument*, none about the production code, which I found correct at every row I checked
including several the plan does not name.

## ⚠ OWNER DECISIONS REQUIRED (1)

**Question:** Spend one short fix cycle on P1 to close two proven blind spots in the verify
script, or carry them forward?

**Story:** This script is the only automated check this project will ever have for the stock
rules, and every later phase's regression safety is built on it. I broke two behaviours on
purpose — the rule that stops two overlapping configurations coexisting, and the rule that
stops junk property text matching a wildcard — and the script reported 58 of 58 passing both
times. The code is right today; nothing would tell you if it stopped being right.

**Branches:** *Fix now* — two test cases and two criterion rows, no production code change,
roughly one short Codex session. *Carry forward* — P2 inherits them and they compete with P2's
own work. *Accept* — the blind spots stay for the life of the project.

**Recommendation:** Fix now. It is the cheapest this will ever be, and it hardens the base
five later phases regress against.

**On silence:** the phase stays APPROVED as recorded; the findings sit in the carry-forward
table and P2's prompt inherits them.

**Trace:** S1, S2 below · plan 1 C8, Notes D4 · intention §23.2 · master plan §9.1(d).

## What I verified correct

Recorded specifically, so the next re-review is cheap and settled ground is not re-walked.

- **C1 (a)–(e) at source.** `schema.prisma` matches master plan §6.1 field for field, including
  both `Shop` back-relations, the four-column unique on `propertiesCanonical`, the
  `[locationStockId, state]` unique, and all three `onDelete: Cascade` relations. The migration
  contains two `CREATE TABLE`s, four indexes and three FKs, and **touches no existing table** —
  `grep -icE 'DROP TABLE|ALTER TABLE|ScanHistory|RedefineTables'` returns 0, confirming context
  §12.3's `RedefineTables` hazard does not apply. `prisma migrate status` → 34 migrations,
  "Database schema is up to date!".
- **The options map against the owner's authority, not against the script.** I dumped
  `ITEM_PROPERTY_OPTIONS` at runtime and compared it to the FINAL table in
  `property-options-selection.md` by hand: all 8 keys, every value, in order, and both category
  groups (tables = 6 entries, chairs = 3) are exact. `Writing Desks` is correctly excluded from
  the table group. The accessor returns the right sets for `Sofas`, `Dining Tables`,
  `Dining Chairs`, `Easy Chairs`, `Nest Of Tables` and `Writing Desks`.
- **Domain logic re-derived by reading, not by trusting the script.** `tokenizePropertyValue`
  splits exactly `,` `/` `&` and never `-`; `normalizeCriteria` sorts keys, unifies scalar to
  array, lowercases/trims/dedupes/sorts values, preserves `null`, and throws on
  empty-after-normalization for both the `[]` and `["  "]` shapes; `matchesCriteria` returns
  true for `{}` before consulting the item, false for a null bag against non-empty criteria,
  and requires key presence for a wildcard; `candidateOutranks` compares weight desc, valued
  keys desc, accepted values **asc**, then `createdAt` asc, then `id` asc — §0.13's order
  exactly; `validateThresholds` rejects wrong length, non-configurable states, duplicates,
  non-positive and non-integer quantities, and both ordering violations;
  `calculateStockState`'s five bands reproduce intention §3.
- **Behaviours no criterion row names, exercised directly and found correct:** the multi-key
  conjunction in `findConflict` (intersecting on one key but not the other correctly yields no
  conflict; intersecting on both yields a conflict); the empty-token-set case in
  `matchesCriteria` (`"  ,  "` and `""` both fail a wildcard, per D4);
  `resolveBestMatch([], …)` → `null`.
- **Instruments, run on the handed-over tree:** `npm run typecheck` exit 0 · purity grep empty
  · `npx tsx scripts/verify-stock-domain.ts` → **58 PASS, 0 FAIL, exit 0**, matching the plan's
  derived expectation of 58 exactly · `git diff --name-only 7b127ab afed53a` = precisely the
  plan's eight-file perimeter, nothing outside it.
- **No orphan cases.** Every one of the 58 script cases carries a criterion-row id; none traces
  to nothing (charter rule 16).
- **Task 0 baseline is real.** With the modules absent the script reports 58 FAIL / exit 1, so
  the harness fails honestly rather than skipping.

## Findings

### S1 — should-fix — C8 never exercises §23.2's conjunction over keys

**Authority:** intention §23.2 — a conflict requires the criteria sets to intersect *"on
**every** key"*. Plan 1 C8, trace `M6, §23.2`.

C8(a)–(h) contain **no pair with the same key set and more than one key**. Every conflict row
is single-key or empty, so the conjunction — the operative word in the rule — is never tested.

**Proven, not asserted.** I changed `findConflict`'s `Object.keys(candidate).every(…)` to
`Object.keys(candidate).slice(0, 1).every(…)`, which breaks the multi-key rule while preserving
the empty-key-set vacuous-truth case that C8(g) guards. Result: **58 PASS, 0 FAIL, exit 0.**
The mutation was reverted and the file checksum verified identical.

**Why it matters beyond P1:** P3's batch create checks every submitted configuration against
its siblings *and* against the rest of the batch, and multi-key criteria are the normal case
once a user combines `wood_type` with `shape`. A regression here admits two overlapping
configurations, which is exactly the ambiguous allocation §6 and §23.2 exist to prevent.

**Correction:** add to C8 — `(i) {wood:["Teak"], up:["Up"]}` vs `{wood:["Teak"], up:["Down"]}`
→ **NO** conflict (same key set, intersects on `wood`, disjoint on `up`); `(j)` the same pair
with `up:["Up","Down"]` on the sibling → **conflict** (intersects on both). Add the matching
cases to the verify script.

### S2 — should-fix — delegation D4's guard is unguarded

**Authority:** plan 1 Notes, delegation D4 (an item property present but tokenizing to the
empty set is treated as key-absent). Related: context §0.8.

`matchesCriteria` implements D4 correctly with an `itemTokens.size === 0` early return. No
criterion row covers it.

**Proven:** deleting that guard leaves **58 PASS, 0 FAIL, exit 0**. Reverted, checksum verified.

**Why it matters:** without the guard, an item whose stored value is `""` or `" , "` — a
plausible shape given the free-text metafield sources described in context §7 — starts
satisfying every wildcard criterion on that key. It would be allocated to a narrower
configuration than it belongs in, silently, with no error anywhere.

**Correction:** add a C4 row — `(g)` an item whose value for a key tokenizes to the empty set
does **not** satisfy a wildcard on that key — plus the matching verify case. The delegation
itself was exercised correctly; only its guard is unwatched.

### N1 — note — C9 checks the options map against a hand-copy in the same file

`expectedOptions` (script lines 78–124) is a literal duplicate of `ITEM_PROPERTY_OPTIONS`,
transcribed by the same actor from the same source in the same sitting. C9(a)/(b) compare the
map to that copy.

This is charter rule 15's first named failure shape — *a snapshot test that wrote the baseline
it then asserts against*. It catches later **divergence** (probe 8 proves that), but it cannot
catch an **original** mistranscription, which is the failure C9 was added to prevent: context
§0.4 calls the map the validation whitelist that eliminates "config matches zero items
forever".

**No defect today** — I verified the transcription independently against
`property-options-selection.md` and it is exact. Recorded because P2's and P5's verify scripts
will copy this pattern, and because the criterion's own wording ("matches that table exactly")
names an authority the instrument does not actually read.

### N2 — note, forward hazard for P3 — display casing versus canonical casing

The map holds display casing (`"Teak"`, `"Up"`, `"Inside Extension"`). `normalizeCriteria`
lowercases every criterion value. So a P3 whitelist check written as
`option.values.includes(criterionValue)` against **normalized** criteria rejects every legal
value, and written against **raw** input accepts `"TEAK"` and `"teak"` inconsistently.

Context §0.5 already settles the semantics — *"the map holds the canonical casing for display,
comparison lowercases both sides"* — but P3's C1(b) ("unknown value for a known key → 400")
does not say so, and its plan does not cite §0.5. Route this into P3's plan before it is
dispatched.

### N3 — note, forward hazard for P2 and P5 — `canonicalCriteriaString` does not enforce its precondition

Given non-normalized criteria it happily emits a non-canonical string:
`canonicalCriteriaString({wood:["teak","oak"]})` → `{"wood":["teak","oak"]}`, whereas the
normalized form yields `{"wood":["oak","teak"]}`. It sorts keys but not values, because it
assumes its input already came through `normalizeCriteria` (as plan 1's Notes state).

That assumption is load-bearing well beyond P1: P2 writes `propertiesCanonical` from this
function and the four-column unique index depends on it, and P5's `mergeKey` (intention §26.2)
is built on that stored column. A caller that skips normalization silently produces a row
identity that neither dedupes nor merges correctly. P2's plan already requires `toDomain` to
map through `normalizeCriteria` defensively — this note is to make sure that requirement is
read as load-bearing rather than belt-and-braces.

### N4 — note — C7(a) exercises only the length guard, and one branch is unreachable

C7(a) builds its "missing state" fixtures by *removing* a state, so each of its three
iterations arrives with two thresholds and trips the `thresholds.length !== 3` check before any
per-state logic runs. The row's expected outcome (hard-fail) is met, so this is not a defect.

Relatedly, `validateThresholds`' `low === undefined || medium === undefined || normal ===
undefined` check (stock-state.ts:50-52) is **unreachable**: after the length, configurable-state
and duplicate checks pass, three distinct configurable states are present by pigeonhole. Harmless
defensive code. Recorded so a later reader does not mistake either for coverage that exists.

## Mutation-probe declaration

Two probes, both applied and reverted, both checksum-verified byte-identical afterwards:

| Probe | File | Mutation | Observed |
|---|---|---|---|
| R1 | `src/modules/stock/domain/conflict.ts` | `Object.keys(candidate).every(` → `Object.keys(candidate).slice(0, 1).every(` | 58 PASS / 0 FAIL / exit 0 — **no bite** (S1) |
| R2 | `src/modules/stock/domain/property-criteria.ts` | removed the `itemTokens.size === 0` early return | 58 PASS / 0 FAIL / exit 0 — **no bite** (S2) |

Checksums before and after are identical:
`26c5c3b3…` (`conflict.ts`), `921e540c…` (`property-criteria.ts`).

**Database and state side effects: none.** I ran no migration, seeded nothing, and wrote
nothing to `prisma/dev.db`; `prisma migrate status` was read-only. My only scratch file lives
outside the repository, in this session's scratchpad.

**I did not re-run the implementer's eight declared probes.** Their evidence is tree-bound to
`afed53a`, which is the tree I reviewed, so it is consumed by citation per the charter's
test-evidence section; re-running identical commands would be over-evidence and a finding
against this round. My budget went to variation instead — the two mutation shapes above and the
four uncovered behaviours exercised directly — which is where both should-fix findings came from.

## Write perimeter of this review

- `docs/under_implementation/warehouse_stock/handoffs/reviewer/handoff_plan1_review_1.md` (this file, created)
- `docs/under_implementation/warehouse_stock/plans/plan_1_schema_domain.md` (Review log entry appended)
- `docs/under_implementation/warehouse_stock/master_plan.md` (tracker row P1 → APPROVED)

No source file, migration, or database was modified. The two probe files above are byte-identical
to `afed53a`.

## Carry-forward dispositions

| # | Item | Destination | Blocks? |
|---|---|---|---|
| S1 | C8's missing multi-key conjunction rows | P1 fix cycle if the owner authorizes it; otherwise P2's prompt as an inherited hazard | no |
| S2 | D4's unguarded empty-token-set behaviour | same as S1 | no |
| N1 | self-referential fixture pattern in verify scripts | P2 and P5 plans — their scripts must not repeat it | no |
| N2 | display-vs-canonical casing in whitelist validation | **P3 plan** — fold before P3 dispatches | no, but must land first |
| N3 | `canonicalCriteriaString` precondition is load-bearing | **P2 plan** — `toDomain` normalization is not optional | no, but must land first |
| N4 | C7(a) length-guard shadowing; unreachable branch | none — recorded only | no |

## Lessons for the plans

1. **A criteria table transcribed from a contract's *consequence list* inherits that list's
   coverage, not the rule's.** §23.2's worked consequences happen to be single-key, so C8
   enumerated eight rows and still missed the conjunction. When a rule quantifies over a
   collection ("on every key"), the criteria must include a case where the collection has more
   than one member and they disagree. This generalizes to P2's group reconciliation and P5's
   compaction, both of which quantify similarly.
2. **A granted delegation still needs a guard.** D1–D5 were granted so the implementer could
   choose freely; that is right. But D4's choice became *behaviour*, and behaviour with no row
   is behaviour nothing watches. Future delegation lists should say which delegations are
   free-choice-and-forget and which produce an observable that needs a criterion row.
3. **A verify script's expected values must come from somewhere the script did not write.**
   N1's pattern will recur in every phase; the plans should require the expectation to be read
   from the authority document, or at minimum require the reviewer to diff the fixture against
   that document by hand, as was done here.
