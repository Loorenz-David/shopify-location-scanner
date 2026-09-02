---
plan: 4
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

# P4 implementer handoff

Implemented the stock-mutation primitive and all four post-commit Shopify/scanner hook sites.
The code checkpoint is `4da4579` (`CHECKPOINT (not approved): implement item stock transition
hooks`). The primitive reuses the stock domain's best-match resolver, treats null/sold/locationless/
categoryless sides as ineligible, uses independent before/after quantities, applies guarded
decrements and state recalculation through P2, and isolates stock failures from the parent
operation. The location command, products/update job, orders/paid, and orders/create paths all
log the structured stock result. The sold paths read the stored row before the sold write.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. Nothing needs owner adjudication for this phase. The malformed-threshold propagation versus
parent-operation isolation collision is recorded as an unresolved coordinator fold-back below,
not silently resolved as a new product decision.

## Task 0 coverage map

P4 has no test file and authors no verifier; this is the ratified project deviation. Rows marked
`code inspection` are intentionally not presented as executed tests. Every row is listed, and
every shipped test/instrument below maps to a row; there are no orphan tests.

| Row | Discharging case | Assertion shape |
|---|---|---|
| C1(a) | `INS-C1(a)` — code inspection of `applyItemStockChange` same-id branch | Exact: equal quantities return `{ changed: false }` without a repository mutation. |
| C1(b) | `INS-C1(b)` — code inspection | Exact: same config calls one increment with `after.quantity - before.quantity`, so 4→6 is +2. |
| C1(c) | `INS-C1(c)` — code inspection | Exact: distinct configs decrement the before side and increment the after side, then repository methods recalculate both states. |
| C1(d) | `INS-C1(d)` — code inspection | Exact: only a resolved before side invokes guarded decrement. |
| C1(e) | `INS-C1(e)` — code inspection | Exact: only a resolved after side invokes increment. |
| C1(f) | `INS-C1(f)` — code inspection | Exact: no resolved sides returns `{ changed: false }` and performs no mutation. |
| C1(g) | `INS-C1(g)` — code inspection | Exact: both sold sides fail eligibility, so no configuration lookup or mutation occurs. |
| C1(h) | `PROBE-GUARD` plus `INS-C1(h)` | Exact service-level probe: source guard refusal logged, source remains 0, destination becomes 1, and result is `changed:true`; the parent HTTP path was not exercised. |
| C1(i) | `INS-C1(i)` — code inspection | Exact: distinct-source decrement uses `before.quantity`, destination increment uses `after.quantity`; no shared quantity exists. |
| C1(j) | `INS-C1(j)` — code inspection | Exact: null before resolves no source and a configured after side is destination-only. |
| C1(k) | `INS-C1(k)` — code inspection | Exact: `itemCategory === null` fails eligibility before `listByGroup`, so it cannot fall through as a typed null query. |
| C2(a) | `MS1` — not executed | No runtime assertion observed; intended exact source −item quantity, destination +item quantity, and recalculated states remain unverified by manual UI. |
| C2(b) | `MS2` — not executed | No runtime assertion observed; intended exact no movement and `changed:false` remain unverified by manual UI. |
| C3(a) | `MS5` — not executed | No runtime assertion observed; intended destination +item quantity and restock state remain unverified by manual UI. |
| C3(b) | `MS5` — not executed | No runtime assertion observed; intended zero decrements on a sold-to-unsold return remain unverified by manual UI. |
| C4(a) | `MS3` — not executed | No runtime assertion observed; intended products/update location move equivalence to C2(a) remains unverified through Shopify admin. |
| C4(b) | `MS3` fixture plus code path inspection — runtime not executed | The code path uses stored before and fresh after snapshots, but no manual property/category/quantity winner-change assertion was observed. |
| C4(c) | `INS-C4(c)` — code inspection | Exact: one `existingHistory` read precedes the mutation branches, one fresh read follows them, and one primitive call is after all branches. |
| C4(d) | `INS-C4(d)` — code inspection; runtime not executed | Exact code shape: both sold snapshots are ineligible; no manual already-sold products/update assertion was observed. |
| C5(a) | `MS4` — not executed | No runtime assertion observed; intended one decrement of exact item quantity remains unverified through an order delivery. |
| C5(b) | `MS4` — not executed | No runtime assertion observed; intended cross-topic same-order pair decrement-once behavior remains unverified through worker intake. |
| C5(c) | `MS4` — not executed | No runtime assertion observed; intended orders/create equivalence remains unverified through worker intake. |
| C6(a) | `MS6` plus `PROBE-GUARD` — parent path not executed | The direct primitive probe observed the required `logger.error` context; no scan-out HTTP/log capture was observed. |
| C6(b) | `MS6` — not executed | No runtime assertion observed; intended HTTP 200 and updated ScanHistory remain unverified. |
| C6(c) | `PROBE-GUARD` plus `MS6` — parent path not executed | Direct service assertion observed source unchanged and destination incremented; no scanner transaction/HTTP assertion was observed. |
| C7(a) | `PER-C7(a)` — checkpoint path inspection | Exact checkpoint content is the five-file P4 perimeter; P3 sibling files are separate uncommitted work. |
| C7(b) | `PER-C7(b)` — byte/diff inspection after probe revert | Exact: `scan-history.repository.ts` has no diff from its pre-phase state. A temporary marker made the instrument report the file, then was reverted. |
| C7(c) | `PER-C7(c)` — byte/diff inspection after probe revert | Exact: `src/modules/ws/*` has no diff from its pre-phase state. A temporary marker made the instrument report the file, then was reverted. |

### Baseline and failure-ID delta

Before the first production edit, the working tree was clean; `npm run typecheck` exited 0 and
`npx tsx scripts/verify-stock-domain.ts` emitted 58 PASS rows and exited 0. The pre-edit
domain failure-ID set was therefore empty. The final domain run again emitted 58 PASS rows: Δ
failure IDs = 0. `verify-all.ts` was not a pre-edit gate instrument in the prompt; its final
scratch-copy result is recorded below rather than fabricating a baseline.

## Named mutation ledger

Declared = 1; executed = 1; observed red = 1; reverted = 1. The named mutation was applied at
the service definition's distinct-configuration branch, not at a caller: source decrement and
destination increment were swapped. It used the scratch-only probe
`/private/tmp/p4-verify.xOUBpU/p4-source-destination-probe.mjs` and the exact command:

```text
DATABASE_URL=file:/private/tmp/p4-verify.xOUBpU/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 node --import tsx /private/tmp/p4-verify.xOUBpU/p4-source-destination-probe.mjs
```

Observed failure: exit 1; the probe printed `sourceAfter:2, destinationAfter:0` and threw
`Error: P4-M1 observed inverted source/destination counters`. The service was restored before
the closing stamp. The unmutated path printed `changed:true, sourceAfter:0, destinationAfter:1`.

Additional guard/instrument probes, all scratch-only or applied-and-reverted:

- Source-guard isolation: the direct primitive probe logged the repository's error context,
  returned `changed:true`, left source quantity at 0, and incremented destination to 1.
- Malformed-threshold collision: deleting one threshold on a scratch configuration caused the
  service to log `Stock mutation failed; parent operation continues` with the group, then return
  `{ changed:false }` without throwing to its caller; the already-applied quantity was 1.
- Purity guard: a temporary `prisma` marker in `src/modules/stock/domain/best-match.ts` made
  the purity grep report that file; the marker was reverted and the final grep was empty.
- Perimeter guards: temporary markers in the scanner repository and WebSocket broadcaster made
  their respective `git diff --name-only` checks report a changed file; both markers were
  reverted and both files are byte-identical to the pre-phase tree.

## Closing evidence

The final implementation stamp was taken before the checkpoint on the completed code and after
all probes had been reverted:

- `npm run typecheck` — exit 0.
- `grep -rn "prisma\\|@prisma" src/modules/stock/domain/ src/shared/item-properties/item-property-options.ts` — empty, exit 1 as expected.
- `DATABASE_URL=file:/private/tmp/p4-verify.xOUBpU/dev.db SHOP_ID=cmnractlq0000qr53y8so42t3 npx tsx scripts/verify-all.ts` — `verify-stock-domain.ts` 58 PASS, `verify-stock-reconciliation.ts` 20 PASS, `SUMMARY PASS 2 script(s)`, exit 0.
- `git diff --check` — clean for the P4 implementation.
- Checkpoint SHA: `4da4579`.

## Manual Scenarios

Redis answered `PONG`; the API started on port 4000 and `/health` returned HTTP 200; the
webhook worker started with concurrency 1. The required authenticated Shopify session was not
available: `/stock/options` returned HTTP 401 (`Missing bearer token`). No development database
data was changed. Therefore the expected-versus-observed record is:

| Scenario | Expected | Observed |
|---|---|---|
| MS1 scan LC1 → H1 | LC1 −1, H1 +1, exact boundary states | Not run: no authenticated scanner session/product selection. |
| MS2 rescan to H1 | No quantity/state change, `changed:false` | Not run: same authentication blocker. |
| MS3 Shopify admin location edit | Products/update returns counters to starting values | Not run: no authenticated Shopify admin/product session; Redis and worker were available. |
| MS4 orders/create → orders/paid, then identical replay | One total decrement for same order; replay adds none | Not run: no authenticated order-delivery/product credentials. |
| MS5 return to store | Destination +item quantity and `restockedAt` set | Not run: no authenticated scanner session. |
| MS6 scratch drift move LC1 → H1 | Error context, HTTP 200, ScanHistory moved, H1 still increments | Parent HTTP scenario not run. Direct scratch primitive guard probe did observe the source refusal/error and H1-equivalent destination increment. |
| MS7 item with no configs | No stock change and no error | Not run: no authenticated scanner session. |
| MS8 group-total note | Catch-all groups reconcile; no-catch-all shortfall is expected | No UI totals observed; the implementation preserves the ratified catch-all semantics. |

## Full write perimeter

Implementation files in checkpoint `4da4579` (exactly five):

- `apps/backend/src/modules/stock/services/apply-item-stock-change.service.ts`
- `apps/backend/src/modules/shopify/commands/update-item-location.command.ts`
- `apps/backend/src/modules/shopify/jobs/process-products-update-webhook.job.ts`
- `apps/backend/src/modules/shopify/commands/handle-orders-paid-webhook.command.ts`
- `apps/backend/src/modules/shopify/commands/handle-orders-create-webhook.command.ts`

Administrative artifacts written by this session:

- `docs/under_implementation/warehouse_stock/plans/plan_4_item_transition_hooks.md` — Review log entry only.
- `docs/under_implementation/warehouse_stock/handoffs/implementer/handoff_plan4_implement_1.md` — this handoff.

The P3 sibling's files are visible in the shared worktree but are not in this session's write
perimeter and were not edited by this session: `src/modules/stock/contracts/stock.contract.ts`,
`src/modules/stock/repositories/location-stock.repository.ts`, `src/server.ts`, and the P3
command/controller/query/route files. No architecture graph exists.

Mutation-probe perimeter, applied and reverted, listed separately from the implementation:

- `/private/tmp/p4-verify.xOUBpU/p4-source-destination-probe.mjs` — scratch probe, retained only in the scratch directory.
- `src/modules/stock/services/apply-item-stock-change.service.ts` — named source/destination swap, reverted.
- `src/modules/stock/domain/best-match.ts` — temporary purity marker, reverted.
- `src/modules/scanner/repositories/scan-history.repository.ts` — temporary perimeter marker, reverted; no final diff.
- `src/modules/ws/ws-broadcaster.ts` — temporary perimeter marker, reverted; no final diff.

Ignored/tool-recorded state:

- `/private/tmp/p4-verify.xOUBpU/dev.db` — SQLite `.backup` scratch copy; all destructive verification stayed here.
- API and webhook-worker development processes were started for manual readiness checks and
  were stopped after the readiness checks.

## Delegations and upstream fold-back

- D4 exercised: stored property reduction is local to the P4 service; non-string values and
  blank string values are dropped, while an absent property bag remains null.
- D9 exercised: no wrapping transaction was added around decrement/increment; each P2 repository
  mutation is individually atomic, and a source refusal does not block the destination.
- Unresolved collision: P2's `calculateStockState` deliberately throws on malformed thresholds,
  while P4 must swallow stock failures so the parent succeeds. The implementation catches and
  logs per mutation and continues to the other side. A malformed scratch threshold proved the
  catch, but the underlying contract precedence is still unrouted; coordinator should fold it
  upstream. This is not presented as a new ratified semantic.
- No candidate criterion or silent deviation was found.
