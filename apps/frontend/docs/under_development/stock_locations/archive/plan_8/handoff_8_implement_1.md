---
plan: 8
role: implementer
round: 1
state: IMPLEMENTED
verdict: IMPLEMENTED
date: 2026-09-02
actor: Codex
---

The PDF export foundation is ready for the next phase. It now turns the same report query
the user is viewing into ordered state sections, settings content, and optional summary
counts, and it gives the Generate sheet a safe private copy of that query. The delivery
seam can preview, share a correctly named PDF file, or download it when file sharing is not
available; dismissing the native share sheet is treated as a normal cancellation. P9 still
needs to supply the visual document, render it, and read its page count.

## ⚠ OWNER DECISIONS REQUIRED (0)

None.

## Coverage map

Each test below is in `src/features/stock/domain/stock-pdf.domain.test.ts`; every assertion
uses the production model/controller path. The reverse map is complete: all 12 tests in the
phase test file are listed, and no test is orphaned.

| criterion row | test id | assertion shape |
|---|---|---|
| C1(a) — empty `medium`; MC1 section order; only Out gets `produce first` | `C1(a)` | Exact section-state array and exact marker array; fixture has no medium section. |
| C1(b) — empty Out moves `produce first` to Low | `C1(b)` | Exact adjacent section array and marker array; Low is observed as the first non-empty section. |
| C2 — rows use MC2 comparator order | `C2` | Expected order is computed with `compactEntries` + `makeCompactRowComparator`; raw fixture order is asserted different. |
| C3(a) — filtered compact case row counts | `C3(a)` | Model section lengths and five summary counts are compared state-by-state with `buildReportView`; model count differs from raw input. |
| C3(b) — grouped case row counts | `C3(b)` | Model section lengths and five summary counts are compared state-by-state with grouped `buildReportView`; grouped count differs from compact count. |
| C4(a) — states use MC1 labels | `C4` | Exact selected label list is asserted. |
| C4(b) — compact grouping wording | `C4` | Exact `Compacted across locations` value is asserted. |
| C4(c) — grouped wording | `C4` | Exact `Grouped by location` value is asserted. |
| C4(d) — selected locations and All locations | `C4` | Exact sorted selected list and exact `All locations` list are asserted. |
| C4(e) — source count is derived from model | `C4` | Source contains `model.entryCount`, and that count is asserted different from raw fixture length. |
| C5(a) — export grouping toggle does not change report boolean | `C5` | Report `groupByLocation` remains false while export becomes true. |
| C5(b) — export state Set is isolated | `C5` | Export `states` Set is a different reference; report values remain unchanged after export toggle. |
| C5(c) — export locations Set is isolated | `C5` | Export location toggle is observed while report locations remain unchanged and the Sets are distinct. |
| C6 — exact local-date filename and zero padding | `C6` | Exact filenames for January 7 and September 1 local Date values. |
| C7(a) — share branch | `C7(a)` | Exact one-call assertion; receives one `File`, exact `application/pdf` type, and C6 filename. |
| C7(b) — absent-share download branch | `C7(b)` | Exact object-URL and anchor-click counts. |
| C7(b) — `canShare({files})` refuses file | `C7(b)` | A present but false capability check is forced to the download path; share spy stays unused. |
| C7(b) — preview branch | `C7(b)` | Preview creates the blob URL and opens it with the expected target/features. |
| C7(c) — rejected share/cancelled share | `C7(c)` | Rejection resolves as `method: "cancelled"`; no URL, click, or export error is observed. |
| H1 — react-pdf production import absence/type-only exception | `H1` | Real non-test feature files are scanned; only the controller matches and its exact `import type` form is asserted. |
| Page-count read-back — explicit P8 structural hold | none by design | P8 exposes the typed render handle, page-count state, and setter; P9 owns the actual rendered-document read-back. |

## What was built

Own production write perimeter:

- `src/features/stock/domain/stock-pdf.domain.ts` — `StockPdfExportQuery`, PDF row/section/
  summary/settings/model interfaces, `buildPdfModel`, `pdfFilename`.
- `src/features/stock/controllers/stock-report.controller.ts` — additive export initialization
  and toggle controllers, page-count state setter, `StockPdfRenderHandle` type, preview,
  share/download delivery.
- `src/features/stock/stores/stock-report.store.ts` — additive `exportState` sub-state,
  setters, reset behavior, selectors.
- `src/features/stock/actions/stock.actions.ts` — additive PDF export facade keys.
- `src/features/stock/domain/stock-pdf.domain.test.ts` — twelve mapped criterion/constraint
  tests.

Required pipeline artifacts written by this session:

- `docs/under_development/stock_locations/plans/plan_8_pdf_assembly.md` — Review log.
- `docs/under_development/stock_locations/handoffs/implementer/handoff_8_implement_1.md` —
  this handoff.

No tracker row was edited; the prompt assigns tracker transitions to the coordinator.

## Evidence

Baseline before the first production edit:

- `npx vitest run src/features/stock/domain/stock-pdf.domain.test.ts --reporter=verbose`
- Result: the test file was present, but the phase module was intentionally absent; Vite
  failed to resolve `./stock-pdf.domain`, with `0` tests collected and one failed suite.
- Measured baseline: 21 test files, 133 listed tests, 451 source files; initial working tree
  clean.

Focused and domain evidence after implementation:

- L1 `npx vitest run src/features/stock/domain/stock-pdf.domain.test.ts`: 12 passed / 12
  total.
- L2 `npx vitest run src/features/stock`: 22 test files passed / 145 tests passed.
- `npm run typecheck`: passed.
- Perimeter lint via `npx eslint` on the five own production/test files: passed with zero
  problems.

The L2 output included twelve jsdom `Window's scrollTo() method` not-implemented messages
from the owner-modified UI tests. They were non-failing diagnostics outside this phase's
perimeter; no UI file was changed.

## Mutation ledger

Declared mutations: C5/M1 = 1. Executed distinct mutations: 1. The row was re-run once after
the phase test file changed, as required; the rerun does not add a distinct mutation.

| criterion / mutation | site and mutation | scope and command | tree/result | observed red |
|---|---|---|---|---|
| C5 / M1 | `src/features/stock/controllers/stock-report.controller.ts:73-89`, initializer call site; replaced `new Set(activeFilter.states)` and `new Set(activeFilter.locations)` with the active Sets | L2, unfiltered `npx vitest run src/features/stock` | Dirty implementation tree with M1 applied; 21 files passed, 1 file failed, 143 tests passed, 1 failed | `C5: export toggles isolate the report query, including both filter Sets`; assertion `initialExportQuery!.states` was the same Set reference as `initialReportFilter.states` (expected distinct). Exactly C5 reddened. |

The M1 rerun was performed after adding H1: 21 files passed, one phase file failed; 144
tests passed and C5 alone failed. The controller was restored from a byte copy after the
probe, and the unmutated L2 run returned 22/22 files and 145/145 tests green.

## Guard/absence probes

| guard | planted defect and site | scope/result | observed red and restoration |
|---|---|---|---|
| H1 react-pdf import perimeter | Added the marker `// @react-pdf/renderer` to `src/features/stock/domain/stock-pdf.domain.ts`, a production file that must not mention the package | L1 `npx vitest run src/features/stock/domain/stock-pdf.domain.test.ts --reporter=verbose`; 11 passed, H1 failed | H1 saw `../controllers/stock-report.controller.ts` plus `./stock-pdf.domain.ts` and failed its exact file-set assertion. Domain file restored from a byte copy; final focused run 12/12 green. |
| C7(c) cancelled-share guard | The test supplies a real rejecting `navigator.share` promise | L1 phase suite; final implementation resolves the rejection path | Before the catch existed, this path would leave the promise rejected; shipped test asserts the observed resolved `method: "cancelled"` plus no download/error. This guard is exercised by the real branch, not a source-only absence claim. |

The C7(c) row is not a hypothetical: its rejecting share is an executable guard against an
unhandled cancellation. No mutation was left applied. Mutation-probe files, listed separately
from the fix perimeter, were `src/features/stock/controllers/stock-report.controller.ts`
(M1, applied/reverted twice) and `src/features/stock/domain/stock-pdf.domain.ts` (H1,
applied/reverted once).

## Foreign diff at closing stamp

The owner’s visual stream is outside this session’s perimeter. At the pre-stamp inventory it
consisted of:

- `src/features/stock/ui/StockCounterTiles.tsx`
- `src/features/stock/ui/StockEntryDetailView.tsx`
- `src/features/stock/ui/StockFilterSheet.tsx`
- `src/features/stock/ui/StockReportEntryRows.tsx`
- `src/features/stock/ui/StockReportPage.tsx`
- `src/features/stock/ui/StockThresholdStrip.tsx`

Foreign diff digest (binary `git diff` over those six paths, SHA-256):
`a6e1af32ff08b36aa7282b2597f9ce5443d12a4bf9816ee82af9a80925a82b57`.

The initial baseline was clean; the foreign UI diff landed during the round and remained
untouched. The final stamp below records the closing tree with this foreign diff present.

## Closing L4 stamp

This is the one closing stamp for the finished implementation tree. Command authorization was
the phase-close requirement; no later source or test edits follow it.

- Tree before stamp: implementation checkpoint plus owner UI diff; `git status --porcelain`
  contains only the declared own/docs paths and the six foreign UI paths; foreign digest above.
- Command: `npm test && npm run typecheck && npm run lint`
- Result: 22 test files passed / 145 tests passed; typecheck passed; lint reported the measured
  repo baseline of 48 errors / 14 warnings, all outside this phase perimeter, with zero lint
  problems in the five own source/test files. The lint command exits nonzero because that
  pre-existing baseline remains; no unrelated files were changed.
- Test comparison: baseline 133 listed tests / 21 test files → final 145 listed tests / 22
  test files; delta +12 tests / +1 test file, all phase-owned additions. The stock-feature L2
  evidence is 145/145 green.

## Coordinator notes / P9 handoff

P9 should import `StockPdfModel`/`buildPdfModel` and use the controller’s `StockPdfRenderHandle`
(`UsePDFInstance` type) with the export query from `selectStockReportExportQuery`. Render the
model, read the actual PDF page count, and call `setPdfPageCount`/`setStockPdfPageCountController`.
The document should honor `summaryCounts`, `settings`, `showContributingLocations`, section
labels, `isProduceFirst`, and normalized `StockPdfRow` values. The sheet should initialize once
from `initializePdfExport`, toggle through the PDF export facade actions, and never write the
report’s applied filter.
