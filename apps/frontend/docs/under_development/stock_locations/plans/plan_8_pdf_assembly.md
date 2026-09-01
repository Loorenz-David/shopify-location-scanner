# Plan 8 — PDF data assembly + delivery mechanics

**Implementer:** Codex · **Depends on:** P7 APPROVED

## Goal
Everything about the PDF that is not visual: the document data model (MC10), filename,
share/download delivery, page-count read-back. NOT here: the react-pdf components
(P9) or sheet UI (P9).

## Read first
Master plan §6 (Domain: stock-pdf; Fonts note) · intention §3 W3, §4A MC10 + §8 (M6) ·
`context/pdf-library.md` (Delivery mechanics) · design `10-pdf-a4/10-pdf-a4.md`
(sections/settings-box content — data aspects only).

## Files expected to change
`src/features/stock/domain/stock-pdf.domain.ts` (+test),
`src/features/stock/controllers/stock-report.controller.ts` (export slice: sheet
state copy, generate/preview/share orchestration), `stores/stock-report.store.ts`
(export sub-state), `actions/stock.actions.ts`.

## Tasks
1. `buildPdfModel(entries, exportQuery)` per MC10: sections (MC1 order, skip empty,
   `produce first` on first non-empty), rows in MC2 order, optional summary counts
   (five states), settings-box fields (states labels, grouping wording, locations,
   source line with entry count), grouped variant.
2. `pdfFilename(date)` → `beyo-stock-YYYY-MM-DD.pdf` (user-local date).
3. Export-sheet state: initialized as a copy of the active report query; sheet toggles
   mutate the copy only (report state untouched — assert).
4. Delivery: blob → `navigator.share({files})` when available; anchor-download
   fallback; preview opens blob URL. Page-count read from the rendered document
   (interface stub the P9 component fulfills; until then **structurally held** —
   trigger: P9's document lands).

## Acceptance criteria
| id | criterion | trace |
|---|---|---|
| C1 | Sections: fixture with empty `medium` yields sections Out, Low, Normal, High in MC1 order; `produce first` only on Out; with Out empty it moves to Low (adjacent pair). | MC10, M6 |
| C2 | Rows within each section equal `compareCompactRows` order (computed both sides). | MC10, MC2, M6 |
| C3 | Model row count per section + summary counts equal the app's counts for the same query (one filtered case, one grouped case). | MC10, M6 |
| C4 | Settings box: states labels via MC1, grouping wording exact (`Compacted across locations` / `Grouped by location`), locations list, source line contains the model's entry count (derived, not typed). | MC10, M6 |
| C5 | Sheet-state isolation: toggling export `groupByLocation` leaves the report store's query unchanged (assert both states). | MC10, M6 |
| C6 | Filename for a fixed Date is exact; single-digit month/day zero-padded. | MC10, M6 |
| C7 | Delivery: with a mocked `navigator.share`, generate calls it with a File of type `application/pdf` and the C6 name; with share absent, the anchor-download path runs (spy on createObjectURL + click). | M6 |

## Notes
No react-pdf import in this phase's production files except the type of the render
handle (keeps the heavy chunk out of Codex's perimeter). Page-count criterion lives in
P9 where the document exists.

## Review log
(empty)
