# P7 — Per-instance count on `LocationStock`

> **DRAFT 2026-09-02** — authored from the owner's request in session; not yet linted, not yet
> projected. Header state: **IMPLEMENTED 2026-09-02 — awaiting review** (all 6 cards answered by
> the owner 2026-09-02; lint and projection were skipped on the owner's instruction to implement
> directly — recorded in the Review log). Handoff: `handoffs/implementer/handoff_7_implement_1.md`. The
> project was closed on 2026-09-02 with P1–P6 APPROVED; this phase re-opens it as an additive
> change to an approved system. Every P1–P6 file it touches is a *frozen* file being thawed on
> purpose — the perimeter below is therefore explicit and closed.
>
> **Written against the stock-state refactor** the owner ran in a parallel session on 2026-09-02
> (uncommitted in the working tree at draft time): states are `out_of_stock, low_in_stock,
> medium_in_stock, high_in_stock, extra_in_stock` on both sides; a definition configures **one to
> three** thresholds (low/medium/high; a `0`/`null` quantity means "not configured"); the report's
> gap field is **`unitsToRestockTarget`** = `max(0, highest configured threshold − count)`. That
> refactor is committed as `4fcbc17` (with `f103dc0` on top); the gate below is satisfied.

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

## Owner decisions (6 — all ANSWERED 2026-09-02)

The owner confirmed every assumption below as the decision. The cards stay for the record and for
the lint's traceability; none is open.

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

P1–P6 APPROVED (true, 2026-09-02). **The stock-state refactor is committed** (`4fcbc17`) — the
implementer's gate self-test still re-runs its instruments (`verify-all.ts` all-PASS, frontend
typecheck/lint/test) before the first P7 edit, since no review record exists for that commit.
Owner cards D1–D6 **answered 2026-09-02** (defaults confirmed). **SATISFIED.** Contract reissued **v1.7** before frontend work starts
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

### 2026-09-02 — owner answered all six cards; gate satisfied
Owner confirmed D1–D6 as written (defaults are the decisions) and reported the state refactor
committed: `4fcbc17` "stock: rename states (normal->high, high->extra) and make thresholds
optional", then `f103dc0` (property rendering on report rows and PDF). Working tree clean. Plan
header moved to READY_FOR_LINT. Next: coordinator lint, then implementer prompt for P7.1–P7.3
(backend) and P7.4 (frontend).

### 2026-09-02 — IMPLEMENTED (Claude Fable 5.1, implementer; owner instruction "you will be implementing this fully")

**Process deviation, stated up front.** No coordinator lint, no projection round, no compiled
prompt: the owner asked for direct implementation from this plan. The row count was re-derived
at implementation (42 as written); nothing in the criteria turned out undecidable, but two rows
were re-sited (below) and the lint would have caught both.

**What was built.** Exactly the perimeter in "Files expected to change", plus three items not
listed there and declared here: (1) `apps/frontend/src/features/stock/domain/stock-count-mode.domain.ts`
— the label helpers (`stockCountLabels`, `countNoun`) moved out of the two component files
because the repo's `react-refresh/only-export-components` lint forbids non-component exports there;
(2) `apps/frontend/src/features/stock/api/mocks/get-stock-location-detail.fixture.ts` and
`mock-state.ts` — the definition DTO gained a required field, so its fixtures had to carry it;
(3) `plans/plan_6_maintenance_verification.md` — one appended Review-log note discharging P6 N1.
`ui/StockLocationDetailView.tsx` was listed and **not changed**: it renders no count (thresholds
strip only), so there was nothing to switch. The four `modules/shopify/` call sites are byte-identical.

**Judgment calls.**
- **Migration shape.** Prisma emitted a SQLite table-rebuild migration for the added column
  (`20260902170346_add_location_stock_instance_count`) rather than an `ALTER TABLE ADD COLUMN`. It
  copies every existing row and leaves `instanceCount` at 0. Applied to `prisma/dev.db` (that is
  what `prisma migrate dev` does); the data was verified intact (3 rows, values unchanged).
- **Legacy fixture expectations changed under the new basis, and the change is recorded row by row:**
  P2 C3 expected `high_in_stock`/`medium_in_stock` for one-item definitions holding 4 and 3 units
  (now both `low_in_stock`: one item under 1/3/5); P2 C4(d) `high_in_stock` → `low_in_stock`
  (quantity 1→4 is still one item); P2 C5 `medium_in_stock` → `low_in_stock`. These rows lost
  their band discrimination; P7 C2(d) carries it now with a fixture where the two bases land in
  different bands. P2 C2 rows keep their numbers by seeding `instanceCount` equal to `quantity`.
- **P5 C1(a) was a pre-existing failure on the baseline run** (`expected 15 report entries, got 18`):
  the script counted every definition in the shop, and `dev.db` now holds three real ones. Fixed in
  passing to count only this run's prefixed fixture rows — inside a file the phase owns, so no
  scope excursion; recorded because the baseline stamp is otherwise unexplainable.
- **The guard-refusal log gained two keys** (`requestedInstanceDecrement`, `currentInstanceCount`);
  P2 C2(c) asserts the exact key set and was updated. Nothing else reads that log.
- **Fixture discrimination on the frontend.** The mock report fixture doubles `quantity` and keeps
  the old numbers as `instanceCount`, so every gap and state stays consistent and any UI cell that
  silently reads `quantity` renders a visibly different number. Six existing page-test assertions
  moved from `.quantity` to `.instanceCount` accordingly; the domain-test builders default
  `instanceCount` to `quantity` so pre-P7 rows keep their arithmetic.
- **Reset in the filter sheet keeps the count mode** (D5: it is a preference, not a filter);
  asserted in C7(b).
- **Store initialisation reads localStorage at module load** (`countMode: readStockReportSettings()`),
  guarded for missing/blocked storage. A `reset()` re-reads it — that is what "survives a reload"
  tests.

**Two re-sitings, reported rather than smoothed.**
- **C3(h)** as written ("after each of (a)–(e) the state equals `calculateStockState(instanceCount,
  thresholds)`") is checked inside the shared hook scenario, so when it fails **every** C3 row
  reports its message (probe ii showed this). One function per row would have cost a second
  scenario run per row; left as is and flagged for the reviewer.
- **Probe (ii)** as named in the plan ("in `updateState`, derive the state from `row.quantity`")
  reddens C3(h) and C4(b) but **not C2(d)**: reconciliation derives the state in the service
  (`computeGroup`), not in the repository, so the basis lives in two places. A second mutation at
  the service site (ii-b) was run and reddens C2(b), C2(d), C2(e) and eight P2 rows. Both are in
  the ledger. The rebuild script is a third site for the same call; no script row observes it
  (C5's preview is checksum- and eyeball-verified, not asserted) — carried as a note.

**Instruments (the L4 stamp).** Tree: HEAD `f103dc0` + this working tree (uncommitted; 37 files
changed, 5 added). Backend: `npm run typecheck` exit 0; purity grep over `src/modules/stock/domain/`
empty; `npx tsx scripts/verify-all.ts` on a fresh `.backup` copy → `SUMMARY PASS 3 script(s)`,
**domain 66 · reconciliation 33 · report 25 = 124 rows**, none REFUSED/MISSING; `prisma/dev.db`
SHA-256 identical before and after. Frontend: `tsc -b` 0 errors; `eslint` 62 problems repo-wide =
**62 at HEAD** (stock feature: 0); `vitest run` **209/209** (baseline 189/189; +20).
Baselines were captured before the first production edit: backend `SUMMARY FAIL` (the P5 C1(a)
fixture defect above; 99 PASS rows), frontend 189/189.

**Rebuild script (C5), on the scratch copy of the real shop:** dry run previewed
`instanceCount 0 → 1 / 7 / 3` for the three real definitions with `writes: 0` and an identical
checksum; the live run wrote exactly those numbers and re-derived the states (`H1 Dining Chairs`
34 units → 7 items → `high_in_stock`, was `extra_in_stock`). **`prisma/dev.db` was not rebuilt**
(the script refuses that path by P6 design) — owner card below.

**Mutation ledger** (executed = declared: 4 backend named + 1 frontend named + 1 extra = 6 run).

| # | Site | Scope | Observed red |
|---|---|---|---|
| i | `apply-item-stock-change.service.ts`, both same-definition call sites: `instances: 0` → `1` | `verify-stock-reconciliation.ts` | `P7.C3(c)` "expected 4/1, got 4/2". C3(d) stayed green: (c)'s surplus instance and (d)'s surplus decrement cancel — the probe discriminates on (c) alone |
| ii | `location-stock.repository.ts` `updateState`: `row.instanceCount` → `row.quantity` | reconciliation + report scripts | `P7.C3(a)–(h)` (all via C3(h)'s message, see re-siting), `C4(a)`, `C4(c)`, `P7.C4(b)` |
| ii-b | `stock-reconciliation.service.ts` `computeGroup`: `calculateStockState(instanceCount` → `quantity` | reconciliation script | `C3(a)–(e)`, `C4(d)`, `C5(a)(b)`, `P7.C2(b)`, `P7.C2(d)`, `P7.C2(e)` |
| iii | `location-stock.repository.ts` `applyGuardedDecrement`: drop `instanceCount: { gte }` from the where-clause | reconciliation script | `P7.C3(g)` "instance-half refusal did not fire" |
| iv | `stock-report.domain.ts` `compactEntries`: sum `quantity` into `instanceCount` | domain + page vitest files | `C6(a)`, page `C4`, `C6`, `C7(a)`, `C7(b)`, `C7(c)` |

A first run of probe i was **reverted too broadly** (a global replace also flipped the leave/enter
branches to `instances: 0`), which contaminated the first runs of ii and iii; the file was restored
exactly, the suite re-run green, and ii/iii re-run with copy-based reverts. The table above is
from the clean runs. Working tree confirmed restored after each probe (`git diff` unchanged).

**Every guard shipped with its red:** the two-column guard (iii), the item basis in both places
(ii, ii-b), the same-definition instance rule (i), compaction (iv). The settings reader's
corrupt-storage guard is exercised by C6(f) with three malformed values.

**Coverage map (row → instrument → assertion shape).** C1(a)–(e) → `P7.C1(*)` in
`verify-stock-domain.ts`, exact `equalJson` on both numbers. C2(a)–(e) → `P7.C2(*)` in
`verify-stock-reconciliation.ts`; (b) asserts the row was *written* (`updatedByUsername` sentinel),
(c) asserts both numbers in `from`/`to`, (d) asserts the discriminating band. C3(a)–(h) →
`P7.C3(*)`; (f) asserts both current and both requested values in the log; (h) counts six state
checks. C4(a)–(f) → `P7.C4(*)` in `verify-stock-report.ts` (plus C3(a) now asserting nine keys).
C5(a)–(c) → executed by hand on the scratch copy (above), not scripted — same as P6 C2. C6(a)–(f)
→ `stock-report.domain.test.ts` "P7 count mode" block and `stock-report-settings.domain.test.ts`.
C7(a)–(c) → `StockReportPage.test.tsx` "P7 count mode"; C7(d) → `GeneratePdfSheet.test.tsx`,
`stock-pdf.domain.test.ts` and `StockReportPdf.test.tsx` (node-env render, both modes); C7(e) →
`stock-api.test.ts`. No orphan tests: every added `it` names its row.

**⚠ OWNER DECISIONS REQUIRED (1)**
- **Backfill the local development database.** `prisma/dev.db` is migrated (column present, every
  row at `instanceCount 0`, so the three live definitions read `out_of_stock` until recounted).
  `scripts/rebuild-location-stock.ts` refuses to run against the configured dev.db by P6 design.
  Options: (a) run the rebuild against a copy and swap; (b) a one-off `npx tsx -e` calling
  `reconcileAllGroups(shopId)`; (c) create/edit any definition in the app — each command
  reconciles its group. Not done unasked: it writes the owner's live data. **Production follows
  runbook R1–R5 in this plan; R1→R3 is one window.**

### 2026-09-02 — owner card closed: local dev.db backfilled
Owner asked for a straightforward local run. `scripts/rebuild-location-stock.ts` gained an explicit
opt-in, `ALLOW_CONFIGURED_DATABASE=1`, which lifts P6's refusal of the configured `prisma/dev.db`
and logs `location-stock-rebuild-configured-database-override` when used; without the flag the
refusal (exit 3) is unchanged and was re-checked. Ran dry then live on `prisma/dev.db`: H1 Dining
Chairs 34 units → 7 items (`extra_in_stock` → `high_in_stock`); O2 Dining Tables 3 → 3 items
(`low_in_stock`); H1 Dining Chairs 2 → 1 item (`low_in_stock`). No open owner cards remain.
