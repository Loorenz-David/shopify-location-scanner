---
plan: 2
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — Plan 2 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P2 of the stock-locations frontend build.
You build exactly what the plan's acceptance criteria require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_2_report_domain.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What is at stake in this phase

This is the phase the whole feature exists to get right, and the only one that kept a
projection gate after the owner cut review effort everywhere else.

**Compaction groups on `mergeKey` AND `stockState`.** Group on `mergeKey` alone and a shortage
in one warehouse merges into healthy stock in another: the report shows a comfortable number,
nobody reorders, and the shelf is empty. Under contract v1.1 the backend prevented this by
construction; under v1.2 the obligation moved to the client and **no backend check can observe
a violation**. It does not announce itself — every row still renders, the number is just wrong.

The round-0 projection found a **second door into the same defect**: if the pipeline filters
before it compacts, or filters without re-quantifying, a row spanning two locations keeps its
full cross-location quantity when the user has selected only one. C2 guards the first door,
C5(f) guards the second. Both are named mutations. Treat them as the point of the phase.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Master plan tracker **P1** reads `APPROVED` | `master_plan.md` §4 |
| G3 | Master plan tracker **P3** reads `APPROVED` — this phase depends on it | `master_plan.md` §4 |
| G4 | Master plan tracker **P2**'s **state column** reads `PROMPT_READY` — not `IMPLEMENTING`, `IMPLEMENTED` or `APPROVED`, which would mean a session already ran. Read the state cell, not the whole row: the note cell legitimately mentions other phases' states | `master_plan.md` §4 |
| G5 | `src/features/stock/domain/stock-report.domain.ts` does not exist | `ls src/features/stock/domain/` |
| G6 | `domain/stock-criteria.domain.ts` exports `displayValueFor(key, wireValue, options)` — C8 calls it | the file |
| G7 | Intention §4B contains **MC2a** and **MC3a** | `intention/raw_intention.md` |

All were re-tested against the committed tree at dispatch. **Do not gate on a clean working
tree** — `package.json` and `package-lock.json` are legitimately dirty in this repo. The
coordinator owns every tracker transition; **do not edit the tracker**.

## 3. Read order

1. `plans/plan_2_report_domain.md` — the phase, including its Notes (delegated free choices)
   and its Review log, which records what the projection changed and why
2. `master_plan.md` §6 (Domain — the three structural notes on the pipeline owner, the
   `contributions` field, and comparator factories), §9 (standing rules, especially **S2**
   allowlists and **S4c** casing), §10 (environment and test scopes)
3. `intention/raw_intention.md` §4A **MC2, MC3, MC4, MC5, MC9**, §4B **MC1b, MC2a, MC3a**,
   §5, §8 (**M2, M2A**), §9A (**D11, D12, D13**)
4. `backend_handoff/frontend-api-contract.md` **v1.3** §2, §4.1, §4.7 and its compaction warning
5. `backend_handoff/handoff_report_contract_v1_2_notice.md` §3
6. **The shipped P1 and P3 code** — `types/`, `domain/stock-states.domain.ts`,
   `domain/stock-criteria.domain.ts`, `api/mocks/`. Reality outranks every document above;
   a disagreement is a finding you report rather than paper over.

## 4. Things that are easy to get wrong here

- **MC2a is not optional detail.** MC2's key 4 renders `properties` to a comparison string and
  §4B fixes exactly how: key order from the passed-in `keyOrder`, unknown keys last by code
  points, `null` renders as `*`, values in the order returned, the separator `U+001F` between a
  key and its values, `U+001E` between key groups, the whole string lowercased, compared by
  code points — never `localeCompare`. Implement it as written; the separators are C0 control
  characters specifically so that no wire value can imitate one.
- **The report domain must not contain a state name, an order index, or a state hex** (S2, MC1).
  Use `countByStateBucket` from the state domain — you add it there, and its bucket keys are
  `out`/`low`/`medium`/`rest`, deliberately not the wire names. C9 proves the shipped
  `stock-allowlist.test.ts` still passes **unmodified**; that guard matches case-insensitively,
  so an identifier named `OUT_OF_STOCK` trips it exactly as a string literal would.
- **D12 and D13 are different rules and both are ratified.** The CTA count follows the rendered
  list (C6). The counter tiles ignore the state filter but respect the location filter (C7).
  MC3a then adds: group *ranking* counts are computed **after** the filter. These are not
  inconsistent — §4B MC3a records why.
- **Grouped mode counts entries, not groups** (C6). `groups.length` is the number of locations,
  which is the miscount D12 was written to prevent.
- **Do not harmonize the two wildcard renderings.** The wizard chip is `UPHOLSTERY · any`
  (P3, shipped). MC9's config label is the key name as it appears in `propertyOptions`, then
  ` any`. Two surfaces, two ratified texts.

## 5. Named mutations — the protocol

The plan names **exactly 2**:

1. **C2 / M1** — delete the `stockState` component wherever the compaction grouping key is
   constructed. The plan requires that site to be a **single expression at the definition**, so
   the mutation has exactly one target; build it that way.
2. **C5(f) / M2** — swap the first two stages of `buildReportView` so filtering precedes
   compaction. C5(c)'s quantity must go from `2` to `20`.

For each, in this order: apply at the **definition**, run, **observe the specific row red**,
restore, re-run green. A mutation that reds nothing, or reds only a different row than the plan
predicts, is a **finding** — report it, do not adjust the test until it goes red. Record per
mutation: file and line, the exact test that reddened, the received value, and confirmation the
tree was restored. If you probe under a `-t` filter, say so — the last phase did, and its report
was narrower than reality as a result.

## 6. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree. Re-stamping after you change the tree again is not over budget; running L4
  as a working loop is.

**Baseline to compare against: 50 tests, 5 files, all passing. Typecheck clean.**
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
S6 measures against that baseline — lint is **not** required to come back clean, and you must
**not** fix unrelated files. What is required: **zero** problems in any file you create or touch.
Report both numbers.

## 7. Hard constraints

- **Perimeter.** `domain/stock-report.domain.ts` (+ test), `types/stock.types.ts`, and
  `domain/stock-states.domain.ts` (+ its existing test) for `countByStateBucket` only.
  **Do not touch `stock-allowlist.test.ts`, any fixture, the API layer, or P3's files.**
  Anything else is a finding to report, not an edit to make.
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`. Owner
  instruction, no exceptions.
- **Enumerate, never sample** (charter rule 2). C3's five pairs and C4's four must each be equal
  on every preceding level and differ only at the named one — otherwise a comparator that
  ignores that level still passes. C4(f) needs four enumerated pairs, not one witness.
- **No IO.** Receiving `keyOrder` or an options list as a parameter is not IO.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Both previous phases did exactly that and both times it was the right call.

## 8. Closing

Handoff at `handoffs/implementer/handoff_plan_2_implement_1.md`, frontmatter `plan: 2`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the two mutations with file, line, received value, and the
row that reddened → your full write perimeter → the closing L4 stamp with all three numbers →
anything you found and did not change.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1 or P3, no extra abstraction, no
hardening nobody asked for. If you notice something worth knowing, write it in the handoff
rather than fixing it.
