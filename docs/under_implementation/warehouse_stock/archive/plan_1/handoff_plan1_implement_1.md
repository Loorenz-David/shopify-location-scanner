---
plan: 1
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

# P1 implementer handoff

Implemented phase 1 on `warehouse-stock-backend`. The checkpoint commit is
`afed53a6b178de4b9890d56eeb760d4cb2bcb96e` (`CHECKPOINT (not approved): implement P1 schema and stock domain`).

## ⚠ OWNER DECISIONS REQUIRED (0)

None. Nothing needs owner adjudication for this phase.

## Coverage map — one line per criterion row

The verifier case named in each row asserts the exact shape required by that row, not a weaker
proxy. C1 is discharged by schema/migration inspection because it is outside the pure-domain
script scope.

| Row | Discharge | Assertion shape |
|---|---|---|
| C1(a) | `schema.prisma` enum and both model declarations | exact field/type/default/relation declarations |
| C1(b) | `schema.prisma` + migration unique index | exact four-column uniqueness |
| C1(c) | `schema.prisma` + migration unique index | exact two-column uniqueness |
| C1(d) | `schema.prisma` + migration foreign keys | all three `onDelete: Cascade` relations |
| C1(e) | `npm run prisma:migrate:dev -- --name add_location_stock` | migration applied cleanly to `prisma/dev.db` |
| C2(a) | `verify-stock-domain.ts:C2(a)` | exact token set |
| C2(b) | `verify-stock-domain.ts:C2(b)` | exact token set |
| C2(c) | `verify-stock-domain.ts:C2(c)` | exact token set |
| C2(d) | `verify-stock-domain.ts:C2(d)` | exact token set |
| C2(e) | `verify-stock-domain.ts:C2(e)` | hyphen-preserving exact token set |
| C2(f) | `verify-stock-domain.ts:C2(f)` | trimmed exact token set |
| C3(a) | `verify-stock-domain.ts:C3(a)` | scalar/array canonical strings equal |
| C3(b) | `verify-stock-domain.ts:C3(b)` | exact deduplicated sorted values |
| C3(c) | `verify-stock-domain.ts:C3(c)` | wildcard remains `null` |
| C3(d) | `verify-stock-domain.ts:C3(d)` | exact string `{}` |
| C3(e) | `verify-stock-domain.ts:C3(e)` | key-order-invariant canonical strings |
| C3(f) | `verify-stock-domain.ts:C3(f)` empty-array + blank-scalar cases | both inputs throw `ValidationError` |
| C4(a) | `verify-stock-domain.ts:C4(a)` | tokenized membership matches |
| C4(b) | `verify-stock-domain.ts:C4(b)` | Mahogany matches and Oak does not |
| C4(c) | `verify-stock-domain.ts:C4(c)` | wildcard matches present key |
| C4(d) | `verify-stock-domain.ts:C4(d)` | wildcard rejects missing key |
| C4(e) | `verify-stock-domain.ts:C4(e)` | `{}` matches `null` properties |
| C4(f) | `verify-stock-domain.ts:C4(f)` | non-empty criteria rejects `null` properties |
| C5(a) | `verify-stock-domain.ts:C5(a)` | weight 4 beats weight 1 |
| C5(b) | `verify-stock-domain.ts:C5(b)` | two-valued, two-key candidate wins |
| C5(c) | `verify-stock-domain.ts:C5(c)` | valued-key count breaks weight tie |
| C5(d) | `verify-stock-domain.ts:C5(d)` | lower accepted-value count wins |
| C5(e) | `verify-stock-domain.ts:C5(e)` | earlier date then lower id break full ties |
| C5(f) | `verify-stock-domain.ts:C5(f)` | score `[0,0,0]` and catch-all loses |
| C6(a) | `verify-stock-domain.ts:C6(a)` | `0` → `out_of_stock` |
| C6(b) | `verify-stock-domain.ts:C6(b)` | `1` → `low_in_stock` |
| C6(c) | `verify-stock-domain.ts:C6(c)` | `10` → `low_in_stock` |
| C6(d) | `verify-stock-domain.ts:C6(d)` | `11` → `medium_in_stock` |
| C6(e) | `verify-stock-domain.ts:C6(e)` | `15` → `medium_in_stock` |
| C6(f) | `verify-stock-domain.ts:C6(f)` | `16` → `normal_in_stock` |
| C6(g) | `verify-stock-domain.ts:C6(g)` | `20` → `normal_in_stock` |
| C6(h) | `verify-stock-domain.ts:C6(h)` | `21` → `high_in_stock` |
| C7(a) | `verify-stock-domain.ts:C7(a)` | each missing configurable state throws |
| C7(b) | `verify-stock-domain.ts:C7(b)` | duplicate state throws |
| C7(c) | `verify-stock-domain.ts:C7(c)` zero + negative + non-integer cases | all three quantities throw |
| C7(d) | `verify-stock-domain.ts:C7(d)` | `low >= medium` throws |
| C7(e) | `verify-stock-domain.ts:C7(e)` | `medium >= normal` throws |
| C7(f) | `verify-stock-domain.ts:C7(f)` | valid thresholds pass |
| C7(g) | `verify-stock-domain.ts:C7(g)` | both derived states throw |
| C8(a) | `verify-stock-domain.ts:C8(a)` | exact duplicate returns existing id |
| C8(b) | `verify-stock-domain.ts:C8(b)` | wildcard/value overlap conflicts |
| C8(c) | `verify-stock-domain.ts:C8(c)` | subset overlap conflicts |
| C8(d) | `verify-stock-domain.ts:C8(d)` | partial overlap conflicts |
| C8(e) | `verify-stock-domain.ts:C8(e)` | disjoint sets do not conflict |
| C8(f) | `verify-stock-domain.ts:C8(f)` | different key sets do not conflict |
| C8(g) | `verify-stock-domain.ts:C8(g)` | empty key sets conflict by vacuous truth |
| C8(h) | `verify-stock-domain.ts:C8(h)` | empty/non-empty key sets do not conflict |
| C9(a) | `verify-stock-domain.ts:C9(a)` | exact eight keys in order |
| C9(b) | `verify-stock-domain.ts:C9(b)` | every value list exact and ordered |
| C9(c) | `verify-stock-domain.ts:C9(c)` | four universal categories exact |
| C9(d) | `verify-stock-domain.ts:C9(d)` | three table-key category lists exact |
| C9(e) | `verify-stock-domain.ts:C9(e)` | chair-key category list exact |
| C9(f) | `verify-stock-domain.ts:C9(f)` | Sofas returns four universal entries |
| C9(g) | `verify-stock-domain.ts:C9(g)` | Dining Tables returns four universal + three table entries |
| C9(h) | `verify-stock-domain.ts:C9(h)` | Dining Chairs returns four universal + upholstery |

## Task 0 baseline

Before the first production edit, the newly transcribed verifier was run with the phase modules
absent. Result: **58 FAIL, 0 PASS, exit 1**. Every case failed with the honest reason that the
domain modules were unavailable. The 58 case labels were exactly the coverage cases listed
above, with C3(f) expanded to `empty array` and `blank scalar`, and C7(c) expanded to `zero`,
`negative`, and `non-integer`.

## Named mutation ledger

Declared = 8; executed = 8. Every run used the targeted scope and the exact command
`npx tsx scripts/verify-stock-domain.ts`, and every probe was reverted. The implementation
checkpoint was `afed53a`; each probe temporarily made the tree dirty relative to that commit.

| Probe | Site and planted defect | Observed red |
|---|---|---|
| 1 | `src/modules/stock/domain/property-criteria.ts`, `tokenizePropertyValue` definition: add `-` to the separator class | `FAIL C2(e): expected ["1-20 kg"], got ["1","20 kg"]` |
| 2 | `src/modules/stock/domain/property-criteria.ts`, `canonicalCriteriaString` definition: remove key `.sort()` | `FAIL C3(e): key order changed the canonical string` |
| 3 | `src/modules/stock/domain/property-criteria.ts`, `matchesCriteria` definition: return true from the missing-key branch | `FAIL C4(d): wildcard matched a missing key` |
| 4 | `src/modules/stock/domain/best-match.ts`, `candidateOutranks` definition: change rule-3 `<` to `>` | `FAIL C5(d): lower accepted-value count did not win` |
| 5 | `src/modules/stock/domain/stock-state.ts`, `calculateStockState` definition: change low `<=` to `<` | `FAIL C6(c): quantity 10 produced the wrong state` |
| 6 | `src/modules/stock/domain/stock-state.ts`, `validateThresholds` definition: disable `low >= medium` rejection | `FAIL C7(d): expected ValidationError to be thrown` |
| 7 | `src/modules/stock/domain/conflict.ts`, `findConflict` definition: require a non-empty key set | `FAIL C8(g): empty criteria did not conflict` |
| 8 | `src/shared/item-properties/item-property-options.ts`, `ITEM_PROPERTY_OPTIONS` definition: remove `Walnut` from `wood_type` | `FAIL C9(b): expected ... "Walnut" ..., got ... without "Walnut"` |

Probe 1 was initially captured through a `tee` wrapper that masked the shell exit status; it
was immediately rerun directly with the exact command above, observed as exit 1, and reverted.
The wrapper left only the temporary `/tmp/stock-probe-1.log` outside the repository.

## Granted delegations exercised

- **D1:** canonical keys and values use code-unit `.sort()`, never locale-sensitive sorting.
- **D2:** `calculateStockState` returns `out_of_stock` for non-positive quantities after its
  threshold precondition is checked; `validateThresholds` owns invalid-threshold rejection.
- **D3:** `findConflict` returns the first matching sibling in input order.
- **D4:** an item key whose stored string tokenizes to an empty set is treated as absent, so a
  wildcard does not match it.
- **D5:** `specificityScore` returns `[weight, valuedKeys, acceptedValues]`; comparison is
  lexicographic with the third component lower-is-better, not a summed score.

## Full write perimeter

Implementation changes in the checkpoint:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20260901180407_add_location_stock/migration.sql`
- `apps/backend/src/modules/stock/domain/stock-state.ts`
- `apps/backend/src/modules/stock/domain/property-criteria.ts`
- `apps/backend/src/modules/stock/domain/best-match.ts`
- `apps/backend/src/modules/stock/domain/conflict.ts`
- `apps/backend/src/shared/item-properties/item-property-options.ts`
- `apps/backend/scripts/verify-stock-domain.ts`

Post-checkpoint coordination documents created/modified:

- `docs/under_implementation/warehouse_stock/plans/plan_1_schema_domain.md` — Review log only
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan1_implement_1.md`

Ignored/generated runtime state touched by the migration command:

- `apps/backend/prisma/dev.db` — migration applied; not committed and left at head
- Prisma client output under `apps/backend/node_modules/.prisma/` — regenerated; ignored

## Closing evidence

- `npm run typecheck`: exit 0.
- Purity grep `grep -rn 'prisma\|@prisma' src/modules/stock/domain/ src/shared/item-properties/item-property-options.ts`: empty (grep exit 1 means no matches).
- `npx tsx scripts/verify-stock-domain.ts`: 58 PASS lines, 0 FAIL, exit 0.
- The full verifier output is pasted into the P1 plan Review log.
- No architecture graph exists in this repository; no graph delta was required.
- No candidate criterion, contract deviation, or environment surprise was found.
