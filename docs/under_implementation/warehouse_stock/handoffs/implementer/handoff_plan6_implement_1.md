---
plan: 6
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-02
actor: Codex (GPT-5)
---

# P6 implementer handoff

Implemented the property-drift report and location-stock rebuild scripts. The six in-scope
rows are C1(a)(b)(c), C2(a)(b)(c), and C5. C3 is out of scope because it was discharged by the
owner's attestation; C4 is the coordinator's ledger closeout.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. No semantic decision was left open.

## Task 0 coverage map — six rows

The pre-edit regression baseline was `npm run typecheck` exit 0 and a scratch-copy
`SUMMARY PASS 3 script(s)` with 97 inherited rows. This phase has no committed `verify-*.ts`
instrument and the project has no test suite, so there was no phase-specific executable red
baseline before the first script edit; no failure count was reconstructed.

| Row | Discharging instrument / case | Assertion shape |
|---|---|---|
| C1(a) | `report-stock-property-drift.ts` against a scratch DB with one planted `wood_type: "Bamboo"` value. | Exact: emits `key: "wood_type"`, `token: "bamboo"`, and `count: 1`; summary emits `driftEntries: 1`. |
| C1(b) | `report-stock-property-drift.ts` against the unmodified development data. | Exact: all configured values produce no false positive (`driftEntries: 0`), and all 8 configured map keys have observations (`unobservedKeys: 0`). |
| C1(c) | SHA-256 before/after the read-only report on `prisma/dev.db`. | Exact: the two checksums are identical. |
| C2(a) | `rebuild-location-stock.ts` with `DRY_RUN=1` against a scratch fixture. | Exact: prints the per-config `99/high_in_stock → 7/high_in_stock` preview and `writes: 0`; checksum is identical. |
| C2(b) | Live rebuild against a separate scratch fixture with quantity planted at 99. | Exact: the planted config is repaired to `7|high_in_stock`. |
| C2(c) | Rebuild output on the same live fixture. | Exact: emits one `location-stock-group-reconciled` event for `P6_LIVE_LOCATION / Dining Chairs` and `groupsTouched: 1`. |
| C5 | Fresh scratch-copy `npx tsx scripts/verify-all.ts`. | Exact: the three executed child scripts report PASS, none report REFUSED/MISSING, 97 rows pass, and the final line is `SUMMARY PASS 3 script(s)`. |

No test case is orphaned: the only executable regression cases are the six criterion-bound
maintenance checks above and the inherited committed verification scripts required by C5.

## Implementation and judgment calls

- `report-stock-property-drift.ts` scans only `ITEM_PROPERTY_OPTIONS` keys. It compares shared,
  lower-cased atomic tokens via P1's `tokenizePropertyValue`; unknown keys from Shopify are not
  drift, including non-map names such as `extensions_quantity`.
- Drift counts are token occurrences across rows. A configured key's `observedCount` counts rows
  with a non-empty tokenized value, and unobserved keys are emitted separately with count 0.
- `rebuild-location-stock.ts` refuses an unset/empty or configured-development `DATABASE_URL`
  with exit 3 before database work, requires `SHOP_ID`, and accepts `DRY_RUN=1` (plus the
  established `true` spelling).
- The reconciliation service writes and returns no computed preview values. Dry-run therefore
  uses its same repository reads, best-match resolver, and state calculator without invoking a
  writer; live mode calls `reconcileAllGroups(SHOP_ID)` directly.
- `verify-all.ts` and `EXPECTED_SCRIPTS` were not edited because neither new file is a
  `verify-*.ts`.

## Evidence ledger

The final code checkpoint tree was `4a0d5ef` and was clean at the C5 run. The plan and this
handoff are documentation recorded after that checkpoint. The named planted probes were two:
C1(a)'s stored-property mutation and C2(b)'s LocationStock quantity mutation. Both were run,
observed as specified, and reverted by disposal of their scratch databases.

| Row | Scope and command | Result / observed failure-ID delta |
|---|---|---|
| C1(a) | L1 manual instrument: `DATABASE_URL=file:/private/tmp/warehouse-stock-p6-drift.tQnvhO/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/report-stock-property-drift.ts` after planting one scratch property. | PASS. One `property-value-drift` line reported `wood_type`, `bamboo`, count 1; summary had one drift entry. No expected failure IDs; planted defect was observed by the instrument. |
| C1(b) | L1 manual instrument: `SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/report-stock-property-drift.ts` on configured data. | PASS. 1107 ScanHistory rows, zero drift entries, zero unobserved keys, eight configured keys observed. No false-positive IDs. |
| C1(c) | L1 checksum probe: `shasum -a 256 prisma/dev.db` immediately before and after the report command. | PASS. Before/after SHA-256: `be5906923b4ed7e2dbe6a8d90964d99f47d3c3926b3875d9bd03cd2fe04f2b22`. |
| C2(a) | L1: scratch copy via `sqlite3 prisma/dev.db ".backup '<dest>'"`; run `DRY_RUN=1 SHOP_ID=... DATABASE_URL=file:<dest> npx tsx scripts/rebuild-location-stock.ts`; checksum before/after. | PASS. Preview showed config `p6-dry-stock` current 99/high and computed 7/high, with one group and zero writes. Before/after SHA-256: `85c9d70175e7c6517e609bd35668fd2dd25f7faf3ff578c04be0335c98d13d2a`. |
| C2(b) | L1: separate `.backup` fixture; set `p6-live-stock` to quantity 99; run live `SHOP_ID=... DATABASE_URL=file:<dest> npx tsx scripts/rebuild-location-stock.ts`; query the planted row. | PASS. Observed `LIVE_REPAIRED=7|high_in_stock`. No failure IDs; planted drift was repaired. |
| C2(c) | Same L1 live command and output. | PASS. One group event for `P6_LIVE_LOCATION` / `Dining Chairs`, completion `groupsTouched: 1`. |
| C5 | L4 scratch-copy command: `DATABASE_URL=file:/private/tmp/warehouse-stock-p6-c5.byTRSQ/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts`. | PASS, exit 0. Failure-ID delta is `∅ → ∅`; 97 expected inherited rows passed. Full output is below. |

The rebuild safety guard was also directly planted by targeting `DATABASE_URL=file:./dev.db`:
it printed the configured-development refusal and exited 3. This is a safety proof, not an
additional criterion row.

## Mutation-probe files and resources

Listed separately from the implementation changes:

- `/private/tmp/warehouse-stock-p6-drift.tQnvhO/dev.db` — C1(a) planted property, applied and
  discarded.
- `/private/tmp/warehouse-stock-p6-dry.*/dev.db` — C2(a) fixture and dry-run checksum probe,
  discarded.
- `/private/tmp/warehouse-stock-p6-live.4zoNFS/dev.db` — C2(b) planted quantity and live repair,
  discarded.
- `/private/tmp/warehouse-stock-p6-c5.byTRSQ/dev.db` — C5 disposable regression copy, discarded.

No production file was touched by a mutation probe; no test file was edited.

## Full C5 output

```text
--- verify-stock-domain.ts ---
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C3(e)
PASS C3(f) (empty array)
PASS C3(f) (blank scalar)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
PASS C4(f)
PASS C5(a)
PASS C5(b)
PASS C5(c)
PASS C5(d)
PASS C5(e)
PASS C5(f)
PASS C6(a)
PASS C6(b)
PASS C6(c)
PASS C6(d)
PASS C6(e)
PASS C6(f)
PASS C6(g)
PASS C6(h)
PASS C7(a)
PASS C7(b)
PASS C7(c) (zero)
PASS C7(c) (negative)
PASS C7(c) (non-integer)
PASS C7(d)
PASS C7(e)
PASS C7(f)
PASS C7(g)
PASS C8(a)
PASS C8(b)
PASS C8(c)
PASS C8(d)
PASS C8(e)
PASS C8(f)
PASS C8(g)
PASS C8(h)
PASS C9(a)
PASS C9(b)
PASS C9(c)
PASS C9(d)
PASS C9(e)
PASS C9(f)
PASS C9(g)
PASS C9(h)
PASS verify-stock-domain.ts
--- verify-stock-reconciliation.ts ---
PASS C1(a)
PASS C1(b)
PASS C1(c)
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C2(d)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C3(e)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C5(a)
PASS C5(b)
PASS C6(a)
PASS C6(b)
PASS verify-stock-reconciliation.ts
--- verify-stock-report.ts ---
PASS C1(a)
PASS C1(b)
PASS C1(c)
PASS C1(d)
PASS C2(a)
PASS C2(b)
PASS C2(c)
PASS C2(d)
PASS C2(e)
PASS C2(f)
PASS C3(a)
PASS C3(b)
PASS C3(c)
PASS C3(d)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
PASS verify-stock-report.ts
SUMMARY PASS 3 script(s)
```

## Full write perimeter

Implementation changes:

- `apps/backend/scripts/report-stock-property-drift.ts`
- `apps/backend/scripts/rebuild-location-stock.ts`
- `docs/under_implementation/warehouse_stock/plans/plan_6_maintenance_verification.md` —
  append-only Review log entry
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan6_implement_1.md`
  — this handoff

No feature code, migration, index, `verify-all.ts`, `EXPECTED_SCRIPTS`, master-plan tracker
row, prior-phase file, or architecture-graph state was changed. There is no architecture graph
in this repository. The checkpoint SHA is `4a0d5ef`.

## Candidate upstream notes

No plan defect was found. The optional map-key absence output has no dedicated acceptance row;
it is implemented and was observed empty on current data (`unobservedKeys: 0`). It remains low
stakes as the plan records, because the C1 rows would still pass if that optional output were
omitted.
