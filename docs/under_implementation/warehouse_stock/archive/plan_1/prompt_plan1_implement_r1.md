---
plan: 1
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — P1 implement (round 1)

## Your role

You implement **phase 1** of the Location Stock System: the two database tables, the
`StockState` enum, every pure domain rule, the property-options map, and one committed
verification script. You are the only actor writing code in this phase.

**Load your doctrine first, before reading anything else.** These are plain markdown; read
both in full and follow them as this session's doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Where this prompt and the doctrine differ, the doctrine wins. **Where this prompt and the
plan file differ, the plan file wins** — `plans/plan_1_schema_domain.md` is your task list;
this prompt only frames the session.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
project docs   <repo root>/docs/under_implementation/warehouse_stock
```

**This is a git worktree and the path matters.** A sibling checkout exists at
`…/Item-Scanner-Shopify` on `main`, where the frontend is built in parallel. It holds a
*copy* of these planning documents that stopped being live at commit `4424a3b`, and a copy of
the backend source that this pipeline does not touch. If a path you are about to open does not
contain `-warehouse-stock-backend`, you are in the wrong tree and your work will be silently
lost. Neither `git status` nor any perimeter check will tell you.

The runtime here is provisioned and green: dependencies installed, Prisma client generated,
`prisma/dev.db` at migration head, `npm run typecheck` exiting 0. Details in master plan §10.

## Gate check — run before reading anything else

Stop and report if any line fails. Do not implement past a failed gate.

1. `docs/under_implementation/warehouse_stock/intention/raw_intention.md` line 3 reads exactly
   `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. `apps/backend/src/modules/stock/` does **not** exist, and neither does
   `apps/backend/src/shared/item-properties/item-property-options.ts`. If either is present,
   P1 is already implemented and this prompt is being run out of order.
4. `context/property-options-selection.md` contains a heading beginning
   `## ✅ OWNER SELECTION — FINAL`.
5. `npm run typecheck` (from `apps/backend`) exits 0 **before you change anything**. This is
   your baseline: any failure you see later is yours.

## Read order

1. `master_plan.md` — §5 (contract resolution), §6.1–§6.4 and §6.6 (**the naming registry —
   everything in it is fixed**), §9 (project deviations from the charter), §10 (environment).
2. `plans/plan_1_schema_domain.md` — **your task list**, in full, including its Notes and its
   Review log.
3. The semantic authorities its Read-first list names, and only those.
4. `.github/instructions/backend-contracts.instructions.md` (repo root) — the project's
   declared backend architecture contract. Authoritative for the new module. Read in full.
5. `src/shared/category/item-categories.ts` — the `as const` idiom you are copying.

**Precedence when authorities disagree:** intention §26 (report only) > intention §23 >
context §0 > intention §1–§22. The master plan's registry is fixed regardless.

**Do not read** `handoffs/` or other `prompts/` files. They carry coordination state that is
not yours, and one of them is a projection whose working sketch is deliberately withheld —
see "What was decided for you" below.

## What this project does differently — binding, read before the doctrine confuses you

Master plan §9 is the authority; these are the three that will bite you.

1. **There is no test suite and you are not building one.** No runner, no test files;
   `npm test` fails by design. This is owner-ratified (context §0.11), and charter rule 1 is
   exempted project-wide. Wherever the charter or the executor doctrine says "test", read
   **"criterion instrument"**, which in this phase means exactly two things: `npm run
   typecheck`, and the committed `scripts/verify-stock-domain.ts` you are writing.
   **Do not install a test framework. Do not add a `test` script. Do not write `*.test.ts`.**
2. **`src/modules/scanner/repositories/scan-history.repository.ts` is out of perimeter for
   every phase of this project** (context §0.10). Read-only to you, always. A need to change
   it is a stop-and-report, never an edit.
3. **Domain purity.** `src/modules/stock/domain/` and `item-property-options.ts` import no
   Prisma and no I/O. The instrument is a grep, run at close — see below.

## Hard scope fences — this phase, and no further

You are building schema + pure functions + one script. **Not** in this phase, and writing any
of it is a defect rather than a head start:

- **No repository, no Prisma access anywhere except the migration** — that is P2.
- **No HTTP: no contract file, no controller, no routes, no `server.ts` edit** — that is P3.
- **No hooks into item flows, no `applyItemStockChange`** — that is P4.
- **No report** — that is P5.
- **No endpoint, field, helper or abstraction beyond the naming registry and this phase's
  criteria.** The registry (master plan §6) fixes names, paths and signatures; if it seems
  wrong, stop and report rather than improving it.

## What was decided for you, and what is yours

A pre-implementation pass ran on this plan before you and found seven things the plan failed
to determine. **All seven are already fixed in the artifacts you are about to read** — you
will not encounter them as gaps. Its working sketch is deliberately withheld: if it reached
you it would be a second plan competing with the real one.

Five further points were judged genuinely yours. They are recorded in the plan's **Notes** as
granted delegations **D1–D5** — the comparator for sorting, `calculateStockState` outside its
validated domain, which id `findConflict` returns on multiple matches, the empty-token-set
case, and `specificityScore`'s return shape. **These are yours on purpose.** Take them, follow
the stated recommendation where one is given, and do not treat them as ambiguity to escalate.
The one hard constraint among them: `specificityScore` may return any shape that preserves
ordered comparison, but **not a single summed number** — that collapses C5(c), where a weight
tie must be broken by the next component.

Everything else in the registry is fixed. The line is: a place the artifacts are *ambiguous*
is a stop-and-report; a place you would simply have chosen differently is not.

## Evidence budget

This project has no suite, so the charter's L1–L4 ladder does not apply as written. Your
budget for this phase is:

- `npm run typecheck` — at the baseline (gate check 5) and again at close.
- `scripts/verify-stock-domain.ts` — run it as you build, freely; it is yours and it is cheap.
- **The closing pass is mandatory and is taken on the tree you actually hand over.** If you
  change anything after taking it, take it again — a re-take after a change is not
  over-budget, it is the only correct stamp.
- The purity grep at close.

Do not run instruments beyond these looking for extra confidence, and do not paste an earlier
run's output as the closing stamp.

## Closing protocol

In this order:

1. **Instruments, on the final tree:** `npm run typecheck` exits 0 · the purity grep
   (master plan §9.2) returns empty · `npx tsx scripts/verify-stock-domain.ts` is **all-PASS**
   and exits 0. Paste the verify script's full output into the plan file's Review log. The
   expected line count is stated in the plan's task 7 — if your count differs, say so and
   explain rather than adjusting the number to match.
2. **Perimeter:** `git diff --name-only` must equal the plan's "Files expected to change"
   list. `prisma/dev.db` is gitignored, so running the migration does not dirty it. Anything
   outside that list is a finding against you — if you genuinely needed it, declare it.
3. **Checkpoint commit** on `warehouse-stock-backend`, subject prefixed
   `CHECKPOINT (not approved):`. This is standing owner authorization — do not stop to ask.
   Never commit to `main`.
4. **Handoff** at `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan1_implement_1.md`,
   frontmatter `plan: 1`, `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`,
   `actor:`. Body must carry:
   - a per-criterion-row account: for each of the 60 lettered rows, where it is discharged
     (which verify-script line, or which artifact for C1's schema rows);
   - **your full write perimeter** — every file created or modified, code and documents, so
     it can be diffed against the tree rather than reconstructed;
   - the checkpoint commit SHA;
   - which of D1–D5 you exercised and what you chose;
   - anything you believe the plan got wrong, as a **candidate criterion** or a note — do not
     silently deviate, and do not silently fix.
5. **Do not touch** the master plan tracker or any plan file outside its Review log. Those are
   the coordinator's.

## Report back

Your final message is for the product owner, who has not read the plan. Four parts: what you
did · what you found and what it means for them · what happens next · what needs them (or one
line saying nothing does). Plain words — no section numbers, no `file:line`, no jargon; the
technical detail lives in the handoff, named by a single pointer line.

One thing worth saying plainly if it happens: this phase's verify script is the only
executable check this project will have for the domain rules, and every later phase's
regression safety is built on it. If any part of it is weaker than it looks, that is the most
useful thing you can tell us.
