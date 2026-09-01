---
plan: 2
role: implementer
round: 1
date: 2026-09-01
---

# Session prompt — P2 implement (round 1)

## Your role

You implement **phase 2** of the Location Stock System: the stock repository (all Prisma access
for the two tables P1 created), the group reconciliation service with its double-pass, and two
committed verification scripts. You are the only actor writing code in this phase.

**Load your doctrine first, before reading anything else.** These are plain markdown; read both
in full and follow them as this session's doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Where this prompt and the doctrine differ, the doctrine wins. **Where this prompt and the plan
file differ, the plan file wins** — `plans/plan_2_repository_reconciliation.md` is your task
list; this prompt only frames the session.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
project docs   <repo root>/docs/under_implementation/warehouse_stock
```

**This is a git worktree and the path matters.** A sibling checkout exists at
`…/Item-Scanner-Shopify` on `main`, where the frontend is built in parallel. If a path you are
about to open does not contain `-warehouse-stock-backend`, you are in the wrong tree and your
work will be silently lost — neither `git status` nor any perimeter check will tell you.

## Gate check — run before reading anything else

Stop and report if any line fails.

1. `docs/under_implementation/warehouse_stock/intention/raw_intention.md` line 3 reads exactly
   `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **P1 is APPROVED and present:** `src/modules/stock/domain/` contains `stock-state.ts`,
   `property-criteria.ts`, `best-match.ts`, `conflict.ts`; `src/shared/item-properties/item-property-options.ts` exists.
4. **Your own files do not exist yet:** `src/modules/stock/contracts/`,
   `src/modules/stock/repositories/`, `src/modules/stock/services/`,
   `scripts/verify-stock-reconciliation.ts`, `scripts/verify-all.ts`.
5. `npm run typecheck` exits 0, and `npx tsx scripts/verify-stock-domain.ts` reports
   **58 PASS / 0 FAIL / exit 0**, before you change anything. Those are your baselines: any
   later failure is yours.

## Read order

1. `master_plan.md` — §5, §6.1–§6.4 and §6.6 (**the registry is fixed**; read the three dated
   fix notes in §6.2 carefully — two of them exist because earlier wording was wrong), §9
   (project deviations), §10 (environment, especially §10.1's DB-safety rule).
2. `plans/plan_2_repository_reconciliation.md` — **your task list**, in full, including every
   Note and the Review log.
3. The semantic authorities its Read-first list names, and only those.
4. `.github/instructions/backend-contracts.instructions.md` — the declared architecture
   contract. P2 is where "Prisma only in repositories" and "transactions belong in services"
   actually bite. Read in full.
5. `src/modules/zones/repositories/zone.repository.ts` — the repository idiom you copy.
6. **P1's shipped code** — read it as an authority on what you may call and on the
   preconditions those functions carry. You may **not** change it (see fences).

## What this project does differently — binding

1. **No automated tests and you are not building one.** No runner, no test files; `npm test`
   fails by design. Charter rule 1 is exempted project-wide. Your instruments are exactly:
   `npm run typecheck`, the purity grep, and the two verify scripts you write.
   **Do not install a test framework, do not add a `test` script, do not write `*.test.ts`.**
2. **`src/modules/scanner/repositories/scan-history.repository.ts` is out of perimeter for every
   phase.** You may *read the `ScanHistory` table* through your own repository — that is task 2
   and it is deliberate, following the `stats` precedent — but you may not edit that file.
3. **Domain purity.** `src/modules/stock/domain/` and `item-property-options.ts` import no Prisma
   and no I/O. The grep runs at close.

## Hard scope fences

You are building a repository, a service, and two scripts. **Not** in this phase, and writing
any of it is a defect rather than a head start:

- **No HTTP** — no controller, no routes, no `server.ts` edit, no zod schemas. That is P3.
  Your `contracts/stock.contract.ts` holds **types only** this phase; P3 adds the schemas.
- **No commands** (`create-`/`update-`/`delete-location-stock`) — P3.
- **No item-flow hooks, no `applyItemStockChange`** — P4. **No report** — P5.
- **No edit to P1's frozen files.** `src/modules/stock/domain/*`,
  `src/shared/item-properties/item-property-options.ts` and `scripts/verify-stock-domain.ts`
  are APPROVED and outside this perimeter. If one of them looks wrong, **stop and report** —
  do not fix it, and do not work around it silently.
- **Nothing beyond the registry and this phase's criteria.**

## Inherited hazards — not optional

These come from P1's review and P2's projection. Each is already in the plan; they are repeated
here because each is a defect that has actually been reasoned about, not a general caution.

1. **Two different shapes share the word "properties."** A *configuration's* `properties` are
   canonical criteria — values are string **arrays** or `null`. An *item's* `properties` are a
   flat bag of **strings**. The `Json → Record<string,string> | null` reduction belongs to
   `listEligibleItems` (the item path) and **must never be applied in `toDomain`** (the criteria
   path), where "drop non-string values" would delete every criterion. Master plan §6.2 says so
   explicitly, and says so because it once said the opposite.
2. **`canonicalCriteriaString` sorts keys but not values**, and assumes its input already passed
   through `normalizeCriteria`. `propertiesCanonical` and the four-column unique index both rest
   on it — and so will P5's merge key. Normalise on **every** write path, not just the obvious
   one.
3. **`logger.error` writes to stderr; `logger.warn` and `info` write to stdout**
   (`shared/logging/logger.ts:10-18`). Your verify script asserts on an error (C2(c)) and on a
   warning (C4(b)). Capture **both** streams and assert on the parsed JSON context object — a
   script capturing one stream silently observes nothing for the other row, and a row written as
   "no exception was thrown" instead of "the log was emitted" passes vacuously.
4. **The refusal predicate in task 5 protects a 290 MB database of real data.** An **unset**
   `DATABASE_URL` is the dangerous case, not the safe one — Prisma falls back to `.env`, which
   points at the configured `dev.db`. Refuse on unset or empty, and compare resolved absolute
   paths, never substrings.
5. **`calculateStockState` throws** when a config's thresholds are not exactly the three
   configurable states. The plan's decision is to let that propagate; task 1(a) is what makes it
   unreachable through your code, so write thresholds in the config's own transaction.

## Granted delegations — yours on purpose

Recorded in the plan's Notes as D11, D14, D15. They are decisions the projection judged genuinely
yours; take them and follow the stated recommendation. They are **not** ambiguity to escalate,
and a reviewer will not treat them as findings.

## Evidence budget

No suite, so the charter's L1–L4 ladder does not apply as written. Your budget:

- `npm run typecheck` — at the baseline and again at close.
- Your two verify scripts — run them freely as you build; they are yours and cheap.
- **The closing pass is mandatory and taken on the tree you actually hand over.** Change
  anything after taking it and you take it again — a re-take after a change is not over-budget,
  it is the only correct stamp.
- The purity grep at close.

Do not run instruments beyond these for extra confidence, and never paste an earlier run's
output as the closing stamp.

## Closing protocol

1. **Instruments, on the final tree:** `npm run typecheck` exit 0 · purity grep empty ·
   `npx tsx scripts/verify-all.ts` **all-PASS on a scratch DB copy**, which must chain P1's
   `verify-stock-domain.ts` as well as your own. Paste the full output and the scratch copy's
   path into the plan file's Review log. **Copy the database with
   `sqlite3 prisma/dev.db ".backup '<dest>'"`, never `cp`** — it runs in WAL mode and a plain
   copy can capture a torn state (master plan §10.1).
2. **Perimeter:** `git diff --name-only` must equal the plan's five-file list. Anything outside
   it is a finding against you — if you genuinely needed it, declare it rather than hiding it.
3. **Checkpoint commit** on `warehouse-stock-backend`, subject prefixed
   `CHECKPOINT (not approved):`. Standing owner authorization — do not stop to ask. Never `main`.
4. **Handoff** at `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan2_implement_1.md`,
   frontmatter `plan: 2`, `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`,
   `actor:`. Body must carry: a per-row account for all **24** lettered rows (which verify-script
   line, or which Manual Scenario, discharges each); your **full write perimeter**, code and
   documents, so it can be diffed rather than reconstructed; the checkpoint SHA; which of
   D11/D14/D15 you exercised and what you chose; and anything you believe the plan got wrong,
   as a **candidate criterion** or a note — never a silent deviation and never a silent fix.
5. **Do not touch** the master plan tracker or any plan file outside its Review log.

## Report back

Your final message is for the product owner, who has not read the plan: what you did · what you
found and what it means for them · what happens next · what needs them (or one line saying
nothing does). Plain words — no section numbers, no `file:line`; the detail lives in the handoff,
named by one pointer line.

One thing worth saying plainly if it happens: this phase writes the first code that *touches the
database*, and its reconciliation service is what every later phase relies on to repair drift. If
any part of it is more fragile than it looks, that is the most useful thing you can tell us.
