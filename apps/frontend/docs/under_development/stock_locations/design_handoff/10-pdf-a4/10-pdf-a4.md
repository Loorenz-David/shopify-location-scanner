# PDF — A4 stock report

_Pair with the screenshot of this screen. Shared tokens, states and conventions live in `00-global.md` — pass that once per session._

Print output of the report, organised in sections per state. Audience is managers and owners deciding what should be produced first and in what volume.

## Page 1
- **Header rule** — 22px green mark + `Beyo Vintage` at 13pt/700, `Stock Report` mono uppercase right, 2px `#0E8A5F` bottom border.
- **Title block** — `Stock Report` 26pt/700, then `01 September 2026 · 09:37 · Warehouse L1–L3` at 11pt.
- **Summary tiles** — five bordered tiles, count 19pt/700 over the state name 7.5pt uppercase, each in its state tint with a matching border.
- **Sections** — Out of stock, then Low.

## Page 2
Medium, Normal, High sections, then a **Report settings** box (`#FAFBFA`, 1px border) recording states included, grouping, locations and source.

## Section and table
- Section header: 11px solid state square, state name 14pt/700, hairline, mono 8pt `n entries`. The most severe section adds `· produce first`.
- Table columns `Type | Properties | Locations | Qty` at 30 / 38 / 20 / 12%. Header row mono-cased uppercase 7.5pt `#8A9791` with a `#DDE4E1` bottom rule; repeat it on every page a table spans.
- Body 10pt: type 600, properties `#5C6B72` joined by `·`, locations in mono 9pt, quantity right-aligned 700 in the state's text colour.
- Row rule `#EFF2F1`; never break a page inside a row.

## Frame
- A4, 14mm margins, header and footer repeat on every page.
- Footer: filename, `Generated <date, time>`, `Page x of y` — mono 7.5pt over a 1px top rule.
- No thumbnails, no threshold numbers.
