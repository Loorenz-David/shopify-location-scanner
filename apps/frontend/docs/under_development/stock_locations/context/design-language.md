# Context — Design language: mockup target vs. established app styling

The design handoff (`../design_handoff/`) is the visual authority for the stock screens.
This document records where its language meets, or diverges from, what the app already
ships — so implementation follows the mockups without silently forking the app's global
design. Grounded 2026-09-01.

## 1. What the app ships today (global)

- **Fonts:** `:root` is Manrope (`src/index.css:16`); auth screens opt into Plus Jakarta
  Sans via `.auth-modern-font`. Google Fonts are imported at the top of `index.css`.
  **Neither Poppins nor IBM Plex Mono is loaded today.**
- **Page ground:** `HomeLayout.tsx:42` paints a radial-green/orange gradient over
  `#f5fbf8 → #edf3ff → #eef2f5`. The handoff's stock-page gradient
  (`linear-gradient(165deg,#E7F4ED 0%,#F5F7FB 45%,#ECEFF9 100%)`) is close but not equal.
- **Palette in code:** Tailwind default hues (slate text, emerald/green primaries,
  rose errors, sky accents) used as utility classes — no CSS-variable token system exists.
- **Shape idiom:** rounded-xl/2xl cards, `border-slate-900/10`, soft long shadows
  (`shadow-[0_10px_22px_rgba(15,23,42,0.06)]`), white/85 surfaces — same family as the
  handoff's 24–26px card radius and `0 10px 24px rgba(31,60,52,.07)` shadow.
- **Chrome:** bottom tab bar (`features/home/ui/BottomNav.tsx`) with center scanner FAB;
  back chevron in a white circle on sub-pages (`LocationsSettingsPage.tsx` header);
  sheet-over-dimmed-content via `SlidingOverlayContainer` + `InfoSheet`
  (rounded-t-[28px], dim + slide, close-on-tap-above).
- **Toggles:** hand-rolled checkbox-peer switches (`SettingsPage.tsx:72-93`) — reuse this
  pattern for the filter/PDF sheet toggles.

## 2. What the handoff adds (stock screens only — see `00-global/00-global.md`)

- The five-state color system (text/tint/solid per state) — this is **new vocabulary**
  and should be defined once as a typed domain map (state → label, text, tint, solid)
  inside the stock feature, not scattered as ad-hoc hex classes.
- Severity order `out_of_stock → low → medium → normal → high` drives every sort and
  the counter tiles. Same order as backend contract §1 — single source in the domain layer.
- Type scale (21/700 titles, 15 body, 13 meta, 11 mono eyebrows, mono location codes),
  IBM Plex Mono for eyebrows/codes/filenames/stepper values.
- Chips (`#EEF2F1` bg, radius 9, 11/600), italic faint `any property` chip.
- Floating action pill above the tab bar with fade-out overlay and 184px scroll inset
  (108px on single-CTA form screens).
- Bottom-sheet radius 34, dim `rgba(22,38,32,.42)`.

## 3. Divergences needing an explicit call

> **Resolved 2026-09-01** (intention §9): 1 → load Poppins + IBM Plex Mono scoped to the
> stock screens (D1). 2, 5, 6 → ruled **mockup errors** by the owner: codes are the only
> shared truth, the dashed row is a picker over instance-less bootstrap locations, and
> Rename is dropped (D2/D3). 3 → placeholder-only. 4 → decided at planning per screen.
> Kept below as the record of what was weighed.

1. **Fonts.** Mockups: Poppins + IBM Plex Mono. App: Manrope. Options: load both new
   families and scope them to the stock screens (precedent: `.auth-modern-font`), or
   render the mockup layout in Manrope + any mono. Loading two families affects app-wide
   font payload.
2. **Location zone names.** Mockups show `L1 · Aisle A`; the data model has only the
   location code string (bootstrap metafield options, backend contract §6). No zone-name
   source exists.
3. **Thumbnails.** Report rows and entry detail show striped placeholder thumbnails; the
   report endpoints return no image data. Placeholder-only is the buildable reading.
4. **Tab bar visibility.** Handoff wants the tab bar on screens 01/02/06/07 and hidden on
   pushed/modal screens. In the shell, tab-bar-visible means "plain registry page",
   hidden means feature-internal pushed views or full-overlay presentation — the split
   must be chosen per screen at planning time.
5. **`New location` dashed row (screen 06)** — "zones without instances": locations are
   Shopify metafield options managed elsewhere (`location-options` feature). This row can
   only mean "pick a bootstrap location that has no stock instances yet", not "create a
   location".
6. **`Rename` (screen 07)** acts on the location string itself — that is a Shopify
   metafield/app-wide concern (and would orphan `/api/stock` definitions keyed by the
   old string unless the backend PATCHes every definition). No stock endpoint supports it.
