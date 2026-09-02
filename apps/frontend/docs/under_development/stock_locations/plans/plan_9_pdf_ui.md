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
| C7 | **The actions are disabled until a blob exists.** `blobFromRenderHandle` **throws while the handle is `loading`** (P8 forward hazard 1), so `Generate & share` and `Preview` must be disabled — not merely no-ops — until the handle has produced a blob, and enabled once it has (assert both states with a mocked handle). **Named mutation M1:** remove the disabled binding so the controls are live while loading → this row reds. Without it, opening the sheet and tapping immediately — the natural thing to do — throws where the user sees, at best, nothing happen. | M6 |
| C8 | **Share is invoked synchronously inside the tap handler** (P8 forward hazard 2). The handler must call the P8 share action with the **already-rendered** blob, with no `await` between the user's gesture and `navigator.share`. iOS treats a share detached from the gesture as `NotAllowedError`, which P8's C7(c) — correctly, for its own scope — swallows as a cancellation: the user taps Share, nothing happens, and nothing errors. Assert that no promise is awaited before the share action is called (e.g. the action is called in the same tick as the click; a pending render is what C7 disables the button for). | M6, MC10 |

## Notes
**Mutation count 1** — C7 (M1, the disabled binding on the sheet's two actions).

**C7 and C8 are P8's forward hazards given rows** *(coordinator lint, 2026-09-02)*. P8's
consumption recorded three; two of them are this phase's to close and had no criterion until now.
Both fail **silently at the user's fingertip**: tapping too early throws, and a share detached from
the gesture is swallowed as a cancellation by the very branch P8 proved. The third — `downloadPdf`
revokes its object URL synchronously and never attaches the anchor — is a live-browser question and
is routed to **P10**, not here.

**S10 applies to C2, C3 and C5.** Each compares rendered output against something the test
computes or a spy it installs. C2's model must contain a section label and a category that do
**not** appear anywhere else in the document, or "extracted text contains it" proves nothing about
placement; C3's page count must differ from any default the component could fall back to (a
hard-coded `1` must not pass); C5 must distinguish the two actions from each other, not merely
observe that *an* action fired.

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

### Implementation round 1 — 2026-09-02 — Claude (Fable 5)

Built screen 10 (`ui/pdf/StockReportPdf.tsx` + `stock-pdf-fonts.ts` + `stock-pdf-page-count.ts` +
`use-stock-pdf-render.tsx`), screen 05 (`ui/GeneratePdfSheet.tsx`), and the pill wiring + lazy sheet
mount in `ui/StockReportPage.tsx`. Handoff: `handoffs/implementer/handoff_plan_9_implement_1.md`.

**Owner decisions taken in-session (2026-09-02):**
- **H1 widened by name.** P8's H1 asserted the controller is the *only* non-test file mentioning
  `@react-pdf/renderer`; P9's document, font registration and render hook must import it. The
  owner authorized editing that one assertion to the closed list of four files. Proved to still
  red on a stray import (probe P-H1).
- **Brand green is `#087A50`** (the 00-global scanner-FAB token), not the design's `#0E8A5F`, which
  is also the Normal state's solid hex and therefore forbidden outside the states domain by S2.
  Owner chose the token over runtime plumbing or an S2 amendment; visible only as a slightly
  darker header rule and mark.

**Judgment calls:**
- **Page-count read-back** parses pdfkit's `/Type /Pages … /Count n` root from the rendered bytes
  (`readStockPdfPageCount`), so the number comes from the document, not the layout tree or the
  model (MC10). C1 checks it against an independent count of `/Type /Page` objects.
- **Repeated column headers without a per-table primitive.** react-pdf has none, but its splitter
  keeps `fixed` children in both halves of a split node; each table's column-header row is `fixed`
  inside the table view, so it repeats on every page the table spans and nowhere else. Section
  titles are page-level siblings of their tables carrying `minPresenceAhead={72}` (title + header +
  one row), because `minPresenceAhead` only breaks an element with non-fixed siblings before it.
  Verified on a 4-page render: page 2 opens with the column header, not an orphan title.
- **Smoke test runs in the node environment** (`// @vitest-environment node`): only the node build
  exposes `renderToBuffer`, and under jsdom vitest substitutes jsdom's typed-array globals, so
  pdfkit's `instanceof Uint8Array` fails on Node buffers and every FlateDecode stream is corrupted
  (all high bytes become `0xFD`). The shared teardown clears `localStorage`, which node lacks; the
  file defines a one-method shim. No `node:` import is used — `/// <reference types="node" />` was
  tried and changed `setTimeout`'s type in `core/ws-client`, so inflate uses the Web
  `DecompressionStream` and the `file:` font sources are served by a `fetch` stub from
  Vite-`?inline` data URLs.
- **C2's extractor** is a ~90-line test helper over the bytes: object walk, ToUnicode CMap
  (`bfchar`/`bfrange`), `BT…ET` lines with `TJ` glyph runs. Counts are word-bounded, case-sensitive,
  and expected counts are derived from the model (section labels: once per section + once per
  settings-box mention; categories: once per row). Tiles print uppercase and so never collide.
- **Fonts**: all six TTFs registered (Poppins 400/500/600/700, IBM Plex Mono 400/500); no italic
  source exists and none is registered. Hyphenation disabled (`registerHyphenationCallback`) so
  category names never hyphenate in the Type column.
- **Sheet chips are tappable** (call `togglePdfExportState`); P8's `togglePdfExportLocation`
  stays uncalled — the design has no location control on screen 05.
- **`showContributingLocations` off hides the Locations column** (34/54/12 %) rather than leaving
  it blank.
- **Render errors surface**: `handle.error` renders an inline message; otherwise a failed font fetch
  would leave both actions disabled forever with nothing said.
- **Subtitle while unknown** reads `A4 · sections per state`; the count is cleared on every
  re-render (`setPdfPageCount(null)`) so a stale number never describes a new document.
- The page's pill calls `initializePdfExport()` then pushes `report-pdf-sheet`; the sheet returns
  `null` if no export query exists (unreachable through the pill).

**Deviations from the plan text:** the render hook file is `use-stock-pdf-render.tsx` (JSX), not
`.ts`. Task 2 named Poppins 400/600/700; 500 was on disk and is registered too.

**Baseline honesty:** the document, fonts, page-count and hook modules were written before the
C1/C2 test file, so C1/C2 have no red baseline — their proofs of failure are the probes
P-C1c, P-C2a, P-C2b. The nine sheet rows and C6 were written red first (module unresolved).

**Observations for the coordinator:** (1) the owner's stream landed a new
`domain/stock-location-groups.domain.test.ts` (+4 tests) and `src/share/location-codes/` during
this round — not mine, untouched. (2) `vite build` isolates react-pdf in the 1.2 MB
`GeneratePdfSheet` chunk; `StockReportPage` is 19.8 kB; the build's chunk-size warning is the
expected consequence. (3) The browser harness (throwaway entry, deleted) confirmed `usePDF` +
Vite-resolved font URLs end to end: 22.8 kB PDF, four embedded subsets, count read back, Preview
opened as a PDF tab.
