---
plan: 5
role: implementer
round: 1
verdict: IMPLEMENTED
date: 2026-09-02
actor: Claude (Fable 5)
---

# Handoff — Plan 5 implement, round 1

## Opening (owner-readable)

The two settings screens now exist and run against the mock data: the *Stock locations* list
and, one tap deeper, the *Location detail* with its instance cards and five-colour threshold
strips. They use the new Poppins / IBM Plex Mono look, sit inside the normal app shell with the
tab bar visible, and are reached from two new rows on the Settings page. Every automated
check the plan asked for passes, the one required sabotage test failed exactly where it should,
and I looked at both screens in a browser myself against the mockups before handing over.
Three things I found but deliberately did not fix are listed at the end.

## ⚠ OWNER DECISIONS REQUIRED (0)

Nothing needs the owner beyond the visual pass (§ "How to see it").

## How to see it (the S5 gate)

1. `apps/frontend/.env` must contain `VITE_STOCK_API_MODE=mock` (it does on this machine).
2. `npm run dev`, log in, open **Settings** (tab bar) → row **Stock locations**.
3. Screen 06 shows `LC1 · 3 stock instances configured` and `H1 · 1 …`, the dashed *New
   location* row and the floating *New instance* pill.
4. Tap **LC1** → screen 07: three cards (Dining Chairs · Coffee Tables · Dining Tables); the
   Coffee Tables strip reads `0 · 1–5 · 6–12 · 13–18 · 19+`, the other two `0 · 1–10 · 11–15 ·
   16–20 · 21+`; Dining Tables shows the italic *any property* chip. Back chevron returns to 06.
5. Tapping a card, the pill, or the dashed row opens a **placeholder** "Stock instance" panel
   with a back chevron — the real wizard is P6.

I could not log into the shell from this session (the backend at `192.168.1.246:4000` did not
answer), so I mounted `StockLocationsPage` inside `HomeLayout` through a throwaway Vite entry
(deleted before the commit) and checked both screens at ~390px. What I saw matched the
descriptions above.

**Knowingly approximated against `06.png` / `07.png`:**
- Zone names (`· Aisle A`) and the `Rename` button are absent by ruling (D2/D3), so the 07
  header is just the code; the 06 row title is the code, not `L1 · Aisle A`.
- Row copy is `N stock instances configured`, not `N item types configured` (the design rule
  says the count is instances; several may share a type).
- Page background is the shell's existing gradient, not the handoff's near-identical one.
- Chevrons are thin stroked icons in the "dashed" grey; the mockup's are a touch lighter.
- The 07 card's tap target is the whole card (mockup implies the same); no hover/press art.
- The Settings tab is **not** highlighted on these pages (finding F3 below).
- Chips on 07 show display casing (`Teak`) only once GET 4.1 options are in memory (F1); on a
  cold visit in the real shell they read `teak`.

## Coverage map (Task 0 — written before the first production edit)

| row | test | assertion shape vs row |
|---|---|---|
| C1(a) both rows rendered | `ui/stock-settings-rows.test.tsx` › C1 | full — both rows by accessible name |
| C1(b) each row navigates to its id | same | full — `homeShellActions.selectNavigationPage` spy, one exact-id assertion per row, call count 2 |
| C2(a) one row per 4.2 location with stockCount | `ui/StockLocationsPage.test.tsx` › C2 | full — both fixture locations, exactly one row each, counts 3 vs 1 asserted separately |
| C2(b) no quantity/state anywhere | same | full — all five MC1 labels absent, all four detail quantities absent, no badge / band test ids. Guard proof: probe A below |
| C3 dashed row → wizard over instance-less set | `ui/StockLocationsPage.test.tsx` › C3 | full — bootstrap {LC1,H1,L2,L3} minus root {LC1,H1} ⇒ `availableLocations` **exactly** `["L2","L3"]`; draft initialised; `editingId` null; view `wizard-step1` |
| C4(a) per-instance category | `ui/StockLocationDetailView.test.tsx` › C4 | full — every LC1 instance enumerated (3) |
| C4(b) chips incl. italic `any property` | same | full — per card equals `renderCriteriaChips(instance.properties, options)`; empty card renders `<em>any property</em>` and zero chips |
| C4(c) strip labels = `deriveBands` per instance | same | full — per card; test first asserts the fixture yields >1 distinct label set (S10 self-check) |
| C5(a) header = code only | same › C5 | full — `h1.textContent === "LC1"`, no `·` |
| C5(b) `Rename` absent | same | full — `queryByText(/rename/i)` and `queryByRole("button",{name:/rename/i})` null. Guard proof: probe B |
| C5(c) zone name absent | same | full — `/aisle/i` absent + (a). Guard proof: probe C |
| C6(a) tap **second** card → edit with that id | same › C6 | full — facade spy `startEditWizard` called once with `{id: fixture[1].id}`; store `editingId` equals it; draft category matches; view pushed |
| C6(b) pill → create-from-location preselected | same | full — `startNewWizardFromLocation("LC1")` once; `draft.location === "LC1"`; `availableLocations === ["LC1"]` |
| C7(a) badge label/colours from MC1 meta, two states | `ui/StockStateBadge.test.tsx` › C7 | full — states 0 and 3 via `getStockStateMeta`; test asserts the two metas differ in label/tint/text |
| C7(b) strip colours from MC1 meta | `StockLocationDetailView.test.tsx` › C4 | full — every band cell `backgroundColor === band.tint`, `color === band.text` |
| C7(c) S2 allowlist green in L4 | `stock-allowlist.test.ts` (untouched) | green in the closing stamp |

**Reverse map:** the four new test files hold exactly 4 tests + 3 = 7 tests; every one appears
above. No orphan tests.

**Red baseline** (tree `f944366` + the four untracked test files, before any production edit):
`npx vitest run src/features/stock/ui` → 4/4 files red — C1 failed on missing rows
(`Unable to find … "Stock report"`); the other three files failed to resolve their component
imports, so C2–C7 were unrun-red.

## Criterion-by-criterion evidence

All L1/L2 runs below are on the final tree unless stated.

- **C1** — `stock-settings-rows.test.tsx` green. Note: `settings-stock-report` has no registered
  page yet (P7 owns `StockReportPage`), so in the running app that row calls
  `selectNavigationPage("settings-stock-report")` and the shell ignores it. The criterion (spy on
  the facade) is met; the user-visible behaviour arrives with P7.
- **C2** — `StockLocationsPage.test.tsx › C2` green (mock mode, real mock layer: LC1:3, H1:1).
- **C3** — `StockLocationsPage.test.tsx › C3` green; expected set is a literal, not reconstructed
  from the selector (S10).
- **C4** — `StockLocationDetailView.test.tsx › C4` green **after** the fixture edit; **red before
  it** on the S10 self-check (`expected 1 to be greater than 1`) — the plan's prediction, observed.
- **C5** — `› C5` green.
- **C6** — `› C6` green; second card (`stock-lc1-coffee`) tapped.
- **C7** — `StockStateBadge.test.tsx` green; strip colours inside C4; allowlist green in L4.

## Named mutations — 1 declared, 1 executed

| # | criterion | site | scope / command | tree | observed |
|---|---|---|---|---|---|
| M1 | C4 | **call site**: `ui/StockLocationDetailView.tsx:75`, `<StockThresholdStrip thresholds={…} />` inside `InstanceCard` — replaced `instance.thresholds` with `useStockSettingsStore.getState().detailsByLocation[instance.location]![0]!.thresholds` (the first instance's ladder on every card) | **unfiltered** `npx vitest run` | final tree + mutation | **1 failed / 112 passed (16 files)** — only `C4: each card renders category, chips and its own five-band strip`. Received `["0","1–10","11–15","16–20","21+"]`, expected `["0","1–5","6–12","13–18","19+"]` (the Coffee Tables card showing Dining Chairs' bands). Reverted; `grep -c "M1 MUTATION"` = 0; UI suite 7/7 green after revert |

Per-criterion summands: C4 = 1. Total 1 = declared 1.

## Guard proofs (charter rule 15 — absence rows)

| probe | row | planted defect (applied → reverted) | scope | observed red |
|---|---|---|---|---|
| A | C2(b) | `<StockStateBadge state={STOCK_STATES[1]} />` inside each 06 row (`ui/StockLocationsPage.tsx`) | L1 `StockLocationsPage.test.tsx` | `× C2 … Found multiple elements with the text: Low` (1 failed / 1 passed) |
| B | C5(b) | `<button type="button">Rename</button>` in the 07 header (`ui/StockLocationDetailView.tsx`) | L1 `StockLocationDetailView.test.tsx` | `× C5 … expected <button …></button> to be null` (1 failed / 2 passed) |
| C | C5(c) | `{location} · Aisle A` in the 07 `h1` | L1 same | `× C5 … expected 'LC1 · Aisle A' to be 'LC1'` (1 failed / 2 passed) |

Each reverted; `grep -c PROBE` = 0 in both files; UI suite 7/7 green afterwards.

## Fixture edit (authorized)

`api/mocks/get-stock-location-detail.fixture.ts` — **only** `stock-lc1-coffee.thresholds`:
`10/15/20 → 5/12/18` (quantity 22 remains `STOCK_STATES[4]`: 19+). Comment added at the site.
L2 `npx vitest run src/features/stock` after the edit: **16 files / 113 tests passed** — no
approved P1–P4 test reddened (the three importers spread `fixture[0]` or use local ladders).

## Write perimeter (this session — everything `git status` shows)

Created:
- `src/features/stock/ui/StockLocationsPage.tsx`, `StockLocationDetailView.tsx`,
  `StockStateBadge.tsx`, `StockPropertyChips.tsx`, `StockThresholdStrip.tsx`,
  `StockFloatingPill.tsx`
- `src/features/stock/ui/StockLocationsPage.test.tsx`, `StockLocationDetailView.test.tsx`,
  `StockStateBadge.test.tsx`, `stock-settings-rows.test.tsx`
- `src/assets/icons/ChevronLeftIcon.svg`, `ChevronRightIcon.svg`, `PlusIcon.svg`
- `docs/…/handoffs/implementer/handoff_plan_5_implement_1.md` (this file)

Modified:
- `src/index.css` (Poppins + IBM Plex Mono import; `.stock-area-font` scope class with the
  00-global colour tokens as CSS variables; `.stock-mono`; `.stock-pill-fade`)
- `src/assets/icons/index.ts` (3 exports)
- `src/features/home/lazy-pages.tsx` (`LazyStockLocationsPage`, variant `inline`)
- `src/features/home/HomeFeature.tsx` (registry entry `settings-stock-locations`, plain page)
- `src/features/settings/domain/settings-options.domain.ts` (two D5 rows)
- **`src/features/settings/types/settings.types.ts` — OUTSIDE the plan's perimeter**, owner-
  authorized in session: `SettingsOptionPageId` gains the two new ids (closed union; the two rows
  do not typecheck without it). Coordinator: fold into the plan's file list.
- `src/features/stock/api/mocks/get-stock-location-detail.fixture.ts` (thresholds only, above)
- `docs/…/plans/plan_5_settings_ui.md` (Review log entry)

Files a probe touched and reverted (no net change): `ui/StockLocationDetailView.tsx` (M1, B, C),
`ui/StockLocationsPage.tsx` (A). Throwaway preview harness `__stock_preview.html` +
`src/__stock_preview.tsx` created after the stamp and deleted before the commit.

Not touched: tracker, `stock-allowlist.test.ts`, `api/` (beyond the fixture), any P1–P4 domain /
store / controller / flow / actions file, the sibling worktree.

## Closing L4 stamp (one run, on the handed-over tree)

Tree: dirty on `f944366`, `git diff` sha256 prefix `ca907edfb5945b6c`; committed unchanged as
the checkpoint commit that contains this handoff (subject `CHECKPOINT (not approved): implement
stock settings UI P5`, parent `f944366`; `git status --porcelain` clean after it) — cite that SHA.

- `npm test` → **16 files, 113 tests, all passed** (baseline 12 / 106 → +4 files, +7 tests;
  failure-ID delta ∅ → ∅)
- `npm run typecheck` → `tsc -b` exit 0, no output
- `npm run lint` → **48 errors / 14 warnings** = baseline, totals unchanged. Perimeter lint:
  0 problems in every file I created; of the files I modified, `features/home/lazy-pages.tsx`
  carries **2 pre-existing problems** (lines 67 and 100, inside `createLazyFeaturePage`, present
  on HEAD before my append and counted in the 48/14) — left alone per S6.

## Judgment calls (all in the plan's Review log; summarised)

1. Perimeter widening of `settings.types.ts` (owner-authorized).
2. DTO→ladder adapter in `ui/StockThresholdStrip.tsx` (owner-authorized) — state-keyed via
   `STOCK_STATES[1..3]`, throws on a missing threshold. **Candidate criterion / domain move**
   before P6.
3. `settings-stock-report` unregistered until P7.
4. `StockWizardPendingView` placeholder for `wizard-step1/2`.
5. Root page resets the internal view stack on mount (entering from Settings always lands on 06).
6. Detail view reads options from the wizard store, else the report store, else empty options.
7. `--stock-code-badge-bg: #e4f6ec` in `index.css` equals the normal-state tint — it is the
   06 badge surface per 00-global, lives outside the S2 scan (`src/features/stock`), and is not
   used as a state colour. Flagging so no reviewer treats it as an S2 leak.

## Findings — noticed, not changed

- **F1 (user-visible, silent) — chip display casing on 07.** `renderCriteriaChips` needs GET 4.1
  options; the settings flow/controller never fetch them (only the wizard's `ensureWizardOptions`
  and the report controller do). On a cold visit chips read `teak`/`oval`; after any wizard or
  report visit they read `Teak`/`Oval`. Fix belongs in P4 code (settings flow or controller
  hydrating options, or an action exposing `ensureWizardOptions`) → Codex.
- **F2 (user-visible) — root "New instance" scope.** `initializeNewStockWizardController()` with
  no location offers only instance-less locations, so from screen 06 a user cannot add a second
  instance to LC1 without entering LC1 first. Design 06 says the pill opens 08 "with no location
  preselected" (implying any location). Semantics question for the coordinator/owner; P4 seam.
- **F3 (cosmetic) — Settings tab not highlighted** on `settings-stock-locations` (00-global says
  it should be): `getVisibleBottomMenuItems` marks active by exact page id. Shell change, out of
  every stock perimeter.
- **F4 (P6 forward hazard)** — `WizardDraft.thresholds` is the DTO array while `commitThreshold`
  works on `ThresholdDraft {low, medium, normal}`; P6 will need both directions of the adapter
  noted in judgment call 2.
- **F5 (intention tension, informational)** — M1's text says "the created card shows the
  backend-computed initial quantity and state", but design 07 (and C4) show no quantity/state on
  instance cards. Built to the mockup; `StockStateBadge` therefore has no production consumer in
  this phase (its consumer is P7's report rows) — it ships with its C7 test as the plan requires.
