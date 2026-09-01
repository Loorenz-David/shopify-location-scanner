---
plan: 2
role: projection
round: 0
date: 2026-09-01
---

# Session prompt — Plan 2 projection (round 0)

## 0. Role and doctrine

You are a **projection session** (reviewer role, round 0) on phase P2 of the stock-locations
frontend build. You do the implementer's first hour of work **on paper**, adversarially, and
record every decision the artifacts fail to determine. You write no code and fix nothing.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/plan-projection.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

*(A Claude session may invoke the `plan-projection` skill instead of reading file 1.)*

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under projection:** `plans/plan_2_report_domain.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. Why this phase still has a projection gate when the others do not

The owner has cut review effort on this project — it is a working interim build, to be rebuilt
later (master plan §3A). The projection gate was dropped for every phase except this one, and
this one kept it for a single reason worth stating before you start:

**Compaction groups on `mergeKey` AND `stockState`. Grouping on `mergeKey` alone merges a
shortage in one location into healthy stock in another.** The report then shows a comfortable
number, nobody reorders, and the shelf is empty. Under contract v1.1 the backend enforced this
by construction; under v1.2 the obligation moved to the client and **no backend check can
observe a violation**. It does not announce itself in testing unless someone looks for it.

That is the defect this whole feature exists to prevent, and this phase is where it lives.
Allocate your depth accordingly.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | The intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Master plan tracker **P1** reads `APPROVED` | `master_plan.md` §4 |
| G3 | Master plan tracker **P2** reads `NOT_STARTED` | `master_plan.md` §4 |
| G4 | `src/features/stock/domain/stock-report.domain.ts` does not exist — P2 is unimplemented | `ls src/features/stock/domain/` |
| G5 | No plan-2 round-0 handoff sits in `handoffs/reviewer/` | `ls handoffs/reviewer/` |
| G6 | `src/features/stock/domain/stock-states.domain.ts` **does** exist and exports `STOCK_STATES`, `compareByStateIndex`, `UnknownStockStateError` — P2 builds on it | the file |

All six were true at dispatch. Do not gate on a clean working tree.

## 3. Read order — only what the implementer will get

1. `plans/plan_2_report_domain.md` — the phase under projection, including its Review log
2. `master_plan.md` §6 (Domain, and the P1 names this phase imports), §9 (standing rules),
   §10 (environment and test scopes)
3. `intention/raw_intention.md` §4A **MC2, MC3, MC4, MC5, MC9**, §4B (MC1b — the comparator
   this phase composes over), §5, §8 (**M2 and M2A**)
4. `backend_handoff/frontend-api-contract.md` **v1.3** §4.7 and its ⚠ compaction warning
5. `backend_handoff/handoff_report_contract_v1_2_notice.md` §3
6. **The actual code P1 shipped** — `src/features/stock/types/`,
   `src/features/stock/domain/stock-states.domain.ts`, `src/features/stock/api/mocks/`.
   Reality outranks every document above; a disagreement is a finding.

## 4. Depth targets

Deep passes on these. Filter plumbing and the counter tiles get a glance unless something
looks wrong.

- **MC4 / M2A — the compaction key.** Is the grouping key determined completely and
  unambiguously by the artifacts: what is grouped, what is summed, how the location list is
  deduped and ordered, what happens to a single-entry group? The plan names a mutation
  (removing `stockState` from the key at the `compactEntries` definition). Can that mutation
  be applied to exactly one site, and is C2's fixture built so that mutation is the **only**
  reason its expected outcome holds — or would some other property of the fixture keep the row
  green (charter rule 2's companion)?
- **MC2 / MC3 — the two total orderings.** Five tiebreak levels and a group ordering. Are all
  adjacent pairs enumerable from the artifacts *as written*, with one exact expected outcome
  each? Is "canonical properties rendered to a comparison string" defined precisely enough
  that two implementers would produce the same string — key order, value order, separators,
  casing? An under-defined comparison string is a silent ordering failure.
- **The comparator seam with P1.** MC1b fixes `compareByStateIndex(a: StockState, b:
  StockState)` returning exactly `0` for equals. P2's row comparators compose over it. Verify
  in the shipped code — not from the document — that the signature the plan assumes is the
  signature P1 actually exports.
- **MC5 — filters and counts.** C6 requires `countPendingRows` to equal the rendered list
  length "computed both sides, not typed". Is the rendered list something this phase actually
  produces, or does that criterion reference a surface that only exists in a later UI phase?

## 5. Also check

- **Every count and every reference resolves** against the artifacts and the shipped P1 code.
- **Criteria decidability:** for each row, could you write the test right now, from the
  artifacts alone, with one exact expected outcome? A row you cannot turn into a concrete
  assertion is a finding.
- **Trace verification both ways:** every row's trace cell names a ledger entry or mechanism
  contract that actually supports what the row asserts, and every entry the phase claims to
  serve is served by at least one row.
- **Sizing:** this plan has 8 criteria, at the charter's ceiling. If projecting it suggests it
  is really two phases, say so — a split now is cheaper than the rounds it would otherwise cost.
- **Fixtures are references too:** a criterion needing a population no fixture builds is
  unexecutable in exactly the way a missing symbol is.

## 6. Evidence budget

**L4 budget: exactly 0.** You change no file and run no suite, so the charter's mandatory
closing stamp does not apply — there is no tree to stamp.

Read-only inspection is unbudgeted: `ls`, `cat`, `grep`, `git log`, reading the P1 source.
You may run P1's existing tests at L1 if you need to confirm what a shipped function actually
does, but prefer reading it.

If you believe you must execute something else, write the charter's authorization line —
"narrower evidence insufficient because …" — **before** the run, and record it.

## 7. Hard constraints

- **You never edit anything** — not the plan, not the intention, not code. Findings route
  through the coordinator.
- **The skeleton is discarded.** Your paper derivation may appear only as a clearly marked
  non-authoritative appendix; the implementer must not receive it as guidance.
- **You never relitigate the intention's semantics.** A semantic hole is an upstream-routed
  finding, not a debate.
- Classify every ledger row as **plan gap** (→ amendment), **intention gap** (→ upstream), or
  **free choice** (→ propose an explicit written delegation). Zero *silent* freedom.

## 8. Closing

Handoff at `handoffs/reviewer/plan_2_round_0_projection_handoff.md`, frontmatter `plan: 2`,
`role: projection`, `round: 0`, `verdict`, `date`, `actor`. Verdict **PROJECTED_CLEAN** or
**AMENDMENTS_REQUIRED**.

Body in order: owner-readable opening (3–5 sentences, no citations, no jargon) → the charter's
`⚠ OWNER DECISIONS REQUIRED (n)` section as decision cards, or one line saying nothing needs
the owner → the decision ledger as a table (decision point / classification / proposed
routing) → reality-check and decidability findings with exact artifact and line → your full
write perimeter → optional discarded skeleton appendix.

Write no line in the plan's Review log; the coordinator writes it when consuming your handoff.

Final chat message in the charter's **owner layer**: what I did → what I found and what it
means for you → what happens next → what needs you, plus one pointer to the handoff.

**A note on scope, given the owner's budget decision:** a long ledger is fine if the items are
real, but weight them. An item that would produce a wrong number on someone's report matters
here; an item that would merely make the code less pleasant to maintain does not. Say which is
which, so the coordinator can route the first kind and waive the second.
