---
plan: 4
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — Plan 4 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P4 of the stock-locations frontend build.
You build exactly what the plan's acceptance criteria require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_4_orchestration.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

P1–P3 built pure pieces: types and the API seam, the config domain, the report domain. None of
them is wired to anything. **This phase makes the whole feature exercisable headlessly** — after
it, every workflow runs against mocks with no UI at all, and the three UI phases become
rendering work rather than logic work.

Two things in it carry real weight:

- **C9 — the report controller calls `buildReportView` and owns the vocabulary.** P2 proved the
  composition order (compact, then filter with re-quantification, then sort) with a named
  mutation. What P2 could not prove is that anyone *calls* it correctly. It needs a `keyOrder`
  derived from GET 4.1's `propertyOptions`, and the report screen has no other reason to fetch
  options — they are fetched "once per wizard entry". Hand it an empty `keyOrder` and every key
  falls into MC2a's unknown-key branch: the rows still sort deterministically, just in the wrong
  order, with nothing to observe.
- **C3's named mutation.** A definition that moves between locations must refetch **both**
  location details. Miss the old one and a row that has moved away stays on the screen it left,
  and nothing errors.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**, **P2** and **P3** all read `APPROVED` | `master_plan.md` §4 |
| G3 | Tracker **P4**'s **state cell** reads `PROMPT_READY` — not `IMPLEMENTING`, `IMPLEMENTED` or `APPROVED`. Read the state cell, not the whole row: note cells legitimately mention other phases' states | `master_plan.md` §4 |
| G4 | `src/features/stock/` has no `stores/`, `controllers/`, `actions/` or `flows/` directory | `ls src/features/stock/` |
| G5 | `domain/stock-report.domain.ts` exports `buildReportView` — C9 calls it | the file |
| G6 | The contract's version line reads **1.4** | `backend_handoff/frontend-api-contract.md` line 4 |

All were re-tested against the committed tree at dispatch. **Do not gate on a clean working
tree** — `package.json` and `package-lock.json` are legitimately dirty here. The coordinator owns
every tracker transition; **do not edit the tracker**.

## 3. Read order

1. `plans/plan_4_orchestration.md` — the phase, including its Notes and the inherited v1.4 note
2. `master_plan.md` §6 (Stores/Controllers/Flows and the navigation view ids; the API signature
   table; the three structural notes on the report pipeline), §9 (standing rules — **S2**
   allowlists, **S9** the two 409 shapes), §10 (environment and test scopes)
3. `intention/raw_intention.md` §3 (**W1–W4**), §4A **MC11, MC12**, §4B, §6, §8 (**M1, M5**),
   §9A (**D3**)
4. `backend_handoff/frontend-api-contract.md` **v1.4** §3, §4.2–4.6, §5
5. `context/frontend-architecture.md` §3, §5, §7 — **the repo's existing store/controller/flow
   idiom.** Match it; do not invent a new one.
6. **The shipped P1–P3 code** under `src/features/stock/`. Reality outranks every document
   above; a disagreement is a finding you report rather than paper over.

## 4. Things that are easy to get wrong here

- **The POST response is authoritative, not optimistic.** Create applies the response DTOs'
  real quantity and state; never 0-default them and never guess a quantity locally (C2).
- **409 handling branches on `conflictingId` being present** (MC12b, and see the plan's inherited
  v1.4 note). Do **not** add handling for the intra-batch conflict shape — this client submits
  single-entry batches only, so it cannot produce that case. S9 records who owns it if that
  ever changes.
- **Never retry a 409** (C5 asserts call count 1).
- **`scan_history_updated` refetches with the payload ignored, no debounce** (MC12c). Redundant
  refetches are accepted; that is the repo's established idiom.
- **Controllers are tested through the store**, the production path (charter rule 3), with the
  API layer in mock mode plus spies — not by calling controller internals directly.
- **Wizard edit-prefill reuses P3's render functions.** Do not write a second mapping; MC6's
  round-trip invariant is what forbids it.

## 5. Named mutations — the protocol

The plan names **exactly 1**: **C3 / M1** — delete the old-location refetch at the patch
definition; C3 must red. Apply it at the definition, run, **observe C3 red**, restore, re-run
green. A mutation that reds nothing is a **finding** — report it, do not adjust the test until
it goes red.

Record: file and line, the exact test that reddened, the received value, and confirmation the
tree was restored. **Run the probe unfiltered** (whole suite, no `-t`) and report the full set of
rows it reddens — the last two phases probed under a filter, and their reports were narrower than
reality as a result.

## 6. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree. Re-stamping after you change the tree again is not over budget; running L4
  as a working loop is.

**Baseline: 82 tests, 6 files, all passing. Typecheck clean.**
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
S6 measures against that baseline — lint is **not** required to come back clean, and you must
**not** fix unrelated files. Required: **zero** problems in any file you create or touch. Report
both numbers.

## 7. Hard constraints

- **Perimeter.** `stores/*`, `controllers/*`, `actions/stock.actions.ts`, `flows/*`, and
  `types/stock.types.ts`, plus their tests. **Do not touch `stock-allowlist.test.ts`, any
  fixture, the API layer, or the P2/P3 domain files.** Anything else is a finding to report,
  not an edit to make. If a domain function turns out to need a change, **stop and report** —
  those phases are approved and their criteria were proven against the shipped shapes.
- **S2 still applies.** The shipped allowlist guard must keep passing untouched: no state name,
  order index or hex outside the state domain. Use `countByStateBucket` and the state domain's
  exports.
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`. Owner
  instruction, no exceptions.
- **Enumerate, never sample** (charter rule 2). C1 wants one row per hydration path; C5 wants
  both the create and the patch path; C7 wants both D3 cases.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  All three previous phases did exactly that at least once, and every time it was right.

## 8. Closing

Handoff at `handoffs/implementer/handoff_plan_4_implement_1.md`, frontmatter `plan: 4`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the mutation with file, line, received value, and every row
it reddened → your full write perimeter → the closing L4 stamp with all three numbers → anything
you found and did not change.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1–P3, no extra abstraction, no
hardening nobody asked for. If you notice something worth knowing, write it in the handoff
rather than fixing it.
