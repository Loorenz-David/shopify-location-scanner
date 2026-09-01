---
plan: 4
role: projection
round: 0
verdict: AMENDMENTS_REQUIRED
date: 2026-09-01
actor: reviewer (plan-projection, Claude)
state: OWNER_DECISIONS_PENDING
---

# P4 projection — round 0

## Verdict

**AMENDMENTS_REQUIRED.** 11 decision-ledger rows, 9 reality-check / decidability findings,
1 owner decision. Two ledger rows (D1, D3) describe mechanisms that, implemented exactly as the
current artifacts prescribe, produce wrong stock counters with no error anywhere.

## Opening — for the owner

I walked phase 4 the way the implementer will, on paper, and stopped at every point where the
written instructions stop deciding. The phase itself is sound and the approach is right, but I
found one instruction that is actively wrong: the way the plan says to work out an item's
"before" state when a sale comes in would subtract the item's stock **twice** on every prepaid
order, because your shop receives two separate webhooks for the same sale. I checked your
database: 121 of your 126 recorded paid orders arrived that way, so this would have hit almost
every sale. The fix is small and local, but it contradicts a sentence you previously approved,
so it needs your say-so — that is the one decision card below.

Everything else is for the coordinator to fold into the plan before the implementer is briefed:
a second place where the counters could silently land on the wrong shelf, and a set of checks
that as written cannot actually catch the thing they were written to catch. Nothing here says
the phase should not proceed — it says it should proceed with these paragraphs corrected first.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — May we add one small database read on the sale path?

**Question.** May the sold-item hook read the item's stored row before marking it sold, instead
of assuming its prior state — accepting one extra database read per sold line item?

**Story.** A customer pays for a dining chair. Shopify sends you two notifications for that one
sale — an "order created" and an "order paid" — and your system already handles both, five
minutes or five seconds apart. Under the currently approved instruction, the stock machinery
would treat each notification as a fresh sale and subtract the chair from the LC1 shelf count
twice. LC1 would read one chair short, and the next chair sold from LC1 would take it to two
short. Nothing errors; the number is simply wrong until someone rebuilds it by hand. In your
current database, 121 of 126 paid orders arrived as exactly this pair.

**Branches.**
- **Read the stored row first (recommended):** the second notification sees the item is already
  sold, changes nothing, counts stay right. Cost: one extra read per sold item, on a path that
  already makes several.
- **Keep the approved wording:** every prepaid sale double-subtracts; counts drift downward
  continuously and are only correct immediately after a manual rebuild.

**Recommendation.** Read the stored row first — the saving it was written to buy is one database
read, and the price is a permanently wrong number on the majority of your sales.

**On silence.** The gate holds: the implementer is not briefed and phase 4 does not start.

**Trace.** context §0.10 (sold rows of the call-site table) vs context §0.7 (sold row of the
before/after table); plan 4 task 4; criteria C5(a)(b)(c).

---

## Decision ledger

| # | Decision point | Class | Proposed routing |
|---|---|---|---|
| **D1** | **Sold path `before`.** §0.10 says derive `before` as `{...after, isSold:false}`, "no extra query is needed". §0.7's table says `before` = **existing row**. They contradict, and only §0.7's is sound. | **intention gap** | Correct context §0.10's two sold rows to "the row read by `findByShopAndProduct` immediately before the call"; delete the "no extra query is needed" clause. See owner card 1. Then amend plan task 4 to drop the `{...after, isSold:false}` primary and make the pre-call read the mechanism, not the fallback. |
| **D2** | **Sold path transition detection.** Plan task 4 says "the command result / repository return exposes enough to decide" whether `isSold` really went false→true. **It does not.** `appendSoldTerminalEventWithFallback` returns `Promise<ScanHistoryRecord>` on all four branches and `isSold` is `true` on every one; there is no `didAppendSoldEvent` flag (contrast `didAppendLocationEvent`). | **plan gap** | Delete the parenthetical. State the mechanism outright: the pre-call `findByShopAndProduct` row is `before`; its real `isSold` is the transition detector. Resolves D1 and D2 together. |
| **D3** | **Sold path `before.properties` / `before.itemCategory`.** The sold write **replaces** both (`resolvePropertiesReplacement` at `:1072`, `resolveCategoryForUpdate` at `:1054`, applied in both the already-terminal and main branches). So `{...after, isSold:false}` resolves the **source** config from post-sale values, and a snapshot that differs from the stored bag decrements the wrong sibling config. | **plan gap** (dissolved by D1's fix) | Record in the plan why the pre-call read is required rather than merely cheaper — it is the only source of the item's *pre-sale* classification. |
| **D4** | **`properties` type conversion.** §6.4 fixes `properties: Record<string, string> \| null`; the only source is `ScanHistoryRecord.properties: Record<string, unknown> \| null`. Typecheck forces a choice and does not constrain it. P2's `normalizeStoredProperties` (`location-stock.repository.ts:39`) is the semantics reconciliation uses — and it is **not exported**, and that file is **not in P4's perimeter**. | **free choice** → needs explicit delegation | Coordinator picks one and writes it into task 1: (a) widen the perimeter by one file to export `normalizeStoredProperties` (C7(a) becomes six files); or (b) restate its exact semantics in the plan for the primitive to mirror. **(a) recommended** — intention §21/§5 forbid a second implementation of matching semantics. Current data does not yet distinguish them (0 of 10 618 property values need trimming, 0 keys need trimming, all text), so this is cheap now and unobservable later. |
| **D5** | **Different configs *and* a quantity change.** Task 1 and C1(c) both say "source −q, destination +q" — a single `q`. When `before.quantity ≠ after.quantity` (the webhook syncs quantity and location in one run; `appendLocationEvent` writes `quantity` unconditionally at `:692`), the correct behaviour is source −`before.quantity`, destination +`after.quantity`. | **plan gap** | Amend task 1 and C1(c) to name the two quantities explicitly; add a matrix row for "different configs **and** quantity changed". |
| **D6** | **`before === null`** (item had no row). Distinct from "before ineligible": the job's create branch (`:143-167`) and a first-ever scan both produce it. §6.4's type allows `null`; the matrix has no row for it. | **plan gap** | Add C1 row: `before === null` → destination-only increment. Add a call-site row under C4 for the webhook create path. |
| **D7** | **Null `itemCategory` in the eligibility predicate.** Task 1's eligibility rule is "non-null, `isSold === false`, location non-null" — it omits `itemCategory`. But §6.4 types it `string \| null` while `listByGroup(shopId, location, itemCategory: string)` and `LocationStock.itemCategory` are non-null. A null category is a **typecheck error**, not a silent fall-through. | **plan gap** | Add `itemCategory !== null` to the stated eligibility predicate in task 1. |
| **D8** | **Webhook call-site placement.** Task 3 says apply "after both writes", but the two writes sit inside `if (!existingHistory \|\| !existingHistory.isSold)` (`:110-228`), while the sold branch is `:90-108`. Task 3 *also* says the sold branch reaches the primitive ("before.isSold && after.isSold → primitive resolves neither side"), which requires placement **after `:228`**. The plan does not say which. | **plan gap** | Bind it: single call after `:228`, before the broadcast at `:230`. If the coordinator instead permits an early skip when `existingHistory?.isSold`, C4(d) must be reworded from mechanism to outcome ("no stock movement occurs"), or it becomes vacuously true. |
| **D9** | **Transaction scope of the decrement/increment pair.** Both repository methods accept an optional `tx`; the plan is silent. §0.10 rejected Option B partly to avoid lengthening write transactions under SQLite's single writer. | **free choice** → needs explicit delegation | Delegate explicitly: **no wrapping transaction** — each call is individually atomic, and §0.15 requires the destination increment to survive a source refusal, which a shared transaction invites an implementer to undo. |
| **D10** | **`before` identifier collision at site 1.** Task 2 names the hoisted read `before`, but `update-item-location.command.ts:68` already binds `before` (the Shopify fetch), consumed at `:86`, `:90`, `:104`, `:118` and returned as `product.previousLocation` at `:193`. | **free choice** → needs explicit delegation | Name the hoisted read `existingHistory` (matching the returnToStore branch and the job) and say so, so no implementer renames a value that is part of the command's response contract. |
| **D11** | **Registry vs plan signature.** §6.4 fixes `applyItemStockChange({ shopId, before, after, operation })`; plan task 1 adds a fifth parameter `itemIdentifiers`. §6 is declared fixed and ambiguity is a finding. | **plan gap** | Fold `itemIdentifiers` into master plan §6.4's registry row (it is needed — `GuardedDecrementContext` carries `productId`/`scanHistoryId` and §0.15 requires them), so the registry and the plan agree. |

## Reality-check and decidability findings

**F1 — C1's eight rows have no instrument.** §9.1 admits three: typecheck, a committed
`verify-*.ts`, or the Manual Scenarios. P4 authors no verify script (§6.4's instrument table
lists none for P4; `scripts/verify-all.ts:5-8` `EXPECTED_SCRIPTS` names only P1's and P2's), and
manual scenarios observe counters, never the primitive's `{changed}` return. Rows with **no
scenario at all**: C1(b) quantity-only change on one config; C1(d) source-only; C1(e)
destination-only; C1(g) sold/sold. Rows decidable only as counter movement, not as the stated
return value: C1(a), C1(f). *Routing:* either add a `scripts/verify-stock-primitive.ts` (and its
`EXPECTED_SCRIPTS` entry, per §6.4's same-commit rule — this changes the file perimeter), or
extend the Manual Scenarios to cover the four uncovered rows and restate C1(a)/(f) as observable
outcomes.

**F2 — C5(b) is satisfied by a guard other than its own predicate (charter rule 2's companion).**
"Replaying the identical webhook" is stopped at `handle-orders-paid-webhook.command.ts:54-70` by
the `ShopifyWebhookDelivery` unique on `(shopId, topic, webhookId)` — it returns `duplicate:true`
and never reaches `appendSoldTerminalEventWithFallback`. The §9.1 same-`orderId` short-circuit
the row exists to prove is therefore never executed, and deleting the stock hook's entire
idempotency handling leaves C5(b) green. Manual scenario 4's "replay same payload" has the same
defect. *Routing:* rewrite C5(b) as the **cross-topic** case — `orders/create` then `orders/paid`
for the same order, different `webhookId`, same `orderId` — which is the real path (121 of 126
paid orders in `dev.db` arrived as this pair) and the only one that reaches §9.1's guard. Manual
scenario 4 follows.

**F3 — no criterion row traces to M1, the ledger entry P4 most obviously serves.** The plan's
Manual Scenarios claim M1 (scenario 7), M5 (scenario 4) and M8 (scenario 8), but no criterion row
cites any of them (charter manifest property 5, both directions). M1 — "counted by exactly one
configuration: the best match" — is precisely what the primitive's own `resolveBestMatch`
candidate construction decides, in new code.

**F4 — no scenario ever puts two competing configurations in one group.** The seed is one
catch-all per location (`LC1 + Dining Chairs + {}`, `H1 + Dining Chairs + {}`). Consequences:
**C4(b)** — "a property, category or quantity sync that changes **which config wins**
reallocates the item between configs" — is **not exercisable as seeded**, since with one config
per group nothing can change which config wins. And the specificity path is untested at P4: a
primitive that builds its candidate list wrongly (wrong field, missing `createdAt`) allocates to
the wrong sibling and every scenario still passes. *Routing:* extend the seed with a second,
more specific configuration in the LC1 group (e.g. `LC1 + Dining Chairs + {wood_type:["teak"]}`)
and add a scenario that moves an item between siblings; add a criterion row tracing to M1.
Closes F3 and F4 together.

**F5 — C6(c) and C1(h) are not decidable from manual scenario 6.** Both assert that a source
guard refusal still applies the **destination** increment. Scenario 6 says only "set a config
quantity to 0 → scan out → error log, scan succeeds" — it never states a configured destination
or an expected destination count. *Routing:* make scenario 6 a **move** (LC1 drifted to 0, scan
LC1→H1) and state both expectations: `logger.error` with `operation: "location_move"`, and
`Q_H1 + qty`.

**F6 — the row count in the tracker and in this session's prompt is wrong: 25, not 28.** Plan 4
has C1 8 · C2 2 · C3 2 · C4 4 · C5 3 · C6 3 · C7 3 = **25** addressable rows. A regex over
`([a-h])` returns 28 because C4(a) cites "C2(a)" and C5(c) cites "(a) and (b)" — cross-references
counted as rows. Both `master_plan.md:44` ("7 criteria / 28 rows") and
`prompts/reviewer/prompt_plan4_projection_r0.md:137` ("all **28** lettered rows") carry it
(charter manifest property 3 — counts are derived, and this one was derived by a counter that
cannot tell a row from a citation).

**F7 — the de-drifted line citation in task 2 is still off by two.** Task 2 asserts "the branch
now opens at `update-item-location.command.ts:48`". Line 48 is
`const returnToStore = input.payload.returnToStore === true;`; the branch opens at **:50** and
the hoistable `findByShopAndProduct` is **:51-54**. (Task 2's own instruction — locate by symbol,
not line — is the right one; the number should be corrected or dropped.)

**F8 — context §0.7's `existingHistory` citation has drifted by one.** §0.7 and §0.10 both cite
`process-products-update-webhook.job.ts:86`; the call is at **:85-88**. Its other citations in
that section resolve exactly (`:182`, `:201`, `:59-63`, `:90-107`).

**F9 — C4(c) is decidable only by code inspection.** "`before` is captured **once** … applied
**once**" is a statement about code shape; no instrument in §9.1 observes it. It is legitimately
re-derivable under §11.1.1, but the plan should say so rather than leave it to a reviewer to
notice that no scenario can decide it.

## Passing-glance notes (not findings, recorded so the reviewer does not re-derive them)

- **`applyIncrement` is not shop-scoped** (`location-stock.repository.ts:341-352`, `where: {id}`).
  Safe as used — ids come from a `shopId`-scoped `listByGroup` — and the file is frozen. Noted
  only so it is not re-raised.
- **`updateState`'s read-then-write of `stockState`** (`:128-160`) is a race under concurrent
  batch scans (`shopify.controller.ts:254` fans out with `Promise.all`). This is **ratified**:
  §0.15 prescribes exactly that read-back, and §11.3 non-finding 9 settles stale counters as
  reconciliation's job. Not a finding.
- **The same-location short-circuit returns the row genuinely unchanged**
  (`scan-history.repository.ts:646-667` — no property, quantity or category write). C2(b)'s
  mechanism is confirmed sound as written.
- **All four sites are safe on the process constraint** (§11.3): the primitive as specified
  imports only the stock repository and domain; neither imports `broadcastToShop`. Verified by
  reading P2's shipped files, not assumed.
- **`ScanHistoryRecord.quantity` is `number`, not nullable** — the null-quantity hazard I
  expected on the sold path does not exist; `normalizeQuantity` floors to 1 at write time, and
  the sold path writes no quantity to an existing row at all.
- **Data shape checked against `prisma/dev.db` (read-only):** 1096 rows carry `properties`, all
  valid JSON objects, 10 618 values all of type text, 0 keys and 0 values needing a trim. This is
  what makes D4 cheap today rather than urgent.

## Write perimeter

**Exactly one file:** `docs/under_implementation/warehouse_stock/handoffs/reviewer/handoff_plan4_projection_0.md`
(this file). No code, no plan, no tracker, no intention or context edit.

**Outside the repo:** two harness-persisted Bash transcripts of `pipeline-charter.md` under the
session's `tool-results/` directory (`bh0lxtahk.txt`, `b4opegm6p.txt`) — read-only byproducts, no
scratch files authored. Database access was `sqlite3 -readonly` throughout; `prisma/dev.db` was
not modified.

## Appendix — non-authoritative

The paper skeleton is **discarded** per doctrine. Nothing in this handoff is guidance on how to
write `applyItemStockChange`; every entry above is a statement about what the artifacts do or do
not determine. The implementer derives the code from the amended plan, not from here.
