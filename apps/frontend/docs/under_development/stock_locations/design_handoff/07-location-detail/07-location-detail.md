# 07 — Location detail (L1)

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

All stock instances configured for one location.

## Elements
- **Header** — `L1 · Aisle A`, `4 stock instances`, and a `Rename` action (acts on the location, not its instances).
- **Instance card** — item type at 17/700 with a chevron; property chips (italic faint `any property` when the instance has none); then a **five-band threshold strip**: `0 | 1–5 | 6–15 | 16–39 | 40+` in state tints, worst (left) to best (right), 30px tall, radius 12, no gaps. Read-only; tapping the card opens the edit form (screen 09 flow, prefilled).
- **Floating `Add instance to L1`** — opens screen 08 with the location preselected as L1.

## Rules
- Several instances may share an item type when their properties differ; that is expected, not a duplicate.
- The strip is derived from the instance's three configured limits — it is a summary, never editable here.
