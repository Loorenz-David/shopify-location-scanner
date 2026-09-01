---
plan: 1
role: implementer
round: 2
date: 2026-09-01
---

# Session prompt — Plan 1, round 2 (coordinator amendment)

## 0. What this round is, and what it is not

**This is not a fix cycle and there are no findings against round 1.** No review has run.
Round 1 was verified by the coordinator and came back clean on every dimension it checked:
write perimeter matched the tree exactly, all five named mutations were run at the sites
their criteria name with observed reds and clean reverts, all 32 tests carry a criterion row
id with zero orphans, and the lint claim held under independent re-derivation.

One upstream fact changed **after** you were dispatched. The backend answered a question the
frontend had filed and reissued the API contract as **v1.3**: `itemCategories` was elided in
v1.1/v1.2 with a literal `...`, and the real vocabulary is **28** values, not the nine that
had been inferred from the property table's `categories` column. Master plan **S4a** and
criterion **C4(b)** have been amended accordingly. Your round-1 fixture was correct for the
artifacts you were given; the artifacts moved.

You are the **implementer**. Read as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Plan file:** `docs/under_development/stock_locations/plans/plan_1_foundations.md` — it is
your task list and acceptance criteria; where this prompt differs, the plan file wins.

## 1. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | The intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Master plan **S4a** names **28** categories and the contract is cited as **v1.3** | `master_plan.md` §9, §2 |
| G3 | Plan 1 **C4(b)** asserts **28** categories, not nine | the plan's criteria table |
| G4 | `src/features/stock/api/mocks/get-stock-options.fixture.ts` still holds **nine** categories — the work is genuinely outstanding | the fixture |
| G5 | Contract §4.1 contains the un-elided 28-value `itemCategories` array | `backend_handoff/frontend-api-contract.md` |

G4 is the one that tells you to stop if someone already did this.

## 2. Read order

1. `plans/plan_1_foundations.md` — criterion **C4(b)**, and its Review log, which records
   why this round exists
2. `master_plan.md` §9 — **S4a** (the 28, in payload order, with the reason the nine were
   wrong) and **S4b**; §2 for the contract version
3. `backend_handoff/frontend-api-contract.md` **v1.3** §4.1 — the authoritative payload
4. `backend_handoff/handoff_item_categories_answer.md` — the backend's answer, if you want
   the full reasoning; not required

## 3. The change — the entire scope of this round

**Allowed file perimeter, exactly two files. Anything else that changes is a finding.**

1. `src/features/stock/api/mocks/get-stock-options.fixture.ts` — replace the nine-value
   `itemCategories` array with the 28 values from contract §4.1, **in payload order**,
   verbatim (S4, S4a).
2. `src/features/stock/api/stock-api.test.ts` — the C4(b) case at line 188, currently named
   `"C4(b): options expose exactly the nine selected item categories in order"`. Rename it so
   it no longer says "nine", and update its assertion to the full ordered 28-value list.

**Assert the whole ordered list, not a length.** `toHaveLength(28)` is the disjunction
charter rule 2 forbids — it passes for any 28 strings in any order. C4(b) says "asserted as
the full ordered list, not a count", and it means it.

Do not touch anything else. Not the other fixtures, not the domain, not the allowlist scans,
not the config. In particular **do not "improve" the nine→28 change into a derived or
computed list** — S4 requires the fixture to carry the contract's values verbatim.

## 4. Evidence budget

**Exactly 1 L4 run** — the closing stamp, on the tree you hand over. If you change anything
after taking it, re-take it; the re-stamp is not over budget.

**This round names no mutations.** C4(b) is an observational row over a fixture; there is no
guard here whose failure needs proving. Do not invent probes — a self-chosen mutation with no
criterion behind it is authorship purchased against no declared objective.

Everything else runs at L1/L2. The relevant L1 is
`npx vitest run src/features/stock/api/stock-api.test.ts`.

Note when you read the lint result: **master plan S6 changed this round too.** It no longer
demands `npm run lint` pass outright. The repo baseline is 48 errors / 14 warnings in
unrelated pre-existing files; your obligation is zero problems in your own perimeter and no
growth in those totals. Your round-1 handling of this was correct and is now the written rule.

## 5. Closing

- Checkpoint commit, subject prefixed `CHECKPOINT (not approved):`, standing authorization —
  do not stop to ask.
- Tracker row P1 → `IMPLEMENTED` with a note naming round 2. Touch no other row.
- Review log entry in the plan file.
- Handoff at `handoffs/implementer/handoff_plan_1_implement_2.md`, charter row schema,
  declaring your **cycle-scoped** write perimeter — the files *this session* changed, not the
  files the phase owns. That is the question the next perimeter check asks.
- If you diverge from anything this prompt instructs, say which and why in its own section
  (charter rule 14). Divergence is often right; undeclared divergence costs a round.

Final chat message in the charter's **owner layer**: what you did → what it means → what
happens next → what needs you, plus one pointer to the handoff.

After this round the phase goes to **first review** — no further implementation is expected.
