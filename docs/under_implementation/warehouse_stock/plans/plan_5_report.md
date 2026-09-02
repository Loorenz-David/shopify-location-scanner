# P5 — Stock Report

> **Rewritten 2026-09-01** against intention **§26** (report-contract amendment, owner-approved
> round 3). The previous version built server-side compaction, state filtering, severity
> ordering and location ranking. Those moved to the client; this phase is correspondingly
> smaller. Its old criteria are preserved in the Review log below, not deleted silently.

## Goal
Implement the report query and endpoint per intention §26: **one unparameterized read returning every stock definition, uncompacted**, each entry carrying a `mergeKey` the client groups on. **Not in this phase:** compaction, state filtering, ordering, location ranking (all client-side per §26.3 — implementing any of them is a defect, not a bonus); any mutation path; any file outside the list below.

## Read first
Master plan §5, §6.4–§6.5, §9, §10 · intention **§27** (round 2 — extends §26.1's entry shape; read it before §26), **§26** (the contract — wins over §19 and context §0.19), **§19** (still the authority for what compaction/ordering *mean*, now performed by the client), §23.1 (canonical form), §24 M7 (as amended) · context §0.19 (read its superseded marker first), §0.20, §0.21 · P1 domain (`STOCK_STATES`, `canonicalCriteriaString`) · P2's repository (`listByShop`, and the stored `propertiesCanonical` column) · P3's controller/routes/contract files.

## Dependencies (gate)
P3 APPROVED (shares `stock.controller.ts`, `stock.routes.ts`, `stock.contract.ts`). **Also gated on the intention header reading `RATIFIED`** — §26 re-opened it; do not start against a header that still says READY_FOR_RATIFICATION.

## Files expected to change
New `src/modules/stock/queries/get-stock-report.query.ts` · `src/modules/stock/{contracts/stock.contract.ts, controllers/stock.controller.ts, routes/stock.routes.ts}` (additions only) · new `scripts/verify-stock-report.ts` (committed criterion instrument, master plan §9.1b/§6.4; scratch DB copy only) · `scripts/verify-all.ts` — **`EXPECTED_SCRIPTS` only**, adding `"verify-stock-report.ts"` to that constant in the same commit that authors the script, which master plan §6.4 requires of the authoring phase (lint L2: the perimeter previously forbade the one file a standing instruction required). Nothing else in the runner is yours: it already auto-discovers `verify-*.ts`, so the constant is what makes a later *deleted or renamed* script report `MISSING` rather than disappear quietly — the point of the §9.1d seam.

**Round 2 (§27) touches three files only:** `src/modules/stock/queries/get-stock-report.query.ts` ·
`src/modules/stock/contracts/stock.contract.ts` (additive types) · `scripts/verify-stock-report.ts`.
**It does NOT touch** `controllers/stock.controller.ts`, `routes/stock.routes.ts` or
`scripts/verify-all.ts` — the route exists, the envelope is unchanged, and the script is already in
`EXPECTED_SCRIPTS`. Their absence from the round-2 diff is a pass; their presence is a finding (lint L3).

## Tasks (ordered)
1. Query — load every `LocationStock` for the shop (P2's `listByShop`) and map one entry per row: `{ location, itemCategory, properties, mergeKey, quantity, stockState }`. `properties` is the configuration's **canonical criteria** (§23.1), never an item bag. **No filtering, no compaction, no grouping, no ordering guarantee** (§26.1).
2. `mergeKey` — `` `${itemCategory}|${propertiesCanonical}` ``, where `propertiesCanonical` is **read from the stored column** (master plan §6.1), not recomputed from `properties` in the query. The column is already the §23.1 identity and is kept in sync by the repository on every write; recomputing it here would create a second implementation of canonicalization, which §21/§0.5 forbid, and would silently diverge if the two ever disagreed. Treat the key as opaque downstream: nothing in this codebase parses it.
3. Contract — response DTO per master plan §6.5. **No query-parameter schema.** Parameters that arrive are ignored, not rejected (§26.1) — so no 400 path exists for them.
4. Controller + route (`GET /stock/report`), both mounts already covered by P3's router.
5. `scripts/verify-stock-report.ts` — seeds a scratch copy of dev.db (`SHOP_ID` env) with a fixture set of configurations hitting every lettered row below, calls `getStockReportQuery` directly (not over HTTP — these rows assert the data, not the transport), prints one PASS/FAIL line per row, exits non-zero on any FAIL. **Refuses to run when `DATABASE_URL` points at the configured dev.db**, and that refusal is a non-zero exit (master plan §9.1d).

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Completeness — one entry per definition, no more, no fewer: (a) every `LocationStock` for the shop appears **exactly once**; (b) a definition matching zero items appears with `quantity: 0` / `out_of_stock` — never omitted, since a definition that fell to zero is the report's most urgent signal; (c) definitions spanning several locations and several categories all appear; (d) no definition belonging to another `shopId` appears — **the fixture must seed a second `Shop` and give it at least one definition, then assert that definition's absence.** `prisma/dev.db` holds exactly one shop, so a fixture that seeds only it makes this row **vacuously PASS while testing nothing** (lint L4 — the same empty-set vacuity P1's review found in `findConflict`). `Shop` requires only a unique `shopDomain`, so the second shop is two lines | M7, §26.1, §0.19 |
| C2 | `mergeKey` identity — equal **iff** `itemCategory` and canonical `properties` are equal: (a) same category + same criteria at two different locations → **equal** keys; (b) one config created with scalar `{wood_type:"Teak"}` and one with `{wood_type:["Teak"]}` → **equal** keys (§23.1 unifies them); (c) same category, different criteria → **different**; (d) different category, identical criteria → **different**; (e) two `{}` catch-alls, same category, different locations → **equal**; (f) `{wood_type:["Teak","Oak"]}` and `{wood_type:["Oak","Teak"]}` → **equal** (member order is not semantic) | M7, §26.2, §23.1 |
| C3 | Entry shape and the absence of server-side processing: (a) each entry carries exactly `location`, `itemCategory`, `properties`, `mergeKey`, `quantity`, `stockState`, **`thresholds`, `unitsToNormalThreshold`** — **eight fields (§27, round 2; was six)** — no `locations[]`, no `rows`, no `groups`; (b) `properties` is the configuration's canonical criteria, not an item's property bag; (c) `?states=out_of_stock&groupByLocation=true` returns **the same complete payload** as no parameters — ignored, not rejected, no 400; (d) reachable at both `/stock/report` and `/api/stock/report` | M7, §26.1/§26.3, §0.19 |
| C4 | **Restock distance (§27, round 2).** `unitsToNormalThreshold` = `max(0, normal_in_stock threshold − quantity)` — the owner's **fill** reading, not the count that merely enters the band. **C4 uses its own fixture set at thresholds 10/15/20** (lint L1 — the round-1 fixtures seed 1/3/5 and **stay that way**; their `quantity 2 → medium_in_stock` row is correct under 1/3/5 and must not be "corrected". 10/15/20 is chosen because those are the integers in §27.3's table, contract §4.7's table and the runbook, so a human cross-checking reads the same numbers). **The fixture writes `quantity` only and derives `stockState`** via `recalculateState` or P1's `calculateStockState` (lint L2 — a hand-typed state makes C4(c) assert its own setup). Bands are `1–10 low`, `11–15 medium`, `16–20 normal`, `>20 high`: (a) quantity **7** (`low_in_stock`) → **13**, asserted exactly, so the rejected `medium + 1` reading (which gives 9) fails it; (b) quantity **0** (`out_of_stock`) → **20**; (c) quantity **18** → the row **first asserts the entry's `stockState` is `normal_in_stock`**, then that the gap is **2** — *the deliberate case*: a definition inside the normal band but below its threshold still reports a gap, and a future reader must not "fix" it to 0; (d) quantity **25** (`high_in_stock`) → **0**, never negative; (e) `thresholds` carries the definition's three configured rows in §6.5's `{state, thresholdQuantity}` shape, matching what `GET /locations/:location` returns for the same definition — **asserted by looking each state up by name, never by array index** | M7, §27.2/§27.3 |

**19 lettered rows** — C1 (a)–(d) = 4, C2 (a)–(f) = 6, C3 (a)–(d) = 4, **C4 (a)–(e) = 5**. Derived at each lint, not copied; the implementer's per-row account covers all 19. *Round 1 closed at 14; §27 adds C4 and re-words C3(a) without adding a row to it.*

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — chaining P1's, P2's and this phase's scripts), output in the Review log; perimeter diff (5 files, additions only in the three shared ones).

## Manual scenarios

**C1–C3 are discharged by `scripts/verify-stock-report.ts`**, not by eye. The curl steps below prove only that the **HTTP transport** delivers what the script already proved about the data.

1. `GET /api/stock/report` against the fixture → entry count and three spot-checked entries match the script's PASS set, including one zero-quantity definition.
2. `GET /api/stock/report?states=out_of_stock&groupByLocation=true` → byte-identical payload to step 1 (C3(c)).
3. Both mounts reachable.

## Notes
- **Round-2 planted-defect probe (master plan §11.1.4) — this round's probe.** Temporarily change the arithmetic to the **rejected**
  reading, `max(0, medium + 1 − quantity)` → **C4(a) must FAIL** (13 becomes 9) **and C4(c) must FAIL** (2 becomes 0). Revert after
  observing red. *Aimed at the exact decision the owner made, and both halves are reachable — the property round 1's probe lacked
  (P5 review N1: it mutated a derivation whose two forms are provably equal before this phase's code runs, so it could only ever
  produce a false green). Before accepting any probe, ask: **what reachable input makes the mutant and the original differ?***
- **Look the normal threshold up BY STATE, never by array index.** The repository returns thresholds `orderBy: { state: "asc" }`,
  which is **alphabetical** — `low_in_stock, medium_in_stock, normal_in_stock` — coinciding with severity order by accident, not by
  design. `thresholds[2].thresholdQuantity` works today and silently returns the wrong number the moment the ordering, the enum, or
  the include changes.
- **Round-1 probe, retained as history:** deriving `mergeKey` from `JSON.stringify(properties)` instead of the stored `propertiesCanonical` column → **C2(b) must FAIL** (a scalar-created and an array-created config would get different keys while being the same criterion). This probe is aimed at the phase's one real silent-failure mode: a `mergeKey` that looks fine in every hand-inspection and quietly splits or merges the client's groups. Revert after observing red.
- **One check function per criterion row (P2 review N1).** P2's script discharged 20 rows with 9 functions — C3(a)–(e) all ran one function — so a single broken assertion reddened five rows with an identical message that matched none of them. Fixtures may be shared; **assertions must not be**. Each lettered row gets its own assertion and its own failure message naming that row's predicate.
- **Do not implement compaction, filtering, ordering or ranking** (§26.3). They are the client's, and adding them here would be scope this phase does not own — a reviewer finding, not a nicety.
- **The safety property that crossed the wire (§26.4):** the client must group on `mergeKey + stockState`, never `mergeKey` alone, or low stock in one location is hidden by healthy stock elsewhere. No criterion here can observe that — it belongs to the frontend's ledger. Recorded so nobody later mistakes its absence from this plan for an oversight.
- Pure projection over ≤ dozens of definition rows — in-memory, no new indexes, no aggregation (context §0.6).

## Review log
(append-only)

### 2026-09-01 — plan rewritten under intention §26 (owner-approved amendment)

The frontend track's request (`frontend_handoffs/frontend-report-endpoint-request.md`, its
decision D7) was approved by the owner in session and folded as intention §26, which wins
over §19 and context §0.19. This plan was rewritten rather than patched: patching would have
left criteria asserting server-side behaviour the contract no longer has.

**What this phase lost** (recorded so the change is auditable, and so a later reader does not
think these were forgotten): the previous C1 cross-location compaction on
`itemCategory + properties + stockState`; C2 default severity ordering; C4 the `states` CSV
filter and its 400 path; C5 grouped-by-location mode with the four-comparator location
ranking. All four moved to the client under §26.3.

**What it gained:** the `mergeKey` contract (§26.2) and its identity criterion, which is the
only genuinely new backend behaviour in the amendment — and it is not new machinery, since
`propertiesCanonical` already stores the §23.1 identity the key is built from.

**Net:** six criteria to three; one endpoint shape instead of two; the verify script added
earlier the same day narrows with it, from compaction-and-ranking rows to identity-and-
completeness rows. The phase gets smaller, which is why the amendment was worth taking.

### 2026-09-02 — P5 implementer round 1 (Codex)

Implemented the unparameterized report projection. The query delegates shop scoping to
P2's `listByShop`, emits one entry per returned definition, and builds the opaque
`mergeKey` from the stored `propertiesCanonical` column. Added the report DTO, controller,
route, the committed scratch-DB verification script, and the required
`verify-all.ts` `EXPECTED_SCRIPTS` registration. No compaction, filtering, ordering,
ranking, mutation, or changes to earlier-phase files were added.

Coverage map (each row has its own executable case/assertion):

- C1(a) → `verify-stock-report.ts` C1(a), exact count plus exactly-one match per fixture definition.
- C1(b) → C1(b), zero quantity and `out_of_stock` assertion.
- C1(c) → C1(c), explicit Dining Chairs and Easy Chairs definitions at distinct locations.
- C1(d) → C1(d), seeded second-shop definition absent from the requested-shop report.
- C2(a) → C2(a), equal merge keys for same criteria at two locations.
- C2(b) → C2(b), equal merge keys for scalar-created and array-created equivalent criteria.
- C2(c) → C2(c), different merge keys for different criteria in one category.
- C2(d) → C2(d), different merge keys for identical criteria in different categories.
- C2(e) → C2(e), equal merge keys for catch-alls at two locations.
- C2(f) → C2(f), equal merge keys for differently ordered equivalent arrays.
- C3(a) → C3(a), exact six-key entry shape for every entry.
- C3(b) → C3(b), canonical configuration criteria `{wood_type: ["teak"]}` assertion.
- C3(c) → C3(c) plus the HTTP curl scenario, direct extra-argument payload equality and byte-identical parameterized response.
- C3(d) → C3(d) plus the HTTP curl scenario, route and both server mounts inspected and both mounts returned 200.

The pre-edit red baseline was not captured: at the opening gate the report query and its
criterion instrument did not exist, so there were no executable P5 cases to run. This is
not reconstructed after the fact. The opening scratch baseline was typecheck 0 and
`SUMMARY PASS 2 script(s)` at `/private/tmp/warehouse-stock-p5-baseline-ocWSyC/dev.db`.

Evidence on the final tree:

- `npm run typecheck` — exit 0.
- Purity grep over `src/modules/stock/domain/` and `src/shared/item-properties/item-property-options.ts` — empty.
- Live-development DB refusal — exit 3 with `REFUSED DATABASE_URL resolves to the configured development database`.
- Final scratch runner path: `/private/tmp/warehouse-stock-p5-close-54LnLO/dev.db`.
- Final HTTP scratch path: `/private/tmp/warehouse-stock-p5-http-O54u70/dev.db`.
- Manual expected vs observed: `/api/stock/report` expected 200 and 3 fixture entries with spot checks; observed 200, `CURL1_ENTRY_COUNT=3`, `CURL1_SPOT_CHECKS=3 PASS`. Parameterized request expected 200 and byte-identical payload; observed 200 and `CURL2_BYTE_IDENTICAL=YES`. Bare `/stock/report` expected reachable; observed 200.

The named probe replacing `mergeKey` with `JSON.stringify(configuration.properties)` was
executed and returned a false green (exit 0), then reverted. P2's frozen `listByShop`
normalizes both scalar and array criteria before this query receives them, so this exact
probe cannot distinguish the forbidden duplicate implementation at the query boundary.
An independent call-site probe substituting a wrong shop id did redden the instrument
(exit 1; C1(a), C1(b), C1(c), C2(a–d), C2(e–f), and C3(b) failed), then was reverted.
This is a candidate upstream instrument note, not a production deviation.

Final `verify-all.ts` output (scratch path above; exact closing tree):

```text
--- verify-stock-domain.ts ---
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
PASS verify-stock-report.ts
SUMMARY PASS 3 script(s)
```

### 2026-09-02 — review round 1 · APPROVED · phase closed

Handoff: `handoffs/reviewer/handoff_plan5_review_1.md`. Tree `dedf415`; perimeter exactly the six
permitted files, additive only in the three shared with P3, `verify-all.ts` limited to the
`EXPECTED_SCRIPTS` line.

Instruments: typecheck 0 · purity empty · `verify-all.ts` **`SUMMARY PASS 3 script(s)`** (58 P1 +
20 P2 + **14 P5**) on a scratch copy · refusal guard exit **3** in all three forms (unset,
relative, absolute) · `prisma/dev.db` untouched, still 0 definitions and 1 shop after a run that
seeds a second one.

All three manual scenarios re-executed by the reviewer against a live server on real inventory.
`{data:{entries:[…]}}` with exactly six fields per entry; a **scalar**-created LC1 teak definition
and an **array**-created H1 teak definition returned the **same `mergeKey`** (C2(b) demonstrated
outside the fixture); a zero-match Sofas definition present at `0`/`out_of_stock`;
`?states=…&groupByLocation=…&limit=…&sort=…` byte-identical to the bare call and a malformed
`?bogus=%%%` still 200; both mounts 200 with identical payloads; 401 without a token.

**Reviewer mutation probes (four, independent of the implementer's).** M2 key omits
`itemCategory` → C2(d) red. M3 key includes `location` → C2(a)(b)(e)(f) red. M4 drops
zero-quantity rows → 8 rows red, each with its own true message. **M1 — the plan's own named
probe — reddened nothing**, confirming the implementer's upstream note. All reverted; tree clean.

**N1 (plan defect, not code):** the named probe cannot fail, because `propertiesCanonical` and
`JSON.stringify(properties)` are provably identical for all reachable data — both derive from
`normalizeCriteria`, which already sorts keys and values, and the only two writers write them
together. The scalar/array unification C2(b) names is settled upstream at write time. The failure
mode the probe targeted **is** covered, by C2(d) (merging) and C2(a)/(e)/(f) (splitting), proven
by M2 and M3. Using the stored column remains correct regardless (§26.2, §21/§0.5). No fix cycle.
**N2:** C3(d) is partly a source-text `includes()` match — proves registration, not reachability;
backed by the curl steps, which were re-executed.

Phase closed.

### 2026-09-02 — P5 implementer round 2 (Codex)

Added the §27 amendment to the approved report projection. `StockReportEntry` now carries
the definition's three `{ state, thresholdQuantity }` rows and the backend-derived
`unitsToNormalThreshold`. The query finds the `normal_in_stock` threshold by state name,
maps only the public threshold shape, and computes `Math.max(0, normalThreshold - quantity)`.
The endpoint remains an uncompacted, unfiltered, unordered read; no controller, route,
runner, migration, index, or other phase file changed.

The verification instrument gained its own 10/15/20 threshold fixtures for quantities 7, 0,
18, and 25. Each fixture writes quantity only and calls the existing repository
`recalculateState` path. The round-1 1/3/5 fixture remains unchanged. C3(a) now asserts the
eight-field shape, and C4(a)–(e) each has its own executable case and failure message. The
pre-production-edit red baseline after adding those cases was 6 failures: C3(a) plus C4(a)–
C4(e); all 14 inherited rows were still PASS.

Judgment calls: a missing `normal_in_stock` row throws rather than silently defaulting to
zero, because valid persisted definitions always contain all three configurable thresholds
and a fallback would hide corrupt data. Threshold rows are projected explicitly to prevent
repository-only fields from crossing the report contract. No deviations from the plan or
ratified intention were required.

Round-2 probe: the query was temporarily changed to look up `medium_in_stock` and calculate
`max(0, medium + 1 - quantity)`, then reverted. C4(a) failed individually (`13` became `9`),
C4(b) also failed (`20` became `16`), and C4(c) failed individually (`2` became `0`);
C4(d) and C4(e) remained PASS. This confirms the probe reaches the selected arithmetic and
distinguishes the owner's fill decision.

Closing evidence on scratch copy `/private/tmp/warehouse-stock-p5-r2-close.fBxWxg/dev.db`:

- `npm run typecheck` — exit 0.
- Purity grep — empty.
- Development-database refusal — exit 3 with the configured `prisma/dev.db` path.
- `DATABASE_URL=file:/private/tmp/warehouse-stock-p5-r2-close.fBxWxg/dev.db
  SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts` — exit 0:

```text
--- verify-stock-domain.ts ---
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
PASS C3(e)
PASS C3(f) (empty array)
PASS C3(f) (blank scalar)
PASS C4(a)
PASS C4(b)
PASS C4(c)
PASS C4(d)
PASS C4(e)
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

Authenticated HTTP evidence on `/private/tmp/warehouse-stock-p5-r2-http.SqQgvE/dev.db`:
one curl against the running server returned HTTP 200 for a real `P5HTTP` entry with quantity
7, `low_in_stock`, thresholds 10/15/20, and `unitsToNormalThreshold: 13`.

Mutation-probe files, listed separately from implementation changes: the report query was
the only repository file temporarily changed, and the change was applied and reverted. No
archgraph is present. The implementation write perimeter is exactly the two source files,
the report verification script, and this Review log entry; the required handoff is recorded
separately under `handoffs/implementer/`.
