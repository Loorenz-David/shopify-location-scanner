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
`src/features/settings/domain/settings-options.domain.ts` (two rows, D5).

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
| C4 | Screen 07 renders per-instance: category, chips (incl. `any property` italic when empty), and a strip whose five labels equal `deriveBands(thresholds)` for that instance (computed, not typed). | M3, MC8 |
| C5 | Screen 07 header shows the location code only; the strings `Rename` and any zone name are absent (mockup-correction guard). | M1 (D2/D3) |
| C6 | Card tap calls the edit action with that instance's id; floating pill calls create-from-location with the code preselected. | M1 |
| C7 | State colors/labels in badges and strips come from MC1 meta (assert a badge's style/label for two states via the domain lookup, not literals; S2 grep-test from P1 still green in L4). | MC1 |

## Notes
Visual fidelity to `06.png`/`07.png` (radii, shadows, spacing, Poppins/mono usage) is
the **owner's approval pass** on the running app (S5) — criteria above are the
automated floor, not the whole bar. Thin by design; refine at prompt time.

## Review log
(empty)
