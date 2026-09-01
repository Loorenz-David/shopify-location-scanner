# Beyo Vintage — global design context

Applies to every screen in the Stock Report and Stock Location Settings areas. Pass this document once; then pass one screen document per screenshot.

## Product areas
- **Stock Report** — read-only view of actual stock conditions, generated from stock configurations. Screens 01–05.
- **Stock Location Settings** — where those configurations are created and managed. Screens 06–09. This area defines how stock is *interpreted*; it is not a report.

## Stock states
Enum: `high_in_stock`, `normal_in_stock`, `medium_in_stock`, `low_in_stock`, `out_of_stock`. Display labels drop `_in_stock`. Severity order, worst first: out_of_stock → low → medium → normal → high.

| state | label | text | tint | solid |
|---|---|---|---|---|
| out_of_stock | Out of stock | `#C0392B` | `#FCEAE7` | `#D9453D` |
| low_in_stock | Low | `#C4661C` | `#FDF0E4` | `#E8843C` |
| medium_in_stock | Medium | `#93750F` | `#FBF4DC` | `#E0B93A` |
| normal_in_stock | Normal | `#157F58` | `#E4F6EC` | `#0E8A5F` |
| high_in_stock | High | `#2D7FC4` | `#E6F1FB` | `#3B9BF0` |

Tint = row bars, badges, summary tiles. Solid = dots, rails, colour bars.

## Colour tokens
Primary `#0E8A5F` · scanner FAB `#087A50` · active nav `#3B9BF0` · heading `#33404A` · body `#5C6B72` · muted `#7A8891` · faint `#9AA7A1` · hairline `#EFF2F1` / `#E9EDEB` · chip bg `#EEF2F1` · control track `#F4F7F6` · dashed border `#C6D4CE` · surface `#FFFFFF`.
Page background: `linear-gradient(165deg,#E7F4ED 0%,#F5F7FB 45%,#ECEFF9 100%)`.

## Type
Poppins 400/500/600/700. IBM Plex Mono for eyebrow labels, location codes, filenames and stepper values.
Screen title 21/700 · card title 17–18/700 · body 15 · meta 13 · helper 12 · chip 11/600 · eyebrow 11 mono, uppercase, letter-spacing .14em.

## Shape and depth
Card radius 24–26 · sheet 34 (top corners) · control 14–20 · chip 9 · pill 22.
Card shadow `0 10px 24px rgba(31,60,52,.07)`; raised CTA `0 12px 26px rgba(14,138,95,.3)`; sheet `0 -20px 50px rgba(20,40,32,.2)`.

## Layout
Frame 390×844, horizontal padding 20. Tap targets ≥44px.
Scroll lists reserve **184px** bottom inset when a floating action pill sits above the tab bar, **108px** on form screens with a single CTA. The bottom overlay fades from transparent to solid so no card is clipped mid-text under the pill.

## Chrome
- **Tab bar**: History, Tasks, centre scanner FAB (64px, `#087A50`), Stats, Settings. Every screen in these areas is reached through Settings, so Settings is the active item (`#3B9BF0`).
- Tab bar is present on 01, 02, 06, 07. Hidden on modal/pushed screens: 03, 04, 05, 08, 09.
- Back chevron sits in a 40px white circle, top left. A close (×) in the same circle means "discard".

## Chips
Properties render as chips: `#EEF2F1` bg, `#5C6B72` text, 11/600, radius 9. A configuration with no properties shows an italic faint `any property` chip.

## Navigation model
`Stock Locations → Location → Stock Instance → Edit`
Creation has two entry points: from Stock Locations (user picks the location) or from a Location (location preselected).
