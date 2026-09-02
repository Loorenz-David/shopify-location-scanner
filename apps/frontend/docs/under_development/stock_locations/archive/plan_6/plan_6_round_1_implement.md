---
plan: 6
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 6 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P6 of the stock-locations frontend build — the
second UI phase. You build exactly what the plan's acceptance criteria require, prove each one,
and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_6_wizard_ui.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

P5 shipped the two settings screens, and the owner has approved them visually. Every way into
the wizard — the dashed `New location` row, the root `New instance` pill, and tapping an
instance card — currently opens a **placeholder** panel (`StockWizardPendingView`, in
`ui/StockLocationsPage.tsx`). **This phase replaces that placeholder with the real two-step
wizard**, screens 08 and 09.

The logic is already built and approved: P3 owns criteria and thresholds, P4 owns the draft
lifecycle, prefill, submit and 409 mapping. **Bind through `stock.actions`, store selectors and
the P3 domain functions.** If a computation you need does not exist, that is a routed finding —
say so and stop; do not add domain logic here.

**The automated criteria are a floor.** Visual fidelity to `08.png` / `09.png` is the owner's
approval pass on the running app (S5). Get the screens genuinely close, and make the owner's
pass cheap: say how to reach them and what you knowingly approximated.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**–**P5** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P6**'s **state cell** reads `PROMPT_READY` — not `IMPLEMENTING`, `IMPLEMENTED` or `APPROVED`. Read the state cell, not the whole row: note cells legitimately mention other phases' states | `master_plan.md` §4 |
| G4 | `ui/StockWizardStep1View.tsx` does not exist yet | `ls src/features/stock/ui/` |
| G5 | `ui/StockLocationsPage.tsx` still contains `StockWizardPendingView` — the placeholder you are replacing | the file |
| G6 | `domain/stock-thresholds.domain.ts` exports `commitThreshold` and `deriveBands`; `domain/stock-criteria.domain.ts` exports `buildCriteria` and `renderCriteriaChips` | the two files |
| G7 | The contract's version line reads **1.4** | `backend_handoff/frontend-api-contract.md` line 4 |

All were re-tested against the committed tree at dispatch. **Do not gate on a clean working
tree** — `package.json` and `package-lock.json` are legitimately dirty here. The coordinator owns
every tracker transition; **do not edit the tracker**.

## 3. Read order

1. `plans/plan_6_wizard_ui.md` — the phase, **including its Notes and the inherited hazard**
2. `master_plan.md` §3 (labor), §6 (UI registry, the three vocabulary loaders), §9 (**S4a** the
   28/19 category split, **S5** the visual gate, **S6** the lint baseline, **S9** the two 409
   shapes, **S10** discriminating inputs), §10 (environment and test scopes)
3. `intention/raw_intention.md` §3 **W1**, §4A **MC6, MC7** (consume, do not reimplement), §7
   (**the mockup corrections — read before the screenshots, they override what you see**),
   §9A **D3, D9, D14**
4. `design_handoff/08-new-instance-step1/` and `09-thresholds/` — `.md` **and** screenshots;
   plus `00-global/00-global.md` and `06-stock-locations/06-stock-locations.md` **line 11**,
   which C8 depends on
5. `context/design-language.md`, `context/frontend-architecture.md` §3
6. **The shipped P1–P5 code** under `src/features/stock/`, especially `ui/StockLocationsPage.tsx`
   and `ui/StockLocationDetailView.tsx` — match their idiom, they passed an owner visual pass.
   Reality outranks every document above; a disagreement is a finding you report.

## 4. Things that are easy to get wrong here

- **19 of the 28 categories carry no category-specific property** (S4a, and the plan's inherited
  hazard). A picker offering only the four universal keys is the **majority case**, not an edge
  case. Do not build layout or logic that assumes at least one bound key.
- **`Any value` is a real option in the value picker** (D9), and it maps through `buildCriteria`
  to `null` — the wildcard. Do not invent a second representation.
- **Step 2's High and Out rows are derived and have no input** (MC7). Exactly three steppers.
- **Every threshold edit goes through `commitThreshold`.** D14: raising low past medium shifts
  medium in the UI. Do not clamp or re-sort locally.
- **Never retry a 409**; render the conflict and keep the form open with values intact (C6).
  Do **not** add handling for v1.4's intra-batch 409 shape — this client submits single-entry
  batches and cannot produce it (S9).
- **Property values render through the vocabulary.** Anything showing a property value needs the
  GET 4.1 options loaded on its own path — see §6 of the master plan. P5 shipped a screen that
  read `teak` where every other screen read `Teak` precisely because it inherited the vocabulary
  from wherever the user had been.

## 5. The trap this phase is most likely to fall into

Five of these rows (C2, C3, C4, C7, C8) compare something rendered against a domain function the
test computes, or against a set the test builds. **That shape proves the call site and says
nothing about the argument** unless a wrong argument would change the output. Master plan **S10**
records the rule and its three occurrences so far; the third was P5's chip casing, where the test
**seeded state the user's own path never loads** and stayed green over a real user-visible defect.

So, concretely:
- **C8 needs a fixture where the two location sets actually differ** — with every location
  occupied, or every location free, the dashed row and the pill coincide and the row proves
  nothing.
- **C7 must prefill from an instance other than the first**, against instances that differ.
- **C2 needs all three cases from the 4.1 fixture** — one universal key, one bound key, one
  excluded — not a sample.
- **Seed only what the user's own path would have already loaded.** If a screen needs the
  vocabulary, let it load the vocabulary.

## 6. C8 — the defect you are fixing, and the seam it lives on

P5 bound **both** root entry points to `initializeNewStockWizardController()` with no argument,
which returns the **instance-less** location set. That is right for the dashed `New location` row
(**D3**) and wrong for the floating `New instance` pill: design 06 line 11 says the pill opens
step 08 "with **no location preselected**" — not "with most locations missing". As shipped, a user
on screen 06 cannot add a second instance to any location that already has one, and nothing errors
— the location is simply absent from the list.

**P4's controller is approved and its C7 asserts the no-argument behavior.** Keep that passing.
Add a **distinct entry point** (a new controller function plus a facade key) for "start a wizard
over all bootstrap locations, none preselected", and point the root pill at it. Changing what the
existing no-argument call means is the wrong fix and will red P4's C7 — if that happens, stop and
report rather than editing an approved test.

## 7. Named mutations — the protocol

The plan names **exactly 1**: **C8 / M1** — point the root pill back at the dashed row's selector;
C8 must red. Apply it at the call site, run, **observe C8 red**, restore, re-run green.

A mutation that reds nothing is a **finding** — report it, and fix the criterion's input rather
than the production code, because a green mutation means the row cannot fail. **Run the probe
unfiltered** (whole suite, no `-t`) and report every row it reddens.

**Absence rows ship with guard proofs.** C4 asserts the derived rows have *no* input; prove that
row can fail by planting an input and recording the red, the way P5 did for its three absence
rows. That pattern was the best thing in the last handoff — keep it.

## 8. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once, on
  the finished tree.

**Baseline: 114 tests, 16 files, all passing. Typecheck clean.**
**Lint baseline: 48 errors / 14 warnings**, all pre-existing, all outside `src/features/stock`.
S6 measures against that baseline — lint is **not** required to come back clean, and you must
**not** fix unrelated files. Required: **zero** problems in any file you create or touch.

## 9. Hard constraints

- **Perimeter.** `src/features/stock/ui/StockWizardStep1View.tsx`, `StockWizardStep2View.tsx`,
  `StockThresholdLadder.tsx`, property-picker subcomponents (+ RTL tests), and — **narrowly
  authorized** — `ui/StockLocationsPage.tsx` (replace `StockWizardPendingView` with the real
  views; repoint the root pill for C8) and the wizard controller + `actions/stock.actions.ts`
  (**add** the new entry point of §6; do not change existing behavior).
- **Do not touch `stock-allowlist.test.ts`, the API layer, fixtures, or any other P1–P5 domain,
  store, controller, flow or UI file.** If one needs a change, **stop and report**.
- After touching `StockLocationsPage.tsx` or the controller, **run the full suite**. If an
  approved P1–P5 test reds, **report it — do not edit that test.**
- **Decide where the threshold adapter lives** (plan Notes; P5 findings F4 and judgment call 2).
  `WizardDraft.thresholds` is the DTO array, `commitThreshold` works on `{low, medium, normal}`,
  and P5 already wrote a one-way adapter inside `ui/StockThresholdStrip.tsx`. If you move it to
  the thresholds domain it needs its own criterion there and P5's copy must call it, not
  duplicate it (charter rule 4). If you keep two, say why in the handoff.
- **Do not touch the sibling worktree** `Item-Scanner-Shopify-warehouse-stock-backend`. Owner
  instruction, no exceptions.
- **Enumerate, never sample** (charter rule 2). C2 wants all three key cases; C3 wants all three
  criteria cases; C8 wants both sets.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Every previous phase did this at least once, and every time it was right.

## 10. Closing

Handoff at `handoffs/implementer/handoff_plan_6_implement_1.md`, frontmatter `plan: 6`,
`role: implementer`, `round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening (3–5 sentences, no jargon) → criterion-by-criterion evidence, each
row naming the test that proves it → the mutation and every absence-guard probe, with file, line,
received value and every row reddened → your full write perimeter → the closing L4 stamp with all
three numbers → anything you found and did not change.

**Because this phase ends at the owner's eyes:** say plainly how to see it running (which screen,
how to reach it, what to tap) and list anything you knowingly approximated against the mockups.

Commit your own checkpoint(s); the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require, get the screens close to the mockups, and stop. No refactors of
P1–P5, no extra abstraction, no hardening nobody asked for. If you notice something worth
knowing, write it in the handoff rather than fixing it.
