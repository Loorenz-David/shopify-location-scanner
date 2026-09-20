# Scanner → Manager stock signals — implementation handoff

Branch `manager-stock-signals`. Written against intention §12A/§13A and Manager
handoff v2 (`STOCK_REPORT_WEBHOOKS_v2_20260919.md`), authority order
§12A.3–§12A.11 → §§4–11 → handoff v2.

## State

- `npm run typecheck` — 0 errors.
- `npx tsx scripts/verify-all.ts` — `SUMMARY PASS 4 script(s)`; all 22 §13A
  checks green; all five planted-defect probes shown red and reverted.

Run with a scratch copy of the database, never `prisma/dev.db`:

```
sqlite3 apps/backend/prisma/dev.db ".backup '<scratch>/verify.db'"
cd apps/backend && DATABASE_URL="file:<scratch>/verify.db" npx prisma migrate deploy
DATABASE_URL="file:<scratch>/verify.db" SHOP_ID=<a shop id in that copy> npx tsx scripts/verify-all.ts
```

`verify-all.ts` passes `process.env` straight through and sets nothing itself;
`verify-stock-reconciliation.ts` needs `SHOP_ID`. Every verify script refuses a
`DATABASE_URL` that resolves to the configured development database, exit code 3.

## Files changed

New:

| File | What it holds |
|---|---|
| `src/modules/outbound-webhook/manager/stock-sync.service.ts` | `runStockSync` — §12A.4's ordered run, one delivery row per HTTP request, §12A.3 ledger transitions, `StockSyncRetryError` |
| `src/modules/outbound-webhook/manager/items-processed.service.ts` | `runProcessedDelivery` (§12A.6 worker handler) and `listProcessedRedriveCandidates` (§12A.7 selection) |
| `scripts/verify-manager-signals.ts` | the §13A script: local `node:http` Manager stub, 22 checks, three child-process modes |

Changed:

| File | What changed |
|---|---|
| `src/modules/outbound-webhook/manager/manager-http.ts` | shared `postJson`, `isRetryableError`, §12A.8 classification, `logRejectedResponse` |
| `src/modules/outbound-webhook/manager/manager-queues.ts` | the two queues, the exact §12A.4 enqueue options, lazy isolated producer connection, bounded reconnects |
| `src/modules/outbound-webhook/manager/manager-signals.ts` | §12A.5 enablement, the two signal functions, in-flight draining on close |
| `src/modules/outbound-webhook/contracts/outbound-webhook.contract.ts` | ledger and delivery records, §12A.9 query schemas |
| `src/modules/outbound-webhook/repositories/manager-stock-ledger.repository.ts` | `prewriteDemand`, `recordDemandOutcome`, `recordDeleteOutcome`, `listByShop` |
| `src/modules/outbound-webhook/repositories/outbound-delivery.repository.ts` | `create`, `recordAttempt`, §12A.9 `list`, `listRedriveCandidates`, `pruneOlderThan` |
| `src/modules/outbound-webhook/repositories/outbound-webhook-target.repository.ts` | `findActiveById` (secret read at send time), `listShopIdsWithActiveEvent` |
| `src/modules/outbound-webhook/queries/list-deliveries.query.ts`, `list-manager-stock.query.ts` | the two §12A.9 reads |
| `src/modules/outbound-webhook/controllers/outbound-webhook.controller.ts`, `routes/outbound-webhook.routes.ts` | the two admin endpoints, registered before `/:id` so neither path is shadowed |
| `src/workers/outbound-webhook-worker.ts` | both workers, the periodic tick (start + `MANAGER_SYNC_INTERVAL_MS`), re-drive, retention prune, shutdown |
| `src/modules/scanner/repositories/scan-history.repository.ts` | §12A.6 post-commit hook in `appendLocationEvent` and `appendSoldTerminalEventWithFallback` |
| `src/modules/stock/domain/stock-demand.ts` | `identityKeyOf`, `unitsPerItem`, `hasAmbiguousSetSize`, `computeStockDemand` |
| `src/modules/stock/services/apply-item-stock-change.service.ts` | `signalStockChanged` wrapper around the unchanged body |
| `src/modules/stock/commands/{create-location-stocks,update-location-stock,delete-location-stock}.command.ts` | the §12A.10 trigger sites |
| `scripts/reconcile-active-sold-items.ts` | `enableManagerSignals()` / `closeManagerSignals()` per §12A.5 |
| `scripts/verify-all.ts` | `verify-manager-signals.ts` added to `EXPECTED_SCRIPTS` |

Changed outside §13A's file map — see **Deviations**:

| File | Why |
|---|---|
| `src/modules/ws/ws-registry.ts` | its import-time Redis client stopped every script from exiting |
| `scripts/verify-stock-report.ts` | two expectations stale since `80f8a36`, red before this work, blocking `SUMMARY PASS` |

## Check results

```
PASS 1 (M1) worked fixture and one restock-target source
PASS 2 (M1) unitsPerItem
PASS 3 (M1) one entry per identity, sorted, no duplicate
PASS 4 (M1) a satisfied rule is sent as 0
PASS 5 (M2) no delete while another location holds the identity
PASS 6 (M1,M2) delete before demand, ledger closed
PASS 7 (M2) Teak -> Light -> Teak sends no delete
PASS 8 (M3) a retryable delete retries the whole run
PASS 9 (M2,M5) a final 401 on a delete lets demand proceed
PASS 10 (M1) an empty shop sends nothing
PASS 11 (M7) missing delete target and ambiguous targets
PASS 12 (M3) triggers coalesce into one further run
PASS 13 (M5) a timeout is retried, not completed
PASS 14 (M4) one report per creation, byte-identical
PASS 15 (M4) sold creation, rollback and blank barcode
PASS 16 (M6,M7) a script signals nothing and exits
PASS 17 (M5) response classification
PASS 18 (M6) signalling never changes an operation's result
PASS 19 (M6) the two read endpoints
PASS 20 (M7) no active target is silent
PASS 21 (M4) bounded processed re-drive
PASS 22 (M1) one set size per rule

PASS verify-stock-domain.ts
PASS verify-stock-reconciliation.ts
PASS verify-stock-report.ts
PASS verify-manager-signals.ts
SUMMARY PASS 4 script(s)
```

Checks 12 and 13 need a reachable Redis. They fail loudly when it is not —
`redis-unreachable` — and never pass silently.

## Probe results

Each defect was planted, the script run, the file restored from a byte copy taken
before planting, and `git status --porcelain` confirmed clean afterwards.

| Probe | Expected red | Actually red |
|---|---|---|
| delete candidates computed without excluding present identities (`stock-sync.service.ts`) | 5, 7 | 5, 6, 7, 11 |
| `instanceCount` swapped for `quantity` in `missingItems` (`domain/restock.ts`) | 1 | 1, 3, 4, 5, 7 |
| `keepLastIfActive` removed (`manager-queues.ts`) | 12 | 12 |
| message-only `isRetryableError`, i.e. the `error.name` branch removed (`manager-http.ts`) | 13 | 13 |
| signal moved inside the transaction callback (`scan-history.repository.ts`) | 15 | 15 — from each of the two creating functions, run separately |

The wider sets in the first two probes are the same defect seen by more checks,
not extra failures.

The last probe first came back **green** when planted in
`appendSoldTerminalEventWithFallback`: check 15 forced its rollback only through
`appendLocationEvent`, leaving the other post-commit site untested — and that is
the function §13A's check-15 row names. Check 15 now rolls back both, and the
probe is red from either site. Fixed in `bfc2fe8`, before the probe was re-run.

## Deviations and judgment calls

Nothing in the intention or the Manager handoff was edited.

1. **Delete outcome `category_not_found` closes the ledger row.** §12A.3's
   transition table lists `deleted` / `not_found` / `category_not_found` as all
   moving a delete row to `deleted`. §7 and the prior session's README read it
   the other way. The authority order puts §12A.3 first, so `recordDeleteOutcome`
   always moves the row to `deleted`.
2. **The processed worker also re-sends a `rejected` row with status 401.**
   §12A.6 alone says the handler is for `pending`/`failed`. §12A.7's re-drive and
   §13A check 21 both require a 401 rejection to be re-sent after the key is
   fixed, so `isSendable` admits exactly that one rejected case.
3. **A missing or inactive target marks the delivery `skipped` with
   `lastError: "target_inactive"`.** Not specified anywhere. The row is left
   visible rather than silently dropped or retried forever.
4. **`identityKey` separates the two parts with a space**, not a NUL character.
   §12A.1 gives the space; the code carried over from the earlier session did not.
5. **`src/modules/ws/ws-registry.ts` — outside the file map.** It built its Redis
   presence client at import time, so every process reaching it through
   `ws-broadcaster` (the scan-history repository, hence `restore-scan-history`)
   opened Redis and never exited. §12A.5 requires the opposite of exactly those
   scripts, and check 16 is red without this. The client is now created on first
   use; nothing else about it changed.
6. **`scripts/verify-stock-report.ts` — outside the file map.** Checks C3(a) and
   P7.C4(a) still expected the nine report-entry fields that existed before
   `80f8a36` added `isLocationPattern`. Both were red on this branch before any
   of this work, and §13A requires `verify-all` to reach `SUMMARY PASS` with the
   existing scripts passing. Only the two expectations were updated.

## Defects found while verifying, and what was done

- **`closeManagerSignals` closed the queues underneath in-flight signals.**
  Signals are fire-and-forget; a report that had not reached its enqueue was lost,
  and the late enqueue rebuilt a lazy connection nothing would close again, so the
  process never exited. In-flight signals are now tracked and drained first.
- **The producer connection reconnected forever.** BullMQ's `waitUntilReady`
  inside `queue.add` stays pending for as long as ioredis keeps retrying, so a
  Redis outage hung the caller — the opposite of §12A.5's "rejects immediately
  instead of hanging"; `enableOfflineQueue: false` does not prevent it. Reconnects
  are bounded, the client emits `end`, `add` rejects, and the lane is dropped so a
  Redis that comes back is used by the next signal. `closeManagerQueues`
  disconnects rather than quitting when the server is unreachable.
- **Check 21 asserted on §12A.7's shop-wide selection as a whole**, so a delivery
  left behind by an interrupted run could decide it. It now asserts on this shop's
  rows while still calling the same shop-wide query.

## Done after the brief, at the owner's request

§12A.11 states that changing the rule editor is not part of this brief, so the
editor kept offering "Any value" and multi-select for `Set Of` (`quantity`)
while the server refused both. The owner asked for it, so it was corrected:
`apps/frontend/src/features/stock/{domain/stock-criteria.domain.ts,ui/StockWizardStep1View.tsx}`
now offer that one key as a single choice with no wildcard, and a stored rule
that predates the constraint opens on its first value so it can be fixed in the
picker instead of failing on submit. Every other key is unchanged. Frontend
typecheck clean, 242 vitest tests pass.

## Notes for whoever picks this up

- `verify-manager-signals.ts` ends with an explicit `process.exit`. It loads the
  Express router for check 19, and that router reaches `notification-queue` and
  `logistic-notification.service`, both of which open a Redis connection at import
  time that only the server's own shutdown closes. The script holds no handle on
  either and must not hang `verify-all`. The "exits by itself" property is
  asserted where it belongs, in check 16's child, which mounts no routes.
- Those two import-time connections are pre-existing and were left alone. They
  are the reason a script must not import the HTTP layer.
- The stub records a request when it arrives, not when it answers. Check 12
  depends on it: recording on answer made its five triggers race the active job's
  completion and produce a third run.
