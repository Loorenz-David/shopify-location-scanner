---
plan: 4
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — P4 implement (round 1)

## Your role

You implement **phase 4**: the single stock-mutation primitive `applyItemStockChange`, and its
four call sites in the existing Shopify command and job layer.

**This is the only phase that edits code the rest of the application already runs.** Everything
before it added new files beside the system. You are reaching into the scanner's location
command, the products webhook job, and both order webhooks — paths that handle real scans and
real sales. Existing behaviour must survive untouched.

**Load your doctrine first.** Plain markdown; read both in full and follow them as doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Doctrine beats this prompt. **The plan file beats this prompt** —
`plans/plan_4_item_transition_hooks.md` is your task list.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
```

If a path lacks `-warehouse-stock-backend`, you are in the wrong tree.

## ⚠ A sibling session may be running phase 3 right now

P3 and P4 were dispatched to run **in parallel**. Perimeters are disjoint — P3 owns
`src/modules/stock/{contracts,commands,queries,controllers,routes}/`,
`src/modules/stock/repositories/location-stock.repository.ts` and `src/server.ts`; you own none
of those. But you may share a working tree, so:

1. **Your perimeter check is "every file *I* changed is in my list"**, not "the tree's diff equals
   my list". Files you do not own in `git status` are the sibling's, not a finding.
2. **Commit by explicit path. Never `git add -A`.**
3. **`npm run typecheck` is repo-wide.** A failure *only* in files outside your perimeter is the
   sibling's in-progress code: say so, wait, re-run. Never edit their files to go green.
4. **P3 is adding a method to `location-stock.repository.ts`.** You **call** that repository; you
   do not change it. If a method you need is missing, stop and report — do not add it.
5. Your manual scenarios need the running app **plus Redis and the webhook worker**, and one needs
   a real Shopify admin edit. Coordinate with the sibling over the app, and **report honestly
   which scenarios you could not execute** rather than skipping them silently.

## Gate check — before reading anything else

1. `intention/raw_intention.md` line 3 reads exactly `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **P2 is APPROVED and present**: `src/modules/stock/{repositories,services}/` exist.
4. **Your own file does not exist**:
   `src/modules/stock/services/apply-item-stock-change.service.ts`.
5. `npm run typecheck` exits 0 and `npx tsx scripts/verify-stock-domain.ts` reports **58 PASS /
   exit 0** before you change anything.

## Read order

1. `master_plan.md` — §5, §6.4, §6.6, §9 (especially **§9.6** and §9.7), §10.
2. `plans/plan_4_item_transition_hooks.md` — **your task list**, in full, including every Note and
   the Review log. A projection pass already found and fixed a great deal; read its record so you
   do not re-derive it.
3. The semantic authorities its Read-first list names — note **context §0.10's sold rows were
   amended 2026-09-01**; read the amendment, not the superseded wording.
4. **The four files you edit, in full, before changing any of them.** You must know what they
   already do.
5. `src/modules/scanner/repositories/scan-history.repository.ts` — **read-only, out of perimeter
   for every phase**. You need it to understand `appendLocationEvent`'s same-location
   short-circuit and `appendSoldTerminalEventWithFallback`'s idempotency branches.
6. P2's shipped repository and service — what the primitive may call, and what those functions do
   when handed something their caller never guaranteed.

## What this project does differently — binding

1. **No test suite and you are not building one.** Your instruments are `npm run typecheck`, the
   purity grep, `scripts/verify-all.ts`, and this phase's **Manual Scenarios**. **P4 authors no
   verify script**, so several rows — C1's resolution matrix and C4(c) — are decidable **only by
   code inspection**. That is legitimate here, but it means you must not present a manual scenario
   as though it discharged them. Say which is which.
2. **`scan-history.repository.ts` must not be edited** (§0.10, §9.6). Option A — hooks in the
   command and job layer, after the item write commits — exists precisely so this file is never
   touched. A need to change it is a **stop-and-report**, never an edit.
3. **No new WebSocket event** (§0.9). `src/modules/ws/*` is untouched.

## Hard scope fences

- **No HTTP surface, no commands, no queries** for the stock module — P3 owns those and is
  building them beside you.
- **No report** — P5. **No changes to P1's or P2's files.** If one looks wrong, stop and report.
- Nothing beyond the registry and this phase's criteria.

## Inherited hazards — not optional

Every one of these is a defect already reasoned about, and every one fails by producing a **wrong
number** rather than an error.

1. **Read the stored row on the sale path.** Owner decision. Do **not** fabricate `before` as
   `{...after, isSold: false}`. Shopify's guard stops the *item* being marked sold twice, but the
   hook sits above it and the repository returns `isSold: true` on all four branches with no flag
   saying whether this call changed anything — so a fabricated `before` asserts a false→true
   transition on every delivery and decrements twice for one sale.
2. **Two quantities, not one.** Different configs with a quantity change means source
   −`before.quantity`, destination +`after.quantity`. The webhook syncs quantity and location in
   one run, so this is normal, not an edge case.
3. **Name the hoisted read `existingHistory`, not `before`.** `update-item-location.command.ts`
   already binds `before` to the Shopify fetch, consumes it four times, and returns it as
   `product.previousLocation`.
4. **Place the webhook call after every branch**, not inside the `if` block holding the two
   writes — the already-sold branch must reach the primitive to resolve as a no-op, and it sits
   outside that block.
5. **`before === null` is not the same as "before ineligible."** The webhook's create branch and
   a first-ever scan both produce it; it means destination-only increment.
6. **Locate every anchor by symbol, never by line.** Context's line citations into these files
   have drifted more than once, and they will drift again the moment you edit them.
7. **A stock failure must never fail the parent operation** (§0.15) — the scan, sale or webhook
   succeeds regardless.

## An unrouted collision — report, do not resolve alone

P2 deliberately lets `calculateStockState` **throw** on a configuration with malformed thresholds:
*"failing loudly in the one place that reads every config in the group is better than silently
reporting a wrong total."* Your task 1 says a stock failure never fails the parent operation. Both
are ratified, and they meet inside `applyItemStockChange`.

Neither the plan lint nor the projection routed this. **Do the obvious safe thing — catch, log at
error with the group identified, and let the parent operation succeed — and then say in your
handoff that you did, and that the collision is unresolved.** Do not treat the silence as
permission to decide it quietly.

## Granted delegations — yours on purpose

D4 and D9 in the plan's Notes. Take them; they are not ambiguity to escalate.

## Evidence budget

`npm run typecheck` at baseline and close · `verify-all.ts` on a **scratch DB copy** via
`sqlite3 … ".backup"`, never `cp` · the purity grep · the Manual Scenarios checklist. **The
closing pass is taken on the tree you hand over.** Destructive steps (the drift test) run against
the scratch copy, never `prisma/dev.db`.

## Closing protocol

1. **Instruments on the final tree:** typecheck 0 · purity grep empty · `verify-all.ts` all-PASS
   on a scratch copy · Manual Scenarios executed, expected-vs-observed per step, with any
   unrunnable step named and explained.
2. **Perimeter:** every file *you* changed is in the plan's five-file list. Additionally confirm
   `scan-history.repository.ts` and `src/modules/ws/*` are **byte-identical** to their pre-phase
   state — C7(b) and C7(c) require it.
3. **Checkpoint commit**, subject prefixed `CHECKPOINT (not approved):`, **explicit paths only**.
4. **Handoff** at `handoffs/implementer/handoff_plan4_implement_1.md`, frontmatter `plan: 4`,
   `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`, `actor:`. Body: a per-row account
   for all **28** lettered rows, marking which are discharged by code inspection rather than an
   executed instrument; your **full write perimeter**; the checkpoint SHA; the delegations you
   exercised; your note on the unrouted collision above; and anything you believe the plan got
   wrong, as a candidate criterion — never a silent deviation.
5. **Do not touch** the tracker or any plan file outside its Review log.

## Report back

For the product owner: what you did · what you found and what it means for them · what happens
next · what needs them. Plain words. If anything about the existing scan or sale paths worries
you after reading them, that is the most useful thing you can say — you are the first phase to
touch them.
