# Plan 5 — Settings UI: tokens + screens 06–07

**Implementer:** Claude (UI phase — master plan §3 labor rules; owner visual gate)

**Depends on:** P4 APPROVED

## Goal
The stock design language in code (fonts, scope class, shared UI parts) and the two
settings screens: Stock locations root (06) and Location detail (07), wired into the
shell and Settings page. NOT here: wizard screens (P6), report screens (P7), any
domain/store logic (bind only through `stock.actions` / store selectors / P3 domain
functions — a gap is a routed finding, S-rules in master plan §3).

## Read first
Master plan §3 (labor), §6 (UI, Shell wiring, Fonts) · intention §3 W1, §7 (mockup
corrections!) · design `00-global/00-global.md` + `06-stock-locations/` +
`07-location-detail/` (md + screenshots) · `context/design-language.md` ·
`context/frontend-architecture.md` §3.

## Files expected to change
`src/index.css` (font imports + `.stock-area-font`), `src/assets/icons/*` (new icons +
index), `src/features/stock/ui/`: `StockLocationsPage.tsx`,
`StockLocationDetailView.tsx`, `StockStateBadge.tsx`, `StockPropertyChips.tsx`,
`StockThresholdStrip.tsx`, `StockFloatingPill.tsx` (+ RTL tests) ·
`src/features/home/lazy-pages.tsx`, `src/features/home/HomeFeature.tsx`,
`src/features/settings/domain/settings-options.domain.ts` (two rows, D5) · `src/features/stock/api/mocks/get-stock-location-detail.fixture.ts` — **narrowly authorized**, see Notes: all four instances currently carry identical thresholds (10/15/20), so C4 cannot discriminate until at least one differs.

## Tasks
1. Fonts + scope class per registry; state colors consumed ONLY via MC1 meta (S2).
2. Shared parts: chips (incl. italic `any property`), five-band strip (renders
   `deriveBands` output), floating pill with fade overlay + scroll insets (00-global).
3. Screen 06 per design md: header counts, location rows (mono badge, count of
   instances), dashed "New location" row (opens wizard restricted to instance-less
   locations — D3), floating `New instance`, empty state framing line.
4. Screen 07: header (code only — D2/D3: NO zone name, NO Rename), instance cards
   (category, chips, strip), floating `Add instance to <code>`, tap card → wizard edit.
5. Shell: register both plain pages (tab bar visible), settings rows, back chevron to
   Settings; internal push to detail via navigation store.

## Acceptance criteria (RTL; jsdom; mock mode)
| id | criterion | trace |
|---|---|---|
| C1 | Settings page renders the two new rows; pressing each navigates to the matching page id (spy on `homeShellActions`/actions facade). | M1 (D5) |
| C2 | Screen 06 renders one row per 4.2 location with its stockCount, and NO quantity/state anywhere (assert absence of state labels — design rule). | M1 |
| C3 | Dashed row press opens the wizard with the location choices = instance-less set from the P4 selector (spy/assert draft init). | M1 (D3) |
| C4 | Screen 07 renders per-instance: category, chips (incl. `any property` italic when empty), and a strip whose five labels equal `deriveBands(thresholds)` for that instance (computed, not typed). **The detail fixture must carry at least two instances whose thresholds differ, and the row asserts each strip separately** — with identical thresholds a component that renders the first instance's bands everywhere passes (S10). **Named mutation M1:** at the strip's call site, pass the first instance's thresholds to every card → this row reds. Without it every instance on the screen displays the first one's bands and nothing errors. | M3, MC8 |
| C5 | Screen 07 header shows the location code only; the strings `Rename` and any zone name are absent (mockup-correction guard). | M1 (D2/D3) |
| C6 | Card tap calls the edit action with that instance's id; floating pill calls create-from-location with the code preselected. **Tap a card other than the first**, against the two-instance fixture C4 requires — tapping the only card, or the first of several, cannot distinguish "this instance's id" from "some instance's id" (S10). | M1 |
| C7 | State colors/labels in badges and strips come from MC1 meta (assert a badge's style/label for two states via the domain lookup, not literals; S2 grep-test from P1 still green in L4). | MC1 |

## Notes
**Mutation count 1** — C4 (M1, the threshold-strip call site).

**Discriminating fixtures are this phase's main trap** *(coordinator lint, 2026-09-02)*. Three of
these rows (C4, C6, C7) compare a rendered value against a domain function computed in the test.
That shape proves the call site but says nothing about the *argument* unless a wrong argument would
change the output — which is how plan 4's C9 shipped satisfiable by a controller that ignored its
vocabulary entirely (master plan **S10**). Concretely: the location-detail fixture used by screen 07
needs two instances differing in thresholds, id, and category; C7's two states must map to different
colors. If a fixture cannot tell right from wrong, the row is decoration.

**This is already the case, verified on the tree:** all four instances in
`get-stock-location-detail.fixture.ts` carry the same thresholds `10/15/20`, so `deriveBands`
returns the same five labels for every one of them. Editing that fixture is therefore **authorized
for this phase only, and only to vary thresholds** — prefer changing one existing instance over
adding one, since instance *count* is asserted elsewhere. Three files import it
(`mock-state.ts`, `stock-settings.controller.test.ts`, `stock-wizard.controller.test.ts`); run the
full suite after the change. If an approved P1–P4 test reds, **report it, do not edit that test** —
that is a finding about the change, not about the test.

Visual fidelity to `06.png`/`07.png` (radii, shadows, spacing, Poppins/mono usage) is
the **owner's approval pass** on the running app (S5) — criteria above are the
automated floor, not the whole bar. Thin by design; refine at prompt time.

## Review log

**2026-09-02 — implement round 1 (Claude, Fable 5).** Built `ui/` (6 parts + page + view, 4 RTL
files, 7 tests), stock tokens/fonts in `index.css`, 3 icons, shell + settings wiring; fixture
`stock-lc1-coffee` thresholds varied to 5/12/18 (authorized; quantity 22 stays high). 113/16 green,
typecheck clean, lint 48/14 = baseline. M1 run unfiltered: reds C4 only. Three absence guards
(C2(b), C5(b), C5(c)) each proven to redden under a planted defect. Full detail:
`handoffs/implementer/handoff_plan_5_implement_1.md`.

Judgment calls (owner-authorized in-session where marked ⚑):
- ⚑ **Out-of-perimeter edit:** `features/settings/types/settings.types.ts` — `SettingsOptionPageId`
  is a closed union; the two D5 rows do not typecheck without adding their ids. Two lines.
- ⚑ **DTO→ladder adapter lives in `ui/StockThresholdStrip.tsx`:** no domain function maps
  `StockThresholdDto[]` to `deriveBands(low, medium, normal)`. State-keyed lookup via
  `STOCK_STATES[1..3]` (no literals). **Candidate for the domain** (`stock-thresholds.domain.ts`)
  before P6, which needs the same conversion for the ladder.
- **`settings-stock-report` is not registered in `HomeFeature`** — its page is P7's. The row is
  present (D5, C1) but inert until P7 registers the page; `selectNavigationPage` ignores unknown ids.
- **Wizard placeholder view** inside `StockLocationsPage` for `wizard-step1/2` so the demo does
  not dead-end when a card/pill/dashed row is tapped; P6 replaces it.
- Root pill and dashed row both call `startNewWizardFromRoot` (P4 offers only the instance-less set
  when no location is given) — see finding F2 in the handoff.
- Row copy `N stock instances configured` instead of the mockup's `N item types configured`
  (the design rule says the count is instances; several may share a type).
- Page uses the shell's gradient, not the handoff's near-identical one (repo idiom).

Findings (not changed here): F1 chip display casing on screen 07 depends on GET 4.1 options that
no settings-side path loads (falls back to wire casing until a wizard/report fetched them);
F2 root-level "New instance" cannot target a location that already has instances; F3 Settings tab
is not highlighted on plain stock pages (shell computes active from page id only).
