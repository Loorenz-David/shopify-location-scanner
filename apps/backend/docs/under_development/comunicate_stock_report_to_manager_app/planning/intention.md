# Intention — Scanner → Manager stock-report signalling

```
status:    RATIFIED — owner David, 2026-09-19 (changelog round 3).
           Mechanism contracts added in §12A (round 4); implementation brief for Codex in §13A.
           Round 5: Card 8 answered; several set sizes per rule are refused on save.
           Round 6: Card 9 answered ("any" set size refused too). No owner decisions open —
           READY TO HAND TO CODEX (§13A).
owner:     David
shaped:    2026-09-19, Claude Opus 5 (intention-shaper); rounds 1–2 2026-09-19
authority: this document, for Scanner-side product semantics.
           The wire contract is NOT ours: manager_handoffs/STOCK_REPORT_WEBHOOKS_v2_20260919.md
           (supersedes v1; complete on its own; published, frozen; a change ships as v3).
repo:      Item-Scanner-Shopify/apps/backend (paths below are relative to it unless stated)
```

---

## 1. Objective and hard constraints

**Objective.** Keep the Manager application's stock-report board a faithful, live projection of
what Scanner's stock report says is missing. Delete Manager's rows for rules Scanner no longer
has. Tell Manager when Scanner first registers an item, so Manager can clear it from its
"awaiting" work. Every signal must be traceable after the fact: for any item or any stock rule,
the owner can see what was sent, when, and what Manager answered.

Three signals, one direction (Scanner → Manager; Manager never calls Scanner for any of them):

| Signal | Manager endpoint (handoff v2 §3, §4A, §4) | What it says |
|---|---|---|
| **Demand** | `POST {base}/api/v1/location-tracker/webhooks/stock-demand` | "For stock rule (category + properties), this many units are still missing." |
| **Delete** | `POST {base}/api/v1/location-tracker/webhooks/stock-demand-deleted` | "No Scanner location holds rule (category + properties) any more." |
| **Processed** | `POST {base}/api/v1/location-tracker/webhooks/items-processed` | "Scanner has registered item `article_number`." |

**Hard constraints**

- **HC-1 — The handoff is the wire contract.** Paths, header, body shapes, units, outcome codes and
  status-code meanings are Manager's (handoff v2 §1 "Stable" column). Scanner adapts to it; any
  need to change it is a request to the Manager side.
- **HC-2 — Demand is absolute and aggregated.** One entry per (`itemCategory`, `properties`)
  identity, summed across every `LocationStock` row sharing it, in **units**; the value is the
  number true *now*. A satisfied rule is sent as `0` (its Manager row stays). A rule no location
  holds any more is **deleted**, never zeroed and never just left out (handoff v2 §3.2 rule 4).
- **HC-2a — Delete is destructive and guarded.** Manager deletes the row *and every work assignment
  on it*. A delete is sent only when **no** Scanner location holds that identity, and that is
  re-checked **at send time** (handoff v2 §4A.2).
- **HC-3 — One ordered stock lane per shop.** Demand and delete messages to a target go one at a
  time, in order; the next waits for the previous one's final answer. Demand payloads are built
  when the job runs, never when it is enqueued (handoff v2 §4A.2, §6.3 — "required").
- **HC-4 — Scanner's own operations never depend on Manager.** A scan, an order webhook, a stock
  configuration change or a reconcile completes identically whether Manager is up, down, slow,
  misconfigured, or not built yet. Signalling failures are recorded, never propagated.
- **HC-5 — `article_number` is sent verbatim.** `ScanHistory.itemBarcode` exactly as stored —
  inner spaces, slashes, leading zeros — never reformatted. A row without one is skipped
  knowingly (recorded), never sent with a substitute such as the SKU.
- **HC-6 — Part of the outbound-webhook family.** Targets are registered, toggled and removed
  through the existing admin API (`src/modules/outbound-webhook/routes/outbound-webhook.routes.ts`)
  and stored in `OutboundWebhookTarget` (`targetUrl` = full endpoint path, `secret` = the shared
  key sent as `x-api-key`). No environment-variable target configuration.
- **HC-7 — Interim system** (standing owner framing): effort goes to silent user-facing defects —
  wrong numbers on Manager's board, wrongly deleted rows, items never cleared, failures nobody
  sees — not to generality or future-proofing.

---

## ⚠ OWNER DECISIONS REQUIRED (0)

None open. Cards 9 and 8 below are kept as answered.

### Card 9 — Should "any set size" also be refused on save? (answered round 6: yes, refuse)

- **Question:** Besides several set sizes, should a rule with set size "Any value" also be refused,
  or count 1 chair per missing item?
- **Story:** Someone creates "Dining chairs, teak, set size: any", wanting 5 sets, and has 3. Two
  sets are missing, but they could be sets of 2, 4 or 8. Counting 1 per item tells Manager
  "2 chairs". The real need is probably 8 or more. The rule editor offers "Any value" for set size
  today; no saved rule uses it.
- **Branches:**
  - *Refuse it too* → every chair rule states one set size; Manager's number is always exact.
  - *Allow, count 1* → such a rule can be saved, but Manager is under-asked.
- **Recommendation:** Refuse it too. It is the same problem your previous answer already closed.
- **On silence:** the gate holds; Codex should not start.
- **Trace:** §12A.2, §12A.11, M1.
- **Answer (owner, round 6):** refuse it too.

### Card 8 — Re-send item reports that never got through? (answered round 5: yes, outages and wrong key)

- **Question:** Should Scanner automatically re-send "item processed" reports that failed (Manager
  down, or the key was wrong), for up to 7 days?
- **Story:** Manager is offline Saturday for an upgrade. Twelve repaired chairs are scanned in that
  day. Each report retries for about five minutes, then gives up. Unlike stock numbers, which the
  15-minute push corrects, nothing ever sends these again. On Monday, twelve finished chairs still
  sit on Manager's board as "waiting for Scanner". With re-send, they clear themselves within 15
  minutes of Manager coming back. The same applies after a wrong key is fixed.
- **Branches:**
  - *Yes, outages and wrong key* → the board heals on its own.
  - *Outages only* → after a key fix, the backlog must be cleared by hand.
  - *No* → every missed report is cleared by hand.
- **Recommendation:** Yes, both. Manager ignores repeats safely, so re-sending can never close
  anything twice.
- **On silence:** the gate holds; Codex should not start.
- **Trace:** §12A.7, §12A.5, M4.
- **Answer (owner, round 5):** the recommendation — yes, both outages and a wrong key.

Card 7 below is kept as answered in round 3 (restore does not report).

### Card 7 — Should the scan-history restore script report items to Manager? (answered: no)

- **Question:** When `restore-scan-history` re-creates lost Scanner rows, should those count as
  "Scanner registered this item" and be reported to Manager?
- **Story:** Under the corrected contract a report now **closes** the item's Manager task, even
  if the worker hasn't finished it ("closed early"). Say the database is restored on a Tuesday.
  The script re-creates rows for 900 items Scanner already knew. One of them, a sideboard, is
  currently back in Manager for a repair. The restore would report it, and Manager would close
  that repair task early, although nobody touched the item.
- **Branches:** *Restore does not report* → recovery can't close anyone's work. The script that
  records missed sales still reports, because a sale is real. *Restore reports* → every re-created
  row closes any open Manager task for that article.
- **Recommendation:** Restore does not report. It rebuilds history; it doesn't register new items.
- **On silence:** the gate holds.
- **Trace:** §4.2, M4.

### Answered (round 1, 2026-09-19 — owner David)

| Card | Answer | Effect |
|---|---|---|
| 1 — snapshot push vs delete/create/change calls | Owner added a delete endpoint on Manager (handoff v2 §4A). Modify = delete old identity + push new; delete = delete identity; quantity change = demand push. | §3, §4.1 rewritten around three signals |
| 2 — number and unit | **Units.** | §4.1.2 |
| 3 — processed trigger scope | **Creation only.** Manager guards against late completion on its own side (now in contract v2 §4.2: early close). | §4.2; M4 fixed at creation |
| 4 — traceability surface | **Stored log + admin read endpoint** (as recommended). | §5.2, §8 are must-ship |

### Answered (round 2, 2026-09-19 — owner David)

| Card | Answer | Effect |
|---|---|---|
| 5 — automatic re-derivation of failed deletes | **Automatic.** | §4.1.3 as written; the "edit-time only" alternative removed |
| 6 — units formula | **Yes:** missing units = missing items × the rule's set size (1 when none). | §4.1.2 final |

---

## 2. Grounding — what exists today (verified 2026-09-19 against the working tree)

### 2.1 Outbound-webhook module
- Admin API, mounted behind `authenticateUserMiddleware` + `requireAdminMiddleware` +
  `requireShopLinkMiddleware`: register / list / toggle / delete targets
  (`src/modules/outbound-webhook/routes/outbound-webhook.routes.ts`).
- `OutboundWebhookTarget` (prisma/schema.prisma): unique `(shopId, targetUrl, eventType)`,
  `secret` stored in plain text. `enum OutboundEventType { item_placed }` — one value.
- `enqueueOutboundEventService` (`services/enqueue-outbound-event.service.ts`): looks up active
  targets for (shop, eventType) and adds **one BullMQ job per target whose data carries the frozen
  payload and the secret** (`src/shared/queue/outbound-webhook-queue.ts`: attempts 4, exponential
  5 s, `removeOnComplete: 100`, `removeOnFail: 200`).
- Worker `src/workers/outbound-webhook-worker.ts` (PM2 app `shopify-outbound-webhook-worker`,
  `ecosystem.config.cjs`): concurrency 5, 8 s timeout. It **discards the response body**, treats
  **every 4xx as done** (warn line), retries 5xx, and classifies network errors by **message
  substring**. The `"TimeoutError"` check never matches: the abort rejects with
  `name === "TimeoutError"` and message "The operation was aborted due to timeout". So **a timed-out
  delivery is silently completed, not retried** (handoff §6.6; affects `item_placed` today).
- Only producer today: `mark-logistic-placement.command.ts:154-176` (`item_placed`, fire-and-forget
  with `.catch` → log).

### 2.2 Stock report (the "stock report objects")
- `LocationStock` (unique `shopId, location, itemCategory, propertiesCanonical`) with
  `quantity` (units held), `instanceCount` (items held), `stockState`, and
  `StockThresholdsLocation` rows.
- **Thresholds and state are item-based** since P7 (commit 89da64c): `updateState` in
  `location-stock.repository.ts` calls `calculateStockState(row.instanceCount, …)`.
- The report (`src/modules/stock/queries/get-stock-report.query.ts`) exposes per row
  `unitsToRestockTarget = max(0, highestThreshold − instanceCount)`. Despite the name, this is **in
  items**. The frontend's "units" count mode switches only the *held* column; its PDF labels the
  gap column "Missing items" in that mode (`apps/frontend/src/features/stock/ui/pdf/StockReportPdf.tsx:306`).
  **Scanner has no missing-in-units number today** — this project derives one (§4.1.2, Card 6).
- `properties` is normalized `StockCriteria` (`domain/property-criteria.ts`: keys sorted, values
  trimmed/lower-cased/de-duplicated/sorted, `null` = any value); `propertiesCanonical` is its
  JSON string. This is the same normalization Manager applies for identity (handoff §3.3).
- Where the numbers change:
  - item movements → `applyItemStockChange` (`services/apply-item-stock-change.service.ts`), called
    from `update-item-location.command.ts:157`, `handle-orders-paid-webhook.command.ts:183`,
    `handle-orders-create-webhook.command.ts:205`, `process-products-update-webhook.job.ts:239`;
  - rule create / update / delete → `commands/*.ts`, which call `reconcileCategory`;
  - **a thresholds-only update does not reconcile** (`update-location-stock.command.ts:104-115`
    only recalculates state), yet it changes the restock target and so changes demand;
  - an update may change `itemCategory`, `location` and/or `properties` in place (same row id) —
    the identity-changing edit that drives deletes;
  - full rebuild → `scripts/rebuild-location-stock.ts` (`reconcileAllCategories`).

### 2.3 ScanHistory creation (the "processed" moments)
Only `src/modules/scanner/repositories/scan-history.repository.ts` creates rows
(context: `../context_gathered/scan-history-creation.md`):
- `appendLocationEvent` (`:494`, create at `:548`, inside `prisma.$transaction`). Callers:
  `update-item-location.command.ts:134` (scanner UI), `process-products-update-webhook.job.ts:149`
  (Shopify products/update, row absent) and `:205` (row present → never a create), plus
  `scripts/restore-scan-history.ts:93`.
- `appendSoldTerminalEventWithFallback` (`:831`, create at `:974`, `latestLocation: null`,
  `isSold: true`). Callers: `handle-orders-create-webhook.command.ts:179`,
  `handle-orders-paid-webhook.command.ts:157`, plus `scripts/reconcile-active-sold-items.ts:524`.
- **Neither function tells its caller whether it created or appended** — both return the record.
  The create-vs-append decision is made inside the transaction.

### 2.4 Environment
- Backend has **no unit-test runner** (`package.json` `test` is a stub). Backend verification is the
  `scripts/verify-*.ts` family run by `scripts/verify-all.ts` (`EXPECTED_SCRIPTS`), established by
  the warehouse_stock pipeline. Frontend uses vitest (not touched here).
- SQLite (WAL), Prisma 6, BullMQ ^5.73 on Redis. JSON columns are not queryable through Prisma.
- `prisma/dev.db` holds real data — read-only for verification; destructive work on a `.backup` copy.
- Manager's receiver is **not built yet** (handoff header). Everything here is built and verified
  against a local stub that implements the handoff's documented responses.

---

## 3. How the requested behaviour maps onto the Manager contract (v2)

| Scanner event | What Scanner sends (in the ordered stock lane) |
|---|---|
| Rule created | Demand push: the new identity appears with its units missing (Manager find-or-creates the row) |
| Item scanned in / sold / moved changes a rule's count | Demand push: the identity's new absolute number |
| Thresholds edited | Demand push: new target, so new number |
| Rule satisfied | Demand push with `0` — Manager row stays |
| Rule's category / properties / location edited | **Delete** of the old identity *only if no location still holds it*, else the old identity's lower sum through demand; **then** demand including the new identity |
| Rule removed | **Delete** of the identity *only if no other location holds it*, else its lower sum through demand |
| ScanHistory row created (either function) | Processed: `[{article_number}]` |

The "only if no location still holds it" guard is why the old version can't simply be deleted on
every edit: LC10 and LC11 can share an identity. Deleting it when LC10's rule changes would wipe
LC11's live demand and every Manager assignment on that row (handoff v2 §4A.2 rule 1).

---

## 4. Core workflow

### 4.1 Stock lane (demand + delete)

**4.1.1 Triggers — "something that can change demand or rule identity was committed for shop S".**
Any of: a committed `applyItemStockChange` that reports `changed`; a rule create / update
(including thresholds-only) / delete; a category reconcile or full rebuild; worker start; a
periodic timer (default every 15 min, configurable). A trigger carries only `shopId` — never
numbers and never identities. Everything is read at send time.

**4.1.2 The number (Cards 2 and 6, owner-confirmed).** For shop S at send time:

```
missingItems(row) = max(0, highestThresholdQuantity(row) − row.instanceCount)        // = report's unitsToRestockTarget
unitsPerItem(row) = the single value of row.properties.quantity, if that key holds
                    exactly one value that parses as a positive integer; otherwise 1
demand(identity)  = Σ over rows with that (itemCategory, propertiesCanonical)
                      of missingItems(row) × unitsPerItem(row)
```

Example: rule "Dining Chairs, quantity [4], teak" at LC10 wants 5 sets and holds 3 → 2 × 4 = 8; at
LC11 it wants 2 and holds 2 → 0; entry sent: `quantityRequested: 8`. Summing per-row gaps (not
"sum of targets − sum of counts") is deliberate: a surplus at one location does not fill a gap at
another. `LocationStock.quantity` (units held) is not an input: the thresholds it would be compared
with are item counts.

**4.1.3 One stock sync = one job, run serially per target.** For each active target of shop S
(`stock_demand` and `stock_demand_deleted` targets registered with the same base URL):
1. read all `LocationStock` rows of S (+ thresholds); compute the set of **present identities** and
   `demand` per identity;
2. **deletes first:** every identity in the target's ledger (§5.1) that Manager holds (`live`) and
   that is **not present now** → one delete request. Because this list is computed from state
   read in step 1 of the same job, the handoff's send-time re-check is inherent: an identity that
   came back (Teak → Light → Teak) is present and gets no delete;
3. **then demand:** one request with every present identity and its number (satisfied → `0`);
4. classify each response (§7); record outcomes in the ledger; write delivery records (§8).

Ordering contract: at most one sync per target running; a trigger arriving while a sync runs
causes exactly one further sync after it (never lost, never parallel); bursts coalesce (short
debounce, default a few seconds). A retry re-runs from step 1, so it can never send an older
number, or a delete of an identity that has since come back. A delete that failed is re-derived
by every later sync (including the periodic one) until Manager answers `deleted` / `not_found`
(Card 5, owner: automatic).

Why one job instead of separate delete and demand events: separate events would need Scanner to
remember "the old identity" at edit time and carry it into a queued message. That is exactly the
frozen-at-enqueue state the handoff forbids, and it needs its own re-check. Deriving deletes from
"ledger minus present" at send time gives the order (delete, then demand) and the re-check at once.

### 4.2 Processed lane (Card 3: creation only)

**Trigger:** a `ScanHistory` row was **created and committed** by `appendLocationEvent` or
`appendSoldTerminalEventWithFallback`. Appends to existing rows never trigger.
- Emitted **after** the transaction commits; a rolled-back create emits nothing.
- Emitted for every production caller of those functions and for
  `scripts/reconcile-active-sold-items.ts` (a real sale Scanner missed). **Exception (Card 7,
  owner):** `scripts/restore-scan-history.ts` does not emit, because under contract v2 a report
  closes Manager's task even when unfinished (early close), and a restore re-creates rows for items
  that are not new.
- `itemBarcode` null or blank after trim → nothing sent; a delivery record with status `skipped`
  and reason `no_article_number` is written so the gap is visible (§8).
- **One article per request**, so each delivery record maps to exactly one article and is
  queryable by it (Prisma cannot query inside JSON).
- The job carries the article number and the ScanHistory id; the payload is `[{ "article_number":
  <itemBarcode verbatim> }]`. Freezing at enqueue is correct here: the fact "this row was created"
  does not go stale. Separate queue from the stock lane: no ordering relation between the two.
- Response: record `outcome` + `reason` exactly as one of the four closed codes of contract v2
  §4.3: `resolved`/`null`, `resolved`/`early` (Manager's task was unfinished and was closed
  anyway), `ignored`/`item_not_found`, `ignored`/`no_open_assignment`. An unknown code is recorded
  verbatim and flagged as an anomaly. **Each item is reported once; never re-sent** (v2 §4.2).

---

## 5. Domain model and state ownership

### 5.1 `ManagerStockLedger` (new table) — "what we believe each target holds"

> **Superseded in detail by §12A.3** (keyed per shop, states `active`/`deleted`, written before
> sending). The purpose stated below still holds.

| Field | Writer | Rule |
|---|---|---|
| `targetId` | system (sync) | FK `OutboundWebhookTarget` (the demand target), cascade on target delete |
| `itemCategory`, `propertiesCanonical` | system | identity; unique with `targetId` |
| `properties` | system | the JSON object last sent (needed to send a delete for an identity no longer present) |
| `state` | system | `live` after a demand entry answered `applied`; `deleted` after a delete answered `deleted` or `not_found`; `rejected` while the category answers `category_not_found` |
| `lastSentQuantity` | system | value in the last delivered demand request |
| `lastAppliedQuantity` | system | updated only on `applied`; never written from a non-200 |
| `lastOutcome`, `lastSentAt`, `lastDeliveryId` | system | Manager's last per-entry answer and link to the delivery record |

Purpose: (a) knowing which vanished identities Manager still holds and must be deleted; (b)
per-rule traceability, including every `category_not_found` rule, queryable without parsing JSON.
It is a **projection of Manager's answers**, never an input to the demand number. Only identities
Manager answered `applied` for become `live`, so Scanner never deletes a row it did not create.
A delete is only ever sent for a `live` identity absent from Scanner at send time.

### 5.2 `OutboundWebhookDelivery` (new table) — the delivery log (Card 4: must ship)

> **Field list and granularity are fixed by §12A.9.**

One row per HTTP request (per logical delivery, not per retry attempt): `id`, `shopId`, `targetId`
(nullable if the target was deleted), `eventType`, `subjectKey` (article number for processed;
null for demand/delete), `status` (`pending | delivered | rejected | failed | skipped`),
`attempts`, `requestBody` (JSON text, the last body actually sent), `responseStatus`,
`responseBody` (text, truncated to a fixed cap), `errorName`/`lastError`, `createdAt`,
`lastAttemptAt`, `completedAt`. Indexes on `(shopId, eventType, createdAt)` and
`(shopId, subjectKey)`.
- Written by the worker only. Never contains the secret.
- Retention: rows older than 30 days (configurable) pruned by the periodic job.
- `item_placed` deliveries use the same log only if cheap (§10).

### 5.3 Contract changes
- `OutboundEventType` gains `stock_demand`, `stock_demand_deleted` and `items_processed` (Prisma enum
  + migration + zod `OUTBOUND_EVENT_TYPES`). `item_placed` is untouched — its payload has another
  consumer and is not what Manager accepts (handoff §6.4).
- Jobs for the new types carry `shopId`/`targetId` + event data only. The worker reads URL and
  secret from the target row at send time, so a rotated secret or a deactivated target takes effect
  on the next attempt, and secrets stop living in Redis job data for these types.
- Pairing: a stock sync needs both a `stock_demand` and a `stock_demand_deleted` target for the
  shop. If only the demand target exists, deletes are not sent and each skipped delete is recorded
  as `skipped` / `no_delete_target`. The missing target is visible, not silent.

### 5.4 What nothing in this project may write
`LocationStock`, thresholds, `ScanHistory` and their events are read-only to this feature. The one
exception is changing the ScanHistory creation functions so their post-commit path knows whether
they created a row.

---

## 6. Facts vs derived

- Facts (stored elsewhere, read here): `LocationStock` rows and thresholds, `ScanHistory.itemBarcode`.
- Derived at send time, **never stored as a fact**: `demand(identity)`, the present-identity set,
  and the delete list. The ledger stores what was *sent* and what Manager *answered* — labelled as
  observations.
- Manager's answers are Manager's facts; Scanner records them verbatim and never infers an outcome
  from a status code alone when a body is available.

---

## 7. Delivery semantics (per handoff v2 §3.4, §4.3, §4A.3, §5, §6.1–6.2, §6.6)

| Observation | Status recorded | Retry? | Loudness |
|---|---|---|---|
| 200, body parsed | `delivered`; per-entry outcomes → ledger (demand/delete) or delivery row (processed) | — | `category_not_found`: error-level log naming the category |
| 200, body unparseable or result count ≠ entry count | `delivered` + anomaly in `lastError`; ledger untouched | no | error log |
| 401 | `rejected` | **no** | **error** log, distinct message ("Manager rejected the key") |
| 422 | `rejected` | no | error log ("sender bug") with Manager's `error` text |
| other 4xx | `rejected` | no | warn log |
| 5xx | retry; `failed` when attempts exhausted | yes | warn per attempt, error on exhaustion |
| timeout / connection error | retry; `failed` when exhausted | yes | same |

Delete outcomes: `deleted` and `not_found` both mark the ledger identity `deleted` (a replay reads
`not_found`); `category_not_found` leaves it as is and logs. Within one sync, a delete that ends
`failed`/`rejected` does **not** block the demand request that follows (the handoff's "final
answer" includes retries exhausted); the delete is re-derived next sync (Card 5).
**Refined by §12A.4/§12A.8:** a *retryable* delete failure retries the whole run (demand waits); only
a final non-retryable answer lets demand proceed in the same run.

Retryability of thrown errors is decided by `error.name` (`TimeoutError`, `AbortError`) plus the
existing message checks. This is the fix in handoff §6.6, applied to the shared worker so
`item_placed` also stops losing timed-out deliveries. Client timeout for the stock lane stays **8 s,
above Manager's 5 s commit limit** (handoff §3.5, which also covers delete). Changing it requires
telling the Manager side.

---

## 8. Traceability — answer to "can the current webhook system provide it?"

**No, not today.** What exists: stdout log lines (`src/shared/logging/logger.ts` → PM2 logs) with
job id, target and status. BullMQ also keeps the last 100 completed / 200 failed jobs in Redis,
including their payload and secret. Missing: the request actually sent after build-at-send-time,
the response body, per-entry outcomes, anything durable, anything queryable by article number or
rule, and any record at all of a timed-out delivery (it completes silently).

What this intention adds (Card 4: must ship): the delivery log (§5.2), the stock ledger (§5.1), and
two admin-only read endpoints on the outbound-webhook router:
`GET /outbound-webhooks/deliveries?eventType=&status=&subject=&limit=` and
`GET /outbound-webhooks/manager-stock?state=&outcome=`. Questions they must each answer in one lookup:
1. "Was article X reported, when, and what did Manager say?"
2. "What does Manager currently hold for rule (category, properties), and did it accept it?"
3. "Which rules is Manager refusing (`category_not_found`)?"
4. "Which rules did we delete in Manager, when, and why (which sync removed them)?"
5. "Which deliveries failed or were rejected in the last N days, and why?"

---

## 9. Operations

- **Configuration (owner):** generate one secret and configure it in Manager as
  `MANAGER_API_KEY_TO_LOCATION_TRACKER_APP`. Register three targets through the existing admin API
  with the same secret: `stock_demand` → `…/webhooks/stock-demand`, `stock_demand_deleted` →
  `…/webhooks/stock-demand-deleted`, `items_processed` → `…/webhooks/items-processed`.
- **No targets registered ⇒ nothing is sent and nothing errors** (today's behaviour of
  `enqueueOutboundEventService`, kept).
- **Processes:** the new queues run inside the existing `shopify-outbound-webhook-worker` PM2 app,
  so deployment adds no PM2 entry.
- **Launch:** the first sync *is* the backfill — Manager creates its board rows from it; the ledger
  starts empty, so launch can never send a delete. No backfill of historical "processed" items.
- **Known at launch:** `Serving Trolleys` returns `category_not_found` until created in Manager
  (handoff §3.1.1) — visible in the ledger, fixed on the Manager side.
- **Standing cross-app rule:** editing `WOOD_GROUPS` (`src/shared/item-properties/wood-groups.ts`)
  or `DRAWER_RANGES` (`drawer-ranges.ts`) requires the same edit in Manager (handoff §6.5). A
  wood-group change also changes identities, so the next sync deletes the old rows in Manager and
  creates new ones. That destroys their assignments — tell Manager's users before such a change.
- **Scripts:** `reconcile-active-sold-items` and `rebuild-location-stock` emit signals like any
  other caller; `restore-scan-history` does not report processed items (Card 7, owner). The
  triggers must not block a script's exit or fail it when Redis is unavailable (HC-4).
- **Cross-app notes:** none open. Both round-1 notes (v2 header, late-completion guard) were
  resolved by the owner's corrected v2 file of 2026-09-19.

---

## 10. Scope ladder

**Must ship**
- New event types + migration; stock lane (§4.1): build-at-send-time, per-target serialization,
  coalescing, deletes derived from ledger vs present identities, explicit zeros for satisfied rules,
  periodic sync, sync on worker start.
- Processed lane (§4.2) at the ScanHistory creation seam.
- Response classification (§7), including the `isRetryableError` fix in the shared worker.
- Delivery log + stock ledger (§5.1–5.2) + the two admin read endpoints (§8).

**Only if cheap**
- `item_placed` deliveries written to the same log.
- A manual "sync now" admin action (the periodic sync already covers it).

**Explicitly deferred / non-goals**
- Any frontend UI for the log (the endpoints are the surface).
- Push notifications/alerts for 401 or `category_not_found` (error logs + ledger only).
- Re-sending any article (contract v2: report each item once; Manager closes early on its side).
- Reporting later location moves or sales of already-registered items (Card 3: creation only).
- Signature/HMAC, timestamps, IP allow-listing (handoff §2: not used).
- Changing the `item_placed` payload or its consumer.
- Encrypting `OutboundWebhookTarget.secret` at rest (pre-existing; out of scope).

---

## 11. Measurement ledger (proposed — ratified with this document)

| ID | Observable outcome — measured true means this shipped | Defect family it guards |
|---|---|---|
| **M1** | After triggers settle, for every identity present in Scanner the last `applied` value at the demand target equals §4.1.2's `demand(identity)` computed from current `LocationStock` (satisfied → `0`). Every identity Manager holds (`live`) that no Scanner location holds has been deleted (`deleted`/`not_found`). No request ever contains two entries with one identity. | Wrong board numbers: per-location entries, stale values, items-vs-units, stale rows left after edit/remove, whole-request 422 from duplicate identities |
| **M2** | No delete is ever sent for an identity that any Scanner location holds at the moment that sync read state. An edit on one location of a shared identity yields a lower sum, never a delete. In a round trip (Teak → Light → Teak) Manager ends holding Teak. | Destructive loss of Manager rows and assignments (handoff v2 §4A.2) |
| **M3** | Stock messages to one target never overlap and are sent delete-before-demand within a sync. A sync reads state when it runs. A trigger during a running sync yields one more sync. A retry never sends an older value, or a delete for an identity present at retry time. | Handoff §6.3 / §4A.2 ordering hazards; lost triggers from queue de-duplication |
| **M4** | Every committed ScanHistory creation (both functions, every production caller and the missed-sales script) with a non-blank `itemBarcode` produces exactly one `items-processed` request whose `article_number` is byte-identical to the stored value. A rolled-back creation, an append to an existing row, and a restore-script creation (Card 7) produce none. A blank barcode produces a `skipped` record and no request. The response's reason is recorded as one of v2 §4.3's four codes. | Items never cleared on Manager; reformatted article numbers; phantom reports that close unfinished Manager work early |
| **M5** | Each response class in §7 lands in its row's status, retry decision and log level. Notably: a timeout is retried; 401 is logged at error level and not retried; 422 is not retried; `category_not_found`, `deleted` and `not_found` are recorded per rule. | Silent drops: the timeout bug, the "every 4xx is done" rule, discarded response bodies |
| **M6** | For any delivery in the retention window, the stored record gives target, time, attempts, final status, the body sent and Manager's answer. The two admin endpoints answer §8's five questions. With Manager unreachable, slow or answering 401/5xx, or Redis unavailable, every Scanner operation that triggers a signal completes exactly as it would without this feature. | Undebuggable integration (owner's traceability requirement); Manager outages breaking scans, order webhooks or stock edits |
| **M7** | With the shipped default configuration and the three targets registered, the periodic sync and the worker-start sync actually run. With no targets registered, no request is sent and no error is logged. With the delete target missing, skipped deletes are recorded. | Unreachable, config-gated features (charter rule 10); a half-configured lane failing silently |

---

## 12. Mechanism invariants already known (for mechanism-inventory to deepen)

- **Identity:** `itemCategory` (exact string) + `propertiesCanonical`. Scanner's normalization
  equals Manager's (§2.2), so one Scanner identity is one Manager identity. The planner must still
  prove no two Scanner identities collapse into one Manager identity (e.g. via `null` vs absent
  keys, or category case variants that Manager's case-insensitive fallback would merge). A
  collapse is now **destructive**: Scanner could see identity A vanish while B (same Manager row)
  is present, and delete the row B depends on.
- **`unitsPerItem`** when the `quantity` criterion is null ("any") or multi-valued → 1 (Card 6);
  inventory to confirm that no live rule has a multi-valued `quantity` today (query dev.db read-only).
- **Per-target serialization + no lost trigger** on BullMQ 5. Known trap: a fixed `jobId` also
  collides with *retained completed* jobs (`removeOnComplete: 100`), which silently drops later
  triggers.
- **Delete derivation** = ledger `live` identities − present identities, computed from the same
  read as the demand payload.
- **Post-commit emission** from inside `prisma.$transaction` in the ScanHistory repository.
- **Response parsing:** results are in request order and one per entry (handoff §3.4, §4.3,
  §4A.3). A mismatch is an anomaly, not a crash, and does not touch the ledger.
- **Fire-and-forget enqueue:** trigger sites never await delivery and never throw.

---

## 12A. Mechanism contracts (mechanism-inventory, round 4 — binding for the implementer)

These contracts settle every item of §12. Where a contract is more precise than an earlier section,
**the contract wins**; each such case is named in "supersedes". Facts below were verified on
2026-09-19 against the working tree, `node_modules/bullmq` 5.73.5, the read-only `prisma/dev.db`
(91 `LocationStock` rows), and Manager's intention MC-3.

### Inventory — ranked by silent-failure risk

| # | Mechanism | If subtly wrong… | Contract |
|---|---|---|---|
| K1 | Delete derivation + ledger | Manager rows **and their assignments** destroyed, or stale rows forever | §12A.3 |
| K2 | Rule identity (grouping key) | Duplicate identity → whole request 422 forever; or a delete hits a rule still in use | §12A.1 |
| K3 | Demand number | Wrong numbers on Manager's board, quietly | §12A.2 |
| K4 | Serialization / no lost trigger | A stale number overwrites a fresh one; a change never reaches Manager | §12A.4 |
| K5 | Signal enablement + Redis isolation | Scripts hang forever; a Redis outage blocks a scan; or a process never signals | §12A.5 |
| K6 | Processed emission after commit | Phantom reports that close Manager work early, or missed reports | §12A.6 |
| K7 | Processed durability (re-drive) | A report lost during a Manager outage, never re-sent | §12A.7 (Card 8) |
| K8 | HTTP + response classification | Timeouts dropped, 401 silent, `category_not_found` invisible | §12A.8 |
| K9 | Delivery log + retention | The owner can't answer "what happened to article X" | §12A.9 |
| K10 | Triggers coverage | Demand drifts until the next periodic sync | §12A.10 |

### 12A.1 Rule identity (K2 → M1, M2)

- **Key:** `identityKey(row) = row.itemCategory + " " + canonicalCriteriaString(row.properties)`,
  using the existing `canonicalCriteriaString` (`src/modules/stock/domain/property-criteria.ts:57`)
  on the **parsed `properties` object that will be sent**, not the stored `propertiesCanonical`
  column. Grouping by what is sent makes a duplicate identity inside one request impossible by
  construction. (Verified: all 91 rows have `json(properties) == propertiesCanonical` today.)
- **Why it is 1:1 with Manager's identity (no collapse):**
  - `itemCategory` is validated against the fixed `ITEM_CATEGORIES` list
    (`src/shared/category/item-categories.ts:12`, `stock.contract.ts:76,144`), so there are no case variants.
  - Property values are validated against the option lists and normalized by `normalizeCriteria`
    (trim → lowercase → dedupe → sort), which Manager's MC-3 mirrors.
  - Manager keeps `null` as a wildcard distinct from an absent key, and never rewrites keys.
  - Live example: `Sofas {"wood_type": null}` is its own identity on both sides.
- **Payload `properties`:** the row's parsed `properties` object as stored (normalized
  `StockCriteria`, `null` values kept). Never re-shaped, never with keys dropped.
- **`itemCategory` payload:** the stored string, unchanged.
- **Determinism:** entries in every demand/delete request are sorted by `identityKey` ascending
  (plain `<` string comparison), so two runs on the same state send byte-identical bodies.

### 12A.2 Demand number (K3 → M1)

Pure function `computeStockDemand(rows: LocationStock[]) → DemandEntry[]` over
`locationStockRepository.listByShop(shopId)` (`location-stock.repository.ts:340`, includes thresholds).

```
restockTarget(row)  = max over row.thresholds of thresholdQuantity; 0 if the row has no thresholds
missingItems(row)   = max(0, restockTarget(row) − row.instanceCount)
unitsPerItem(row)   = q  if row.properties.quantity is an array of exactly one string
                          matching /^[1-9][0-9]*$/ (then q = Number(that string));
                      1  otherwise (key absent, null wildcard, several values, anything else)
demand(identity)    = Σ over rows in the identity of missingItems(row) × unitsPerItem(row)
```

- **One source for `missingItems`:** extract `restockTarget` into the stock domain (e.g.
  `src/modules/stock/domain/restock.ts`). `get-stock-report.query.ts` then computes
  `unitsToRestockTarget` from it too, so the Scanner screen and Manager's board can't diverge.
  The report's output must stay byte-identical; `scripts/verify-stock-report.ts` must still pass.
- Integers only; `quantityRequested` is always an integer ≥ 0.
- Location patterns (`LC%`) are ordinary rows: they are included and summed like any other.
- Multi-valued `quantity` **can no longer be saved** (§12A.11, owner round 5); no live rule has one
  (all 32 quantity rules are single-valued `1/2/4/6/8`). The "→ 1" branch stays only as a defence
  against rows written outside the API: when one is seen, log `warn` once per sync naming the
  identity. A `null` set size can no longer be saved either (Card 9, owner round 6); the same
  defensive `→ 1` + `warn` applies if one is ever found.
- Worked fixture the tests must include: identity "Dining Chairs `{quantity:["4"], upholstery:["down"],
  wood_group:["teak"]}`" at LC10 (thresholds 2/4/5, instanceCount 3) and at LC11 (thresholds 1/2,
  instanceCount 2) → `quantityRequested: 8`.

### 12A.3 Stock ledger and delete derivation (K1 → M1, M2, M3) — supersedes §5.1

Table `ManagerStockLedger`, keyed **per shop** (not per target — see "targets" below):

| Field | Type | Rule |
|---|---|---|
| `id` | cuid | |
| `shopId` | FK Shop, cascade | |
| `itemCategory` | String | identity part 1 |
| `propertiesCanonical` | String | identity part 2 = `canonicalCriteriaString(properties)` |
| `properties` | Json | the object last sent (needed to send a delete once the rule is gone) |
| `state` | enum `ManagerStockLedgerState { active, deleted }` | see transitions |
| `lastSentQuantity` | Int? | |
| `lastAppliedQuantity` | Int? | written only from an `applied` outcome |
| `lastOutcome` | String? | Manager's last per-entry outcome verbatim |
| `lastSentAt` | DateTime? | |
| `lastDeliveryId` | String? | the `OutboundWebhookDelivery.id` of the last request that carried it |
| `createdAt`, `updatedAt` | DateTime | |

`@@unique([shopId, itemCategory, propertiesCanonical])`.

**Transitions (complete):**

| Event | Before | After |
|---|---|---|
| Identity is present and about to be sent in a demand request (**written before the HTTP call**) | none / `active` / `deleted` | `active`, `lastSentQuantity`, `lastSentAt`, `lastDeliveryId` |
| Demand 200, entry outcome `applied` | `active` | `active`, `lastAppliedQuantity = sent value`, `lastOutcome = applied` |
| Demand 200, entry outcome `category_not_found` | `active` | `active`, `lastOutcome = category_not_found` |
| Delete 200, entry outcome `deleted` / `not_found` / `category_not_found` | `active` | `deleted`, `lastOutcome = <outcome>` |
| Any non-200, unparseable 200, or transport error | any | **unchanged** |

**Why the row is written before sending:** if Manager applies a demand but Scanner fails to record
the answer (crash, SQLite busy), the identity is still known. When it later vanishes it still gets
deleted. A delete for a row Manager never created answers `not_found`, which is harmless.

**Delete candidates (computed in the same sync, from the same `listByShop` read as the demand):**
ledger rows with `shopId = S`, `state = active`, whose identity is **not** in the present set.
This one rule enforces three guarantees:
- **Handoff §4A.2 rule 1:** a shared identity is still present while any location holds it.
- **The send-time re-check:** the list is derived when the job runs, not when the edit happened.
- **Card 5's automatic retry:** the row stays `active` until Manager answers.

**Targets:** the stock lane needs **at most one** active `stock_demand` and **at most one** active
`stock_demand_deleted` target for the shop.

| Active targets | Behaviour |
|---|---|
| 0 demand targets | sync is a no-op; nothing is written or logged beyond `debug` |
| > 1 of either type | sync writes one `skipped` delivery (`lastError = ambiguous_targets`), logs `error`, sends nothing |
| demand target, no delete target | deletes are not sent: one `skipped` delivery per sync (`lastError = no_delete_target`, `requestBody` = the deletes it would have sent); demand is still sent |

### 12A.4 The stock sync job and serialization (K4 → M3)

**Queue:** new BullMQ queue `manager-stock-sync` (prefix `iss`, as the existing queues).
**Worker:** consumed inside `src/workers/outbound-webhook-worker.ts`, `concurrency: 1`.
**Job data:** `{ shopId }` only.

**Every** enqueue (trigger, worker start, periodic) uses exactly these options:

```ts
queue.add("stock-sync", { shopId }, {
  deduplication: { id: `stock-sync:${shopId}`, keepLastIfActive: true }, // no ttl
  attempts: 4,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 200,
});
```

Verified semantics in the installed BullMQ (`dist/esm/commands/includes/deduplicateJobWithoutReplace.lua`,
`storeDeduplicatedNextJob.lua`, `moveToFinished-14.lua`):

| When a trigger arrives, the existing job for that shop is… | What BullMQ does | Why that is correct |
|---|---|---|
| none | a job is created | — |
| waiting, or delayed between retries | the add is ignored | that job hasn't read state yet; it will read the newer state |
| active | the add is stored and turned into **one** new job when the active one finishes | nothing lost, never parallel, at most 1 active + 1 waiting |

The key is released only when the job finishes (completes or fails for good). **Do not** use a
fixed `jobId`: it would collide with retained completed jobs and silently drop later triggers.

**One sync run (`runStockSync(shopId, deps)`), in this order:**
1. Resolve targets (§12A.3 table); stop per that table if needed.
2. `rows = listByShop(shopId)`; `entries = computeStockDemand(rows)`; `present = set of identityKey`.
3. `deletes = ledger rows (active, not in present)`, sorted by key.
4. If `deletes` is non-empty and a delete target exists:
   - POST them (body `[{itemCategory, properties}]`);
   - classify (§12A.8);
   - **write the ledger transitions for the delete before continuing**;
   - on a retryable failure, write the delivery row and **throw** (BullMQ retries the whole run,
     which re-reads state).
5. If `entries` is non-empty:
   - pre-write the ledger rows (§12A.3);
   - POST demand;
   - classify;
   - write the ledger transitions;
   - on a retryable failure, write the delivery row and throw.
6. **Empty arrays are never sent** (Manager answers 422 to `[]`).
7. A non-retryable answer to the delete request (401, 422, other 4xx, unparseable 200) is recorded
   and the run **continues to step 5**. The next sync re-derives the delete.

**Supersedes** §7's sentence "a delete that ends failed/rejected does not block the demand
request": a *retryable* delete failure retries the whole run (demand waits, as handoff §4A.2
requires); only a *final* non-retryable answer lets demand proceed.

**Periodic + start:** the outbound worker, on start and then every `MANAGER_SYNC_INTERVAL_MS`
(default `900000`), enqueues a stock sync for every shop that has an active `stock_demand` target.
It uses a plain `setInterval` in that single worker process — not a BullMQ job scheduler — and
the same `queue.add` options.

### 12A.5 Signal enablement and Redis isolation (K5 → M6, M7)

New module `src/modules/outbound-webhook/manager/manager-signals.ts` exporting
`enableManagerSignals()`, `closeManagerSignals()`, `signalStockChanged(shopId)` and
`signalItemProcessed(input)`.

- **Nothing connects to Redis at import time.** The module owns its own ioredis connection, created
  lazily on the first signal after `enableManagerSignals()`, with `enableOfflineQueue: false` and
  `maxRetriesPerRequest: 1`. When Redis is down, `queue.add` rejects immediately instead of hanging.
  It **must not** reuse `src/shared/queue/redis-connection.ts` (`maxRetriesPerRequest: null`, which
  queues commands forever).
- **Signals are enabled per process.** Before `enableManagerSignals()` every signal function is a
  silent no-op: nothing is written, no Redis connection is made, and nothing is logged above
  `debug`. Called at startup in:
  - `src/server.ts`;
  - `src/workers/webhook-worker.ts`, which runs the orders/create, orders/paid and products/update
    jobs;
  - `src/workers/outbound-webhook-worker.ts`, for its own periodic enqueues;
  - `scripts/reconcile-active-sold-items.ts` only, which must call `closeManagerSignals()` in a
    `finally` before exiting.

  Each enabling process logs `info "Manager signals enabled"` once.
- **Consequences:**
  - `restore-scan-history`, `rebuild-location-stock` and every `verify-*` script never enable
    signals. They make no Redis connection, still exit on their own, and restore never reports
    (**Card 7 is satisfied by construction**, no per-call flag).
  - After a rebuild, Manager is corrected by the next periodic sync.
- **Never throws, never awaited by the caller:** trigger sites call `void signalX(...)`. Every signal
  function catches everything internally and logs `error` with `shopId` and the reason.

### 12A.6 Processed emission (K6 → M4)

- In `scanHistoryRepository.appendLocationEvent` and `appendSoldTerminalEventWithFallback`, set a
  local `createdRecord` (the object returned by `tx.scanHistory.create`) inside the transaction.
  **After** `await prisma.$transaction(...)` resolves, if `createdRecord` is set, call
  `void signalItemProcessed({ shopId, scanHistoryId: createdRecord.id, itemBarcode:
  createdRecord.itemBarcode })`.
  - A rolled-back transaction never reaches that line.
  - The append branch never sets `createdRecord`.
  - Return values and signatures are unchanged.
- `signalItemProcessed`:
  1. load active `items_processed` targets for the shop; if there are none, return;
  2. for each target, write one `OutboundWebhookDelivery`:
     - `itemBarcode` null, or blank after `trim()` → status `skipped`, `lastError =
       no_article_number`, `subjectKey = null`, nothing enqueued;
     - otherwise → status `pending`, `subjectKey = itemBarcode` **as stored (not trimmed)**,
       `requestBody = JSON.stringify([{ article_number: itemBarcode }])`;
  3. enqueue each `pending` delivery on the new queue `manager-items-processed` with
     `jobId = delivery.id`, `attempts: 6`, `backoff: exponential 5 000`, `removeOnComplete: true`,
     `removeOnFail: true`.
- Worker (`concurrency: 5`, same process): load the delivery and its target; stop if the delivery
  is no longer `pending`/`failed`; POST the stored `requestBody` **byte-for-byte**; classify
  (§12A.8); update the row (`attempts++`, status, response). One article per request, always.
- M4 is measured on the stored row: `JSON.parse(requestBody)[0].article_number === ScanHistory.itemBarcode`
  (strict equality, the `"04 2 001 0034"` fixture included).

### 12A.7 Processed re-drive (K7 → M4) — Card 8 answered "yes, both" (owner, round 5)

Binding. In the worker's periodic tick, re-add
(same `jobId = delivery.id`, same options) up to **200** `items_processed` deliveries, oldest
first, where:

| Condition | Why |
|---|---|
| `status = pending` and `createdAt` older than 5 min | never reached the queue — Redis was down at trigger time |
| `status = failed` and `createdAt` within 7 days | 5xx / timeout retries exhausted |
| `status = rejected`, `responseStatus = 401` and `createdAt` within 7 days | Card 8, second part: the key was wrong and may since have been fixed (while it is still wrong, each tick re-sends at most 200 and they are refused again — bounded noise, accepted) |

Manager's endpoint is idempotent (a replay after success reads `no_open_assignment`), so re-drive
can never close anything twice. It is still one report per item; the re-drive only repeats a
report that never got a final answer.

### 12A.8 HTTP and response classification (K8 → M5) — refines §7

- One shared helper `postJson(url, secret, body)`:
  - `fetch` POST with headers `Content-Type: application/json` and `x-api-key: <secret>`;
  - `signal: AbortSignal.timeout(8_000)`;
  - reads the response as text.
- Shared `isRetryableError(error)`: exactly the handoff §6.6 function (checks `error.name`
  `TimeoutError`/`AbortError`, then the message substrings). It **replaces** the one in
  `outbound-webhook-worker.ts`, so `item_placed` gets the fix too.
- Response schemas (zod), checked on the whole body; the result count must equal the entry count;
  any mismatch → "unparseable":

| Request | `data.results[i]` |
|---|---|
| demand | `{ outcome: "applied" \| "category_not_found" }` (echo fields ignored) |
| delete | `{ outcome: "deleted" \| "not_found" \| "category_not_found" }` |
| processed | `{ outcome: "resolved", reason: null \| "early" }` or `{ outcome: "ignored", reason: "item_not_found" \| "no_open_assignment" }` |

- Classification (complete):

| Observation | Delivery `status` | Ledger | Retry | Log |
|---|---|---|---|---|
| 2xx, body matches schema | `delivered` | transitions of §12A.3 | — | `info`; each `category_not_found` → `error` naming the identity |
| 2xx, body does not match | `delivered`, `lastError = unparseable_response` | unchanged | no | `error` |
| 401 | `rejected` | unchanged | no | `error` "Manager rejected the API key" |
| 422 | `rejected` | unchanged | no | `error` "sender bug" + Manager's `error` text |
| other 4xx | `rejected` | unchanged | no | `warn` |
| 5xx | `failed` (final) / stays `pending` (retrying) | unchanged | yes | `warn`, `error` on final |
| thrown, `isRetryableError` true | same as 5xx | unchanged | yes | same |
| thrown, `isRetryableError` false | `failed`, `lastError` = name + message | unchanged | no | `error` |

- "Final" for a stock sync = BullMQ attempts exhausted. On a thrown retryable error the run marks
  that request's delivery row `failed` before throwing (each stock request gets its own row; see
  §12A.9).

### 12A.9 Delivery log, endpoints, retention (K9 → M6) — supersedes §5.2 details

- Prisma `enum OutboundDeliveryStatus { pending delivered rejected failed skipped }` and model
  `OutboundWebhookDelivery`:

| Field | Type |
|---|---|
| `id` | cuid |
| `shopId` | FK Shop, cascade |
| `targetId` | String?; plain column, no FK — the log outlives deleted targets |
| `eventType` | `OutboundEventType` |
| `subjectKey` | String? |
| `status` | `OutboundDeliveryStatus` |
| `attempts` | Int, default 0 |
| `requestBody` | String |
| `responseStatus` | Int? |
| `responseBody` | String?; first 16 384 characters |
| `lastError` | String? |
| `createdAt` | DateTime |
| `lastAttemptAt` | DateTime? |
| `completedAt` | DateTime? |

  Indexes: `(shopId, eventType, createdAt)`, `(shopId, subjectKey)`, `(status, createdAt)`.
  **Never stores the secret.**
- **Granularity:** a processed delivery = one row per (report, target), `attempts` counting its
  tries. A stock-sync request = **one row per HTTP request sent** (a retried run writes new rows,
  because its body is rebuilt from fresh state). Skipped decisions are rows too.
- **Endpoints** (on `outboundWebhookRouter`, i.e. `/api/outbound-webhooks/...`, admin + shop link
  already enforced; register them **before** the `/:id` routes):
  - `GET /deliveries?eventType=&status=&subject=&since=&limit=`
    - `limit` 1–200, default 50;
    - `since` is ISO-8601;
    - `subject` is an exact match on `subjectKey`;
    - ordered `createdAt desc`;
    - returns every field above.
  - `GET /manager-stock?state=&outcome=` → the shop's ledger rows, ordered by `itemCategory`, then
    `propertiesCanonical`.
- **Retention:** on each periodic tick, delete deliveries with `createdAt` older than
  `OUTBOUND_DELIVERY_RETENTION_DAYS` (default 30). Ledger rows are never pruned.
- Scope ladder item "`item_placed` into the log" stays only-if-cheap; the `item_placed` payload,
  queue and consumer are otherwise untouched.

### 12A.10 Stock triggers (K10 → M1, M3)

`void signalStockChanged(shopId)` is called at exactly these points, after the underlying write has
committed:

| Site | When |
|---|---|
| `applyItemStockChange` (`apply-item-stock-change.service.ts:262`) | before returning, when the result is `{ changed: true }` (covers all 4 production callers) |
| `createLocationStocksCommand` | end, after the loop that restores user attribution |
| `updateLocationStockCommand` | end, before `return result` (**covers thresholds-only edits**, which don't reconcile) |
| `deleteLocationStockCommand` | end, after `reconcileCategory` |
| outbound worker | on start and every `MANAGER_SYNC_INTERVAL_MS` (§12A.4) |

Not signalled (healed by the periodic sync): `scripts/rebuild-location-stock.ts`, direct DB edits.

### 12A.11 One set size per rule (owner, round 5 → M1)

- `validateStockCriteria` (`src/modules/stock/contracts/stock.contract.ts:72`) refuses a
  normalized criteria whose `quantity` key is present and is either **`null`** ("any set size",
  Card 9) or a list of **more than one value**. It throws
  `ValidationError("A stock definition can use only one set size")` → HTTP 400; nothing is saved.
  Create and update both pass through this function, so both are covered.
- Still allowed: no `quantity` key at all (a rule that doesn't mention set size, which counts 1
  per item), or exactly one value.
- The check runs after `normalizeCriteria`, so `"4"`, `["4"]` and `[" 4 ", "4"]` are all one value
  and are accepted.
- Scope: `quantity` only (the set size of chair categories). `extension_quantity` and every other
  key keep accepting several values and `null`.
- Existing rows: none violate this today (dev.db verified — no `quantity: null`, no multi-valued
  `quantity`). No data migration. Re-verify with a read-only query of production before deploy.
- Frontend: the rule editor still offers several set sizes (and "Any value"). Until it is changed,
  a user who picks them gets the server's error message. Changing the editor is **not** part of the
  Codex brief.

---

## 13. Pre-implementation protocol

1. ~~Owner answers Card 7 and approves the ratification surface~~ — done, RATIFIED 2026-09-19
   (changelog round 3).
2. ~~mechanism-inventory on §12~~ — done in-document, §12A (round 4).
3. ~~implementation-planner~~ — **waived by the owner (2026-09-19):** this document is handed to
   Codex as the single implementation source; §13A is its brief.
4. Before the first live sync: confirm the Manager receiver is deployed with all three endpoints
   and still on handoff v2.

---

## 13A. Implementation brief for Codex (single-document handoff)

**You implement this whole document.** Authority order when two passages differ:
1. §12A contracts;
2. §4–§11;
3. the Manager handoff `manager_handoffs/STOCK_REPORT_WEBHOOKS_v2_20260919.md` for anything on
   the wire.

If something you need is decided nowhere, **stop and report** rather than choosing. Don't edit
this document.

### Read first
§1, §3, §4, §12A (all), then handoff v2 §3–§6. Work in `apps/backend`.

### Do not touch
- `LocationStock`/threshold write logic, allocation, reconciliation semantics — **except** the one
  validation rule of §12A.11 in `validateStockCriteria`;
- ScanHistory write logic beyond the post-commit hook of §12A.6;
- the `item_placed` payload and producer;
- the frontend;
- `prisma/dev.db` (real data; read-only);
- anything under `docs/` other than what this brief asks for.

### File map

| File | Change |
|---|---|
| `prisma/schema.prisma` + new migration | `OutboundEventType` += `stock_demand`, `stock_demand_deleted`, `items_processed`; new enums `OutboundDeliveryStatus`, `ManagerStockLedgerState`; models `OutboundWebhookDelivery` (§12A.9), `ManagerStockLedger` (§12A.3); back-relations on `Shop` |
| `src/modules/outbound-webhook/contracts/outbound-webhook.contract.ts` | `OUTBOUND_EVENT_TYPES` += the three types; delivery/ledger DTOs; zod schemas for Manager responses (§12A.8) and endpoint query params |
| `src/modules/outbound-webhook/manager/` (new) | `manager-signals.ts` (§12A.5, §12A.6 producer) · `manager-http.ts` (`postJson`, `isRetryableError`, classification) · `stock-sync.service.ts` (`runStockSync`, §12A.4) · `items-processed.service.ts` (worker handler §12A.6, re-drive selection §12A.7) · `manager-queues.ts` (lazy connection + the two queues + enqueue helpers with the exact options) |
| `src/modules/outbound-webhook/repositories/` | `outbound-delivery.repository.ts`, `manager-stock-ledger.repository.ts` |
| `src/modules/outbound-webhook/{queries,controllers,routes}` | the two GET endpoints (§12A.9) |
| `src/modules/stock/domain/restock.ts` (new) + `domain/stock-demand.ts` (new) | `restockTarget`, `missingItems`, `unitsPerItem`, `identityKey`, `computeStockDemand` (pure) |
| `src/modules/stock/queries/get-stock-report.query.ts` | use `restockTarget` from the domain; output unchanged |
| `src/modules/stock/contracts/stock.contract.ts` | §12A.11: `validateStockCriteria` refuses a `quantity` that is `null` or holds several values |
| `src/modules/stock/services/apply-item-stock-change.service.ts`, `commands/{create,update,delete}-location-stock*.command.ts` | stock triggers (§12A.10) |
| `src/modules/scanner/repositories/scan-history.repository.ts` | post-commit `signalItemProcessed` (§12A.6) |
| `src/server.ts`, `src/workers/webhook-worker.ts` | `enableManagerSignals()` at startup |
| `src/workers/outbound-webhook-worker.ts` | shared `isRetryableError`; `enableManagerSignals()`; two new `Worker`s (`manager-stock-sync` concurrency 1, `manager-items-processed` concurrency 5); start + interval tick (sync enqueue, processed re-drive §12A.7, retention prune); close all on shutdown |
| `src/config/env.ts` | `MANAGER_SYNC_INTERVAL_MS` (default 900000), `OUTBOUND_DELIVERY_RETENTION_DAYS` (default 30) |
| `scripts/reconcile-active-sold-items.ts` | `enableManagerSignals()` at start, `closeManagerSignals()` in `finally` |
| `scripts/verify-manager-signals.ts` (new) + `scripts/verify-all.ts` `EXPECTED_SCRIPTS` | the verification below |

### Build order
Each step leaves `npm run typecheck` at 0 errors.
1. Schema + migration + contract types.
2. Pure domain (`restock`, `stock-demand`), then refactor the report query onto it.
3. `manager-http`, then the repositories.
4. `runStockSync` and the processed handler, written against an injected `post` function so tests
   can drive them without BullMQ.
5. Queues + `manager-signals` + the worker wiring.
6. Trigger sites and the ScanHistory hook.
7. Endpoints.
8. Verification script.

### Verification (`scripts/verify-manager-signals.ts`)

**Environment and style:**
- Copy the existing verify scripts' conventions: the `REFUSED` guard with exit code 3 against
  `prisma/dev.db` (`scripts/verify-stock-reconciliation.ts:8-25`) and `PASS`/`FAIL` lines per check.
- Run on a scratch copy: `sqlite3 prisma/dev.db ".backup '<scratch>/verify.db'"`, then
  `DATABASE_URL=file:<scratch>/verify.db`.
- Create a temporary `Shop` + targets and delete them in `finally`.

**Stub and harness:**
- Manager is a local `node:http` stub started by the script. Per request it can: answer a given
  status + body, answer the handoff's documented 200 bodies computed from the request, or never
  answer. It records every request (path, `x-api-key`, body).
- **Never a live Manager.**
- Checks 12–13 need Redis (`REDIS_URL`). If it is unreachable, those checks print `FAIL
  redis-unreachable`; they never pass silently.

Each check is one line in the output and names the M it serves. Checks are stated as observable
outcomes: HTTP requests the stub received, rows in the DB, and the return values of
`computeStockDemand` / endpoints.

| # | Check | M |
|---|---|---|
| 1 | Worked fixture of §12A.2 → one entry, `quantityRequested: 8`; `missingItems` equals the report query's `unitsToRestockTarget` for every fixture row | M1 |
| 2 | `unitsPerItem`: `["4"]`→4, absent→1, `null`→1, `["4","6"]`→1, `["0"]`→1, `["04"]`→1 | M1 |
| 3 | Two locations sharing an identity → one entry (summed); requests never contain a duplicate `identityKey`; entries sorted | M1 |
| 4 | Satisfied rule → entry with `0` sent (not omitted) | M1 |
| 5 | Rule removed while another location still holds its identity → **no delete**, lower sum sent | M2 |
| 6 | Rule removed / criteria edited with no other holder → delete request precedes the demand request; ledger row → `deleted` after `deleted` answer | M1, M2 |
| 7 | Teak → Light → Teak before a sync runs → no delete sent; Teak present in demand | M2 |
| 8 | Delete answered 503 twice then 200 → whole run retried; demand sent only after the delete's 200; delete re-derived by the next run if attempts exhaust | M3 |
| 9 | Delete answered 401 → demand still sent in the same run; ledger row stays `active`; next run sends the delete again (Card 5) | M2, M5 |
| 10 | Empty present set and empty ledger → stub receives nothing | M1 |
| 11 | Missing delete target → `skipped` row `no_delete_target`, demand sent; two active demand targets → `skipped` `ambiguous_targets`, stub receives nothing | M7 |
| 12 | (Redis) five triggers while one sync is active → exactly one further run; no two runs overlap (stub records non-overlapping request windows) | M3 |
| 13 | (Redis) stub never answers → the job is retried (attempt count > 1), not completed; same for `item_placed`'s worker path via the shared `isRetryableError` | M5 |
| 14 | ScanHistory created via `appendLocationEvent` with barcode `"04 2 001 0034"` → one delivery whose body's `article_number` is strictly equal to the stored value; a second append to the same product → no new delivery | M4 |
| 15 | Creation via `appendSoldTerminalEventWithFallback` → one delivery; a forced rollback (throw inside the transaction path) → none; blank barcode → `skipped` `no_article_number`, stub receives nothing | M4 |
| 16 | Signals not enabled (script context) → no delivery rows, no Redis connection, the script process exits by itself | M6, M7 |
| 17 | Response classes: 401, 422, 418, 500, unparseable 200, results-count mismatch → status/ledger/retry exactly per §12A.8 table; processed reasons `early`/`null`/`item_not_found`/`no_open_assignment` stored verbatim | M5 |
| 18 | Stub down (connection refused) and Redis stopped → `updateItemLocationCommand` / stock update command return the same result as with signalling disabled | M6 |
| 19 | Endpoints: `/deliveries?subject=04 2 001 0034` returns check 14's row; `/manager-stock?outcome=category_not_found` returns a `Serving Trolleys` identity; no field contains the secret | M6 |
| 20 | No active targets → no request, no delivery row, no log above `debug` | M7 |
| 21 | Re-drive: a `failed` delivery (stub answered 500 until attempts ran out) and a `rejected` 401 delivery are both re-sent by the next tick once the stub answers 200 → both `delivered`; a `delivered` row and one older than 7 days are not re-sent; at most 200 per tick | M4 |
| 22 | Saving a Dining Chairs rule with `quantity: ["4","6"]` via create **and** via update → 400 with the §12A.11 message, nothing written; `quantity: ["4"]` saves; `quantity: null` → 400 via create and update; a rule with no `quantity` key saves; `extension_quantity` with several values or `null` still saves | M1 |

**Planted-defect probes** (run each, confirm the named check goes red, revert from a byte copy,
confirm `git diff` is clean):
- delete candidates computed without excluding present identities → checks 5, 7 red;
- `instanceCount` swapped for `quantity` in `missingItems` → check 1 red;
- `keepLastIfActive` removed → check 12 red;
- old message-based `isRetryableError` restored → check 13 red;
- signal moved inside the transaction callback → check 15 (rollback) red.

### Done means
- `npm run typecheck` 0 errors;
- `npx tsx scripts/verify-all.ts` prints `SUMMARY PASS` including the new script, with the existing
  scripts still passing;
- the five probes each shown red and reverted;
- a short handoff note at
  `docs/under_development/comunicate_stock_report_to_manager_app/handoffs/codex_implementation.md`
  listing:
  - files changed;
  - check results;
  - probe results;
  - anything you stopped on.

---

## 14. Open decisions ledger

| # | Decision | State | Blocks |
|---|---|---|---|
| 1 | Wire model for create / modify / delete | Resolved — owner, round 1 (v2 delete endpoint) | — |
| 2 | Missing number unit | Resolved — units (owner, round 1) | — |
| 2b | Exact units formula | Resolved — missing items × set size (owner, round 2, Card 6) | — |
| 3 | Processed trigger scope | Resolved — creation only (owner, round 1) | — |
| 4 | Traceability surface | Resolved — log + endpoint (owner, round 1) | — |
| 5 | Parallel lane vs extend worker | Resolved (R3, R12) | — |
| 6 | Periodic interval, debounce, retention defaults | Resolved (R6); owner may override | — |
| 7 | Automatic re-derivation of failed deletes | Resolved — automatic (owner, round 2, Card 5) | — |
| 8 | Does the restore script report processed items? | Resolved — no (owner, round 3, Card 7) | — |
| 9 | Re-send failed processed reports (outage / wrong key) | Resolved — yes, both (owner, round 5, Card 8) | — |
| 10 | Rules with several set sizes | Resolved — refused on save (owner, round 5) | — |
| 11 | Rules with "any" set size (`null`) | Resolved — refused on save (owner, round 6, Card 9) | — |

---

## 15. Shaping changelog

**Round 0 — 2026-09-19, Claude Opus 5 (initial grounded shaping)**
- R1 The owner's model (delete old version, create new, separate quantity endpoint) cannot be built
  against handoff v1, which has one absolute demand endpoint and no delete. Mapped onto it (§3) and
  sent to the owner as Card 1 rather than decided silently.
- R2 Unit conflict found: Scanner thresholds are item-based (P7), Manager's board is unit-based
  (Manager intention HC-2a). Card 2 with a conversion that keeps the contract unchanged.
- R3 Family: stay inside the outbound-webhook family (targets, admin API, worker process) but give
  the Manager signals their own queue and handlers. Reason: the existing worker's shared queue runs
  5 jobs at once and freezes payloads at enqueue, both forbidden for demand (HC-3); extending it with
  per-event handlers would still share that concurrency. The timeout fix goes into the shared code
  so `item_placed` benefits.
- R4 `items_processed` is a new event type, not a reshaped `item_placed` (that payload has another
  consumer).
- R5 Thresholds-only updates do not reconcile today; listed explicitly as a demand trigger (§4.1.1).
- R6 Defaults chosen (repo-derivable, owner may override): periodic full push every 15 min,
  short coalescing debounce, 30-day delivery-log retention, 8 s client timeout kept.
- R7 Processed deliveries are one article per request so the log is queryable by article (SQLite
  JSON is not queryable through Prisma).
- R8 Emission happens for script callers too; accepted because Manager's endpoint is idempotent —
  recorded so it is not rediscovered as a surprise.
- R9 Traceability: the current system does not provide it (§8); proposed log + ledger, Card 4.

**Round 1 — 2026-09-19, owner David answers Cards 1–4; Claude Opus 5 folds them**
- R10 Card 1: the owner added a delete endpoint on the Manager side, published in handoff v2
  (`stock-demand-deleted`, §4A). Authority line moved to v2. Retired rules are now **deleted**, not
  zeroed; the round-0 "retire with 0" ledger behaviour is removed. Satisfied rules still send `0`.
- R11 v2 §4A.2 constraints adopted as HC-2a / HC-3: delete only when no location holds the
  identity, re-checked at send time; demand and delete share one ordered lane per shop.
- R12 Design choice (mine, repo-derivable): deletes are derived at send time as "ledger `live` −
  present identities" inside the same serialized sync job, delete-before-demand. This implements
  the owner's "send the old version as a delete, then the new one" while making the handoff's
  send-time re-check inherent. It also avoids carrying the old identity in a frozen queued message.
  The consequence, that a failed delete is re-derived automatically, is destructive enough to go
  to the owner: Card 5.
- R13 Card 2: units. The owner's rationale ("we store the unit value too") refers to
  `LocationStock.quantity`, which is units *held*; the thresholds and the report's gap are in items
  (verified: `StockReportPdf.tsx:306` labels the gap "Missing items" in units mode). The formula
  keeps missing-items × set size; confirmation sent as Card 6 rather than assumed.
- R14 Card 3: creation only. The round-0 "extend to location events" branches removed from §4.2 and
  M4. Owner states Manager guards late completion; the published v2 contract does not yet say so —
  recorded as a cross-app note (§9), no Scanner-side re-send.
- R15 Card 4: log + admin endpoint → must-ship; the ledger endpoint gains a `state` filter for
  deleted rows.
- R16 Measurement ledger restructured for deletes: new M2 (delete safety); ordering moved to M3;
  processed → M4; classification → M5; traceability and isolation merged into M6 to stay at seven.
- R17 New event type `stock_demand_deleted`; a missing delete target is recorded, not silent (§5.3).
- R18 Wood-group / drawer-range edits now also cause deletes in Manager (identities change). Added
  to the standing cross-app rule (§9).

**Round 2 — 2026-09-19, owner David answers Cards 5–6 and corrects handoff v2; Claude Opus 5 folds**
- R19 Card 5: automatic. A failed delete is re-derived by every later sync; the edit-time-only
  alternative text removed from §4.1.3.
- R20 Card 6: yes. §4.1.2's formula (missing items × single `quantity` criterion value, else 1) is
  final.
- R21 Authority moved to `STOCK_REPORT_WEBHOOKS_v2_20260919.md`. The earlier
  `…v2_20260918.md` no longer exists in the folder; the corrected file carries a proper v2 header
  and a what-changed table. Both round-1 cross-app notes are closed (§9).
- R22 Contract v2 §4.2–4.3: `not_awaiting` is gone. A report for an unfinished Manager task now
  closes it early (`resolved`/`early`); report each item once. §4.2 now records the four closed
  codes, and M4 checks them.
- R23 Consequence of R22 found while folding: round-0 R8 ("scripts emit too; harmless because
  idempotent") is no longer harmless. A report is now an action that can close unfinished Manager
  work. `restore-scan-history` re-creates rows for items that are not new, so it would close
  in-progress repairs. Proposed: the restore script does not report; `reconcile-active-sold-items`
  (real missed sales) still does. Sent as Card 7, not decided silently. R8 stands corrected by
  this entry.

**Round 3 — 2026-09-19, RATIFIED by owner David**
- R24 Card 7: the recommendation is adopted — `restore-scan-history` does not report processed
  items; `reconcile-active-sold-items` does. §4.2, §9 and M4 already stated it; "proposed" wording
  removed.
- R25 **RATIFIED.** Owner David, 2026-09-19, in chat, replying "the recommendation is correct" to
  Card 7 and "the intention is approved". Ratification surface presented (round 2's closing
  message): (1) intended outcome — Scanner keeps Manager's board matching its stock report through
  demand (missing units summed across locations, 0 when satisfied) and guarded, serialized deletes,
  reports each newly registered item once, and stores every message with Manager's answer,
  queryable by article and rule; (2) measurement ledger M1–M7 as in §11; (3) scope — the three
  webhooks, delivery log, per-rule stock ledger, two admin read endpoints, the timeout-retry fix;
  non-goals: log UI, alerts, re-sends, `item_placed` changes; (4) open decision: Card 7, answered
  above. Status header moved COLLABORATING → RATIFIED. Any later material semantic change re-opens
  the gate.

**Round 4 — 2026-09-19, mechanism inventory folded in-document (Claude Opus 5)**

Owner direction: hand this single document to Codex; the planner/projection/review pipeline is
waived. Result: §12A (contracts K1–K10) and §13A (Codex brief).

*Evidence gathered:*
- `bullmq` 5.73.5 implements `deduplication.keepLastIfActive` (Lua sources cited in §12A.4).
- dev.db (read-only): 91 rules, no multi-valued `quantity`, one `null` wildcard rule, zero
  `properties`/`propertiesCanonical` drift.
- `ITEM_CATEGORIES` is a fixed list, so there are no case variants.
- Manager MC-3 keeps `null` and never normalizes keys.
- The ScanHistory repository and stock services import no Redis module today.
- Scripts rely on natural exit (`process.exitCode`), so a module-level Redis connection would hang them.
- Orders and products handlers run in `webhook-worker`.

*Decisions:*
- R26 Identity key is computed from the `properties` object actually sent, so a duplicate
  identity within one request is impossible by construction (§12A.1).
- R27 The ledger is keyed per shop, not per target (supersedes §5.1's `targetId`), with a
  "≤ 1 active target per stock event type" rule and visible `skipped` rows otherwise. Reason:
  deletes and demand go to two different targets, so a per-target ledger has no single owner.
- R28 Ledger rows are written **before** the demand request, and every delete answer
  (`deleted`/`not_found`/`category_not_found`) retires the row. A lost answer can therefore never
  leave a stale Manager row undeletable. The cost is at most one harmless `not_found` call.
- R29 Serialization uses BullMQ `deduplication { keepLastIfActive: true }` with no ttl, not a fixed
  `jobId` (which collides with retained completed jobs), and a single worker with concurrency 1.
  The periodic sync is a `setInterval` in that worker, not a job scheduler, to keep one enqueue path.
- R30 Delete-then-demand inside one run: a *retryable* delete failure retries the whole run; a
  final non-retryable answer lets demand proceed. This refines §7 (handoff §4A.2's "final answer"
  wording).
- R31 **Card 7 is implemented by process-level enablement**, not a per-call flag. Only server,
  webhook-worker, outbound-worker and `reconcile-active-sold-items` enable signals; restore,
  rebuild and verify scripts never connect to Redis. Lazy producer connection with
  `enableOfflineQueue: false` so a Redis outage rejects fast instead of hanging (M6).
- R32 Processed deliveries are persisted as `pending` rows **before** enqueueing (jobId = delivery
  id), so a Redis outage at trigger time leaves a visible row. Re-sending such rows is Card 8,
  written as §12A.7 pending the answer.
- R33 Multi-valued `quantity` keeps the ratified "→ 1" rule and adds a `warn` log so the
  approximation is visible. Unilateral, listed for the owner; no live rule is affected.
- R34 `restockTarget` is extracted to one domain function used by both the report and demand, so
  the screen and Manager's board can't drift (M1).
- R35 The verification harness is a `verify-*.ts` script (the backend has no unit runner) with a
  local stub Manager, 20 outcome-level checks mapped to M1–M7, and 5 planted-defect probes.

**Round 5 — 2026-09-19, owner David answers Card 8 and the set-size note; Claude Opus 5 folds**
- R36 Card 8: "the recommendation is correct" → §12A.7 re-drive is binding for both outage failures
  and 401 rejections. The bounded noise while a key is still wrong is recorded in §12A.7. Check 21
  added.
- R37 Set-size note: the owner overrides R33 — a rule with several set sizes is **refused on save**
  (new §12A.11, `validateStockCriteria`), instead of counting 1. R33's `warn` survives only as a
  defence against rows written outside the API. Check 22 added. "Do not touch" gains this one
  exception.
- R38 Found while folding: the rule editor also offers "Any value" for set size (`{"quantity": null}`,
  `apps/frontend/src/features/stock/domain/stock-criteria.domain.ts:20-21`), and the backend
  accepts it. That is the same ambiguity, and the owner's answer covers several sizes but not
  "any" → Card 9, not decided silently.
- R39 The frontend editor keeps offering these options; the server's error is the guard. Changing
  the editor is outside the Codex brief (HC-7 interim framing).
- Check count in §13A is now 22.

**Round 6 — 2026-09-19, owner David answers Card 9**
- R40 Card 9: "that is correct, we will also block any set size" → §12A.11 refuses `quantity: null`
  as well as several values, with the same message. A rule without a `quantity` key is still valid.
  Check 22 extended; the pending wording in §12A.2, §12A.11 and §13A is removed.
- R41 No owner decisions open. The document is ready to hand to Codex as the single
  implementation source (§13A).
