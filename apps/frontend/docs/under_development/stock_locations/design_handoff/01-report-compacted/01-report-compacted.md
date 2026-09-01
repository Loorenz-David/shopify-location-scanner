# 01 — Stock Report, compacted

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Report across all locations with cross-location compaction ON. Default landing screen of the report.

## Elements
- **Segmented `Compact | By location`** — `group_by_location` false/true. Switching to By location goes to screen 02.
- **Filter pill** — count of active state filters; opens screen 03.
- **Counter strip** — entries per state from the unfiltered result; four tiles (Out, Low, Medium, Rest).
- **Entry row** — thumbnail, `type`, `properties` chips, `quantity` + unit, then a state-tinted bar: `stock_state` label left, contributing `location` codes right (`L1 · L3`).
- **Floating `Generate PDF`** — opens screen 05.

## Rules
- Order by severity, worst first.
- Compaction: entries merge only when `type + properties + stock_state` all match; quantities sum; contributing locations are retained and listed. Same type+properties with a different state stays a separate row — a shortage must never be hidden by stock elsewhere.
- Subtitle reports scope: `All locations · 18 entries`.
