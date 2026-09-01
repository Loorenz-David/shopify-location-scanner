---
plan: 3
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — Plan 3 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P3 of the stock-locations frontend build.
You build exactly what the plan's acceptance criteria require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_3_config_domain.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. Why P3 runs before P2

The plan header used to read "Depends on: P2 APPROVED". That was backwards and was corrected
on 2026-09-01 (master plan §7). Nothing in this phase touches the report domain, while plan 2's
entry-detail label needs `displayValueFor` — which you build here, and which MC6's round-trip
invariant forbids anyone from copying into a second file. **So plan 2 binds to the signature you
ship.** `displayValueFor(key, wireValue, options)` is fixed in master plan §6; do not change its
shape without routing the change back to the coordinator.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Master plan tracker **P1** reads `APPROVED` | `master_plan.md` §4 |
| G3 | Master plan tracker **P3** reads `NOT_STARTED` | `master_plan.md` §4 |
| G4 | Master plan §7 sequencing reads `P1 → **P3 → P2**` | `master_plan.md` §7 |
| G5 | Neither `domain/stock-criteria.domain.ts` nor `domain/stock-thresholds.domain.ts` exists | `ls src/features/stock/domain/` |
| G6 | `api/mocks/get-stock-options.fixture.ts` exists with 28 `itemCategories` and 8 `propertyOptions` | the file |

All six were true at dispatch. **Do not gate on a clean working tree** — `package.json` and
`package-lock.json` are legitimately dirty in this repo.

## 3. Read order

1. `plans/plan_3_config_domain.md` — the phase, including its Notes and inherited-hazard section
2. `master_plan.md` §6 (Domain registry — `displayValueFor`'s fixed signature), §9 (standing
   rules, especially **S4c** on value casing), §10 (environment and test scopes)
3. `intention/raw_intention.md` §4A **MC6, MC7, MC8**, §8 (**M3, M4**), §9A (**D9, D14**)
4. `backend_handoff/frontend-api-contract.md` **v1.3** §2 (value normalization) and §4.1
   (the property vocabulary table — S4b: where the table and the JSON example disagree, the
   table wins)
5. **The shipped P1 code** — `src/features/stock/types/`, `api/mocks/`. Reality outranks every
   document above; a disagreement is a finding you report rather than paper over.

## 4. What to build

Two files plus their colocated tests: `domain/stock-criteria.domain.ts` and
`domain/stock-thresholds.domain.ts`. All functions are **pure** — no fetch, no store, no
`import.meta.env`. Receiving the options list as a parameter is not IO.

Three things the plan's Notes settle that are easy to get wrong:

- **Casing direction (S4c).** Criteria are **submitted** display-cased (`["Teak"]`); responses
  come back **lowercase** (`["teak"]`) because the backend normalizes. `displayValueFor` is what
  recovers the display form, by case-insensitive match into the options map, falling back to the
  raw wire value when unmatched. C2 and C3 both depend on that direction.
- **The two wildcard renderings are deliberate.** The wizard chip is `UPHOLSTERY · any` (D9,
  yours). The entry-detail config label is MC9's form (plan 2's). Do not make them match.
- **Omission ≠ wildcard.** A removed row omits the key entirely; `{key: null}` means "has the
  key, any value". C1(b) and C1(c) are different assertions.

## 5. Named mutations — the protocol

The plan names **exactly 2**, both in C6: delete the raising-cascade branch
(`medium = max(...)`), and delete the lowering branch. For each, in this order: apply it at the
**definition**, run the suite, **observe the specific row red** the plan names (C5(e) for the
first, C5(a) for the second), restore, re-run green. A mutation that reds nothing, or reds a
different row than the plan predicts, is a **finding** — report it, do not adjust the test until
it goes red.

Your handoff records, per mutation: the file and line it was applied at, the exact test that
went red, and confirmation that the tree was restored.

## 6. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, run once
  at the end on the finished tree. Re-stamping after you change the tree again is not over budget;
  running L4 repeatedly as a working loop is.

**Lint baseline: 48 errors / 14 warnings, all pre-existing and all outside `src/features/stock`.**
Master plan S6 measures against that baseline — `npm run lint` is **not** required to come back
clean, and you must **not** fix unrelated files. What is required: **zero** problems in any file
you create or touch. Report both numbers.

Current baseline to compare against: **32 tests, 3 files, all passing.** Typecheck clean.

## 7. Hard constraints

- **Perimeter.** Create/edit only `domain/stock-criteria.domain.ts`,
  `domain/stock-thresholds.domain.ts`, their `.test.ts` files, and view types in
  `types/stock.types.ts` if a criterion genuinely needs one. Anything else is a finding to
  report, not an edit to make. In particular: **do not touch `stock-allowlist.test.ts`,
  `stock-states.domain.ts`, or any fixture.**
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`. Owner
  instruction, no exceptions.
- **Enumerate, never sample** (charter rule 2). C5 lists eight cascade rows; each asserts its one
  exact output triple. No disjunctive assertions ("either 15/16/39 or …").
- **Every exported helper has a caller in this phase** (charter rule 4) — tests count.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  P1's round 1 did exactly that with an unsatisfiable lint criterion and it was the right call.

## 8. Closing

Handoff at `handoffs/implementer/handoff_plan_3_implement_1.md`, frontmatter `plan: 3`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the two mutations with file, line, and the row that reddened
→ your full write perimeter → the closing L4 stamp with all three numbers (tests, typecheck, lint
vs baseline) → anything you found and did not change.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1, no extra abstraction, no hardening
nobody asked for. If you notice something worth knowing, write it in the handoff rather than
fixing it.
