# Context — PDF generation library

**Resolution (2026-09-01, owner):** `@react-pdf/renderer` was chosen and is installed
(`^4.9.0` in `apps/frontend/package.json`). The evaluation below is kept as the record
of the decision; the "Delivery mechanics" section remains the implementation guidance.

No PDF library existed in `apps/frontend/package.json` when this was evaluated. The A4 report
(`../design_handoff/10-pdf-a4/`) requires client-side generation of a multi-page A4
document with: repeated per-page header/footer, `Page x of y`, per-state sections whose
table header repeats across page breaks, no page break inside a row, colored summary
tiles, state-colored text, mono + sans fonts, computed page count shown in the sheet
(screen 05), a Preview action, and hand-off to the OS share sheet.

## Candidates

| library | size (approx, gz) | layout model | fit |
|---|---|---|---|
| **@react-pdf/renderer** | ~350–450 KB (incl. fontkit; lazy-loadable) | React components + flexbox, `fixed` header/footer, `render={({pageNumber,totalPages})}` page numbers, `wrap={false}` rows, `Font.register` for Poppins/IBM Plex Mono TTFs | Direct translation of the mockup; declarative; matches the repo's React idiom |
| jsPDF + jspdf-autotable | ~120–170 KB | imperative canvas-like API; autotable gives repeated table headers + `rowPageBreak:'avoid'`; footers drawn in `didDrawPage` | Lightest; tables easy, but tiles/section chrome are manual coordinate work; custom TTFs must be base64-embedded |
| pdfmake | ~700 KB+ with vfs fonts | JSON doc-definition | Heavy; weakest fidelity control |
| pdf-lib | ~200 KB | low-level drawing, no layout/pagination engine | Would mean writing our own paginator — no |

## Recommendation

**@react-pdf/renderer, loaded as a lazy chunk.** Rationale:

- The A4 design is a styled document (tiles, section rules, settings box), not just
  tables — flexbox layout reproduces it with the least brittle code; an imperative
  jsPDF build of the same design would be coordinate arithmetic that breaks on every copy change.
- Weight is contained: the repo already lazy-loads whole features via
  `createLazyFeaturePage` / dynamic `import()` — the PDF module is only fetched when the
  user opens Generate PDF. "Light and fast" then holds where it matters (app startup),
  and generation of a 2–3 page text report is fast in-browser.
- `totalPages`/`pageNumber` render props and `fixed` elements satisfy the footer spec
  exactly; page count for the sheet subtitle comes from rendering to a blob and reading
  the document's page count before download (or from the same render pass).

If the owner weighs raw chunk size over layout fidelity, jsPDF + jspdf-autotable is the
fallback; everything in the design is *achievable* there at higher implementation cost.

## Delivery mechanics (both options)

- **Generate & share:** render to `Blob` → `navigator.share({ files: [new File(...)] })`
  (supported in iOS/Android PWA contexts); fallback when Web Share files are unsupported:
  anchor download of the blob URL.
- **Preview:** open the blob URL (`window.open`/iframe viewer). Filename per design:
  `beyo-stock-YYYY-MM-DD.pdf`.
- **Fonts:** the chosen families must be shipped as static TTF assets (Google Fonts CDN
  CSS is not consumable by PDF engines); subsetted Poppins 400/600/700 + IBM Plex Mono
  400/500 keep the payload small. Follows the font decision in `design-language.md` §3.1.
