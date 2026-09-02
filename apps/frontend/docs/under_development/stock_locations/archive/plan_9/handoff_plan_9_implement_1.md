---
plan: 9
role: implementer
round: 1
verdict: IMPLEMENTED (coordinator to stamp the tracker)
date: 2026-09-02
actor: Claude (Fable 5)
---

# Handoff — Plan 9 implement, round 1

## Opening

Screen 10 (the A4 react-pdf document) and screen 05 (the Generate PDF sheet) are built, the
report page's `Generate PDF` pill is live, react-pdf loads only when the sheet opens, and P8's
page-count stub is fulfilled by a read-back from the rendered bytes. All eight criteria have
tests that were shown to fail; the one named mutation reds its row alone, unfiltered. Closing
stamp: **26 files / 162 tests green, typecheck clean, lint at the 48/14 baseline with 0 problems
in any stock file.** The sheet was also exercised in a real browser against the mock backend:
the blob is a valid PDF with all four font subsets embedded and the page count read back.

Two things needed the owner and were settled in-session (see "Owner decisions" below); nothing
is pending.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. Two decisions were asked and answered during the session (below); the visual pass remains
the gate (S5) and needs one printed PDF.

## Owner decisions taken in-session (2026-09-02)

| # | question | answer |
|---|---|---|
| 1 | P8's `H1` guard asserts the controller is the only non-test file naming `@react-pdf/renderer`; P9 must import it in `ui/pdf/`. | **Widen H1 by name** — authorized edit of that one assertion in `domain/stock-pdf.domain.test.ts` to the closed list: controller, `ui/pdf/StockReportPdf.tsx`, `ui/pdf/stock-pdf-fonts.ts`, `ui/pdf/use-stock-pdf-render.tsx`. Proved to red on a stray import (P-H1). |
| 2 | The design's brand green `#0E8A5F` is also the Normal state's solid hex; S2's allowlist scan forbids it in `ui/pdf/`. | **Use `#087A50`** (00-global scanner-FAB token). Slightly darker header rule and brand mark; recorded for the polish pass. |

## Gate check (at session start, tree `8dbf506` + owner's dirty stream)

G1 RATIFIED ✓ · G2 P1–P8 APPROVED ✓ · G3 P9 PROMPT_READY ✓ · G4 no `ui/pdf/` ✓ · G5 exports present ✓ ·
G6 six TTFs present ✓ · G7 pill present, disabled, unchanged in role (file reformatted by the owner) ✓.

## Task 0 — coverage map (row → test → assertion shape)

| row | test id (file) | assertion is the row's shape? |
|---|---|---|
| C1(a) resolves to a PDF, magic `%PDF` | `C1` (`ui/pdf/StockReportPdf.test.tsx`) | yes — first four bytes |
| C1(b) page count ≥ 2 for the two-page fixture | `C1` | yes — counts `/Type /Page` objects independently of the read-back (fixture renders 4) |
| C1(c) the read-back equals it | `C1` | yes — `readStockPdfPageCount(bytes) === pageObjects.length` |
| C2 each section label / row category exactly once per model occurrence, extracted from the buffer, computed from the model | `C2` (same file) | yes — byte-level extractor (ToUnicode + `TJ`), word-bounded case-sensitive counts, expected map built from `model.sections` and `model.settings.states`; S10 self-check that categories occur both 1× and 2× |
| C3 subtitle shows the read-back count, mocked handle | `C3` (`ui/GeneratePdfSheet.test.tsx`) | yes — mock blob carries `/Count 3`; asserts `A4 · 3 pages · sections per state` and store `pageCount === 3`; 3 ≠ 1 (hard-coded default) and ≠ the fixture's real 1 page |
| C4(a) chips mirror the active filter's states | `C4(a)` | yes — five chips in `STOCK_STATES` order, pressed set equals the seeded filter |
| C4(b) excluded states carry the faint style class | `C4(b)` | yes — `text-[var(--stock-faint)]` on exactly the three excluded, absent on the included |
| C4(c) toggles call the P8 export-state actions; report query untouched (spy) | `C4(c)` | yes — spies on `setPdfExportQuery`, `setPdfExportGroupByLocation`, `togglePdfExportState`; store export query updated; `appliedFilter` same reference and content; `setReportFilter` spy not called |
| C5 Generate & share / Preview call the respective actions exactly once each | `C5(share)`, `C5(preview)` | yes — each row asserts its action once and the other zero |
| C6 react-pdf absent from the page's static graph, module-registry spy | `stock-pdf-lazy-boundary.test.tsx` | yes — `vi.mock` factory flag stays false after `import("./StockReportPage")`; positive control flips it after importing the lazy seam |
| C7 disabled while loading; enabled once a blob exists | `C7(loading)`, `C7(ready)` | yes — both buttons, both states |
| C8 share called synchronously in the tap handler with the rendered handle | `C8` | yes — `fireEvent.click` then immediate assertion, no await; called with the same handle object and blob |

Reverse map: every test in the three new files appears above; no orphans. The one edited P8 test
(`H1`) keeps its P8 row (plan 8 C8).

**Red baseline:** the nine sheet rows and C6 were run red before their components existed (module
unresolved, 9 + 1 cases uncollectable). **C1/C2 have no red baseline** — the document, fonts,
page-count and hook modules were written before their test file; their proofs of failure are the
probes P-C1c, P-C2a, P-C2b below. Stated rather than reconstructed.

## Criterion evidence

All at L1/L2 during work; the closing stamp below is the authoritative run.

- **C1/C2** — `npx vitest run src/features/stock/ui/pdf` → 2/2. Runs under `// @vitest-environment node`
  (see "Environment surprises"). The 48-row fixture renders 4 pages; the read-back reads 4.
- **C3, C4(a–c), C5(×2), C7(×2), C8** — `npx vitest run src/features/stock/ui/GeneratePdfSheet.test.tsx` → 9/9.
- **C6** — `npx vitest run src/features/stock/ui/stock-pdf-lazy-boundary.test.tsx` → 1/1. Corroborated by
  `vite build`: `StockReportPage-*.js` 19.84 kB, `GeneratePdfSheet-*.js` 1,214 kB (react-pdf), six
  `.ttf` assets emitted.
- **L2** `npx vitest run src/features/stock` → 26 files / 162 tests green (the allowlist guard included:
  no state hex or name in any new file).

## Named mutation and guard probes

Tree for every probe: `8dbf506` + dirty (whole-tree digest `8a3c843691ab` before the docs edits).
Each probe was applied to a byte copy, run, and restored from that copy (`cmp` verified). **Every
file a probe touched is listed in the perimeter section.**

| # | mutation | site | scope / command | observed |
|---|---|---|---|---|
| **M1** (named) | delete both `disabled={!isReady}` bindings | `ui/GeneratePdfSheet.tsx`, the two action buttons (call site of `isRenderReady`) | **L4 unfiltered** `npx vitest run` | **1 failed / 161 passed (162)** — `C7(loading)` alone, `expect(shareButton()).toBeDisabled()` line 195: "Received element is not disabled" |
| M1a (rule 12 variant) | delete only Preview's binding | same file, Preview button | L1 sheet file | `C7(loading)` reds at the *preview* assertion (line 196) — the second sub-check bites on its own |
| P-C8 | `onClick={async () => { await Promise.resolve(); …share… }}` | sheet, share button handler | L1 sheet file | `C8` reds: "expected generateAndShareStockPdfController to be called 1 times, but got 0 times" (line 219) |
| P-C5 | Preview calls `generateAndSharePdf` | sheet, Preview handler | L1 sheet file | `C5(preview)` reds (preview 0 calls, line 188); `C5(share)` stays green as it should |
| P-C5b | Share calls `previewPdf` | sheet, share handler | L1 sheet file | `C5(share)` (line 168) **and** `C8` (line 219) red — the two actions are distinguished from both sides |
| P-C4b | drop `text-[var(--stock-faint)]` from excluded chips | sheet, chip className | L1 sheet file | `C4(b)` reds at `toHaveClass` (line 111) |
| P-C4a | `const isIncluded = true` | sheet, chip render | L1 sheet file | `C4(a)` (line 100), `C4(b)` (line 114), `C4(c)` (line 143) red |
| P-C4c | chip handler also calls `stockActions.setReportFilter(...)` | sheet, chip onClick | L1 sheet file | `C4(c)` reds at `expect(after).toBe(before)` (line 146). The `setReportFilter` spy clause sits after it and cannot bite independently — any write through it also replaces the reference; recorded, not a defect |
| P-C1c | `readStockPdfPageCount` returns `1` | `ui/pdf/stock-pdf-page-count.ts` (definition) | L1 smoke file | `C1` reds: "expected 1 to be 4" (line 313) |
| P-C3 | same mutation | same | L1 sheet file | `C3` reds: subtitle `A4 · 3 pages · …` not found (line 87) — proves the subtitle number comes from the read-back, not a default |
| P-C2a | section title text blanked | `ui/pdf/StockReportPdf.tsx`, `Section` | L1 smoke file | `C2` reds: `{ 'Out of stock': 1, Low: 1, … }` vs expected `2` each (line 343) |
| P-C2b | rows rendered twice | same, `Section` rows map | L1 smoke file | `C2` reds: `'Dining Chairs': 4` vs `2` (line 348) |
| P-C6 | `import "./GeneratePdfSheet";` added statically | `ui/StockReportPage.tsx` (import block) | L1 boundary file | `C6` reds: "expected true to be false" (line 30); page restored byte-identical |
| P-H1 | `import type { UsePDFInstance } from "@react-pdf/renderer";` in the sheet | `ui/GeneratePdfSheet.tsx` | L1 `domain/stock-pdf.domain.test.ts` | widened `H1` reds: 5 matches vs the 4 allowed (line 134) |

**Arithmetic:** plan names **1** mutation (C7/M1); executed **1** named + 1 rule-12 variant + 12 guard
probes. `executed (1) == declared (1)`.

**Authorization line for the unfiltered M1 run:** narrower evidence insufficient because the prompt
(§6) requires the named mutation to run unfiltered and every reddened row reported.

## Write perimeter

**Created (mine):**
- `src/features/stock/ui/pdf/StockReportPdf.tsx` — screen 10 document (+ internal `SummaryTiles`, `Section`, `SettingsBox`)
- `src/features/stock/ui/pdf/stock-pdf-fonts.ts` — `Font.register` ×2, hyphenation off
- `src/features/stock/ui/pdf/stock-pdf-page-count.ts` — `readStockPdfPageCount`
- `src/features/stock/ui/pdf/use-stock-pdf-render.tsx` — `useStockPdfRenderHandle` (the sheet's react-pdf seam)
- `src/features/stock/ui/pdf/StockReportPdf.test.tsx` — C1, C2
- `src/features/stock/ui/GeneratePdfSheet.tsx` — screen 05
- `src/features/stock/ui/GeneratePdfSheet.test.tsx` — C3, C4(a–c), C5(×2), C7(×2), C8
- `src/features/stock/ui/stock-pdf-lazy-boundary.test.tsx` — C6

**Edited (mine):**
- `src/features/stock/ui/StockReportPage.tsx` — pill wiring and lazy sheet mount only (`lazy`/`Suspense` import, `LazyGeneratePdfSheet`, `isPdfSheetOpen` prop, pill `onPress` + `disabled` removed, mount block, root prop). Diff against my pre-edit byte copy: +19/−4 lines, nothing else.
- `src/features/stock/domain/stock-pdf.domain.test.ts` — **authorized out-of-perimeter edit** (owner decision 1): H1's title and expected list.
- `docs/under_development/stock_locations/plans/plan_9_pdf_ui.md` — Review log entry.
- this handoff.

**Checkpoint commit note (S11/S12):** `ui/StockReportPage.tsx` was staged whole, so the checkpoint
carries the owner's uncommitted reformat of that file (+60/−25 in the foreign diff) together with my
+19/−4 wiring — `git show --stat` reports 108 lines for it. Nothing else of the owner's stream was
staged; their other 14 modified and 5 untracked paths remain in the working tree.

**Probe-touched, applied and byte-restored (no residual change):** `ui/GeneratePdfSheet.tsx`,
`ui/pdf/stock-pdf-page-count.ts`, `ui/pdf/StockReportPdf.tsx`, `ui/StockReportPage.tsx`.

**Temporary, deleted before the stamp:** `__stock_preview.html`, `src/__stock_preview.tsx` (browser
harness), and two scratch test files under `ui/pdf/` used to characterise react-pdf under vitest.

**Not touched:** tracker, master plan, api layer, fixtures, any P1–P8 production file, `index.css`,
`apps/backend/`, `package.json`.

**Foreign diff present at the stamp (owner's stream, S12):** 15 tracked files modified (digest of
the tracked foreign diff excluding my two edited files: `1a6c958bb18c`; 14 under `features/stock/ui/`
plus `features/unified-scanner/ui/UnifiedLocationManualInputPanel.tsx`) and 5 untracked foreign
paths: `domain/stock-category-images.domain.ts`, `domain/stock-location-groups.domain.ts`,
`domain/stock-location-groups.domain.test.ts` (**+4 tests**), `ui/StockCategoryThumbnail.tsx`,
`src/share/location-codes/`. None read, none edited, none staged.

## Closing L4 stamp

Tree: `8dbf506` + the dirty tree above (whole-tree digest `8a3c843691ab` at stamp time, before the
two docs files were written). One run each:

- `npm test` → **26 files / 162 tests passed**, 0 failed.
- `npm run typecheck` → clean.
- `npm run lint` → **48 errors / 14 warnings** — identical to the S6 baseline; **0 problems in any file
  under `src/features/stock`** (verified by file list in the lint output).

**Baseline measured on the tree I was given** (by `npx vitest list`, not a run): 22 files / 146 tests.
Delta to the stamp: +12 mine (2 + 9 + 1) **+4 foreign** (`stock-location-groups.domain.test.ts`) = 162;
H1 renamed in place. L4 budget: exactly one closing stamp, plus the prompt-mandated unfiltered M1 run.

## Environment surprises (for the master plan §10 if the coordinator wants them)

1. **react-pdf under vitest+jsdom corrupts output.** jsdom's environment swaps the typed-array globals,
   so pdfkit's `instanceof Uint8Array` fails for Node buffers and every compressed stream is mangled
   (all high bytes → `0xFD`). Node-environment tests render correctly; the RTL sheet tests never
   touch react-pdf (hook mocked).
2. **`localStorage` in node-env tests.** `src/test/setup.ts` clears it in `afterEach`; a node-env
   test file must define a shim (one line in the smoke test).
3. **No `node:` imports in tests.** `tsconfig.app.json` types only `vite/client`; adding
   `/// <reference types="node" />` to one test changed `setTimeout`'s type in `core/ws-client` and
   broke typecheck. Web `DecompressionStream` + Vite `?inline` font imports avoid it.
4. **Font sources** are `new URL(…, import.meta.url).href`: Vite serves/hashes them in dev/build
   (verified in the browser and in `dist/`); under node-env tests they are `file:` URLs that
   react-pdf routes through `fetch`, which the test stubs.

## Found and not changed

- P8's `settings.source` reads `Source: N entries` where the mock-up shows `Source · Shopify scanner,
  18 stock configurations`; rendered as shipped (P8 approved).
- P8's `toggleStockPdfLocationController` / `togglePdfExportLocation` has no caller: screen 05 carries
  no location control.
- The tile border uses the state's solid at 1 pt; the mock-up's border is a lighter tone. Polish.
- The settings box is `wrap={false}` and lands alone on a new page when the last section fills the
  previous one (seen on the 4-page fixture). Acceptable; polish if the owner minds.
- `vite build` warns about the 1.2 MB `GeneratePdfSheet` chunk — that is the lazy chunk working.

## How to reach the sheet and print one PDF (S5)

1. `apps/frontend`: with `.env` at `live` the report shows the three real definitions (all
   `quantity 0 / out_of_stock`), so **a live export is one short section** — that is the data, not a
   bug. For a fuller document run mock mode: `VITE_STOCK_API_MODE=mock npm run dev`.
2. Settings → **Stock report** → tap **Generate PDF** (floating pill). The sheet renders the PDF
   off-screen; the subtitle changes from `A4 · sections per state` to `A4 · N pages · …` when the
   count is read back, and both buttons enable.
3. **Preview** opens the PDF in a tab — print it from there (Cmd+P) for the visual pass; **Generate &
   share** hands it to the OS share sheet on the phone (download fallback on desktop — P10 checks the
   fallback browsers).
4. Toggle chips/switches to see the document re-render (count clears, then returns).
