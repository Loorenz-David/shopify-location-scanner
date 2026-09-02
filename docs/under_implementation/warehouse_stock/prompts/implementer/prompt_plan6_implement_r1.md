---
plan: 6
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — P6 implement (round 1)

## Your role

You implement **phase 6**, the project's last: **two maintenance scripts**, and the **final
regression run** that proves no phase silently broke an earlier one.

P1–P5 are all APPROVED and closed. **You add no feature code.** If you find a defect in shipped
behaviour, it is a **stop-and-report** that routes back as a fix cycle on the owning phase — never
a patch here.

**Load your doctrine first.** Plain markdown; read both in full and follow them as doctrine:

```
/Users/davidloorenz/agent-skills/pipeline-charter.md          ← shared authority, read FIRST
/Users/davidloorenz/agent-skills/implementation-executor.md   ← your role
```

Doctrine beats this prompt. **The plan file beats this prompt** —
`plans/plan_6_maintenance_verification.md`.

## Workspace

```
repo root      /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify-warehouse-stock-backend
branch         warehouse-stock-backend
backend root   <repo root>/apps/backend          ← EVERY command runs from here
```

No sibling session is running; the tree is yours and `git status` is clean.

## Your scope is C1, C2 and C5 — six rows. C3 and C4 are not yours.

- **C3 is already discharged** by the product owner's attestation (2026-09-02). It needs the
  frontend, Redis, the worker and a Shopify admin edit. **Do not attempt it, and do not record a
  result for it.** The plan states its exact boundary.
- **C4 is the coordinator's** ledger closeout.

Report on **C1(a)(b)(c), C2(a)(b)(c), C5** — six rows. Say nothing about the other two beyond
noting they are out of scope.

## Gate check — before reading anything else

1. `intention/raw_intention.md` line 3 reads exactly `**Status: RATIFIED**`.
2. `git branch --show-current` prints `warehouse-stock-backend`.
3. **P3/P4/P5 are all APPROVED** — `master_plan.md` §4's rows say so.
4. **Your own files do not exist:** `scripts/report-stock-property-drift.ts`,
   `scripts/rebuild-location-stock.ts`.
5. Baseline on a **scratch copy**: `npx tsx scripts/verify-all.ts` prints
   `SUMMARY PASS 3 script(s)` with **58 + 20 + 19 = 97** rows PASS, and `npm run typecheck`
   exits 0.

## Read order

1. `plans/plan_6_maintenance_verification.md` — your task list, in full, including C3's
   discharge note and C5's corrected wording.
2. `master_plan.md` §6.4 (the instrument table **and its earned note** — read why `MISSING` is
   judged against `EXPECTED_SCRIPTS` and never against that table), §9, §10.
3. `scripts/reconcile-active-sold-items.ts` — **the convention source**: `DRY_RUN`, `SHOP_ID`,
   tsx, direct `src/` imports, output style.
4. `scripts/verify-stock-reconciliation.ts` — the scratch-DB refusal guard (`process.exitCode = 3`)
   and path resolution. **Your rebuild script is destructive and needs the same guard.**
5. `src/shared/item-properties/item-property-options.ts` — `ITEM_PROPERTY_OPTIONS`, the map C1
   reports against.
6. P2's `stock-reconciliation.service.ts` — `reconcileAllGroups(shopId, hooks?)`, which the
   rebuild script wraps.

## What this project does differently — binding

1. **No test suite and you are not building one.** Your instruments are `npm run typecheck`, the
   purity grep, `verify-all.ts`, and the two scripts' own observed behaviour.
2. **Neither new script is a `verify-*.ts`**, so `verify-all.ts` must **not** be edited and
   `EXPECTED_SCRIPTS` must **not** grow. If you find yourself editing it, stop.
3. **`scan-history.repository.ts` is out of perimeter for every phase.**

## Hard scope fences

- **Two new files. Nothing else.** No feature code, no migration, no index, no edits to P1–P5's
  shipped files.
- A defect in shipped behaviour is a **stop-and-report**, not a fix.

## Inherited hazards — not optional

1. **The rebuild script writes. Guard it like the verify scripts do** — refuse with exit 3 when
   `DATABASE_URL` resolves to the configured `prisma/dev.db`, and honour `DRY_RUN=1` by printing
   per-config `current → computed` deltas and writing **nothing**. C2(a) proves the dry run is
   inert with a **checksum before and after**, so a stray write is visible.
2. **The drift script is read-only** — C1(c) checksums `dev.db` before and after. No write, no
   `updatedAt` touch, no reconciliation call.
3. **Expect keys outside the map, and do not report them as drift.** Live data carries
   `dimensionss`, `designer`, `material_type`, `extensions_quantity` (plural — note the map has
   `extension_quantity`, singular) and others. The map defines what is **configurable**, not what
   Shopify sends. Task 1 scans *the map's* keys.
4. **Values are tokenized before comparison** — a stored `"Oak, Teak"` is two atomic tokens, not
   one unknown value. Reuse P1's `tokenizePropertyValue`; do not write a second splitter (§21/§0.5).
5. **A group without a catch-all legitimately sums short** of its physical inventory (§0.21).
   If your rebuild output shows that, it is expected, not drift.

## Evidence budget

`npm run typecheck` at baseline and close · `verify-all.ts` on a **scratch DB copy** made with
`sqlite3 prisma/dev.db ".backup '<dest>'"`, **never `cp`** · the purity grep · both scripts run
against a scratch copy, with the planted-value and planted-drift steps and the two checksums.
**Destructive steps never touch `prisma/dev.db`.**

## Closing protocol

1. **Instruments on the final tree:** typecheck 0 · purity grep empty · **C5's run pasted whole**
   into the plan's Review log — this is the project's single strongest piece of evidence that no
   phase silently broke an earlier one, so paste the full output, not a summary.
2. **Perimeter:** exactly the two new scripts. `verify-all.ts` must not appear in your diff.
3. **Checkpoint commit**, subject prefixed `CHECKPOINT (not approved):`, **explicit paths only**.
   Standing authorization. Never `main`.
4. **Handoff** at `handoffs/implementer/handoff_plan6_implement_1.md`, frontmatter `plan: 6`,
   `role: implement`, `round: 1`, `state: IMPLEMENTED`, `date:`, `actor:`. Body: a per-row account
   for **your six rows**, the two checksums, the full C5 output, your write perimeter, the
   checkpoint SHA, and anything you believe the plan got wrong as a candidate upstream note.
   *That section has caught a real defect in three consecutive rounds; it is not a formality.*
5. **Do not touch** the master plan tracker or any plan file outside its Review log.

## Report back

For the product owner: what you did · what you found and what it means for them · what happens
next · what needs them. Plain words. **If either script's output shows a number you cannot
explain, say so** — this is the last phase, and an unexplained number here is the last chance
anyone gets to notice it before the project closes.
