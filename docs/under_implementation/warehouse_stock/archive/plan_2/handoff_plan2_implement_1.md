---
plan: 2
role: implement
round: 1
state: IMPLEMENTED
date: 2026-09-01
actor: Codex
---

# P2 implementer handoff

Task 0 coverage map (recorded before production edits)

| Criterion row | Discharging case | Assertion shape |
|---|---|---|
| C1(a) | VR-C1(a) | Exact persisted `{}` is read back as an object, not `null`. |
| C1(b) | VR-C1(b) | Reads after create and update compare `propertiesCanonical` to `canonicalCriteriaString(properties)`. |
| C1(c) | VR-C1(c) | The repository's second identical create throws an error whose `code` is exactly `P2002`; no mapping assertion is substituted. |
| C2(a) | VR-C2(a) | Exact quantity and exact `medium_in_stock` state are asserted after guarded decrement. |
| C2(b) | VR-C2(b) | The refused decrement returns without throwing and the stored quantity remains exactly 2. |
| C2(c) | VR-C2(c) | Exactly one parsed error log is captured across stdout and stderr; its context has exactly the eight required keys and values. |
| C2(d) | VR-C2(d) | Increment from 2 by 4 reads back quantity 6 and exact `high_in_stock` state. |
| C3(a) | VR-C3(a) | A mixed fixture proves only exact location/category and unsold rows affect the group. |
| C3(b) | VR-C3(b) | A specific and broad matching fixture asserts each item is counted by its `resolveBestMatch` winner only. |
| C3(c) | VR-C3(c) | One eligible row with quantity 4 produces a stock quantity of 4, not row count 1. |
| C3(d) | VR-C3(d) | All configurations, including a zero-match configuration, are read after one reconciliation transaction with exact quantities/states. |
| C3(e) | VR-C3(e) | An eligible item matching no configuration leaves every configuration unchanged and does not throw. |
| C4(a) | VR-C4(a) | The no-interleaving run records the pass-1 timestamp, waits, and proves no second write changed it. |
| C4(b) | VR-C4(b) | The awaited between-pass callback mutates an item; pass 2 restores the value and a parsed warning names the group and delta. |
| C4(c) | VR-C4(c) | The between-pass hook fires exactly once, proving the service has exactly two passes and no loop. |
| C4(d) | VR-C4(d) | The returned config-id map contains the pass-2 quantity/state after the interleaved mutation. |
| C5(a) | VR-C5(a) | A manually drifted quantity of 99 is replaced by the fresh recount value. |
| C5(b) | VR-C5(b) | Reconciliation log capture contains no guarded-decrement refusal error. |
| C6(a) | VR-C6(a) | Two distinct groups are seeded and both are reconciled to their expected values. |
| C6(b) | VR-C6(b) | `onGroupReconciled` receives exactly two distinct groups, including the group with two configs. |
| C7(a) | VR-C7(a) | Scratch-copy `verify-all` exits 0 and emits one PASS status per expected child. |
| C7(b) | Manual Scenario C7(b) | A temporary discovered child forced to exit non-zero was reported FAIL and made `verify-all` non-zero. |
| C7(c) | Manual Scenario C7(c) | With `DATABASE_URL` unset, reconciliation exits 3 and `verify-all` reports REFUSED and non-zero. |
| C7(d) | Manual Scenario C7(d) | With this phase's reconciliation script temporarily absent, `verify-all` reports MISSING and non-zero. |

Pre-edit executable baseline: not captured. The phase's verification scripts and the modules
they exercise did not exist at the gate, so there was no executable case to run without first
creating the phase's instrument. This is recorded rather than reconstructed after implementation.

Implementation summary

The five-file implementation is checkpointed at `e3eb367`:

- `apps/backend/src/modules/stock/contracts/stock.contract.ts`
- `apps/backend/src/modules/stock/repositories/location-stock.repository.ts`
- `apps/backend/src/modules/stock/services/stock-reconciliation.service.ts`
- `apps/backend/scripts/verify-stock-reconciliation.ts`
- `apps/backend/scripts/verify-all.ts`

Administrative documents written by this session are this handoff and the implementer entry in
the Review log of `plans/plan_2_repository_reconciliation.md`. No master-plan tracker row was
edited, no P1 file was edited, and no architecture-graph state exists in this repository.

The closing tree evidence is: `npm run typecheck` exit 0; the mandated purity grep is empty;
`verify-all.ts` exits 0 on `/private/tmp/p2-final-close.VVZXE3/dev.db`, chaining P1's 58 PASS
rows and P2's 20 PASS rows. The exact transcript and scratch-copy path are pasted into the plan
Review log. The manual integrity checks also recorded REFUSED (exit 3) for an unset
`DATABASE_URL`, FAIL (exit 1) for a temporary non-zero discovered child, and MISSING (exit 1)
for a temporarily renamed `verify-stock-reconciliation.ts`; the renamed file and temporary child
were restored/removed.

Delegations and choices: D11 uses the same one error log and `currentQuantity: null` for a
missing or cross-shop row; the direct missing-row branch was not separately instrumented. D14
is exercised by not adding `listGroupSummaries`. D15 is exercised by the unset-`SHOP_ID` probe,
which exits 1 and names `SHOP_ID`. The repository stores the caller's location/category strings
as supplied; P3 owns location trimming and rejection. No candidate criterion or upstream semantic
hole was found.

Mutation/probe perimeter, listed separately from the five-file implementation: the temporary
`apps/backend/scripts/verify-p2-probe.ts` was created to force a child exit 1 and then deleted;
`apps/backend/scripts/verify-stock-reconciliation.ts` was temporarily renamed to
`verify-stock-reconciliation.ts.bak` for C7(d) and restored; and the initial mistaken root-level
authoring paths `src/modules/stock/contracts/stock.contract.ts`,
`src/modules/stock/repositories/location-stock.repository.ts`, and
`src/modules/stock/services/stock-reconciliation.service.ts` were created and deleted before
the correct `apps/backend/src/...` files were authored. None of these transient paths remain.
