---
plan: 3
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — P3 implement (round 1)

## Your role

You implement **phase 3**: the configuration HTTP surface — options, summary, detail, batch
create, update, delete — for the Location Stock System.

**Load your doctrine first.** Plain markdown; read both in full and follow them as this session's
doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Doctrine beats this prompt. **The plan file beats this prompt** —
`plans/plan_3_configuration_api.md` is your task list; this only frames the session.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
```

If a path you are about to open does not contain `-warehouse-stock-backend`, you are in the wrong
tree and your work will be silently lost.

## ⚠ A sibling session may be running phase 4 right now

P3 and P4 were dispatched to run **in parallel**. Their file perimeters are disjoint by design —
P4 owns `src/modules/shopify/*` and `src/modules/stock/services/apply-item-stock-change.service.ts`;
you own none of those. But you may share a working tree, so:

1. **Your perimeter check is "every file *I* changed is in my list"**, not "the tree's diff equals
   my list". Files you do not own appearing in `git status` are the sibling's, not a finding.
2. **Commit by explicit path. Never `git add -A` or `git add .`** — you would commit their
   half-finished work under your checkpoint.
3. **`npm run typecheck` is repo-wide.** If it fails *only* in files outside your perimeter, that
   is the sibling's in-progress code, not yours: say so in your handoff, wait, and re-run. Do
   **not** edit their files to make your check pass. If it fails in a file you own, it is yours.
4. **Both phases' manual scenarios need the running app**, and P4's also need Redis and the
   webhook worker. If the app is already running for the sibling, coordinate or run yours after —
   report honestly which scenarios you could not execute rather than skipping them silently.

## Gate check — before reading anything else

Stop and report if any line fails.

1. `intention/raw_intention.md` line 3 reads exactly `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **P2 is APPROVED and present**: `src/modules/stock/repositories/location-stock.repository.ts`
   and `src/modules/stock/services/stock-reconciliation.service.ts` exist.
4. **Your own files do not exist**: `src/modules/stock/{commands,queries,controllers,routes}/`.
5. `npm run typecheck` exits 0 and `npx tsx scripts/verify-stock-domain.ts` reports **58 PASS /
   exit 0** before you change anything. Those are your baselines.

## Read order

1. `master_plan.md` — §5, §6.3–§6.6 (**the registry is fixed**; read every dated fix note in
   §6.2 — several exist because earlier wording was wrong), §9 (deviations, incl. §9.7/§9.8), §10.
2. `plans/plan_3_configuration_api.md` — **your task list**, in full, including every Note and
   the Review log. The Review log records what a projection pass already found and fixed; read it
   so you do not re-derive it.
3. The semantic authorities its Read-first list names, and only those.
4. `.github/instructions/backend-contracts.instructions.md` — read in full. P3 is where its
   layering rules bite: **controllers must not import repositories, commands must not call Prisma,
   transaction boundaries live in services**.
5. `src/modules/zones/**` — the CRUD template, including `getRequiredIdParam`.
6. P1's and P2's shipped code, as authorities on what you may call and what preconditions those
   functions carry.

## What this project does differently — binding

1. **No test suite and you are not building one.** `npm test` fails by design; charter rule 1 is
   exempted project-wide. Your instruments are `npm run typecheck`, the purity grep,
   `scripts/verify-all.ts`, and **this phase's Manual Scenarios curl checklist** — P3 authors no
   verify script. **Do not install a test framework or write `*.test.ts`.**
2. **`scan-history.repository.ts` is out of perimeter for every phase.**
3. **Domain purity**: `src/modules/stock/domain/` and `item-property-options.ts` import no Prisma.

## Hard scope fences

- **No item-flow hooks, no `applyItemStockChange`** — that is P4, and it is being built beside
  you. Do not create `services/apply-item-stock-change.service.ts`.
- **No report endpoint** — P5.
- **Do not edit P1's frozen files** (`domain/*`, `item-property-options.ts`,
  `verify-stock-domain.ts`). If one looks wrong, **stop and report**.
- **`stock-reconciliation.service.ts` is P2's and stays as shipped** — you call it, you do not
  change it.
- Nothing beyond the registry and this phase's criteria.

## Inherited hazards — not optional

Each is already in the plan; repeated because each is a defect that has been reasoned about.

1. **`stock.contract.ts` already exists** and both P2 files import from it. You **extend** it. An
   overwrite deletes `LocationStock`, `LocationStockCreateData`, `LocationStockUpdateData`,
   `GuardedDecrementContext`, `ReconciliationValue` and `StockOperation`.
2. **You re-open P2's repository, deliberately**, for one new method: `replaceThresholds`.
   Threshold replacement has no write path anywhere in `src/`. **The silent failure to avoid:**
   adding `thresholds?` to `UpdateLocationStockInput` and passing it to `updateConfig` compiles
   clean and drops the field on the floor — that method's spread never reads it. Thresholds would
   appear to save and never do. Delete and re-create **inside one transaction**: the unique index
   forces delete-before-create, and a configuration left with zero thresholds makes
   `calculateStockState` throw inside reconciliation, which bricks create, update **and** delete
   for every sibling in that location and category.
3. **The whitelist must be callable from both paths.** A schema-internal check works for create
   and cannot work for PATCH, where `itemCategory` and `properties` arrive independently. Validate
   the **effective** pair — stored ⊕ patch — or the update endpoint ships with no property
   validation at all.
4. **The options map holds display casing; criteria are lowercased.** Compare with both sides
   lowercased, or every legal value is rejected. And the value check must **skip `null`
   wildcards** — otherwise it throws or rejects every wildcard.
5. **Batch conflicts are group-partitioned.** Compare members only within their own
   `(location, itemCategory)`. Otherwise a batch creating a catch-all for two locations is
   rejected 409, because two catch-alls share an empty key set.
6. **Never return the repository object.** `toDomain` carries `shopId` and `propertiesCanonical`;
   the DTO carries neither. Map through `toLocationStockDto`.

## Granted delegations — yours on purpose

D10, D11, D12 in the plan's Notes. Take them; they are not ambiguity to escalate and a reviewer
will not treat them as findings.

## Evidence budget

`npm run typecheck` at baseline and close · `verify-all.ts` on a **scratch DB copy** made with
`sqlite3 prisma/dev.db ".backup '<dest>'"`, never `cp` · the purity grep · the Manual Scenarios
checklist. **The closing pass is taken on the tree you hand over**; change anything after it and
re-take it. Nothing beyond these for extra confidence.

## Closing protocol

1. **Instruments on the final tree:** typecheck 0 · purity grep empty · `verify-all.ts` all-PASS
   on a scratch copy · the Manual Scenarios checklist executed, expected-vs-observed per step.
   Paste the verify output and the scratch path into the plan's Review log.
2. **Perimeter:** every file *you* changed is in the plan's list. Declare anything else.
3. **Checkpoint commit** on `warehouse-stock-backend`, subject prefixed
   `CHECKPOINT (not approved):`, **adding your paths explicitly**. Standing authorization — do not
   stop to ask. Never `main`.
4. **Handoff** at `handoffs/implementer/handoff_plan3_implement_1.md`, frontmatter `plan: 3`,
   `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`, `actor:`. Body: a per-row account
   for all **31** lettered rows (which scenario or instrument discharges each); your **full write
   perimeter**; the checkpoint SHA; which delegations you exercised; and anything you believe the
   plan got wrong, as a candidate criterion or a note — never a silent deviation, never a silent
   fix. Say plainly which manual scenarios you could not run and why.
5. **Do not touch** the master plan tracker or any plan file outside its Review log.

## Report back

For the product owner, who has not read the plan: what you did · what you found and what it means
for them · what happens next · what needs them. Plain words, no section numbers or `file:line`;
the detail lives in the handoff, named by one pointer line.
