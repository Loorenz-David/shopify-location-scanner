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
| C7 | Edit-prefill: opening from an instance shows its location/category/chips/thresholds (via P4 prefill — assert two fields incl. a wildcard chip). | M1, M4 |

## Notes
Visual pass by owner against `08.png`/`09.png` (S5). Ladder rail/typography per
00-global; derived-row `derived` badges mono. Refine at prompt time.

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
(empty)


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
