# Plan 9 — PDF document + Generate sheet UI: screens 05, 10

**Implementer:** Claude (UI phase; owner visual gate) · **Depends on:** P8 APPROVED

## Goal
The A4 react-pdf document (screen 10) rendering P8's model, and the Generate PDF
bottom sheet (screen 05), lazy-loaded as its own chunk. Un-holds P7's stubbed pill and
P8's page-count read. NOT here: model/delivery changes (P8 findings route back).

## Read first
Master plan §3, §6 (UI/pdf, Fonts) · intention §3 W3, §4A MC10 (consume) + §8 (M6) ·
design `05-generate-pdf/` + `10-pdf-a4/` (md + screenshots) · `context/pdf-library.md`.

## Files expected to change
`src/features/stock/ui/pdf/StockReportPdf.tsx` (+ subcomponents), font TTFs under
`src/assets/fonts/` + `Font.register`, `src/features/stock/ui/GeneratePdfSheet.tsx`
(+ RTL tests), dynamic-import wiring from the report page's pill (removing P7's
`structurally held` stub), P8's page-count stub fulfilled.

## Tasks
1. Document per `10-pdf-a4.md`: A4, 14mm margins, fixed header/footer every page
   (brand rule, filename, `Generated <ts>`, `Page x of y` via render props), title
   block, five summary tiles (tint + border per MC1), sections (solid square, name,
   hairline, mono count, `· produce first`), tables (column %s, repeated header rows,
   `wrap={false}` body rows), settings box, state-colored quantities. No thumbnails,
   no thresholds.
2. Fonts: subsetted Poppins 400/600/700 + IBM Plex Mono 400/500 TTFs registered.
3. Sheet per `05-generate-pdf.md`: preview miniature, computed subtitle
   (`A4 · N pages · sections per state`), mono filename, three toggles, inherited
   state chips (excluded faint), `Preview` + `Generate & share` calling P8 actions.
4. Lazy chunk: react-pdf + document imported only when the sheet opens (dynamic
   import; the report page bundle stays clean).

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Node render smoke: `renderToBuffer`(fixture model) resolves to a PDF (magic bytes `%PDF`) with page count ≥ 2 for the two-page fixture; the count read-back equals it (P8 stub fulfilled — un-hold recorded in P8's Review log). | M6 |
| C2 | Rendered text contains each non-empty section's label and each row's category exactly once per occurrence in the model (extracted via pdf text run over the buffer; computed from the model, not typed). | MC10, M6 |
| C3 | Sheet subtitle shows the page count from C1's read-back for the current model (RTL with mocked render handle). | M6 |
| C4 | Sheet chips mirror the active filter's states; excluded states render with the faint style class; toggles call the P8 export-state actions (report query untouched — spy). | MC10, M6 |
| C5 | `Generate & share` and `Preview` call the respective P8 actions exactly once each. | M6 |
| C6 | The react-pdf module is absent from the report page's static import graph (assert via dynamic-import boundary: importing `StockReportPage` does not evaluate the pdf module — module-registry spy). | M6 (perf constraint C2 of context/pdf-library.md) |

## Notes
Pixel/print fidelity to `pdf_1.png`/`pdf_2.png` and `05.png` is the owner's visual
pass (S5) — print one real PDF for it. Row-split-avoidance (`wrap={false}`) is
asserted only via C1/C2 smoke plus owner inspection; a programmatic page-break
assertion is not purchased (rule: never test the dependency's own layout engine).

**This phase has a REAL overlap with the owner's visual stream** *(coordinator, 2026-09-02;
master plan **S12**)*. Unlike P8, whose perimeter is domain/controller/store and therefore disjoint,
this phase must wire the **`Generate PDF` pill inside `ui/StockReportPage.tsx`** — the P7 file the
owner has been editing directly. P7 shipped that pill as a *structurally held* disabled stub with
the trigger "enabled when P9 lands"; this is that landing.

Consequences for whoever implements this:
- Expect `StockReportPage.tsx` to look different from what P7 committed, and to keep changing while
  you work. **Read it fresh; do not port a diff against P7's version.**
- Touch **only the pill's wiring and the sheet mount** in that file. Its layout, classes and styling
  belong to the owner's pass — a formatting change of yours will collide with theirs, and yours is
  the one that should yield.
- If the pill has been restyled, moved, or removed by the polish stream, that is a **stop and
  report**, not a reconstruction. The owner decides where their own button lives.
- Everything else in S12 applies: explicit paths, never `git checkout` a file you did not write,
  measure the baseline from the tree you are given, and never repair a red outside your perimeter.

## Review log
(empty)
