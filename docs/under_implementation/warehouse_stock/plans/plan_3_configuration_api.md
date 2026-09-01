# P3 — Configuration API (contracts, commands, queries, routes)

## Goal
Ship the full configuration HTTP surface: options, summary, detail, batch create, update, delete — validated per the intention, reconciling per §0.17/§23.6, mounted and authenticated per §0.18. **Not in this phase:** the report endpoint (P5), item-flow hooks (P4).

## Read first
Master plan §5, §6.3–§6.6, §9, §10 · intention §2, §6, §14–§18, §23.2–§23.5 · context §0.3, §0.4, §0.12, §0.17, §0.18, §3.3–§3.6, §2 (dual mount) · `.github/instructions/backend-contracts.instructions.md` · `src/modules/zones/**` (CRUD template incl. `getRequiredIdParam`) · P1 domain, P2 repository/service.

## Dependencies (gate)
P2 APPROVED. (May run in parallel with P4 — disjoint perimeters.)

## Files expected to change
New `src/modules/stock/{contracts/stock.contract.ts, commands/create-location-stocks.command.ts, commands/update-location-stock.command.ts, commands/delete-location-stock.command.ts, queries/get-stock-locations-summary.query.ts, queries/get-location-stock-detail.query.ts, queries/get-stock-configuration-options.query.ts, controllers/stock.controller.ts, routes/stock.routes.ts}` · `src/server.ts` (two mount lines).

## Tasks (ordered)
1. `stock.contract.ts` — zod schemas per master plan §6.5 DTOs. Criteria input: `z.record` accepting `string | string[] | null`; category-aware key/value whitelist validation (§23.3) via `getPropertyOptionsForCategory` — **lowercase both sides of the value comparison (context §0.5: "the map holds the canonical casing for display, comparison lowercases both sides"). P1 review N2:** `ITEM_PROPERTY_OPTIONS` stores display casing (`"Teak"`, `"Up"`, `"Inside Extension"`) while `normalizeCriteria` lowercases every criterion value, so `option.values.includes(criterionValue)` against normalized criteria rejects **every legal value**, and against raw input accepts `"TEAK"` and `"teak"` inconsistently; thresholds: exactly the three configurable states (§2). Location: trimmed non-empty string, no further validation (§0.12).
2. Create command: normalize criteria → per-item validation → intra-batch + against-existing conflict checks (§23.2, batch members checked against each other AND existing siblings) → single transaction insert (§23.5) → post-commit `reconcileGroup` once per distinct affected group → return DTOs re-read after reconciliation. `createdByUsername`/`updatedByUsername` from `req.authUser.username`.
3. Update command: load-or-404 (shop-scoped); apply changes; conflict check excludes self; thresholds replace fully (delete + recreate inside the tx); reconcile per §0.17 trigger-scope table — thresholds-only → recompute state on that row only; criteria change → 1 group; location/category change → old group AND new group.
4. Delete command: delete (thresholds cascade) → reconcile the group.
5. Read queries + controller + routes (`asyncHandler`, envelopes `{ data }` / `{ ok: true }`, `getRequiredIdParam` idiom) + dual mount in `server.ts`.

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Validation rejects with 400: (a) unknown property key for the config's category (e.g. `shape` on Dining Chairs); (b) unknown value for a known key — **and (b2) a known value in any casing is ACCEPTED (`"teak"`, `"Teak"`, `"TEAK"` all pass for `wood_type`), per §0.5 and P1 review N2**; (c) missing threshold state; (d) duplicate threshold state; (e) non-positive threshold; (f) low ≥ medium; (g) medium ≥ normal; (h) empty-after-normalization value array. Valid scalar AND array criterion shapes are both accepted | M6, §23.1/§23.3/§2 |
| C2 | Batch create all-or-nothing: (a) two valid configs → both created, 201 `{data}` with canonical properties; (b) second of two conflicts with the first (intra-batch) → 409, NEITHER written, error names `batchIndex`; (c) conflict with an existing sibling → 409 with `conflictingId`, nothing written | M6, §23.5/§23.2 |
| C3 | Create initializes from inventory: a config matching existing unsold items returns quantity = sum of their item quantities and the correct state — never 0-by-default (seedable against dev data, e.g. `LC1` + `Dining Chairs` + `{}`) | M1/M5, §14/§0.17 |
| C4 | Update reconciliation scope: (a) thresholds-only edit → same quantity, state recomputed, sibling quantities untouched; (b) criteria edit → its group reconciled (a sibling's quantity changes when items reallocate); (c) location change → BOTH old and new groups reconciled (old sibling regains the items) | M5, §0.17 |
| C5 | Delete: (a) row + thresholds gone, items untouched; (b) `{ok:true}`; (c) group reconciled — a broader sibling absorbs the deleted config's items | M5, §16/§0.17 |
| C6 | Reads: (a) summary counts configurations per location (3 configs at one location → `stockCount: 3`); (b) detail returns full DTO incl. thresholds, audit fields, canonical properties; (c) options returns `itemCategories` + the §23.3 map | M7(partial)/M6, §17/§18/§0.4 |
| C7 | Mounting & auth: (a) reachable at `/api/stock/...` and `/stock/...`; (b) 401 without token; (c) works for a non-admin role (§0.18); (d) audit usernames recorded from the authenticated user | §0.18/§0.3 |

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — this phase authors no verify script of its own, but must not regress P1's or P2's); perimeter diff matches file list.

## Manual scenarios (curl checklist — implementer executes, reviewer re-executes; expected quantity/state stated per step)
1. `GET /api/stock/options` → categories + map (spot-check one per-category key).
2. Create `LC1 + Dining Chairs + {}` with thresholds 10/15/20 → quantity = the group's true eligible sum (derive live: `sqlite3 prisma/dev.db "SELECT SUM(quantity) FROM ScanHistory WHERE latestLocation='LC1' AND itemCategory='Dining Chairs' AND isSold=0"`), state per C6-P1 boundaries. (M8 note: with `{}` present the group sums to true inventory.)
3. Create `LC1 + Dining Chairs + {wood_type:["Teak"]}` → teak items move off the catch-all; catch-all quantity drops by exactly the teak sum.
4. Attempt duplicate of step 3 (as scalar `"Teak"`) → 409 with `conflictingId`.
5. Update step-3 config to `H1` → LC1 catch-all reabsorbs; H1 group initialized correctly.
6. Delete step-3 config → items fall back; summary/detail reflect all of it.
7. Steps 2–6 as a `worker`-role user → all permitted.

## Notes
- **Reviewer planted-defect probe (master plan §11.1.4):** temporarily skip the intra-batch conflict check (compare only against existing siblings) → manual scenario 4 variant (duplicate submitted twice in ONE batch) must stop failing; revert. Proves the batch conflict instrument can fail.
- Response DTOs are re-read AFTER reconciliation pass 2 so the user sees pass-2 values (§23.6).
- Reconciliation runs post-commit of the config transaction (create/update/delete), once per distinct affected group even when a batch touches several.
- `:location` path param is URL-encoded by the client; decode via express default.

## Review log
(append-only)
