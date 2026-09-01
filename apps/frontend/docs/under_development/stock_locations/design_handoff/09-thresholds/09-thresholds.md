# 09 — Stock thresholds · step 2

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Sets the thresholds for one stock instance. Context line under the title names the instance: `L1 · Chair · Walnut, Dining`. Both progress segments are green.

## Elements
- **Intro line** — "Set the upper limit for normal, medium and low. High and Out of stock follow from them."
- **Ladder card** — one card, highest state at the top, so the five states read as one scale rather than unrelated numeric fields. An 8px continuous colour rail runs down the left through all five bands, blue → green → yellow → orange → red. Rows separated by hairlines.
- **Derived rows** (High, Out of stock) — state name, a mono uppercase `derived` badge, a plain-language subtitle (`40 and above`, `nothing on the shelf`), and the resulting value in mono on the right. **No input.**
- **Editable rows** (Normal, Medium, Low) — state name in its own state colour, `up to n` subtitle, and a stepper on the right: 44px − and + buttons, white on a `#F4F7F6` track, radius 15/18, with a 52px-wide 19px mono value between them. The value is also directly typable.

## Rules
- **Only three values are configurable**: the upper limit of Normal, Medium and Low. High is everything above the Normal limit; Out of stock is 0. Never render inputs for those two.
- Validation: low < medium < normal, each ≥ 1. Lowering a limit pushes the ones below it down.
- Footer: `Back` (secondary) and `Save instance` (primary).
- Editing an existing instance uses this same screen, prefilled, with the CTA reading `Save changes`.
