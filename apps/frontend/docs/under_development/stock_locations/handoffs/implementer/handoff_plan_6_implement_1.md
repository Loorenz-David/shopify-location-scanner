---
plan: 6
role: implementer
round: 1
verdict: IMPLEMENTED
date: 2026-09-02
actor: Claude (Fable 5)
---

# Handoff — Plan 6 implement, round 1

## Opening (owner-readable)

The stock-instance wizard is real now. Tapping *New instance*, *New location* or an instance
card opens the two-step form from the mockups: pick a location, an item type and optional
properties (with an *Any value* choice), then set the three limits on the colour ladder where
High and Out of stock follow automatically. Saving lands you back on that location's screen
with the new card in place; a conflict from the server is shown on the form without losing
what you typed. The one defect carried over from the last phase is fixed: the floating *New
instance* button now offers every location, not just the empty ones. Everything the plan asked
for is proven by automated checks, the required sabotage test failed exactly where it should,
and I walked both screens in a browser against the mockups before handing over.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner beyond the visual pass (§ "How to see it").

## How to see it (the S5 gate)

1. `apps/frontend/.env` must contain `VITE_STOCK_API_MODE=mock` (it does on this machine).
2. `npm run dev`, log in, **Settings** → **Stock locations** (screen 06).
3. **Screen 08 from the pill:** tap the floating *New instance* → four location cards (`LC1 H1 L2
   L3` with the demo bootstrap), none selected, eyebrow `STEP 1 OF 2`. Tap the dashed *New
   location* row instead and only the empty ones (`L2 L3`) are offered — that is the fixed C8
   behaviour.
4. **Screen 08 from a location:** tap `LC1` → *Add instance to LC1* → the `LC1` card is
   preselected and the eyebrow reads `STEP 1 OF 2 · FROM LC1`. Tap *Item type* → a pushed list of
   the 28 types. Choose *Dining Tables*, tap *Add property* → seven definitions (four universal +
   `shape`, `extension_type`, `extension_quantity`); choose *Sofas* instead and only the four
   universal ones appear (the 19-of-28 majority case). Tap `shape` → *Any value* plus the four
   shapes; pick some, *Done* → the row `SHAPE / Oval, Rectangular` with its ×. *Next · thresholds*
   is grey until both location and item type are chosen.
5. **Screen 09:** context eyebrow `LC1 · DINING TABLES · OVAL, RECTANGULAR`, both progress bars
   green, the ladder card with the colour rail. Type `16` into *Low* and press Enter → *Medium*
   slides to `17` (the ratified push). `−` greys out at the floor. *Save instance* → back on LC1
   with the fourth card showing `0 · 1–16 · 17 · 18–20 · 21+`.
6. **Edit:** tap the *Coffee Tables* card on LC1 → *Edit stock instance*, one location card,
   `SHAPE / Oval`, thresholds 5 / 12 / 18 on step 2, CTA *Save changes*.

I could not log into the shell from this session (backend at `192.168.1.246:4000` unanswered),
so I mounted `StockLocationsPage` inside `HomeLayout` through the throwaway Vite entry from P5
(deleted before the commit) and walked steps 3–6 above. What I saw matched.

**Knowingly approximated against `08.png` / `09.png`:**
- Location cards carry the code only (`LC1`), no zone name (D2) — they read sparser than the
  mockup's `L1 / Aisle A`.
- Property row labels are the raw vocabulary key in mono uppercase (`WOOD_TYPE`, `SHAPE`), not
  the mockup's prettified `WOOD` — the vocabulary carries no display name for keys, and P3's
  chips already spell `UPHOLSTERY · any`.
- The item-type / definition / value pickers are plain white-card lists with a green check;
  the handoff has no mockup for them.
- The tab bar stays visible on 08/09 (design says hidden). Same shell constraint P5 recorded:
  pushed views live inside a plain page. The CTA footer sits above the tab bar with a fade.
- Ladder rows are a touch tighter than the mockup; stepper buttons are 44px as specified.
- "Any value" renders in synthesized italic — Poppins italic faces are not loaded (P5 loaded
  400/500/600/700 upright only).
- The conflict banner is the rose banner idiom from 06/07 (mockups show no conflict state).
- Page background is the shell's gradient (P5's call).

## Coverage map (Task 0 — written before the first production edit)

| row | test | assertion shape vs row |
|---|---|---|
| C1(a) CTA disabled with neither location nor item type | `StockWizardStep1View.test.tsx` › C1 | full |
| C1(b) disabled with location only | same | full |
| C1(c) disabled with item type only (fresh wizard via discard + pill) | same | full |
| C1(d) enabled with both and zero properties | same | full — `properties` asserted `{}`, no rows |
| C2(a) universal key offered (`wood_type` for Dining Tables) | same › C2 | full — literal expected list, not recomputed |
| C2(b) bound key offered (`shape` for Dining Tables) | same | full |
| C2(c) excluded key absent: `upholstery` for Dining Tables; `shape`/`extension_*` for Dining Chairs; every bound key for Sofas (majority case) | same | full — three categories, literal lists |
| C2(d) each definition at most once — adding removes it from the picker | same | full — after adding `wood_type` the picker reads `[years, weight_definition, country]`; exactly one `wood_type` row |
| C3(a) value picker lists the key's values + `Any value` | same › C3 | full — literal 9 `wood_type` values + `Any value` |
| C3(b) choosing values yields chips/rows | same | full — row reads `Teak, Oak`; step-2 context `L2 · Dining Chairs · Teak, Oak, UPHOLSTERY · any` |
| C3(c) values case exact `properties` | same | literal `{ wood_type: ["Teak","Oak"] }` |
| C3(d) any-value case | same | literal `{ wood_type: ["Teak","Oak"], upholstery: null }` |
| C3(e) none case | same | literal `{}` before adding and after removing both rows |
| C4(a) exactly three steppers | `StockWizardStep2View.test.tsx` › C4 | full — 3 textboxes, 3 `Decrease *`, 3 `Increase *`; five rows in order high/normal/medium/low/out |
| C4(b) derived rows have no input (absence) | same | full — High and Out rows: 0 textbox / spinbutton / button, `querySelector("input")` null, badge `derived` present. Guard proofs: probes A and B |
| C4(c) stepper + typed edits go through `commitThreshold`; `low<med<norm` after every commit | same | full — invariant asserted after each of four commits; non-numeric input reverts; store DTO equals the display |
| C4(d) D14 push visible in UI | same | full — typing `16` into Low shows Medium `17`; `−` on Medium pulls Low to `15`. Argument proof: probe C |
| C5(a) save (create) calls create with the draft | same › C5(create) | at the API seam the action calls: `createStockConfigurations` body == single-entry batch built from the draft (incl. the stepped `normal: 21`) — one level deeper than the facade, stronger not weaker |
| C5(b) save (edit) calls update with the instance id; CTA `Save changes` | same › C5(edit) | full — `updateStockConfiguration(second.id, {location,itemCategory,properties,thresholds})`; `Save instance` absent |
| C5(c) success pops to location detail (nav asserted) | both C5 tests | full — `viewStack.at(-1) === "location-detail"`, screen 07 heading rendered, created `Sofas` card present from the mock layer |
| C6(a) 409 renders the message naming the conflicting category | same › C6 | full — banner carries the envelope message, `Dining Chairs`, chip `Teak` |
| C6(b) form stays open, values intact, never retried | same | full — view still `wizard-step2`, Save enabled, three inputs equal pre-submit, draft deep-equal, create called once |
| C7(a) edit prefill shows location/category/rows incl. wildcard/thresholds | `StockWizardStep1View.test.tsx` › C7 | full — second LC1 instance: `LC1` card pressed, `Coffee Tables`, `shape → Oval` (display-cased from the vocabulary the controller loads — test seeds nothing), `extension_type → Any value`; step 2 inputs 5/12/18; `Save changes` present |
| C7(b) instance other than the first; differs in category and thresholds | same | S10 self-check assertions before relying on it |
| C8(a) dashed row → instance-less set only | `stock-wizard-entry-points.test.tsx` › C8 | full — literal `["L2","L3"]` in the store and 2 rendered cards |
| C8(b) pill → all bootstrap locations, none preselected | same | full — literal `["LC1","H1","L2","L3"]`, 4 cards all `aria-pressed=false`, `draft.location === ""`, eyebrow `Step 1 of 2` |
| C8(c) the two sets differ (fixture discriminates) | same | self-check: `instanceLess` non-empty and `≠` bootstrap |
| Task 1 helper lines / × discard / progress; Task 2 rail + `derived` badges | — | owner visual pass (S5); × discard is exercised on the way in C1(c) and C8 |

**Reverse map:** the three new test files hold 4 + 4 + 1 = **9 tests**; every one appears above.
No orphan tests. No P1–P5 test file was edited.

**Red baseline** (tree `4b4c652` + the three untracked test files, before any production edit):
`npx vitest run <the three files>` → **9 failed / 0 passed, 3 files** — every test on
`Unable to find role="heading" and name "New stock instance"` / `"Edit stock instance"` (the
placeholder rendered). *Honesty note:* the first run had 5 of the 9 failing earlier on a helper
bug of mine (`within(row).queryByText("LC1")` throws on the 06 row's badge+title pair — P5 uses
`queryAllByText`); I fixed the helper and re-ran before touching production, and the 9/9
figure above is that second run.

## Criterion-by-criterion evidence (final tree; L2 `npx vitest run src/features/stock` = 19 files / 123 tests)

- **C1** — `StockWizardStep1View.test.tsx › C1` green. Four gating states in one test; the
  type-only case re-enters through × and the pill (production path), not a store reset.
- **C2** — `› C2` green. Three categories enumerated with literal lists (bound, differently
  bound, unbound); each-once proven by re-opening the picker after an add.
- **C3** — `› C3` green. Exact `properties` literals for values / any / none; the picker list is
  a literal of the 9 `wood_type` values + `Any value`.
- **C4** — `StockWizardStep2View.test.tsx › C4` green. Both push directions observed in the DOM,
  invariant after every commit, DTO round-trip asserted against the store.
- **C5** — `› C5(create)` and `› C5(edit)` green. Spy at the `stockApi` seam (the same seam P4's
  own C2 used); nav asserted; the created card is rendered from the mock layer's state.
- **C6** — `› C6` green. `ApiClientError` 409 with `conflictingId` of the in-memory LC1
  definition (loaded by the user's own path through screen 07); message + category + chip.
- **C7** — `StockWizardStep1View.test.tsx › C7` green. Wildcard injected into the *detail
  response* (`getStockLocationDetail` spy), wire-cased, so display casing must come from the
  vocabulary the controller loads.
- **C8** — `stock-wizard-entry-points.test.tsx › C8` green. Both sets literal; fixture self-check
  first.

## Named mutations — 1 declared, 1 executed

| # | criterion | site | scope / command | tree | observed |
|---|---|---|---|---|---|
| M1 | C8 | **call site**: `ui/StockLocationsPage.tsx:156`, the root pill's `onPress` — `startNewWizardOverAllLocations()` replaced by `startNewWizardFromRoot()` (the dashed row's selector) | **unfiltered** `npx vitest run` | final tree + mutation | **1 failed / 122 passed (19 files)** — only `C8: the dashed row offers instance-less locations only; the pill offers every location, none preselected`. `AssertionError: expected [ 'L2', 'L3' ] to deeply equal [ 'LC1', 'H1', 'L2', 'L3' ]`. Reverted; `grep -c "M1 MUTATION"` = 0 |

Per-criterion summands: C8 = 1. Total 1 = declared 1.

## Guard proofs (charter rule 15) and S10 argument probes

| probe | row | planted defect (applied → reverted) | scope | observed red |
|---|---|---|---|---|
| A | C4(b) via (a) | `<input type="text" readOnly …>` replacing the value span in `DerivedRow` (`ui/StockThresholdLadder.tsx:66`) — an input in both derived rows | L1 `StockWizardStep2View.test.tsx` | `× C4 … expected [ <input readonly …>, …(4) ] to have a length of 3 but got 5` (1 failed / 3 passed) — tripped the stepper count first |
| B | C4(b) itself | `<button type="button">PROBE B</button>` appended to `DerivedRow` — a control the (a) counts do not see (rule 12) | L1 same | `× C4 … expected [ <button type="button"></button> ] to have a length of +0 but got 1` at `StockWizardStep2View.test.tsx:124` (the derived-row `queryAllByRole("button")` assertion) |
| C | C4(c)/(d) argument (S10) | `ui/StockThresholdLadder.tsx:157` — typed input assigned locally (`{ ...draft, [row]: Number(value) }`) instead of through `commitThreshold` | L1 same | `× C4 … expected [ 16, 15, 20 ] to deeply equal [ 16, 17, 20 ]` at `:143` — the D14 push row |
| D | C7 display casing (S10) | `ui/StockWizardStep1View.tsx` `rowValueLabel` — `displayValueFor` skipped, raw wire value rendered | L1 `StockWizardStep1View.test.tsx` | `× C7 … Unable to find an element with the text: Oval` at `:246` (1 failed / 3 passed) |

Each reverted; `grep -c PROBE` = 0 in both files; lint clean; L4 stamp taken after all reverts.

## Write perimeter (this session — everything `git status` shows)

Created:
- `src/features/stock/ui/StockWizardStep1View.tsx`, `StockWizardStep2View.tsx`,
  `StockThresholdLadder.tsx`, `StockWizardPicker.tsx`, `StockWizardChrome.tsx`
- `src/features/stock/ui/StockWizardStep1View.test.tsx`, `StockWizardStep2View.test.tsx`,
  `stock-wizard-entry-points.test.tsx`
- `docs/…/handoffs/implementer/handoff_plan_6_implement_1.md` (this file)

Modified (all narrowly authorized by the prompt §9):
- `src/features/stock/ui/StockLocationsPage.tsx` — `StockWizardPendingView` removed; `wizard-step1`
  → `StockWizardStep1View`, `wizard-step2` → `StockWizardStep2View onSaved={setDetailLocation}`;
  root pill → `startNewWizardOverAllLocations`. Dashed row unchanged.
- `src/features/stock/controllers/stock-wizard.controller.ts` — **additive**: private
  `getBootstrapStockLocations`, private `startNewStockWizard` (extracted body of the existing
  no-argument controller, behaviour unchanged), exported
  `initializeNewStockWizardOverAllLocationsController`.
- `src/features/stock/actions/stock.actions.ts` — one new key `startNewWizardOverAllLocations`.
- `docs/…/plans/plan_6_wizard_ui.md` — Review log entry.

Files a probe touched and reverted (no net change): `ui/StockLocationsPage.tsx` (M1),
`ui/StockThresholdLadder.tsx` (A, B, C), `ui/StockWizardStep1View.tsx` (D). Throwaway preview
harness `__stock_preview.html` + `src/__stock_preview.tsx` created and deleted before the stamp.
Post-stamp edit: `ui/StockWizardStep1View.tsx` line 29 only (NUL sentinel → `"__any_value__"`,
see the stamp section).

Not touched: the tracker, `stock-allowlist.test.ts`, `api/`, fixtures, any P1–P5 domain / store /
flow / test file, `StockThresholdStrip.tsx`, the sibling worktree.

## Closing L4 stamp (re-taken once — see provenance) and tree identity

**Provenance, read this first.** Two things happened between the first stamp and the commit:

1. **My working files were swept into a coordinator commit.** While this session was running,
   commit `75cfbb5` ("stock locations: sequence the backend merge as a step between P6 and P7",
   a `master_plan.md` amendment) was made in this repo and it staged **all 11 of my then-uncommitted
   source files** alongside it (the three modified + eight created files listed above, identical to
   my tree at that moment). So the phase's code is in `75cfbb5`, not in a `CHECKPOINT` commit, and
   my first `CHECKPOINT (not approved): implement stock wizard UI P6` (`655dec5`) contains only the
   Review log entry and this handoff. I did not rewrite either commit (charter: checkpoints are never
   squashed). The perimeter is still verifiable: `git diff 4b4c652..HEAD -- src` is exactly my
   declared write perimeter, and `75cfbb5`'s only non-mine content is `master_plan.md`.
2. **A NUL byte in `StockWizardStep1View.tsx`, found and fixed after the first stamp.** Git showed
   the file as `Bin` in `75cfbb5`; the cause was `const ANY_VALUE_ID = "\x00any-value"` — my
   earlier `sed` rename of that sentinel had silently not matched. Harmless at runtime (a NUL inside
   a string literal; the sentinel is only compared against itself) but garbage in the tree. Replaced
   with `"__any_value__"`; no other file I wrote contains a NUL (all scanned). Because this changed
   the tree after the stamp, **the stamp below is the re-take on the corrected tree** (the first run,
   on the NUL tree, had identical numbers).

Tree: clean after the second checkpoint commit `CHECKPOINT (not approved): fix NUL sentinel in
wizard step 1 (P6)` — **cite that SHA** (its parent is `655dec5`).

- `npm test` → **19 files, 123 tests, all passed** (baseline 16 / 114 → +3 files, +9 tests;
  failure-ID delta ∅ → ∅)
- `npm run typecheck` → `tsc -b` exit 0, no output
- `npm run lint` → **48 errors / 14 warnings** = baseline, totals unchanged; `npx eslint` over
  every file created or modified above: **0 problems**

## Judgment calls (full text in the plan's Review log; summarised)

1. Threshold adapter kept in the UI, both directions private to `StockThresholdLadder.tsx`;
   P5's one-way strip copy untouched (two copies, declared — see Review log for why).
2. C8: private `startNewStockWizard` extracted; existing no-argument controller unchanged in
   behaviour; new controller + facade key; dashed row still on `startNewWizardFromRoot`.
3. Changing the item type drops property rows the new type does not bind (M4 phantom keys).
4. Pickers are local step-1 state rendered as pushed panels; tapping a property row re-opens
   its values.
5. Step 2 hands the saved location to the page so a root-initiated create lands on it.
6. × discard only pops the view (F1 below).
7. Fixed CTA footer above the still-visible tab bar; `pb-28` scroll inset.
8. `−` at floor decided by asking `commitThreshold`; no floor literal in UI.
9. C5 discharged at the API seam because `submitWizard` calls controllers, not the facade.

## Findings — noticed, not changed

- **F1 (user-visible, minor) — a wizard error outlives a discard.** After a 409 the wizard store
  holds `error`; tapping × only pops the view, and screens 06/07 render
  `settingsErrorMessage ?? wizardErrorMessage`, so the rose "Already configured…" banner stays on
  the location screen until the next wizard start clears it. Fix is a P4-seam facade key (e.g.
  `discardWizard` → `useStockWizardStore.reset()`) called from the × and from step 2's Back-to-06
  path; one line each, outside this phase's narrow authorization. Not reachable in the mock demo
  (the mock layer never 409s).
- **F2 (informational) — `renderedCriteriaChips` in the wizard store is dead for the UI.** P4
  sets it only at edit start and never on property edits; step 2 computes
  `renderCriteriaChips(draft.properties, options)` live instead. Nothing reads the store field.
- **F3 (demo gap) — the conflict UI cannot be seen in the running app**: the mock layer has no 409
  path, so C6 is provable only in tests. The owner's pass cannot cover it.
- **F4 (cosmetic)** — tab bar visible on 08/09; Poppins italic not loaded (synthesized).
- **F5 (informational)** — edit cannot move an instance to another location (P4 sets
  `availableLocations` to the single original location); matches W1, recorded so nobody expects
  a location change on edit.
