# 06 — Stock locations (settings root)

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Entry point: Settings → Stock locations. Lists only locations that already have one or more stock instances configured.

## Elements
- **Header** — title `Stock locations`, subtitle `3 locations · 13 stock instances`, and one framing line: thresholds set here decide how stock is read in the report.
- **Location row** — 52px `#E4F6EC` badge with the mono location code, `L1 · Aisle A`, `4 item types configured`, chevron. Opens screen 07.
- **Dashed `New location` row** — for zones that have no instance yet.
- **Floating `New instance`** — opens screen 08 with **no location preselected**.

## Rules
- Count shown per location is its number of stock instances (item type + properties combinations).
- Prioritise fast scanning of configuration, not stock conditions: no quantities and no stock states on this screen.
