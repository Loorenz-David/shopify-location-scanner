# 02 — Stock Report, grouped by location

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

`group_by_location=true`; cross-location compaction disabled.

## Elements
- **Group header** — location code + zone name, hairline, count badge `n to fix` tinted by the group's worst state.
- **Entry row (compact variant)** — solid state rail (8×38, radius 4) on the left, type, property chips, then quantity with the state label beneath, right-aligned. No location chips; the group supplies the location.

## Rules
- Location groups ordered by number of problematic entries (out_of_stock / low / medium), most first.
- Entries within a group ordered by severity, worst first.
- Same floating `Generate PDF` and tab bar as screen 01.
