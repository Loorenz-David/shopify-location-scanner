# 03 — Filter sheet

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Bottom sheet over the report. Composes the report query. The list behind dims to `rgba(22,38,32,.42)`.

## Elements
- **Grab handle**, title `Filters`, `Reset` in primary green.
- **Stock state list** — one row per state: checkbox, solid state dot, label, entry count. Selected rows use `#F0F8F4` bg with a `#0E8A5F` 1.5px border and a filled green checkbox; unselected are white with `#E4EAE7`.
- **Locations** — chips, `All` plus one per location, single-tint selection.
- **Group by location** — toggle, subtitle "Disables cross-location merge".
- **Primary CTA** — states the resulting count: `Show 9 entries`.

## Rules
- Only entries whose `stock_state` is selected are included.
- The states list is the caller's `states` filter; the toggle is `group_by_location`.
- CTA count updates live as filters change.
