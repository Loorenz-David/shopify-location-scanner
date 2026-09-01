# 05 — Generate PDF sheet

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Bottom sheet over the report. Exports the current report query. Paper is A4, fixed.

## Elements
- **Preview block** — miniature first page, title `Generate PDF`, subtitle `A4 · 2 pages · sections per state`, mono filename `beyo-stock-YYYY-MM-DD.pdf`.
- **Toggles** — include summary counts; show contributing locations; group by location.
- **States in the export** — chips inherited from the active filter; excluded states render faint `#F1F4F3` / `#9AA7A1`.
- **Actions** — `Preview` (secondary) opens the document, `Generate & share` (primary) hands off to the OS share sheet.

## Rules
- Page count in the subtitle is computed, not fixed.
- The toggles mirror the report query, so changing them here changes the export only.
