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
| C5 | Sheet-state isolation: toggling export `groupByLocation` leaves the report store's query unchanged (assert both states). **Assert the report query's `states`/`locations` Sets too, not just the boolean** — a shallow copy aliases them, so a location toggle in the sheet would still reach through. **Named mutation M1:** at the export-state initializer, hand out the report query itself instead of a copy → this row reds. Without it, opening the export sheet and toggling anything silently rewrites the report the user is looking at, and nothing errors. **C5(keyOrder)** *(coordinator, 2026-09-02)*: the initialized query's `propertyKeyOrder` equals the options-derived key order and is non-empty, on an input where an empty order sorts the C2 pair the other way — deleting `propertyKeyOrder: currentKeyOrder()` at the initializer must red this clause (S10; it left 12/12 green before the clause existed). | MC10, M6 |
| C6 | Filename for a fixed Date is exact; single-digit month/day zero-padded. | MC10, M6 |
| C7 | Delivery, three cases (charter rule 2 — this is a branch, enumerate it): **(a)** with a mocked `navigator.share`, generate calls it with a File of type `application/pdf` and the C6 name; **(b)** with share absent, the anchor-download path runs (spy on createObjectURL + click); **(c)** with share present but **rejecting** — which is what a user cancelling the share sheet produces — no error surfaces to the user and no download is silently substituted. A cancelled share is not a failure, and an unhandled rejection here shows an error banner for something the user chose to do. **(d)** *(coordinator, 2026-09-02 — Task 4's preview clause given a row)*: preview creates an object URL for the blob and opens it in a new tab with `noopener,noreferrer`. | M6 |
| C8 | **React-pdf stays out of this phase's production files** except the `import type { UsePDFInstance }` line in the report controller — scan of every non-test file under `src/features/stock` (the Notes' "no react-pdf import" obligation given a row; the implementer's `H1` test). | infra-enabler row (S7) — bundle perimeter, plan 8 Notes |

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

### Coordinator consumption — 2026-09-02 (Claude, Fable 5)

**Perimeter:** `git show --stat a7d90b1` = the seven declared paths exactly; the six foreign UI files
(owner visual stream on P7's components) carry digest `a6e1af32…` — identical to the handoff's, so
the closing stamp's tree is the tree consumed. L4 count: one stamp, as budgeted. Test arithmetic:
133 → 145 = +12, matching the twelve mapped tests; reverse map complete.

**Probes (L1, phase file, each applied → run → byte-restored):**

| # | mutation | site | result |
|---|---|---|---|
| PA | delete `propertyKeyOrder: currentKeyOrder()` | initializer, controller | **12/12 green — finding** (S10 second sub-shape: every row's `exportQuery()` helper supplied the order). Repaired: `C5(keyOrder)` added; PA re-planted reds **that row alone** (13 → 1 failed). |
| PB | M1 variant — alias `locations` only | initializer | C5 reds (the Sets clause bites on its own) |
| PC | location toggle also writes `appliedFilter` | `toggleStockPdfLocationController` | C5 reds |
| PD | view built without the export's `locations` (no re-quantification) | `rowsByState` | C3(a) reds. *(A first siting on `states` stayed green — not a defect: the section loop enforces the state filter a second time.)* |
| PE | rejected share falls through to download | share catch | C7(c) reds |

**Folds:** C5(keyOrder) clause; C7(d) preview (an acceptance claim living in Task 4); C8 = the
implementer's `H1` guard, which traced to no row (S7 enabler). No orphan remains.

**Semantic question for the owner (card relayed to the owner at consumption; the branches are recorded here):** `summaryCounts` reports `0`
for a state the export excludes. MC10 says "five tiles, full counts per state in the export's
grouping mode"; the app's tiles ignore the state filter (D13). A "Low only" export whose header
tile reads `Out of stock 0` tells a manager nothing is out — silent, on paper. P8 stays
IMPLEMENTED (coordinator-verified) until answered; answer A changes ~6 lines of `summaryCounts`.


### Second coordinator pass — 2026-09-02 (Opus 5, verifying the consumption above)

The consumption in `b908c10` was itself verified rather than trusted, since it was made by a
different session. It holds: perimeter is the seven declared paths, the stamp re-runs green (22
files / 146 tests, typecheck clean, lint 48/14 baseline with 0 problems across all four P8 files),
and every criterion has a test with no orphans.

**Its probes were re-run unfiltered** — that pass ran them at L1 on the phase file, which has
historically under-reported blast radius in this project. Both hold at full scope: **M1** (hand out
the report query's `Sets` instead of copies) reds **C5 alone**, and **PA** (initializer supplies an
empty vocabulary) reds **`C5(keyOrder)` alone**. The S10 hole it found was real and its repair works.

**One further hole, in C6.** The UTC implementation of `pdfFilename`
(`toISOString().slice(0, 10)`) **did not red C6** — the row whose entire subject is that the
filename uses local calendar parts. It was caught only incidentally by C7(a). Cause: C6's two
inputs were both `23:30`, which rolls forward only under a **negative** UTC offset. This machine is
**+0200**, and CI would be UTC, so in both places the row passed with the bug present. **A test
whose discriminating power depends on the machine's timezone is not a guard**; this is S10's first
sub-shape with an environmental twist.

Repaired: C6 now asserts both ends of the day — `23:30` on one date and `00:30` on the next — so a
UTC implementation reds it under either sign of offset (and correctly does not red at UTC+0, where
there is no bug). Proved: re-planting the UTC implementation now reds **C6 and C7(a)**, where
before it reddened C7(a) only. No production code changed; the shipped `pdfFilename` was already
correct. Suite 146, unchanged.

Known and accepted: the coordinator wrote that test change, so it carries no independent review
beyond the mutation proof. **The owner card below remains the only thing between this phase and
APPROVED.**

**Forward hazards → P9/P10 prompt:** (1) `blobFromRenderHandle` throws while `loading` — the sheet
must disable *Generate & share* / *Preview* until the handle has a blob. (2) Every share rejection
is "cancelled" — P9 must call the controller synchronously inside the tap handler with the
pre-rendered blob (no `await` before `share`, or iOS throws `NotAllowedError` and it is swallowed
as a cancel). (3) `downloadPdf` revokes the object URL synchronously and never attaches the anchor;
a P10 live check on Firefox/desktop Safari — the fallback browsers — should confirm the file lands.
### Owner card answered — 2026-09-02 · **APPROVED**

The owner ruled **B**: the PDF's summary tiles count **the document, not the warehouse**, so a
state the export excludes reads `0`. Recorded at intention level as **§4B MC10a**, because it
narrows MC10's "full counts per state" wording, which was written before the question was put.

**No production change was required** — B is what shipped. The coordinator verified the invariant
MC10a states now holds *by construction* rather than by convention: `summaryCounts` is derived from
`sections` via `section.rows.length`, so the five counts necessarily sum to the document's row
count in both modes, with no second query and no second source of truth.

The opposing case was put to the owner and declined; §4B MC10a records the reasoning and the
accepted residual rather than leaving it to be rediscovered — a "Low only" export whose
`Out of stock` tile reads `0` is true of the document and misleading about the warehouse, mitigated
by the settings box naming the included states directly above the rows (C4).

**P8 is APPROVED.** Both coordinator passes are recorded above: the first (`b908c10`, a different
session) found and repaired the `propertyKeyOrder` S10 hole; the second re-ran its probes unfiltered
and found one more — C6's timezone-dependent input — repairing it with no production change.
