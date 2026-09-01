# 04 — Entry detail

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Drill-down on one report entry, reached by tapping a row on 01 or 02. Pushed screen, no tab bar.

## Elements
- **Header card** — 88px thumbnail, type at 24/700, all property chips, then two tiles: state (state-tinted, label + name) and total quantity.
- **Contributing locations** — the per-location rows merged into this entry: solid state rail, location code + zone, the stock configuration matched (`Config: Chair / Oak`), quantity and state, right-aligned. Section eyebrow carries the count.
- **Info note** — blue `#EEF6FC` card explaining why the merge happened and that healthier stock elsewhere is never merged in. Adapt the wording to the case; omit when the entry has a single location.
- **Actions** — `Scanned items` (secondary; scanner history filtered to this type + properties) and `Add task` (primary).

## Rules
- Every location listed has the same `stock_state` as the entry, by definition of compaction.
- No threshold numbers anywhere in the report area; state badges only.
