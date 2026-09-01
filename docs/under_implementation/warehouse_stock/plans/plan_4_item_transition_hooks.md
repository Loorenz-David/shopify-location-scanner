# P4 — `applyItemStockChange` + the Four Hook Sites

## Goal
Implement the single stock-mutation primitive (§0.7) and invoke it from the four ratified call sites (§0.10): location command, products/update webhook job, orders-paid, orders-create. **Not in this phase:** any edit to `scan-history.repository.ts` (hard perimeter rule), any new WS event (§0.9 — none exists in V1), the report.

## Read first
Master plan §5, §6.4, §6.6, §9 (esp. §9.6), §10 · intention §7–§8, §10–§13 · context §0.7, §0.9, §0.10, §0.15, §0.16, §9 (sold lifecycle), §10.1–§10.2, §11.3 · `src/modules/shopify/commands/update-item-location.command.ts` · `src/modules/shopify/jobs/process-products-update-webhook.job.ts` · `src/modules/shopify/commands/handle-orders-paid-webhook.command.ts` · `src/modules/shopify/commands/handle-orders-create-webhook.command.ts` · P2 repository/service.

## Dependencies (gate)
P2 APPROVED. (Parallel with P3 allowed — perimeters are disjoint.)

## Files expected to change
New `src/modules/stock/services/apply-item-stock-change.service.ts` · `src/modules/shopify/commands/update-item-location.command.ts` · `src/modules/shopify/jobs/process-products-update-webhook.job.ts` · `src/modules/shopify/commands/handle-orders-paid-webhook.command.ts` · `src/modules/shopify/commands/handle-orders-create-webhook.command.ts`. **Explicitly NOT:** `src/modules/scanner/repositories/scan-history.repository.ts`, `src/modules/ws/*`.

## Tasks (ordered)
1. `applyItemStockChange({ shopId, before, after, operation, itemIdentifiers })` — `before`/`after`: `{ location, itemCategory, properties, quantity, isSold } | null`. Resolve each side's best-matching config — a side is eligible iff it is **non-null**, `isSold === false`, **`location !== null`, and `itemCategory !== null`** (D7: the category was omitted from the stated predicate, but `listByGroup(shopId, location, itemCategory: string)` is non-null, so a null category is a **typecheck error**, not a silent fall-through) — then `resolveBestMatch` over the group's configs. **`before === null` is a distinct case from "before ineligible" (D6)**: the webhook's create branch and a first-ever scan both produce it, and it means destination-only increment. Same config on both sides: apply the net quantity delta (guarded if negative). Different: guarded decrement on source of **`before.quantity`**, increment on destination of **`after.quantity`** — **two quantities, not one (D5)**. The webhook path syncs quantity and location in the same run and `appendLocationEvent` writes `quantity` unconditionally, so `before.quantity ≠ after.quantity` is a normal case, and a single `q` silently conserves the wrong total. Either side unresolved: single-sided. Recalculate state after every mutation. Return `{ changed: boolean }`. Errors are caught and logged — a stock failure never fails the parent operation (§0.15).
2. Hook `updateItemLocationCommand` (§0.10): hoist a `scanHistoryRepository.findByShopAndProduct` read (the call the command already makes inside its `returnToStore` branch, made unconditional) → **name it `existingHistory`, NOT `before` (D10)**: `update-item-location.command.ts` already binds `before` to the Shopify fetch and consumes it at four sites, returning it as `product.previousLocation`. `existingHistory` matches the name the `returnToStore` branch and the webhook job already use; **locate every anchor in this phase by symbol, not by line.** Context's citations into these files have drifted: §0.10's `:53-70` for the `returnToStore` branch (F7 — and the corrected `:48` in an earlier draft of this plan was itself off by two) and §0.7's `existingHistory` line (F8, off by one). The symbols resolve; the numbers do not, and they will drift again the moment this phase edits these files; the returned `historyItem` → `after`; call once after `appendLocationEvent` returns; `operation`: `"return_to_store"` when returnToStore else `"location_move"`.
3. Hook `processProductsUpdateWebhookJob` (§0.7): `before` captured once from `existingHistory` (already loaded before mutations); apply **exactly once, at the end of the job body, after every branch has run** — not inside the `if (!existingHistory || !existingHistory.isSold)` block that contains the two writes (D8). Task 3 also requires the already-sold branch to reach the primitive so it can resolve as a no-op, and that branch sits *outside* that `if`; placing the call inside it would make the sold branch skip the hook entirely, which is a different behaviour from the no-op the plan intends. `after` comes from a fresh repository read; `operation: "products_update_sync"`. The already-sold quantity-sync branch stays a stock no-op (before.isSold && after.isSold → primitive resolves neither side).
4. Hook both orders commands (§0.10) — **amended 2026-09-01 (owner, projection card 1): read the stored row first.** `before` is a real `scanHistoryRepository.findByShopAndProduct` read taken **before** the sold write, **not** the fabricated `{...after, isSold: false}` of §0.10's call-site table. `after` = the post-sale row. `operation: "sold"`.

   **Why the fabricated `before` is wrong, recorded because the owner's question was the right one and the answer is not the obvious one.** The owner asked whether Shopify's own idempotency already prevents a double sale from affecting an already-sold item. **It does, at the item level** — verified at source: `appendSoldTerminalEventWithFallback` looks for an existing `sold_terminal` event with the same `orderId` and, on a match, `return`s the row **without writing `isSold` again**. The item is marked sold exactly once, as expected.

   The stock counter is not protected by that guard, because **the hook sits above it**. Option A (§0.10) places the call in the command layer, after the repository returns — and the repository returns a `ScanHistoryRecord`, the row's *state*, with no signal saying whether this call changed it. A replayed delivery returns `isSold: true` indistinguishably from the first. Fabricating `before` as `isSold: false` then asserts a false→true transition on **every** delivery, so the primitive decrements again on a sale that already decremented.

   Reading the row makes `before.isSold` true on the replay, which lands on the primitive's existing `before.isSold && after.isSold` no-op row (C1(g)) — no new mechanism, just a real input instead of an assumed one. **`orders/create` and `orders/paid` both fire for the same order** (the dev database holds 490 create and 117 paid intake records), so this is the normal path, not an edge case.

   **This amends context §0.10's "no extra query is needed" for these two call sites only**, and aligns them with §0.7's table, which already said `before` is the existing row. The two ratified sections disagreed; §0.7 is the one that survives. **The mechanism for detecting a real false→true transition is the pre-call read, and nothing else (D2).** `appendSoldTerminalEventWithFallback` returns `Promise<ScanHistoryRecord>` on **all four** of its branches with `isSold: true` on every one — there is no `didAppendSoldEvent` flag, in contrast to `appendLocationEvent`'s `didAppendLocationEvent`. So the return value cannot distinguish a first delivery from a replay, and the plan must not suggest it can. The call is placed unconditionally after the sold write; the **read taken before it** supplies `before.isSold`, and a replay (`before.isSold === true`, `after.isSold === true`) lands on C1(g)'s existing no-op row. §9.1's short-circuits are then irrelevant to correctness rather than something the call site must dodge.
5. Structured logging at each site per the existing command logging convention (context §3.7).

## Acceptance criteria
| # | Rows | Trace |
|---|---|---|
| C1 | Primitive resolution matrix: (a) both sides same config, same quantity → no mutation, `changed:false`; (b) same config, quantity 4→6 → net +2, one mutation; (c) different configs → source −q, destination +q, both states recalculated; (d) source resolves only → decrement only; (e) destination resolves only → increment only; (f) neither → no-op `changed:false`; (g) before.isSold=true & after.isSold=true → no-op; (h) source guard refusal still applies the destination increment (§0.15); **(i) different configs AND a quantity change → source −`before.quantity`, destination +`after.quantity`, not one shared `q`** (D5); **(j) `before === null` (no prior row) → destination-only increment, no decrement attempted** (D6); **(k) a side whose `itemCategory` is null is ineligible and resolves nothing** (D7) | M1/M3/M4, §0.7/§0.15 (**M1 added — F3: allocation correctness is the ledger entry P4 most obviously serves, and no row traced to it**) |
| C2 | Scan move (API): (a) scanning an item between two configured locations moves exactly `item.quantity` units — source decreases by that amount **and** destination increases by it, both states recalculated; (b) rescanning the same item to the location it already occupies produces `changed:false` and **no** counter movement on either side (the repository short-circuits before any event, §10.2) | M3, §0.10/§10.2 |
| C3 | Return to store: (a) a sold item returned via `returnToStore` increases the destination config by exactly `item.quantity`; (b) **nothing is decremented anywhere** — `before` carries `isSold: true`, so the primitive resolves no source side (§0.7's eligibility rule), and a decrement here would double-count against the sale that already removed it | M3, §0.7/§9.2 |
| C4 | Webhook path (`products/update`, worker process): (a) a location edit made in the Shopify admin moves stock **identically to C2(a)** — same amounts, same states; (b) a property, category or quantity sync that changes which config wins reallocates the item between configs without any location change; (c) `before` is captured **once**, from `existingHistory` ahead of both writes, and the stock change is applied **once** after both have run — so no delta is computed against a half-updated row (§0.7's ordering constraint); (d) an already-sold item whose quantity syncs is a stock **no-op** (`before.isSold && after.isSold`) | M3, §0.7 |
| C5 | Sale: (a) `orders/paid` on an allocated item decrements its config by exactly `item.quantity`, **once**; (b) **the cross-topic pair** — `orders/create` then `orders/paid` for the same order, **different `webhookId`, same `orderId`** — decrements **exactly once in total**. *Not* a replay of the identical payload (F2): that is stopped upstream by the `ShopifyWebhookDelivery` unique on `(shopId, topic, webhookId)`, which returns `duplicate: true` and never reaches the sold path at all — so the identical-payload row is green even with the stock hook's idempotency handling deleted entirely, and proves nothing about the mechanism it names. The cross-topic pair is the real path and the only one that reaches §9.1's same-`orderId` guard; (c) `orders/create` behaves identically to (a) and (b) | M3, §0.10/§9.1 |
| C6 | Failure isolation, with a config quantity manually drifted to 0 on a scratch copy: (a) a scan-out emits the §0.15 `logger.error` carrying the operation context; (b) the **scan itself still succeeds** — HTTP 200 and `ScanHistory` updated; (c) the guard refusal does **not** roll back or clamp, and any other valid stock mutation in the same operation still applies (§0.15: a source refusal does not prevent the destination increment) | M4, §0.15 |
| C7 | Perimeter: (a) `git diff --name-only` for the phase = exactly the five files listed; (b) `src/modules/scanner/repositories/scan-history.repository.ts` is **byte-identical** to its pre-phase state (§0.10 — Option A exists precisely so this file is never touched); (c) `src/modules/ws/*` is byte-identical (§0.9 — V1 adds no event) | §0.10/§0.9 (perimeter integrity — **no `M` id by design**, per the P2 C7 precedent) |

Phase-close instruments: typecheck green; purity grep empty; **`npx tsx scripts/verify-all.ts` all-PASS on a scratch copy** (§9.1d — this phase touches the domain P1 built and the service P2 built; the seam is what makes a regression in either visible here rather than at P6); perimeter diff (C7).

## Manual scenarios (executed against the running app + worker; expected quantity/state stated per step; configs seeded via P3 endpoints)
Seed: `LC1 + Dining Chairs + {}` and `H1 + Dining Chairs + {}`, thresholds 10/15/20 each — **plus a second, narrower configuration inside LC1: `LC1 + Dining Chairs + {wood_type: ["Teak"]}` (F4)**. Without a competing pair in one group, no scenario ever exercises best-match resolution at a hook site, and C4(b) — "a sync that changes **which config wins** reallocates the item" — has no fixture that can express a winner changing. Record starting quantities Q_LC1_catchall, Q_LC1_teak, Q_H1.
1. Scan a qty-1 unsold Dining Chair from LC1 to H1 → Q_LC1−1 / Q_H1+1; states per boundaries. (M3)
2. Rescan same item to H1 → no change (`changed:false`). (M3)
3. Edit the same item's location LC1←H1 in **Shopify admin**; wait for products/update → counters return to start. Requires Redis + webhook worker running (master plan §10). (M3)
4. Mark the item sold by delivering **`orders/create`, then `orders/paid`, for the same order with different `webhookId` values** → its config decreases by the item's quantity **once in total, not twice** (F2 — replaying an identical payload is rejected upstream by the delivery-dedupe unique and never reaches the sold path, so it cannot exercise this). Then re-deliver one of the two identical → still no further change. (M3/M5)
5. Return it to store via scanner UI → config +qty, `restockedAt` set. (M3)
6. Drift test, on a scratch copy: set the **LC1 catch-all** quantity to 0, then scan an item **from LC1 to H1** → (a) the §0.15 `logger.error` appears with its context, (b) the scan returns HTTP 200 and `ScanHistory` shows the new location, and **(c) `H1`'s quantity has still increased** — the move is chosen over a scan-out precisely so C6(c) and C1(h) have an observable destination side (F5: with a scan-*out* there is no destination, so "the increment still applies" cannot be observed at all and both rows would be graded on the error log alone). (M4)
7. Scan an item in a location with NO configs → no stock change, no errors. (M1 fall-through)
8. Group-total note (M8): totals in these scenarios reconcile exactly because `{}` catch-alls are present; without them a shortfall is expected, not drift.

## Notes
- **Granted delegations (P4 projection D4, D9) — the implementer's call, on purpose:** (D4) converting `ScanHistoryRecord.properties` (`Record<string, unknown> | null`) to §6.4's `Record<string, string> | null` — P2's `normalizeStoredProperties` is the semantics reconciliation uses but it is **not exported and its file is not in P4's perimeter**, so re-implement that reduction locally (drop non-string values, drop empty-after-trim, `null` for an absent bag) rather than widening the perimeter to export it; (D9) **no wrapping transaction** around the decrement/increment pair — each repository call is individually atomic, §0.10 rejected Option B partly to avoid lengthening write transactions under SQLite's single writer, and §0.15 requires the destination increment to survive a source refusal, which a shared transaction would undo.
- **Instrument honesty (F1, F9) — state this in the Review log rather than letting it pass silently.** C1's rows describe the primitive's internal resolution matrix, and §9.1 admits only three instruments: typecheck, a committed `verify-*.ts`, and manual scenarios. **P4 authors no verify script**, so C1(a)–(k) and C4(c) ("`before` is captured once") are decidable **only by code inspection**. That is legitimate for this project — but it means the reviewer grades them by reading, and the implementer must not present a manual scenario as though it discharged them. If C1's matrix deserves an executable instrument, that is a plan amendment to raise, not a gap to paper over.
- **Reviewer planted-defect probe (master plan §11.1.4):** temporarily swap the source/destination resolution in `applyItemStockChange` (decrement destination, increment source) → manual scenario 1 must show inverted counters; revert. Proves the scenario checklist can fail.
- The primitive lives in the stock module and imports only the stock repository + domain; call sites import the service (layering per architecture contract — commands may call services).
- Worker-process sites must not import `broadcastToShop` (no event work exists in this phase at all — §0.9).
- `itemIdentifiers` (`productId`, `scanHistoryId`) ride along solely for §0.15 log context.

## Review log
(append-only)

### 2026-09-01 — projection round 0 · AMENDMENTS_REQUIRED · consumed by coordinator

Handoff: `handoffs/reviewer/handoff_plan4_projection_0.md`. 11 ledger rows, 9 findings, 1 owner
card. **All folded.** 7 criteria, **28** rows (was 25; C1 gained (i) two quantities, (j)
`before === null`, (k) null category).

**Owner card 1 answered** — read the stored row on the sale path. Folded into task 4 with the
verification that Shopify's guard *does* protect the item and cannot protect the counter.

| # | Folded to |
|---|---|
| D1 | **context §0.10 amended** — its two sold rows contradicted §0.7's own table; §0.7 wins. Owner-ratified in session, so the gate is not re-opened |
| D2 | Task 4: the pre-call read is the **only** transition-detection mechanism — the repository returns `isSold: true` on all four branches with no `didAppendSoldEvent` flag. The plan's claim that the return "exposes enough" is deleted |
| D3 | Dissolved by D1 — the sold write replaces `properties` and `itemCategory`, so `{...after}` resolved the source config from post-sale values |
| D4, D9 | Granted delegations (re-implement the property reduction locally; **no** wrapping transaction, since §0.15 needs the destination increment to survive a source refusal) |
| D5 | Task 1 + C1(i): source −`before.quantity`, destination +`after.quantity` — two quantities, not one |
| D6, D7 | C1(j)/(k) and the eligibility predicate gains `itemCategory !== null` |
| D8 | Webhook call placed **after every branch**, not inside the `if` holding the two writes — otherwise the already-sold branch skips the hook entirely instead of resolving as a no-op |
| D10 | The hoisted read is named `existingHistory`; `before` is already bound in that file and returned as `product.previousLocation` |
| D11 | **master plan §6.4** gains `itemIdentifiers`, which the plan required and the registry lacked |

**Findings.** F1/F9 — C1's matrix and C4(c) are decidable **only by code inspection**, since P4
authors no verify script; recorded in Notes as instrument honesty rather than papered over.
F2 — **C5(b) could not fail**: an identical-payload replay is stopped upstream by the
`ShopifyWebhookDelivery` unique on `(shopId, topic, webhookId)` and never reaches the sold path,
so the row was green even with all idempotency handling deleted. Rewritten as the **cross-topic**
pair, the real path. F3 — no row traced M1, the entry P4 most obviously serves; C1 now does.
F4 — **no scenario ever put two competing configurations in one group**, so best-match resolution
was never exercised at a hook site and C4(b) had no fixture that could express a winner changing;
the seed gains a narrower LC1 configuration. F5 — scenario 6 changed from a scan-*out* to a
**move**, so C6(c)/C1(h)'s "the destination increment still applies" has an observable side at
all. F6 — a coordinator row-count error in **both** plans. F7/F8 — context's line citations into
these files have drifted again; the plan now says locate by symbol, always.

**Seal scored, then deleted.** Probe A surfaced (as card 1 + D1/D2). **Probe B did not** — the
collision between P2's decision to let a malformed-threshold throw propagate and P4's "a stock
failure never fails the parent" is still unrouted. Recorded as an open item for the P4 implement
prompt rather than silently dropped.
