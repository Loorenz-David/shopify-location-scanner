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
| C5 | Sheet-state isolation: toggling export `groupByLocation` leaves the report store's query unchanged (assert both states). **Assert the report query's `states`/`locations` Sets too, not just the boolean** — a shallow copy aliases them, so a location toggle in the sheet would still reach through. **Named mutation M1:** at the export-state initializer, hand out the report query itself instead of a copy → this row reds. Without it, opening the export sheet and toggling anything silently rewrites the report the user is looking at, and nothing errors. | MC10, M6 |
| C6 | Filename for a fixed Date is exact; single-digit month/day zero-padded. | MC10, M6 |
| C7 | Delivery, three cases (charter rule 2 — this is a branch, enumerate it): **(a)** with a mocked `navigator.share`, generate calls it with a File of type `application/pdf` and the C6 name; **(b)** with share absent, the anchor-download path runs (spy on createObjectURL + click); **(c)** with share present but **rejecting** — which is what a user cancelling the share sheet produces — no error surfaces to the user and no download is silently substituted. A cancelled share is not a failure, and an unhandled rejection here shows an error banner for something the user chose to do. | M6 |

## Notes
No react-pdf import in this phase's production files except the type of the render
handle (keeps the heavy chunk out of Codex's perimeter). Page-count criterion lives in
P9 where the document exists.

**Mutation count 1** — C5 (M1, the export-state initializer).

**S10 governs C1–C4** *(coordinator lint, 2026-09-02)*. Each compares the model against a domain
function or a count the test computes, which proves the call site and not the argument. What each
input must be able to discriminate:
- **C1** — the fixture needs an empty `medium` **and** a second case with `out` empty, or the
  `produce first` marker's *movement* is never observed; a marker that is always on the first
  section passes a fixture whose first section is never empty.
- **C2** — the section's rows must not already be in `compareCompactRows` order in the fixture, or
  a model that never sorts passes.
- **C3** — the filtered case must yield **different** counts from the unfiltered one, and the
  grouped case different again; equal numbers prove nothing about which query was used.
- **C4** — the source line's entry count must differ from the fixture's raw entry count, so
  "derived, not typed" is actually observable.

**Measure the baseline yourself.** The owner is committing a parallel stream of visual changes to
the stock UI between P7 and this phase, so the test and file counts recorded at P7's approval
(21 files / 133 tests) **will have moved** by the time this runs. Take the baseline from the tree
you are given, and report both numbers; do not inherit a stale figure from a document.

**The fonts already exist** for P9's benefit: `src/assets/fonts/` carries Poppins Regular/Medium/
SemiBold/Bold and IBM Plex Mono Regular/Medium as `.ttf`. There is **no italic face** — P6 recorded
that "Any value" renders synthesized-italic in the app for that reason. P9's `Font.register` should
not assume one exists.

## Review log

### Implementation round 1 — 2026-09-02 — Codex

Implemented the non-visual PDF assembly and delivery seam. `buildPdfModel` composes the
existing report pipeline, so compact rows still come from compaction, filtering and the
registered comparator; grouped exports are normalized to the same PDF row shape after the
grouped report view has applied its query. The model carries canonical state sections, the
first non-empty `produce first` marker, optional five-state summary counts, settings-box
content, a derived entry count, and the two PDF display toggles. The controller now owns a
copied export query, page-count state awaiting P9's render, a react-pdf render-handle type
only, preview, Web Share file delivery, file-capability fallback, anchor download, and
cancelled-share handling. The actions facade exposes the export state transitions for P9.

Judgment calls:

- The export query carries the report's fetched `propertyKeyOrder` as derived context. This
  keeps `buildPdfModel(entries, query)` at the planned two-argument seam while ensuring C2
  uses the same vocabulary ordering as the report controller.
- `StockPdfRow` is the existing `CompactedReportRow` shape. Grouped raw entries are adapted
  with one contribution and one location, allowing P9 to render one table contract for both
  modes; the model retains `showContributingLocations` for the document component to honor.
- Summary counts always contain all five canonical states when enabled, with zero for a
  state excluded by the export filter. Sections themselves remain limited to selected,
  non-empty states as MC10 requires.
- A rejected `navigator.share` resolves as `{ method: "cancelled" }`; it never calls the
  download fallback and does not write an export error. `navigator.canShare({ files })`, when
  present and false or throwing, uses the download fallback.
- Page-count parsing/read-back remains structurally held for P9. This round only supplies
  `StockPdfRenderHandle`, `pageCount` state, and `setStockPdfPageCountController`; no number
  is fabricated.

Observations:

- The supplied tree was initially clean, but the owner’s parallel visual stream landed while
  this round ran. Six UI files were left untouched and are listed in the handoff. Feature
  tests emit jsdom `Window's scrollTo() method` not-implemented messages from those UI tests,
  but the tests pass; this is not a P8 change.
- The pre-edit baseline measured 21 test files, 133 listed tests, and 451 source files. The
  finished phase tree measures 22 test files, 145 listed tests, and 453 source files: this
  round adds one test file, twelve tests including the PDF-import guard, and two source files.
- The P8 test fixture deliberately discriminates S10: C1 has an empty middle state and a
  second first-section case; C2 starts in the wrong order and ties through the comparator's
  earlier keys; C3 filtered and grouped counts differ; C4's derived model count differs from
  raw fixture length.
