---
plan: 10
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 10 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P10 — the **final phase** of the stock-locations
frontend build. Read these two files first, by absolute path, and follow them as this session's
doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_10_live_integration.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

Every build phase is APPROVED. The backend is merged into this repo and the owner has already run
real traffic through the feature. **This phase is verification, not construction** — its job is to
prove the seam holds in a production build and to close the gaps live use has not yet touched.

Write code only to fix a defect this phase finds. If you find yourself adding a feature, stop.

## 2. Read this before planning your work — most of the contract is already proven

Master plan **§7C** records what was verified against the real database and the merged backend
source. **Do not re-derive any of it**: casing is lowercase on the wire with a display-cased
vocabulary; `mergeKey` is `itemCategory|propertiesCanonical` with no location and no state;
`propertyOptions` key order matches the fixture exactly, so **there is no vocabulary drift**; the
409 carries `conflictingId` and the owner has seen the banner render; DELETE returns `{ ok: true }`
as typed; create works, with three real definitions in the database. The doubled-`/api` hazard
task 1 warns about is already guarded at `api/stock-api.test.ts:268`.

**What is actually left is the plan's Notes list**, and the two entries most likely to be skipped
are the ones that need setup rather than code:

- **The report has never been seen with real, non-zero numbers.** Every live definition sits at
  `quantity 0` / `out_of_stock`, so row ordering, the counter tiles and MC3a's group ranking have
  never run against real data. **Scan stock in first** — the backend track's
  `docs/under_implementation/warehouse_stock/verification/end-to-end-runbook.md` §2 is the
  procedure — or C3's report clause proves nothing.
- **The download fallback has never run in the browsers it exists for.** See §5.

## 3. Gate check

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**–**P9** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P10**'s **state cell** reads `PROMPT_READY` | `master_plan.md` §4 |
| G4 | `api/stock-api-mode.ts` exists and resolves `mock` only on an explicit `"mock"` value | the file |
| G5 | The backend is present in this repo (`apps/backend/src/modules/stock/`) and its migration is applied — `npx prisma migrate status` in `apps/backend` reports nothing pending | the repo |

**Do not gate on a clean working tree**; see §4. The coordinator owns every tracker transition;
**do not edit the tracker**.

## 4. You are sharing this working tree (S12)

The owner runs a continuous stream against the stock screens and it is **no longer only visual** —
it now includes new domain files (`stock-location-groups.domain.ts` and its tests,
`stock-category-images.domain.ts`, `StockCategoryThumbnail.tsx`, `src/share/location-codes/`).
Some of it may be uncommitted while you work.

- **Stage explicit paths only. Never `git add -A`** (**S11**).
- **Never `git checkout` a file you did not write** — restore probes from a byte copy you made.
- **A red outside your perimeter is a report, never a repair.**
- **Measure your own baseline** — 162 tests at P9's approval, and the owner's stream moves it.
- Record the digest of any foreign diff at your stamp.

## 5. The inherited hazard you must actually test in a browser

P8's `downloadPdf` **revokes the object URL synchronously and never attaches the anchor to the
document**. That works in Chrome and WebKit-on-iOS and is exactly the pattern that **fails in
Firefox and desktop Safari** — which are precisely the browsers the anchor fallback exists for,
being the ones without `navigator.share`.

No unit test settles this: jsdom has no download behaviour, and P8's C7(b) asserts only that
`createObjectURL` and `click` were called. **Open the app in Firefox and in desktop Safari, export
a PDF, and confirm a file lands on disk.** If it does not, the fix is to append the anchor to
`document.body` before clicking and revoke the URL on the next tick — a defect fix, in scope.

## 6. Named mutations — the protocol

The plan names **exactly 1**: **C1 / M1** — invert the seam's default resolution so an unset flag
yields `mock`; C1 must red. Apply it, run, **observe C1 red**, restore, re-run green.

This is the phase's worst failure and the reason charter rule 10 exists: **a production build that
silently serves fixtures looks completely healthy** — every screen populates, nothing errors — while
showing invented stock to real people. Prove the guard fails.

**Run the probe unfiltered** (whole suite, no `-t`) and report every row it reddens.

## 7. Evidence budget and the manual clause

- L1/L2 unbudgeted while working. **L4: exactly 1 closing stamp.**
- **C3 is an explicit charter rule 1 exemption**: it is manual, environment-lifecycle work. Record
  it in the Review log **with date and actor**, stating exactly what you did and observed, in
  enough detail that the owner can repeat it. An unrepeatable manual claim is worth nothing.
- Where a manual check has an automated proxy (C2, plus P4's C5/C6 suites), say which parts the
  proxy covers and which parts only the manual run did.

**Lint baseline: 48 errors / 14 warnings.** Zero problems in any file you create or touch.

## 8. Hard constraints

- **No new features, no UI changes** beyond a defect fix this phase's own criteria surface.
- **Do not touch** `apps/backend/` source. If the wire disagrees with contract v1.4, that is a
  **finding routed to the backend track** (filing rule: master plan §2), never absorbed silently
  and never patched on the frontend to compensate.
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`.
- **The mock fixtures stay.** Only the default path flips; mock mode remains available for
  development and is what the tests use.
- **Enumerate, never sample** (charter rule 2). C2 wants all seven endpoints, one row each, each
  distinguishable from the others.
- If a criterion cannot be satisfied as written, **say so and stop**. Every previous phase did this
  at least once, and every time it was right.

## 9. Closing

Handoff at `handoffs/implementer/handoff_plan_10_implement_1.md` — that exact name.

Body: owner-readable opening → criterion-by-criterion evidence → the mutation with every row it
reddened → **the manual C3 run, written so the owner can repeat it** → the browser check of §5 with
its result → your write perimeter plus any foreign diff → the closing L4 stamp with the baseline you
measured → findings, separating *routed to the backend track* from *fixed here*.

**This is the last phase.** In the final chat message, tell the owner plainly what is now proven
end to end and what remains outstanding — including the §7D visual-polish pass, which is theirs and
deliberately deferred.

Commit your own checkpoint(s) with **explicit paths**; the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Prove the seam, fix what is broken, and stop.
