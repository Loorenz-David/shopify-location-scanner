---
plan: 9
role: implementer
round: 1
date: 2026-09-02
---

# Session prompt — Plan 9 implement (round 1)

## 0. Role and doctrine

You are an **implementation session** on phase P9 of the stock-locations frontend build — the last
build phase before live integration. You build exactly what the plan's acceptance criteria
require, prove each one, and stop.

Read these two files first, by absolute path, and follow them as this session's doctrine:

1. `/Users/davidloorenz/agent-skills/implementation-executor.md`
2. `/Users/davidloorenz/agent-skills/pipeline-charter.md`

**Workspace:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend`
**Implementation folder:** `docs/under_development/stock_locations/`
**Plan under implementation:** `plans/plan_9_pdf_ui.md`

Where this prompt and the plan file differ, **the plan file wins**.

## 1. What this phase is for

P8 built the PDF's data model, filename, export state and delivery mechanics, and proved them.
This phase builds the two visible things: the **react-pdf document** (screen 10) and the
**Generate sheet** (screen 05), and it fulfils the page-count read-back P8 shipped as a
structurally-held stub.

**The model is not yours to compute.** `buildPdfModel` already produces sections, rows, summary
counts and the settings box; you render them. Note **§4B MC10a**, ratified at P8's approval: the
summary tiles count **the document, not the warehouse**, so an excluded state reads `0` — that is
correct and deliberate, not a bug to fix.

Three rows carry the weight, and two of them are silent failures at the user's fingertip:

- **C7 — the actions must be *disabled* until a blob exists.** `blobFromRenderHandle` **throws
  while the handle is `loading`**. Opening the sheet and tapping immediately is the natural thing
  to do; if the controls are live, that throws where the user sees nothing happen.
- **C8 — share must be called synchronously inside the tap handler**, with the already-rendered
  blob and no `await` in between. iOS treats a share detached from the user gesture as
  `NotAllowedError`, and P8's C7(c) — correctly, for its scope — swallows that as a cancellation.
  Get this wrong and Share does nothing, silently, on the owner's actual phone.
- **C6 — react-pdf must stay out of the report page's static import graph.** It is the heaviest
  dependency in the app; a static import means every report view pays for it.

## 2. Gate check

Stop and report if any of these does not hold:

| # | must hold | where |
|---|---|---|
| G1 | Intention header reads `**Status: RATIFIED**` | `intention/raw_intention.md` line 3 |
| G2 | Tracker **P1**–**P8** all read `APPROVED` in their **state cells** | `master_plan.md` §4 |
| G3 | Tracker **P9**'s **state cell** reads `PROMPT_READY` | `master_plan.md` §4 |
| G4 | `ui/pdf/` does not exist yet | `ls src/features/stock/ui/` |
| G5 | `domain/stock-pdf.domain.ts` exports `buildPdfModel` and `pdfFilename`; the controller exports the export-state and delivery actions | the files |
| G6 | `src/assets/fonts/` contains the Poppins and IBM Plex Mono `.ttf` files | `ls src/assets/fonts/` |
| G7 | `ui/StockReportPage.tsx` still contains the disabled `Generate PDF` pill — this phase enables it. **If the owner's visual pass has moved or removed it, stop and report** | the file |

**Do not gate on a clean working tree** — see §3. The coordinator owns every tracker transition;
**do not edit the tracker**.

## 3. You are sharing this working tree, and this time it OVERLAPS

Master plan **S12**: the owner runs a continuous visual-polish stream against the stock screens
while phases run. For P8 that was harmless — its perimeter was domain and controller. **For you it
is not**, because you must wire the `Generate PDF` pill inside **`ui/StockReportPage.tsx`**, a file
the owner has been editing directly.

- **Read that file fresh. Do not port a diff against P7's version** — it has changed.
- Touch **only the pill's wiring and the sheet mount**. Its layout, classes and styling belong to
  the owner's pass; a formatting change of yours will collide with theirs, and yours yields.
- **If the pill has been restyled, moved, or removed, stop and report.** Do not reconstruct it.
  The owner decides where their own button lives.
- **If a P7 test goes red and you did not cause it, report it — do not fix it.** Those tests belong
  to an approved phase whose owner is moving them in real time.
- **Never `git checkout` a file you did not write** to undo a probe; restore from a byte copy you
  made yourself. A checkout on a file the owner is editing destroys uncommitted work permanently.
- **Stage explicit paths only** (**S11**), record the digest of any foreign diff at your stamp, and
  **measure the baseline from the tree you are given** — 146 tests at P8's approval, but the
  owner's stream lands continuously and that number will have moved.

## 4. Read order

1. `plans/plan_9_pdf_ui.md` — the phase, **including its Notes**, which carry the mutation, the
   S10 list, and why C7/C8 exist
2. `master_plan.md` §6 (UI registry; **Fonts**), §9 (**S2**, **S5** the visual gate, **S6** lint
   baseline, **S10** discriminating inputs, **S11** staging, **S12** the shared tree), §7D (polish
   is deferred and concurrent)
3. `intention/raw_intention.md` §3 **W3**, §4A **MC10**, §4B **MC10a** (the summary-count ruling),
   §8 **M6**
4. `context/pdf-library.md` — the whole file; its perf constraint C2 is C6's trace
5. `design_handoff/10-pdf-a4/` and `05-generate-pdf/` — `.md` and screenshots
6. **The shipped P8 code** (`domain/stock-pdf.domain.ts`, the controller's export slice) and
   **P7's report page as it stands today**. Reality outranks every document above.

## 5. Things that are easy to get wrong here

- **Fonts must be registered, and there is no italic face.** `src/assets/fonts/` carries Poppins
  Regular/Medium/SemiBold/Bold and IBM Plex Mono Regular/Medium. P6 recorded that the app renders
  "Any value" in *synthesized* italic for this reason. **Do not `Font.register` an italic source
  that does not exist**, and do not assume react-pdf will synthesize one — it will not.
- **Never test the dependency's own layout engine.** `wrap={false}` row-split avoidance is asserted
  by the C1/C2 smoke plus the owner's printed page, not by a programmatic page-break assertion.
- **MC10a governs the tiles**: an excluded state reads `0`. Do not "fix" it.
- **S2 still applies**: no state name, order index or hex outside the state domain, including
  inside the PDF components. `stock-allowlist.test.ts` must keep passing untouched.

## 6. Named mutations — the protocol

The plan names **exactly 1**: **C7 / M1** — remove the disabled binding so the sheet's two actions
are live while the handle is loading; C7 must red. Apply it, run, **observe C7 red**, restore,
re-run green.

A mutation that reds nothing is a **finding** — report it and fix the criterion's input. **Run the
probe unfiltered** (whole suite, no `-t`) and report every row it reddens. Two coordinator passes
on P8 each found a hole that an L1-scoped probe had missed; unfiltered is not a formality here.

**Prove C8 can fail too.** Insert an `await` between the tap handler and the share action and show
the row reds — otherwise C8 asserts a property nothing tests.

## 7. Evidence budget

- L1 `npx vitest run <file>` and L2 `npx vitest run src/features/stock` — unbudgeted while working.
- **L4: exactly 1 closing stamp** — `npm test` + `npm run typecheck` + `npm run lint`, once.

**Measure the baseline yourself** (146 tests / 22 files at P8's approval; it will have moved).
**Lint baseline: 48 errors / 14 warnings**, pre-existing, outside `src/features/stock`. Required:
zero problems in any file you create or touch. Do not fix unrelated files.

## 8. Hard constraints

- **Perimeter.** `src/features/stock/ui/pdf/*` (the document components), the Generate sheet
  component (+ RTL tests), and — **narrowly authorized** — `ui/StockReportPage.tsx` **for the pill
  wiring and sheet mount only**, plus `src/assets/fonts` registration wherever the registry says it
  belongs.
- **Do not touch** `stock-allowlist.test.ts`, the api layer, fixtures, any P1–P8 domain, store,
  controller, flow or actions file, or `apps/backend/`. P8's model and delivery are approved and
  proven; if one needs a change, **stop and report**.
- **Enumerate, never sample** (charter rule 2). C4 wants included *and* excluded chips; C5 wants
  both actions distinguished; C7 wants both the loading and the ready state.
- If a criterion cannot be satisfied as written, **say so and stop** rather than weakening it.
  Every previous phase did this at least once, and every time it was right.

## 9. Closing

Handoff at `handoffs/implementer/handoff_plan_9_implement_1.md` — **that exact name**; P8's landed
as `handoff_8_implement_1.md` and broke the convention. Frontmatter `plan: 9`, `role: implementer`,
`round: 1`, `verdict`, `date`, `actor`.

Body: owner-readable opening → criterion-by-criterion evidence, each row naming its test → the
mutation and every guard probe with file, line, received value and every row reddened → your full
write perimeter plus any foreign diff present at your stamp → the closing L4 stamp with the
baseline you measured → anything you found and did not change.

**Because this phase ends at the owner's eyes:** say how to reach the sheet and **print one real
PDF** — that is the S5 gate here, and pixel/print fidelity cannot be judged on screen. Note that on
the owner's live data every definition is at `quantity 0` / `out_of_stock`, so a live export will be
one short section; say so rather than letting it read as a bug, and mention that mock mode gives a
fuller document.

Commit your own checkpoint(s) with **explicit paths**; the coordinator makes the gate commit.

Final chat message in the charter's **owner layer**: what I did → what it means → what happens
next → what needs you.

**A note on scope:** this is an interim build the owner intends to replace (master plan §3A).
Build what the criteria require and stop. No refactors of P1–P8, no extra abstraction, no
hardening nobody asked for. Visual polish is the owner's, deferred and concurrent (§7D).
