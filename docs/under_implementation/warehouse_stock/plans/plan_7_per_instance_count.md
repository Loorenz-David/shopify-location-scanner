# P7 — Per-instance count on `LocationStock`

> **DRAFT 2026-09-02** — authored from the owner's request in session; not yet linted, not yet
> projected. Header state: **OWNER_DECISIONS_PENDING** (6 cards, §"Owner decisions"). The
> project was closed on 2026-09-02 with P1–P6 APPROVED; this phase re-opens it as an additive
> change to an approved system. Every P1–P6 file it touches is a *frozen* file being thawed on
> purpose — the perimeter below is therefore explicit and closed.
>
> **Written against the stock-state refactor** the owner ran in a parallel session on 2026-09-02
> (uncommitted in the working tree at draft time): states are `out_of_stock, low_in_stock,
> medium_in_stock, high_in_stock, extra_in_stock` on both sides; a definition configures **one to
> three** thresholds (low/medium/high; a `0`/`null` quantity means "not configured"); the report's
> gap field is **`unitsToRestockTarget`** = `max(0, highest configured threshold − count)`. That
> refactor must be committed before P7 starts (gate below).

## Goal

Today a `LocationStock` row carries one number, `quantity`, which is the **sum of
`ScanHistory.quantity`** over the unsold items allocated to that definition. Keep it, and add a
second number, **`instanceCount`** — the number of `ScanHistory` rows allocated to the definition,
each row counting 1 regardless of its `quantity`. Both numbers move together on every item
transition, both are recomputed by reconciliation and by the rebuild script, and both reach the
frontend.

**Thresholds and `stockState` switch basis: they are evaluated against `instanceCount`, not
`quantity`** (owner clarification, 2026-09-02, in session). `unitsToRestockTarget` becomes the
item gap `max(0, highest configured threshold − instanceCount)`.

The report page and the PDF (preview and print) show `instanceCount` by default; the user can
switch the report to show `quantity` (units) instead, and the PDF sheet carries the same switch.

**Not in this phase:** any change to eligibility (`isSold`, `latestLocation`, `itemCategory`),
best-match, conflict rules, canonical criteria, the HTTP surface beyond additive fields, or the
threshold validation rules. A behaviour change in any of those is a finding.

## ⚠ OWNER DECISIONS REQUIRED (6)

Each card states the assumption the plan is written under. A card left unanswered means the
assumption stands.

| # | Question | Plan assumes | Why it matters |
|---|---|---|---|
| D1 | Column / wire name for the per-instance number? | **`instanceCount`** on the Prisma model, the domain type, both DTOs and the report entry. Rejected: `itemCount` (reads as "items in stock", which is what `quantity` already claims), `count` (ambiguous next to `quantity`). | Name lands in a migration, the registry §6.1/§6.5 and contract v1.7; renaming later costs a migration |
| D2 | Does a `ScanHistory` row with `quantity: 0` count as one instance? | **Yes.** Eligibility is unchanged (unsold, at the location, in the category); every eligible row allocated to a definition counts 1. | The alternative couples instance counting to a quantity rule nothing else in the system has, and makes "row present but counts 0" a silent state |
| D3 | What does the "To normal" / "Missing" figure show when the user switches the display to units? | **Still the item gap** (`unitsToRestockTarget`, item-based, because thresholds are item-based). Units mode changes the "In stock / Current" figure and its label only; the gap column is relabelled "Missing items". There is no unit-based gap: thresholds no longer have a unit meaning. | A unit-based "missing" number would have to be invented; showing the item gap under a "units" heading would be a silent lie |
| D4 | Existing thresholds were entered in **units**. After backfill every definition's state is re-derived against **items**. Auto-convert thresholds? | **No conversion.** States move; the owner re-tunes thresholds by hand after the deploy (runbook step R4 prints the before/after per definition). Reason: no defensible formula exists (unit/item ratio differs per definition and per day). | On LC1 today: 221 units under 200/250/300 reads `medium_in_stock`; the same rows counted as items will read a lower band until re-tuned. This is expected, not a defect |
| D5 | Where does the items-vs-units preference live? | **Per device**, `localStorage` key `stock-report-settings` (pattern: `unified-scanner/domain/scanner-settings.domain.ts`). Not per account: no backend user-preference surface exists and this is a display choice. Default `"instances"`. | A server-side preference is a new endpoint + table for one boolean |
| D6 | Does sort order inside the compacted view follow the displayed number? | **Yes** — the comparators (`makeCompactRowComparator`, `makeGroupEntryComparator`) take the mode and compare the displayed count; state ordering stays first. | Sorting by a hidden number looks random to the user |

## Read first

Master plan §5, §6.1, §6.2, §6.4, §6.5, §9, §10, §11 · intention §19 (what the operations mean),
§22.10a (transition scenarios), §26–§27 (report contract, restock gap) · contract
`contracts/frontend-api-contract.md` v1.6 §1, §4.7 (**note:** the parallel state refactor has not
yet reissued the contract; v1.7 below folds both changes) · the state refactor's diff
(`domain/stock-state.ts`, `queries/get-stock-report.query.ts`, migration `rename_stock_states`) ·
P2's `stock-reconciliation.service.ts`
(two-pass recount, `writeChangedValues`) · P4's `apply-item-stock-change.service.ts` (the three
transition shapes: same-definition delta, leave, enter) and its four call sites ·
`scripts/rebuild-location-stock.ts` (P6; **its Review log N1 warned that the dry run
re-implements P2's `computeGroup` and is "the first thing to re-check if allocation semantics
change" — this phase is that change**) · frontend `stock/domain/stock-report.domain.ts`
(compaction sums `quantity`; `missingQuantityForEntry`), `stock/domain/stock-pdf.domain.ts`,
`stock/stores/stock-report.store.ts`.

## Dependencies (gate)

P1–P6 APPROVED (true, 2026-09-02). **The stock-state refactor is committed** and its own
instruments are green (`verify-all.ts` all-PASS, frontend typecheck/lint/test) — P7 thaws the same
files and must not start on top of an uncommitted diff. Owner cards D1–D6 answered or left to
their defaults. Contract reissued **v1.7** before frontend work starts
(P7.4 gate).

## Semantics (the contract for the implementer)

For one definition `c` in group `(shop, location, itemCategory)`, with `E` the eligible items of
the group (unsold, `latestLocation = location`, `itemCategory = category`) and `winner(i)` the
best-match definition for item `i`:

```
quantity(c)      = Σ  i.quantity   for i in E where winner(i) = c      (unchanged)
instanceCount(c) = Σ  1            for i in E where winner(i) = c      (new; D2: quantity 0 still counts 1)
stockState(c)    = calculateStockState(instanceCount(c), thresholds(c))   (basis changed)
unitsToRestockTarget(c) = max(0, restockTarget(c) − instanceCount(c))     (basis changed; wire name kept)
restockTarget(c)  = highest configured thresholdQuantity of c              (unchanged, from the state refactor)
```

Incremental hooks (`applyItemStockChange`) must reproduce the recount exactly. Per transition:

| Shape | `quantity` delta | `instanceCount` delta |
|---|---|---|
| Same definition before and after, item quantity changed | `after.q − before.q` | **0** |
| Same definition, nothing changed | 0 → `{ changed: false }` | 0 |
| Item leaves a definition (sold, moved out, category/properties changed, re-allocated to a sibling) | `− before.q` | **−1** |
| Item enters a definition (scan in, return to store, re-allocated) | `+ after.q` | **+1** |

**The non-negative guard covers both columns in one statement.** `applyGuardedDecrement` becomes
one `updateMany` with `quantity >= qDelta AND instanceCount >= iDelta`, decrementing both; a
refusal writes neither and logs both current values. A guard that protected only `quantity` would
let `instanceCount` drift negative silently, and a guard that ran as two statements could refuse
one and apply the other.

**Reconciliation compares three values** (`quantity`, `instanceCount`, `stockState`) when deciding
whether a row changed, in both `writeChangedValues` and `writePassTwoDifferences`; a row whose
`quantity` matches but whose `instanceCount` drifted must be written.

## Files expected to change

**P7.1 schema + domain:** `prisma/schema.prisma` (`LocationStock.instanceCount Int @default(0)`)
+ migration `add_location_stock_instance_count` · `src/modules/stock/contracts/stock.contract.ts`
(`LocationStock`, `LocationStockDto`, `toLocationStockDto`, `StockReportEntry`,
`ReconciliationValue`, `GuardedDecrementContext` — additive) · **new**
`src/modules/stock/domain/allocation.ts` (pure `allocateGroup(configurations, items) →
Map<id, { quantity, instanceCount }>`, extracted from P2's `computeGroup` and P6's copy; zero
Prisma imports, so it lives in `domain/` under the purity grep).

**P7.2 repository + reconciliation + hooks:** `src/modules/stock/repositories/location-stock.repository.ts`
(`toDomain`, `updateState` reads `instanceCount`, `applyGuardedDecrement`, `applyIncrement`,
`writeAbsolute`) · `src/modules/stock/services/stock-reconciliation.service.ts` (uses
`allocateGroup`; three-value compare) · `src/modules/stock/services/apply-item-stock-change.service.ts`
(instance deltas per the table) · `scripts/rebuild-location-stock.ts` (uses `allocateGroup`; dry-run
preview shows both numbers). **The four call sites in `modules/shopify/` do not change** — they pass
snapshots, and the snapshot already carries `quantity`; their absence from the diff is a pass.

**P7.3 report + instruments:** `src/modules/stock/queries/get-stock-report.query.ts` (entry gains
`instanceCount`; gap from `instanceCount`) · `scripts/verify-stock-reconciliation.ts`,
`scripts/verify-stock-report.ts` (new rows) · `scripts/verify-stock-domain.ts` (rows for
`allocateGroup`) · `scripts/verify-all.ts` **untouched** (no new script) ·
`docs/.../contracts/frontend-api-contract.md` → **v1.7** · master plan §6.1, §6.2, §6.5 (registry rows).

**P7.4 frontend:** `stock/types/stock.dto.ts`, `stock/types/stock.types.ts` (`StockCountMode`,
`instanceCount` on `CompactedReportRow`, `ReportContribution`, `ReportEntryDetailItem`) · **new**
`stock/domain/stock-report-settings.domain.ts` (read/save `countMode`, localStorage) ·
`stock/domain/stock-report.domain.ts` (compaction sums both; `displayedCount(row, mode)`;
comparators take mode) · `stock/domain/stock-pdf.domain.ts` (`StockPdfExportQuery.countMode`,
`StockPdfSettings.count`, summary unchanged) · `stock/stores/stock-report.store.ts` (`countMode`,
setter, selector) · `stock/actions/stock.actions.ts`, `stock/controllers/stock-report.controller.ts`
(set mode → persist → rebuild view) · `stock/ui/StockFilterSheet.tsx` (segmented "Count: Items /
Units" next to "Group by location") · `stock/ui/GeneratePdfSheet.tsx` (same control, seeded from
the report mode) · `stock/ui/StockReportEntryRows.tsx`, `stock/ui/StockEntryDetailView.tsx`,
`stock/ui/StockLocationDetailView.tsx` (labels + displayed number) · `stock/ui/pdf/StockReportPdf.tsx`
(column header "Items"/"Units", gap header per D3, settings box line) · `stock/api/mocks/get-stock-report.fixture.ts`,
`get-stock-report.mock.ts` · tests beside each of the above.

## Tasks (ordered)

### P7.1 — schema + domain
1. Add `instanceCount` (registry §6.1 amendment, default 0, no index). Migration is additive.
2. Extract `allocateGroup` into `domain/allocation.ts`; it returns both numbers per definition and
   is the **only** implementation of the allocation loop from here on (P6 N1 closed).
3. Contract types: additive fields; `ReconciliationValue = { id, quantity, instanceCount, stockState }`.

### P7.2 — repository, reconciliation, hooks, rebuild
4. Repository: `toDomain` maps `instanceCount`; `updateState` derives state from
   `row.instanceCount`; `applyIncrement(id, { quantity, instances })`;
   `applyGuardedDecrement(id, shopId, { quantity, instances }, context)` as one guarded
   statement; `writeAbsolute(id, { quantity, instanceCount }, stockState, by, tx)`.
5. Reconciliation: `computeGroup` calls `allocateGroup`; both write paths compare three values.
6. `applyItemStockChange`: same-definition branch passes `instances: 0`; leave/enter branches pass
   `instances: 1`. The log lines gain `instanceCount` alongside `quantity`.
7. Rebuild script: dry-run preview prints `{ quantity, instanceCount, stockState }` for current
    and computed; live path unchanged (it already delegates to `reconcileAllGroups`).

### P7.3 — report, instruments, contract
8. Report entry gains `instanceCount`; `unitsToRestockTarget` from `instanceCount`. Keep the
    wire name (the state refactor just introduced it); document the basis change in v1.7.
9. Extend the three verify scripts per the criteria below. No new script, so `EXPECTED_SCRIPTS`
    stays as is (P6 lint L1 — do not touch `verify-all.ts`).
10. Contract v1.7: fold the state refactor (state names, one-to-three thresholds,
    `unitsToRestockTarget`) **and** this phase: additive `instanceCount` on the definition DTO and
    the report entry; §1 and §4.7 state that thresholds, `stockState` and `unitsToRestockTarget`
    are item-based.

### P7.4 — frontend
11. `StockCountMode = "instances" | "units"`; read on store init from localStorage, default
    `"instances"`; a setter action persists then re-runs `buildReportView`.
12. Domain: compaction sums both numbers per row and per contribution; `displayedCount(row, mode)`
    is the single accessor UI and comparators use. `missingQuantityForEntry` reads
    `unitsToRestockTarget` (unchanged); its client-side fallback (highest threshold − count) must
    subtract `instanceCount`, not `quantity`, or a stale client computes a unit gap.
13. UI: filter sheet gains the segmented control; entry rows, detail views and the PDF read the mode.
    Labels: `"In stock"` cell → `"Items"` / `"Units"`; the gap cell keeps its current label
    (`"To normal"` on the row, `"Missing"` in the PDF — whatever the state refactor settles on) in
    items mode and reads `"Missing items"` in units mode (D3).
    The PDF settings box gains `Count: items` / `Count: units`.
14. PDF sheet: `countMode` on the export query, seeded from the report's mode when the sheet opens,
    editable there without changing the report's mode.
15. Fixtures and mocks carry `instanceCount`; the live-integration test asserts it on a real entry.

### P7.5 — deploy + backfill (runbook, executed by the owner or coordinator, not the implementer)
R1. Deploy backend with migrations (`instanceCount` arrives as 0 on every row).
R2. `DRY_RUN=1 SHOP_ID=<id> npx tsx scripts/rebuild-location-stock.ts` — capture the preview; every
    definition shows `instanceCount: 0 → n` and most show a state change (D4).
R3. Live rebuild; confirm `writes` and `groupsTouched` match the preview.
R4. Hand the owner the per-definition before/after list for threshold re-tuning (D4).
R5. Deploy frontend. Until R5 the old frontend keeps working: `instanceCount` is additive and the
    old client ignores it; **between R1 and R3 states are wrong** (every row reads out_of_stock),
    so R1→R3 is one maintenance window.

## Acceptance criteria

| # | Rows | Trace |
|---|---|---|
| C1 | `allocateGroup` (pure, `verify-stock-domain.ts`): (a) three items of quantity 4, 3, 7 allocated to one definition → `{ quantity: 14, instanceCount: 3 }`; (b) an item with `quantity: 0` → `{ quantity: 0, instanceCount: 1 }` (D2); (c) items split across a catch-all and a carve-out by best-match → each definition's pair matches a hand count; (d) a definition with no matches → `{ 0, 0 }`; (e) an item matching no definition contributes to neither | §19, D2 |
| C2 | Reconciliation (`verify-stock-reconciliation.ts`, extending P2's fixture at lines 336–341: quantities 4/3/7/9/8/6): (a) the teak definition recounts to `quantity 4, instanceCount 1`; the catch-all to `quantity 3, instanceCount 1`; the unmatched/wrong-location/wrong-category/sold items to neither; (b) a row whose `quantity` is correct but whose `instanceCount` was corrupted to 99 **is written** — three-value compare; (c) pass-two correction fires when an item is inserted between passes and the delta log carries both numbers; (d) `stockState` in the result equals `calculateStockState(instanceCount, thresholds)`, asserted with a fixture where `quantity` and `instanceCount` fall in **different** bands (e.g. thresholds 2/4/6, one item of quantity 5 → `instanceCount 1` → `low_in_stock`, while a quantity-based reading gives `high_in_stock`); (e) an existing row created before the column (seeded with `instanceCount: 0` and a correct `quantity`) is repaired by a plain reconcile — this is R2/R3's mechanism, tested not argued | §19, M5 |
| C3 | Hooks (`verify-stock-reconciliation.ts`, new section driving `applyItemStockChange` directly): (a) enter: `before: null`, `after: q 3` → `+3 / +1`; (b) leave: `before: q 3`, `after: null` → `−3 / −1`; (c) same definition, `q 1 → 4` → `+3 / 0`; (d) same definition, `q 4 → 1` → `−3 / 0`; (e) move between two definitions in one call (before matches A, after matches B) → A `−q/−1`, B `+q/+1`; (f) guard: row at `quantity 2, instanceCount 1`, decrement `{ 5, 1 }` → refused, **both** columns unchanged, log names both current values; (g) guard: row at `quantity 5, instanceCount 0` (corrupt), decrement `{ 3, 1 }` → refused on the instance half alone, `quantity` untouched; (h) after each of (a)–(e) the row's `stockState` equals `calculateStockState(instanceCount, thresholds)` | §22.10a, P4 C-rows |
| C4 | Report (`verify-stock-report.ts`, own fixture at thresholds 10/15/20 for low/medium/high **in items**, restock target 20): (a) each entry carries **nine** fields — the eight of §27 (with `unitsToRestockTarget` in place of the old name) plus `instanceCount`; (b) a definition with 7 items totalling 30 units → `instanceCount 7`, `quantity 30`, `stockState low_in_stock`, `unitsToRestockTarget 13` — the discriminating row: a quantity-based gap would give 0 and a quantity-based state `extra_in_stock`; (c) 0 items → `0 / 0 / out_of_stock / 20`; (d) 25 items → `extra_in_stock`, gap clamped `0`; (e) a definition with **only** `low_in_stock: 10` configured and 4 items → target 10, gap 6 — the one-threshold shape the state refactor introduced; (f) `GET /locations/:location` returns the same `instanceCount` for the same definition | §27, state refactor, D3 |
| C5 | Rebuild script: (a) `DRY_RUN=1` preview shows both numbers for current and computed; (b) a planted `instanceCount` drift is repaired by the live run while `quantity` was already right; (c) `writes: 0` on dry run (checksum) — re-executes P6 C2 under the new shape | M5 |
| C6 | Frontend domain (vitest): (a) compaction sums `instanceCount` and `quantity` independently across locations; (b) `displayedCount` returns `instanceCount` in `"instances"` mode and `quantity` in `"units"` mode; (c) comparators order by the displayed number and flip when the mode flips (fixture where the two orders differ); (d) `missingQuantityForEntry` is mode-independent (D3); (e) counter tiles are mode-independent; (f) settings read defaults to `"instances"` on empty/corrupt storage and round-trips a saved `"units"` | D3, D5, D6 |
| C7 | Frontend UI (vitest + the P5 visual harness): (a) default render shows `instanceCount` under "Items"; (b) switching in the filter sheet re-renders every row with `quantity` under "Units", gap label "Missing items", and survives a reload; (c) entry detail and location detail follow the mode; (d) the PDF sheet opens seeded with the report's mode, can be flipped without changing the report, and the rendered PDF column header and settings box reflect the sheet's choice (node-env render test per `ui/pdf/StockReportPdf.test.tsx` conventions); (e) fixtures/mocks carry `instanceCount` and the live-integration test asserts a real entry has it | D3, D5 |

**Row count: 42** — C1 5 · C2 5 · C3 8 · C4 6 · C5 3 · C6 6 · C7 5. Derived at lint, not copied.

Phase-close instruments: backend typecheck 0 · purity grep empty (`allocation.ts` must have no
Prisma import) · `npx tsx scripts/verify-all.ts` → `SUMMARY PASS 3 script(s)` with the new totals
recorded · frontend `npm run typecheck`, `npm run lint`, `npm test` green · perimeter diff exactly
the files above · the four `modules/shopify/` call sites byte-identical.

## Manual scenarios (after R5, on the running app)

1. Scan an item with `quantity: 3` into a configured location → definition shows +1 item / +3 units;
   state follows the item count.
2. Edit that item's quantity in Shopify admin to 5 → +0 items / +2 units; state unchanged.
3. Sell it → −1 / −5; state re-derived.
4. Report: default shows items; flip to units in the filter sheet; reload; still units. Flip back.
5. PDF: preview in items, flip the sheet to units, preview shows the "Units" header and
   "Count: units" in the settings box; the report page is still in items.
6. Run the rebuild dry run on the production shop; all deltas zero.

## Notes

- **Planted-defect probes** (master plan §11.1.4). (i) In `applyItemStockChange`, pass
  `instances: 1` on the same-definition branch → C3(c)(d) red. (ii) In `updateState`, derive the
  state from `row.quantity` → C2(d), C3(h), C4(b) red — this is the probe aimed at the owner's
  clarification; if it reddens nothing the fixture's two bands coincide and the fixture is wrong.
  (iii) In `applyGuardedDecrement`, guard on `quantity` only → C3(g) red. (iv) In compaction, sum
  `quantity` into `instanceCount` → C6(a) red. Each must be reverted after observing red.
- **Do not add a unit-based gap.** D3 is the decision; a second gap column is scope this phase does
  not own.
- **Keep the wire name `unitsToRestockTarget`.** "Units" is a misnomer once the gap is item-based;
  renaming it again, one day after the state refactor introduced it, touches the frontend contract
  for no behavioural gain. Contract v1.7 documents the basis.
- **The four Shopify call sites are frozen** and must appear nowhere in the diff. Everything they
  need is already in the snapshot.
- **Interim-build framing** (owner, standing): the `allocateGroup` extraction is justified here
  only because two copies of the allocation loop would have to change identically; it is not a
  maintainability pass. Nothing else is refactored.
- **Between R1 and R3 the live states are wrong** (every row at `instanceCount 0` reads
  `out_of_stock`). Schedule R1–R3 as one window and say so to whoever reads the report that day.
- The P6 review N1 hazard ("first thing to re-check if allocation semantics change") is
  discharged by task 5; record that in P6's Review log when this phase closes.

## Review log
(append-only)

### 2026-09-02 — plan drafted
Owner request in session: keep `quantity`, add per-instance count, thresholds follow the
per-instance count, frontend default per-instance with a user switch to units for report and PDF.
Seven owner cards opened.

### 2026-09-02 — draft revised against the parallel stock-state refactor
The first draft recorded a "pre-flight finding" that backend state names disagreed with the
frontend and the registry. That was a misread: the working tree held the owner's in-progress
state refactor (backend renamed, frontend rename partly applied) and was read as two settled
sides. The owner confirmed the refactor is theirs and finished. P7.0 and card D7 removed; the
gap field is `unitsToRestockTarget`, thresholds are one to three, the top band is
`extra_in_stock`. Six owner cards remain. Gate now requires that refactor committed and green.
