---
plan: 5
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — P5 implement (round 1)

## Your role

You implement **phase 5**: the stock **report** — one query, one endpoint, one committed
verification script.

This is the smallest phase in the project and the last one before closeout. It is a **pure read**.
You add no mutation path, you change no stored value, and you touch no behaviour any earlier phase
shipped.

**Load your doctrine first.** Plain markdown; read both in full and follow them as doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Doctrine beats this prompt. **The plan file beats this prompt** — `plans/plan_5_report.md` is your
task list.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
```

If a path lacks `-warehouse-stock-backend`, you are in the wrong tree and your work will be lost.

**No sibling session is running.** P3 and P4 ran in parallel; that is over — both are APPROVED and
closed. The tree is yours alone, `git status` is clean, and any file you did not change appearing
in it **is a finding**, not a sibling's work.

## Gate check — before reading anything else

Stop and report if any line fails.

1. `intention/raw_intention.md` line 3 reads exactly `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **P3 is APPROVED and present:** `src/modules/stock/{controllers/stock.controller.ts,routes/stock.routes.ts}`
   exist and `stock.contract.ts` exports `toLocationStockDto`.
4. **Your own files do not exist:** `src/modules/stock/queries/get-stock-report.query.ts` and
   `scripts/verify-stock-report.ts`.
5. `npm run typecheck` exits 0, and on a **scratch copy**
   `npx tsx scripts/verify-all.ts` prints `SUMMARY PASS 2 script(s)` (58 P1 rows + 20 P2 rows).
   Those are your baselines; the same command must pass at close with **3** scripts.

## Read order

1. `master_plan.md` — §5, **§6.4–§6.5** (the registry is fixed; §6.4's `verify-stock-report.ts`
   row was **corrected 2026-09-02** — read the corrected text, not a memory of "aggregation
   rows"), §9 (deviations, incl. §9.7/§9.8 and standing instruction 9), §10.
2. `plans/plan_5_report.md` — **your task list**, in full, including every Note and the Review
   log. The Review log records what the §26 rewrite removed, so you do not rebuild it.
3. The semantic authorities its Read-first list names — above all **intention §26** in full
   (§26.1–§26.5; locate it by its heading `26. Report Contract`, **never by line number** — line
   citations in this project have drifted more than once), which **wins over §19 and context §0.19**. Read §19's superseded marker before §19.
4. P2's repository (`listByShop`, and the stored `propertiesCanonical` column) and P1's domain
   (`STOCK_STATES`, `canonicalCriteriaString`) as authorities on what you may call.
5. `scripts/verify-stock-reconciliation.ts` — **the template for your own script**: its
   `refuseDatabase` guard (`process.exitCode = 3`), its scratch-path resolution, its one-PASS-line-
   per-row output shape.
6. P3's shipped controller and routes — you add to them; you do not restructure them.

## What this project does differently — binding

1. **No test suite and you are not building one.** `npm test` fails by design; charter rule 1 is
   exempted project-wide. **Do not install a test framework or write `*.test.ts`.** Your
   instruments are `npm run typecheck`, the purity grep, and the script you author.
2. **This phase's criteria are discharged by `scripts/verify-stock-report.ts`, not by eye.** The
   three curl steps prove only that HTTP delivers what the script already proved about the data.
3. **`scan-history.repository.ts` is out of perimeter for every phase.**

## Hard scope fences

- **Do not implement compaction, state filtering, ordering or location ranking** (§26.3). They
  moved to the client. Adding any of them is a **defect, not a bonus** — a reviewer finding.
- **No mutation path.** No command, no write, no reconciliation call.
- **Additions only** in `stock.contract.ts`, `stock.controller.ts`, `stock.routes.ts`. P3's
  approved logic stays byte-identical; if something in it looks wrong, **stop and report**.
- **Do not edit P1's or P2's files** (`domain/*`, `item-property-options.ts`,
  `location-stock.repository.ts`, `stock-reconciliation.service.ts`, `verify-stock-domain.ts`,
  `verify-stock-reconciliation.ts`). Your `verify-all.ts` edit is the **`EXPECTED_SCRIPTS`
  constant only**.
- Nothing beyond the registry and this phase's criteria.

## Inherited hazards — not optional

Each fails by producing a **plausible wrong answer**, never an error.

1. **Build `mergeKey` from the stored `propertiesCanonical` column, never by re-canonicalizing
   `properties` in the query.** The column already *is* the §23.1 identity and the repository keeps
   it in sync on every write. Recomputing it creates a second implementation of canonicalization
   (§21/§0.5 forbid this) and diverges silently the moment the two disagree. A config created with
   scalar `{wood_type:"Teak"}` and one created with `{wood_type:["Teak"]}` are **the same
   criterion** and must produce **the same key**; that is C2(b), and it is the row the reviewer's
   planted defect targets.
2. **`properties` in an entry is the configuration's canonical criteria — not an item's property
   bag.** They are different shapes with similar names (C3(b)).
3. **C1(d) is vacuous unless your fixture seeds a second `Shop`.** The database holds exactly one.
   Seed a throwaway second shop (it needs only a unique `shopDomain`), give it a definition, and
   assert that definition does **not** appear. A row that passes because there was nothing to
   exclude has measured nothing.
4. **One assertion function per lettered row** (P2 review N1). P2's script discharged 20 rows with
   9 functions, so one broken assertion reddened five rows with a message matching none of them.
   Fixtures may be shared; **assertions must not be**. Each row gets its own failure message
   naming that row's predicate.
5. **Query parameters are ignored, not rejected** (§26.1). There is no 400 path for them, so do
   not write a query-parameter zod schema. C3(c) asserts a parameterized call returns the
   **byte-identical** payload.
6. **A definition matching zero items is included**, with `quantity: 0` / `out_of_stock` — never
   omitted. It is the report's most urgent signal (C1(b)).
7. **`verify-all.ts` needs `"verify-stock-report.ts"` in `EXPECTED_SCRIPTS`, in the same commit**
   (§6.4). The runner already auto-discovers your script, so this is not what makes it run — it is
   what makes a later deletion or rename report `MISSING` instead of vanishing.

## Not yours, and not an oversight

**§26.4's safety property** — the client must group on `mergeKey` **+ `stockState`**, or low stock
in one location is hidden by healthy stock in another. No criterion here can observe it; it belongs
to the frontend's ledger. It is recorded in the plan so nobody mistakes its absence for a gap. **Do
not invent a criterion for it.**

## Evidence budget

`npm run typecheck` at baseline and close · `verify-all.ts` on a **scratch DB copy** made with
`sqlite3 prisma/dev.db ".backup '<dest>'"`, **never `cp`** (WAL) · the purity grep · the three
manual curl steps. **The closing pass is taken on the tree you hand over**; change anything after
it and re-take it. Your script must **refuse** (exit 3) when `DATABASE_URL` resolves to
`prisma/dev.db` — and you should prove that refusal fires, once.

## Closing protocol

1. **Instruments on the final tree:** typecheck 0 · purity grep empty · `verify-all.ts` all-PASS on
   a scratch copy, now `SUMMARY PASS 3 script(s)` with your rows visible · the three curl steps,
   expected-vs-observed. Paste the verify output and the scratch path into the plan's Review log.
2. **Perimeter:** every file you changed is in the plan's list — five files plus the
   `EXPECTED_SCRIPTS` line. Declare anything else.
3. **Checkpoint commit**, subject prefixed `CHECKPOINT (not approved):`, **explicit paths only**,
   never `git add -A`. Standing authorization — do not stop to ask. Never `main`.
4. **Handoff** at `handoffs/implementer/handoff_plan5_implement_1.md`, frontmatter `plan: 5`,
   `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`, `actor:`. Body: a per-row account
   for all **14** lettered rows (C1 a–d, C2 a–f, C3 a–d), naming which instrument discharges each
   and marking any discharged by code inspection rather than execution; your **full write
   perimeter**; the checkpoint SHA; the planted-defect probe if you ran one; and anything you
   believe the plan got wrong, as a candidate criterion or an upstream note — **never a silent
   deviation, never a silent fix**. *P3's handoff caught a real contract defect that way; that
   section is not a formality.*
5. **Do not touch** the master plan tracker or any plan file outside its Review log.

## Report back

For the product owner, who has not read the plan: what you did · what you found and what it means
for them · what happens next · what needs them. Plain words, no section numbers or `file:line`;
the detail lives in the handoff, named by one pointer line.
