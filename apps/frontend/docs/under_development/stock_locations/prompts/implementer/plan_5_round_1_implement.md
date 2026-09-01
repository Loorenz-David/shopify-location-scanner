---
plan: 5
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 5 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P5 of the stock-locations frontend build — the
**first UI phase**. You build exactly what the plan's acceptance criteria require, prove each
one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_5_settings_ui.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

P4 made the whole feature exercisable headlessly: stores, controllers, the actions facade and
the WS flows all run against mocks with no UI at all. **This phase gives the settings half of
the feature a face** — the design language in code, plus screens 06 (Stock locations root) and
07 (Location detail), wired into the shell.

Because the logic already exists and is approved, your job is rendering and binding, not
deciding. **Bind only through `stock.actions`, store selectors, and the P3 domain functions.**
If you find yourself wanting a computation that does not exist, that is a routed finding — say
so and stop; do not add domain logic here.

**The automated criteria are a floor, not the bar.** Visual fidelity to `06.png` / `07.png` is
the owner's approval pass on the running app (S5). Get the screens genuinely close to the
mockups; the RTL rows only catch what RTL can catch.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**, **P2**, **P3** and **P4** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P5**'s **state cell** reads `PROMPT_READY` — not `IMPLEMENTING`, `IMPLEMENTED` or `APPROVED`. Read the state cell, not the whole row: note cells legitimately mention other phases' states | `master_plan.md` §4 |
| G4 | `src/features/stock/` has no `ui/` directory yet | `ls src/features/stock/` |
| G5 | `src/features/stock/actions/stock.actions.ts` and `stores/`, `controllers/`, `flows/` all exist — this phase binds to them | `ls src/features/stock/` |
| G6 | `domain/stock-criteria.domain.ts` exports `deriveBands` — C4 computes against it | the file |

All were re-tested against the committed tree at dispatch. **Do not gate on a clean working
tree** — `package.json` and `package-lock.json` are legitimately dirty here. The coordinator owns
every tracker transition; **do not edit the tracker**.

## 3. Read order

1. `plans/plan_5_settings_ui.md` — the phase, **including its Notes**, which carry this
   phase's main trap and the one fixture edit you are authorized to make
2. `master_plan.md` §3 (labor rules), §6 (UI registry, Shell wiring, Fonts), §9 (standing rules
   — **S2** allowlists, **S5** the visual gate, **S6** the lint baseline, **S10** discriminating
   inputs), §10 (environment and test scopes)
3. `intention/raw_intention.md` §3 **W1**, §4A **MC1, MC8**, §7 (**the mockup corrections — read
   these before the screenshots, they override what you will see**), §9A (**D2, D3, D5**)
4. `design_handoff/00-global/00-global.md`, then `06-stock-locations/` and `07-location-detail/`
   — the `.md` **and** the screenshots in each `screenshots/` folder
5. `context/design-language.md` and `context/frontend-architecture.md` §3 — the repo's existing
   page/shell idiom. Match it; do not invent a new one.
6. **The shipped P1–P4 code** under `src/features/stock/`. Reality outranks every document
   above; a disagreement is a finding you report rather than paper over.

## 4. Things that are easy to get wrong here

- **The mockups are known to be wrong in places.** Intention §7 lists the corrections and they
  win. Two are load-bearing on screen 07 (D2/D3): the header shows the **location code only** —
  **no zone name, no Rename control** — and C5 asserts those strings are absent.
- **Screen 06 shows no quantities and no states.** Only a location code, a mono badge and an
  instance count. C2 asserts the absence.
- **State colors and labels come from MC1 meta, never from literals** (S2). The shipped
  `stock-allowlist.test.ts` guard must keep passing untouched — no state name, order index or
  hex outside the state domain. That guard is not yours to edit.
- **The five-band strip renders `deriveBands` output**, computed — never a hand-typed set of
  five labels.
- **`any property` is italic** when an instance has no property chips (MC8).
- **The dashed "New location" row opens the wizard restricted to instance-less locations** (D3)
  — that selector already exists in P4; call it, do not recompute it.

## 5. The trap this phase is most likely to fall into

Three rows (C4, C6, C7) compare something rendered against a domain function the test computes.
**That shape proves the call site and says nothing about the argument** unless a wrong argument
would change the output. Plan 4's C9 shipped exactly this way — satisfiable by a controller that
ignored its vocabulary entirely — and it took a mutation probe to find it. Master plan **S10**
records the rule.

Concretely, verified on the tree: **all four instances in `get-stock-location-detail.fixture.ts`
carry identical thresholds (10/15/20)**, so `deriveBands` returns the same five labels for every
one of them, and a component that renders the first instance's bands on every card would pass C4
as written. Vary one instance's thresholds — the plan's Notes authorize that edit and scope it —
and assert each strip separately. Same reasoning for C6: **tap a card other than the first**.

## 6. Named mutations — the protocol

The plan names **exactly 1**: **C4 / M1** — at the threshold-strip call site, pass the first
instance's thresholds to every card; C4 must red. Apply it at the call site, run, **observe C4
red**, restore, re-run green.

A mutation that reds nothing is a **finding** — report it, and fix the criterion's input rather
than the production code, because that is what a green mutation means. **Run the probe
unfiltered** (whole suite, no `-t`) and report the full set of rows it reddens; every phase so
far probed under a filter and under-reported its blast radius.

## 7. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree.

**Baseline: 106 tests, 12 files, all passing. Typecheck clean.**
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
S6 measures against that baseline — lint is **not** required to come back clean, and you must
**not** fix unrelated files. Required: **zero** problems in any file you create or touch. Report
both numbers.

## 8. Hard constraints

- **Perimeter.** `src/features/stock/ui/*` (+ RTL tests), `src/index.css`, `src/assets/icons/*`,
  `src/features/home/lazy-pages.tsx`, `src/features/home/HomeFeature.tsx`,
  `src/features/settings/domain/settings-options.domain.ts`, and — **only to vary thresholds** —
  `src/features/stock/api/mocks/get-stock-location-detail.fixture.ts`.
- **Do not touch `stock-allowlist.test.ts`, the API layer, or any P1–P4 domain, store,
  controller, flow or actions file.** Those phases are approved and their criteria were proven
  against the shipped shapes. If one needs a change, **stop and report**.
- After the fixture edit, run the full suite. Three files import that fixture. **If an approved
  P1–P4 test reds, report it — do not edit that test.**
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`. Owner
  instruction, no exceptions.
- **Enumerate, never sample** (charter rule 2). C1 wants both settings rows; C4 wants every
  instance's strip, not one; C7 wants two states.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Every previous phase did this at least once, and every time it was right.

## 9. Closing

Handoff at `handoffs/implementer/handoff_plan_5_implement_1.md`, frontmatter `plan: 5`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the mutation with file, line, received value, and every row
it reddened → your full write perimeter → the closing L4 stamp with all three numbers → anything
you found and did not change.

**Additionally, because this phase ends at the owner's eyes:** tell the owner plainly how to see
it running (which page, how to reach it), and list anything you knowingly approximated against
the mockups. The owner's visual pass is the real gate — make it cheap for them.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require, get the screens close to the mockups, and stop. No refactors of
P1–P4, no extra abstraction, no hardening nobody asked for. If you notice something worth
knowing, write it in the handoff rather than fixing it.
