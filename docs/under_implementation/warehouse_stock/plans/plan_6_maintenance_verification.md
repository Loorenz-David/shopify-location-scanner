# P6 — Maintenance Scripts + End-to-End Verification Sweep

## Goal
Ship the two maintenance scripts (property-drift report, full stock rebuild) and execute the complete manual verification sweep that closes the project against the measurement ledger. **Not in this phase:** feature code changes (any defect found here routes back as a fix cycle on the owning phase).

## Read first
Master plan §5, §6.4, §9, §10 · intention §9, §20, §22.10a, §24 (full ledger) · context §0.4 (drift insurance), §0.17, §0.21 · `scripts/reconcile-active-sold-items.ts` (script conventions: `DRY_RUN`, `SHOP_ID`, tsx, direct `src/` imports) · all five prior plans' Review logs.

## Dependencies (gate)
P3, P4, P5 all APPROVED.

## Files expected to change
New `scripts/report-stock-property-drift.ts` · new `scripts/rebuild-location-stock.ts`. Nothing else.

## Tasks (ordered)
1. `report-stock-property-drift.ts` — scans all `ScanHistory.properties` for the shop; for every key in `ITEM_PROPERTY_OPTIONS`, reports stored atomic tokens absent from the map's values (and, separately, map keys never observed), with counts. Read-only; no `DRY_RUN` needed.
2. `rebuild-location-stock.ts` — `reconcileAllGroups(shopId)` wrapper with `DRY_RUN=1` mode that prints per-config current→computed deltas without writing; honors `SHOP_ID`.
3. Execute the verification sweep below; record every step's expected vs observed in the Review log. Defects → fix cycles on the owning phase's plan, not patches here.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Drift script: (a) a value planted in a scratch item (`wood_type: "Bamboo"`) is reported under `wood_type` with count; (b) map values all present in data produce no false positives; (c) read-only — dev.db byte-identical after a run (checksum before/after) | §0.4 |
| C2 | Rebuild script: (a) `DRY_RUN=1` prints deltas, writes nothing (checksum); (b) live run repairs a planted drifted quantity; (c) output lists every group touched | M5, §9/§20 |
| C3 | End-to-end sweep executed and recorded — every §22.10a scenario: scan into a configured location; scan out; a sale; a return to store; a Shopify-admin location edit; a config created against existing inventory; a config deleted with fallback to a broader one. Each with expected quantity AND state written before execution | M1–M5, §22.10a |
| C4 | Ledger closeout row per measurement: M1–M8 each marked verified with a pointer to the evidence (P1–P5 Review logs or C3 steps). M6→P1-C8/P3-C1–C2, M7→`verify-stock-report.ts` all-PASS plus the P5 curl steps, M8→the catch-all/no-catch-all totals check run once each way | M1–M8, §24 |
| C5 | Regression seam final run (§9.1d): `verify-all.ts` exits 0 with every script in the master plan §6.4 table reported PASS — none `REFUSED`, none `MISSING`. Output pasted whole into the Review log, since this is the project's single strongest piece of evidence that no phase silently broke an earlier one | §9.1d |

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — the project's final regression run, chaining P1, P2 and P5's scripts), full output in the Review log; perimeter diff (2 files).

## Manual scenarios
C3 IS the scenario list (the §22.10a set). M8 reminder for every totals check: a group without a catch-all legitimately sums short — expected, not drift (§0.21).

## Notes
- Scripts run with `npx tsx scripts/<name>.ts` from `apps/backend`; destructive steps (planted drift) on a scratch copy of dev.db per master plan §10.
- This phase is the project's approval gate: after C4, the coordinator archives per the charter closeout ritual.

## Review log
(append-only)
