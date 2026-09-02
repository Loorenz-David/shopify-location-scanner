---
plan: 5
role: implementer
round: 2
date: 2026-09-02
---

# Session prompt — P5 implement (round 2)

## Your role

**Phase 5 round 1 is APPROVED and shipped.** This round adds one thing to it: the report entry
gains the definition's three **thresholds** and a derived **`unitsToNormalThreshold`**, so the
restock screen can say how many pieces to bring.

This is an **additive amendment to approved code**, not a fix cycle. Round 1's review found no
defect. Nothing that exists is wrong; two fields are missing.

**Load your doctrine first.** Plain markdown; read both in full and follow them as doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Doctrine beats this prompt. **The plan file beats this prompt** — `plans/plan_5_report.md`.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
```

If a path lacks `-warehouse-stock-backend`, you are in the wrong tree. No sibling session is
running; the tree is yours and `git status` is clean.

## Gate check — before reading anything else

Stop and report if any line fails.

1. `intention/raw_intention.md` line 3 reads exactly `**Status: RATIFIED**`. *(§27 re-opened this
   gate on 2026-09-02 and the owner re-stamped it the same day. If it reads
   READY_FOR_RATIFICATION, stop — you are looking at an unratified amendment.)*
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **Round 1 is present and approved:** `src/modules/stock/queries/get-stock-report.query.ts`
   exists and `scripts/verify-stock-report.ts` exists.
4. `npm run typecheck` exits 0, and on a **scratch copy** `npx tsx scripts/verify-all.ts` prints
   `SUMMARY PASS 3 script(s)` with **14** P5 rows PASS. That is your baseline; at close the same
   command must print `SUMMARY PASS 3 script(s)` with **19** P5 rows.

## Read order

1. **`intention/raw_intention.md` §27** — the authority for this round, in full. Locate it by its
   heading `27. Report — restock distance`, **never by line number**. §27.3's four-row table is
   the specification; read §26 after it, for what is *unchanged*.
2. `plans/plan_5_report.md` — your task list, in full, including **C4**, the round-2 file list,
   both round-2 Notes, and the Review log (round 1's review records why the old probe was
   worthless — do not repeat its shape).
3. `master_plan.md` §6.5 — the updated `StockReportDto`, which now carries the by-state lookup
   rule in a comment.
4. `src/modules/stock/queries/get-stock-report.query.ts` and `scripts/verify-stock-report.ts` —
   what you are extending.
5. P1's `domain/stock-state.ts` — `calculateStockState`'s bands are the reason §27.3's numbers are
   what they are.

## The decision this round implements — get the boundary right

```
unitsToNormalThreshold = max(0, normal_in_stock threshold − quantity)
```

With thresholds 10/15/20 the bands are `1–10 low`, `11–15 medium`, `16–20 normal`, `>20 high`. A
definition **enters** normal at 16 and **fills** it at 20. **The owner chose fill.**

| quantity | state | value |
|---|---|---|
| 0 | `out_of_stock` | **20** |
| 7 | `low_in_stock` | **13** — *not 9* |
| 18 | `normal_in_stock` | **2** — already normal, still a gap. **Intended.** |
| 25 | `high_in_stock` | **0** — never negative |

**The row at 18 is not a bug and must not be "improved" to 0.** It is the owner's decision,
recorded in §27.3, and C4(c) pins it.

## Inherited hazards — not optional

1. **Look the normal threshold up BY STATE, never by array index.** The repository returns
   thresholds `orderBy: { state: "asc" }` — **alphabetical**, which coincides with severity order
   by accident. `thresholds[2].thresholdQuantity` works today and returns a wrong number the
   moment the ordering, the enum, or the include changes. Nothing would error.
2. **`max(0, …)`.** A definition above its normal threshold must report `0`, never a negative.
3. **C4's fixtures use thresholds 10/15/20 and are their own set.** The existing fixture seeds
   **1/3/5** and **stays that way** — its `quantity 2 → medium_in_stock` row is correct under
   1/3/5, and "correcting" it reddens round 1. Add fixtures; do not retune the shared constant.
4. **The C4 fixture writes `quantity` only and derives `stockState`** (`recalculateState`, or
   `calculateStockState` from P1). A hand-typed state makes C4(c) assert its own setup instead of
   the system's behaviour.
5. **`thresholds` in the entry is the same `{state, thresholdQuantity}` shape `LocationStockDto`
   already uses** (§6.5). Not a new vocabulary, not the repository row — no `id`, no `shopId`, no
   audit fields.
6. **Everything else about the report is unchanged** (§27.5): still unparameterized, still
   uncompacted, still no ordering guarantee, `mergeKey` untouched. No migration, no new query, no
   index — `listByShop` already returns each definition's thresholds.

## Hard scope fences

- **Three files only** — the query, the contract (additive types), the verify script. The
  controller, the routes and `verify-all.ts` are **not** yours this round; the route exists, the
  envelope is unchanged, and the script is already in `EXPECTED_SCRIPTS`.
- **Do not touch P1's, P2's or P3's files.** Do not re-open round 1's 14 rows; they pass and must
  keep passing.
- No compaction, filtering, ordering or ranking — still the client's (§26.3).

## Round-2 planted-defect probe — this one discriminates, and you must observe it red

Change the arithmetic to the **rejected** reading, `max(0, medium + 1 − quantity)`, and confirm:

- **C4(a) fails** — 13 becomes 9
- **C4(c) fails** — 2 becomes 0

Then revert. **Report both, individually.** *Round 1's named probe reddened nothing, because it
mutated a derivation whose two forms are provably equal before this phase's code runs — a false
green recorded as evidence. The test for any probe is: what reachable input makes the mutant and
the original differ? This one has two.*

## Evidence budget

`npm run typecheck` at baseline and close · `verify-all.ts` on a **scratch DB copy** made with
`sqlite3 prisma/dev.db ".backup '<dest>'"`, **never `cp`** · the purity grep · one curl against a
running server on a scratch copy showing a real entry's `thresholds` and `unitsToNormalThreshold`.
**The closing pass is taken on the tree you hand over.**

## Closing protocol

1. **Instruments on the final tree:** typecheck 0 · purity grep empty · `verify-all.ts`
   `SUMMARY PASS 3 script(s)` with **19** P5 rows · the refusal guard still exits 3 · the curl,
   expected-vs-observed. Paste the verify output and the scratch path into the plan's Review log.
2. **Perimeter:** exactly the three files. If the controller, routes or `verify-all.ts` appear in
   your diff, say why — their presence is a finding.
3. **Checkpoint commit**, subject prefixed `CHECKPOINT (not approved):`, **explicit paths only**.
   Standing authorization. Never `main`.
4. **Handoff** at `handoffs/implementer/handoff_plan5_implement_2.md`, frontmatter `plan: 5`,
   `role: implement`, `round: 2`, `state: IMPLEMENTED`, `date:`, `actor:`. Body: a per-row account
   for all **19** rows — round 1's 14 confirmed still passing, C4's 5 newly discharged — the probe
   result **naming C4(a) and C4(c) separately**, your full write perimeter, the checkpoint SHA, and
   anything you believe the plan got wrong as a candidate upstream note. *That section has caught a
   real defect in each of the last two rounds; it is not a formality.*
5. **Do not touch** the master plan tracker or any plan file outside its Review log.

## Report back

For the product owner: what you did · what you found and what it means for them · what happens
next · what needs them. Plain words, no section numbers or `file:line`.
