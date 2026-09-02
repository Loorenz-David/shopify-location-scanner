# Plan 6 — Instance wizard UI: screens 08–09

**Implementer:** Claude (UI phase; owner visual gate) · **Depends on:** P5 APPROVED

## Goal
The two-step create/edit wizard: step 1 (location → item type → properties) and step 2
(threshold ladder), pushed over the settings area, with conflict surfacing. NOT here:
report screens; any change to P3/P4 logic.

## Read first
Master plan §3, §6 · intention §3 W1, §4A MC6/MC7 (consume only), §9 D9 ·
design `08-new-instance-step1/` + `09-thresholds/` (md + screenshots) ·
contract **v1.4** §2, §3 (the two 409 shapes), §4.4–4.5 (error envelope).

## Files expected to change
`src/features/stock/ui/`: `StockWizardStep1View.tsx`, `StockWizardStep2View.tsx`,
`StockThresholdLadder.tsx`, property picker subcomponents (+ RTL tests).

## Tasks
1. Step 1 per design md: two-segment progress, × discard, numbered sections, location
   cards (preselected variant `from <code>`), item-type selector (options from 4.1),
   properties card (rows, ×-remove, dashed Add property → definition picker filtered
   by selected category's bindings → value picker **including "Any value"** (D9)),
   helper lines, `Next · thresholds` CTA gated on required fields.
2. Step 2 per design md: context line, ladder card with rail, derived rows (no
   inputs), editable rows with steppers + typable mono value bound to
   `commitThreshold`, Back / `Save instance` (edit: `Save changes`).
3. Submit via P4 actions; on 409 render the conflict (naming the existing definition
   when P4 exposes it); on success pop to the location detail.

## Acceptance criteria (RTL)
| id | criterion | trace |
|---|---|---|
| C1 | Step 1 gating: CTA disabled until location AND item type chosen; properties optional (CTA enabled with none). | M1 |
| C2 | Definition picker offers only keys valid for the selected category (universal + bound — one universal, one bound, one excluded case from the 4.1 fixture); each definition appears at most once (adding removes it from the picker). | M4 |
| C3 | Value picker lists that key's values plus `Any value` (D9); choosing values yields chips; the submitted draft maps through `buildCriteria` (assert the exact `properties` object for: values case, any-value case, none case). | MC6, M4 |
| C4 | Step 2 renders exactly three steppers (derived High/Out rows have no input — assert absence); stepper and typed edits go through `commitThreshold` and the displayed triple always satisfies low<med<norm (drive the D14 push case: raising low past med shifts med in the UI). | MC7, M3 |
| C5 | Save (create) calls the create action with the draft; save (edit) calls update with the instance id and CTA reads `Save changes`; success pops to location detail (nav store asserted). | M1 |
| C6 | 409 path: action rejecting with conflict info renders the message naming the conflicting definition's category; form stays open, values intact. | M1, MC12b |
| C7 | Edit-prefill: opening from an instance shows its location/category/chips/thresholds (via P4 prefill — assert two fields incl. a wildcard chip). **Prefill from an instance other than the first**, against a fixture whose instances differ in category and thresholds (S10). | M1, M4 |
| C8 | **The two root entry points offer different location sets.** The dashed `New location` row offers only instance-less locations (D3); the floating `New instance` pill offers **all** bootstrap locations with none preselected (design 06 line 11). Assert both sets explicitly against a fixture where they differ — with every location occupied or every location free they coincide and the row proves nothing. **Named mutation M1:** point the pill at the dashed row's selector → this row reds. Without it a user on screen 06 cannot add a second instance to any location that already has one, and the wizard simply opens with that location missing from the list. | M1 (D3, design 06) |

## Notes
Visual pass by owner against `08.png`/`09.png` (S5). Ladder rail/typography per
00-global; derived-row `derived` badges mono. Refine at prompt time.

**Mutation count 1** — C8 (M1, the root pill's location selector).

**C8 is a defect routed forward from P5** *(coordinator, 2026-09-02)*. P5 bound both root entry
points to `initializeNewStockWizardController()` with no argument, which returns the instance-less
set. That is correct for the dashed row and wrong for the pill: **D3 restricts only the dashed
row**, and design 06 line 11 says the pill opens step 08 "with no location preselected" — not
"with most locations missing". It was not user-reachable in P5 because the wizard was a
placeholder, which is why P5 shipped; it becomes reachable the moment this phase exists. The
controller seam is P4's and approved — P4's C7 asserts the no-argument behavior and must keep
passing — so add a distinct entry point rather than changing what the existing one means.

**The threshold adapter needs both directions** *(routed from P5 findings F4 and judgment call 2)*.
`WizardDraft.thresholds` is the DTO array; `commitThreshold` works on `ThresholdDraft {low, medium,
normal}`; P5 already wrote a one-way DTO→ladder adapter inside `ui/StockThresholdStrip.tsx` that
throws on a missing threshold. C4 drives the ladder in both directions, so decide once where that
adapter lives — if it moves to the thresholds domain it needs its own criterion there, and P5's
copy must then call it rather than duplicating it (charter rule 4).

**S10 applies to C2, C3, C4 and C7** as much as to C8: each compares a rendered value against a
domain function the test computes, which proves the call site and not the argument. Every one of
them needs an input where a wrong argument changes the output, and none may seed state the user's
own path would not have loaded — that is exactly how P5's chip casing defect (F1) stayed green.

## Inherited hazard — the item-category vocabulary is 28, and 19 of them carry no property

*(Routed by the coordinator 2026-09-01 from contract v1.3; master plan S4a.)*

The category list is **28**, not the nine an earlier reading inferred, and **19 of the 28
have no category-specific property at all** — they are configured with the four universal
keys alone (`wood_type`, `years`, `weight_definition`, `country`). Only the six table types
and the three chair types appear in the property table's `categories` column.

So "a category with zero applicable property keys" never occurs (the four universal keys
always apply), but "a category whose property picker offers four options instead of eight"
is the **majority case, not the exception**. Any logic or layout that assumes at least one
category-specific key is wrong for 19 of 28 categories, and wrong silently — the picker
simply comes back shorter.

For this phase specifically: the design was checked against the longer list and **needs no
visual change** — screen 08 draws Item type as a single-select row with a chevron opening a
pushed picker, not an inline dropdown, and its helper line states the count as data (it will
read 28 instead of 9 on its own). Recorded so nobody re-opens the design question. What does
need care is the property step: for 19 of 28 categories `Add property` offers the four
universal keys only.

## Review log
- **2026-09-02 · round 1 consumption · coordinator · APPROVED.** The owner's visual pass is this
  phase's gate (S5) and the owner has given it. No independent review session ran (§3A).

  Verified by hand: the source perimeter is exactly the declared 11 files (8 created, 3 modified)
  measured from `4b4c652`, the last commit before the contamination described below; tracker,
  allowlist, api, fixtures and every P1–P5 domain/store/flow file untouched. The closing stamp
  re-ran green (19 files / 123 tests, typecheck clean, lint unchanged at 48/14, scoped lint 0).
  All 9 test names enumerated against the coverage map with no orphans and every criterion C1–C8
  present. The NUL sentinel is gone: a full byte scan of all 445 tracked frontend source files
  finds NUL only in the six font files and one PNG.

  **C8's named mutation re-planted unfiltered** (point the pill back at the dashed row's
  selector): reddened exactly `C8`, 1 failed / 122 passed. The coordinator additionally ran the
  **reverse** probe the plan did not require — point the *dashed row* at the all-locations
  selector — which reds both `C8` and **P5's C3**. The two entry points are therefore
  distinguished in both directions, and D3 is guarded by two independent criteria rather than one.
  The four guard proofs (A–D) are recorded with their reds, including probe D, an S10 *argument*
  probe on C7's display casing that this session designed itself.

  **F1 fixed before the backend merge.** A 409 left `error` in the wizard store; the × discard only
  popped the view, and screens 06/07 render `settingsErrorMessage ?? wizardErrorMessage`, so the
  banner followed the user back to the location screen and stayed until the next wizard start. The
  handoff correctly judged it unreachable against the mock layer, which never 409s — but §7A merges the
  real backend next, and attempting a definition that already exists is the first thing anyone does
  while testing. Fix: a `discardWizard` facade key calling the wizard store's existing `reset()`,
  wired into step 1's × only; step 2's Back keeps the draft by design and was left alone. Guard:
  **`F1`** in `StockWizardStep1View.test.tsx`, proved to fail — removing the one added call reds it
  and only it. Suite is 124 tests; the stamp was re-run after.

  Known and accepted: the coordinator wrote that fix and its test, so they carry no independent
  review beyond the mutation proof. F2 (`renderedCriteriaChips` unread by the UI) and F5 (edit
  cannot move an instance, which matches W1) are informational. F3 — the conflict UI cannot be
  exercised in the running app because the mock layer has no 409 path — **is discharged by the
  merge**: it becomes reachable against the real backend, and is worth trying deliberately once.
  F4 is cosmetic and accepted by the owner's pass.
**2026-09-02 — implement round 1 (Claude, Fable 5).** Built `ui/StockWizardStep1View.tsx`,
`StockWizardStep2View.tsx`, `StockThresholdLadder.tsx`, subcomponents `StockWizardPicker.tsx` +
`StockWizardChrome.tsx`, 3 RTL files / 9 tests; replaced `StockWizardPendingView` in
`StockLocationsPage.tsx`; added the C8 entry point (`initializeNewStockWizardOverAllLocationsController`
+ facade key `startNewWizardOverAllLocations`) and pointed the root pill at it. L4: 19 files / 123
tests, typecheck clean, lint 48/14 = baseline, 0 in perimeter. M1 run unfiltered: reds C8 only.
Absence guard C4(b) proven with two probes (A: input in a derived row reds C4(a); B: button in a
derived row reds C4(b) itself — rule 12), plus two S10 argument probes (C: typed edit bypassing
`commitThreshold` reds the D14 row; D: property rows skipping `displayValueFor` reds C7). Screens
checked in a browser through the P5 throwaway harness (deleted). Full detail:
`handoffs/implementer/handoff_plan_6_implement_1.md`.

Judgment calls:
- **Threshold adapter stays in the UI** (plan Notes / P5 F4): both directions live privately in
  `ui/StockThresholdLadder.tsx`; P5's one-way copy in `StockThresholdStrip.tsx` is untouched. Moving
  it to `stock-thresholds.domain.ts` would have meant editing an approved P3 domain file and a P5 UI
  file without a criterion for either; the duplicated lookup is ~10 lines, state-keyed via
  `STOCK_STATES[1..3]`, and this is an interim build (§3A). Two copies, declared.
- **C8 seam:** a private `startNewStockWizard(availableLocations, location?)` was extracted from
  `initializeNewStockWizardController` so the new controller does not duplicate it; the existing
  function's behaviour is byte-for-byte the same (P4 C7 and P5 C3 stayed green throughout).
  `startNewWizardFromRoot` still means "instance-less set" and the dashed row still calls it.
- **Category change drops properties the new category does not bind** (M4 phantom keys): a
  `shape` row chosen under Dining Tables is removed when the type becomes Sofas, rather than being
  submitted for a 400. The `properties` object is left untouched when nothing is dropped.
- **Pickers are local view state**, not navigation views: item type / definition / values render as
  pushed panels inside step 1 (`PickerState`), matching the plan's "pushed picker" reading of 08.
- **Tapping a property row reopens its value picker** ("change values"); the mockup shows only ×.
- **Step 2 reports the saved location to the page** (`onSaved` → `detailLocation`) so a create from
  screen 06 lands on the new instance's location rather than the last-opened detail.
- **× discard only pops the view**; the wizard store keeps its draft/error until the next wizard
  start (no facade key resets it — see handoff finding F1).
- **Fixed footer above the visible tab bar** (same shell constraint P5 recorded: pushed views live
  inside a plain page, so the tab bar stays); scroll inset `pb-28` on the wizard sections.
- **"−" disabled at floor** is computed by asking `commitThreshold` whether stepping down changes
  the value — no floor literal in the UI. Typed non-numeric input reverts (MC7).
- **Property row labels show the raw key** (`wood_type`, uppercased by CSS) — the vocabulary carries
  no display name for keys, and P3's chips already spell `UPHOLSTERY · any`.
- **C5's "calls the create/update action"** is discharged one level deeper, at the API seam the
  action calls (`createStockConfigurations` body / `updateStockConfiguration(id, patch)`), because
  the UI binds through `submitWizard`, which calls the controllers directly, not through the facade.


## Inherited note — contract v1.4 splits the 409, and it changes nothing here

*(Routed by the coordinator 2026-09-01; master plan **S9** carries the full analysis.)*

A 409's `details` now has two shapes. The familiar one carries `conflictingId`. The new one —
two entries of a single batch clashing with each other — carries `{batchIndex,
conflictsWithBatchIndex}` and **no `conflictingId`**, because all-or-nothing means nothing was
written and no id exists.

**It is unreachable for V1**: every create is a single-entry batch, and multi-entry batch is an
explicit non-goal. **And this phase was already written for it** — MC12b falls back to the
envelope `message` when the id is absent, and P1 typed `conflictingId?: string` optional, so the
unguarded read v1.4 warns about does not typecheck. **No criterion changes.** Do not add
handling for a case this client cannot produce; if multi-entry submit is ever built, S9 records
what that work owes.
