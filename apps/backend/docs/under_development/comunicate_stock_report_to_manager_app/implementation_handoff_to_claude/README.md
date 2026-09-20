# Claude implementation handoff — Scanner → Manager stock signals

## Resume point

- Repository: `Item-Scanner-Shopify`, branch: `manager-stock-signals` (already checked out).
- Source of truth: `../planning/intention.md`; wire contract: `../manager_handoffs/STOCK_REPORT_WEBHOOKS_v2_20260919.md` **only**.
- Authority: intention §12A > intention §§4–11 > wire handoff v2. Never edit either authority document.
- `prisma/dev.db` is real data. Never write to it. Verification must create a SQLite `.backup` scratch copy and use `DATABASE_URL=file:<scratch>/verify.db`.
- Never call a live Manager; verification uses a local `node:http` stub. Redis-unreachable checks 12–13 must fail, not silently pass.

## Committed work

All work below is committed and `npm run typecheck` was green immediately before each commit.

| Commit | Subject | Implemented |
|---|---|---|
| `ba265db` | `manager-signals: schema and contracts` | Prisma event/status/ledger enums and models; Shop relations; migration `20260919120000_add_manager_stock_signals`; expanded outbound event type contract; initial response/query Zod schemas; requested short Codex plan artifact. |
| `15a9198` | `manager-signals: stock demand domain` | `restockTarget`, `missingItems`, `unitsPerItem`, `identityKey`, `computeStockDemand`; report query uses shared missing-item calculation; §12A.11 server validation. |
| `63fc2b1` | `manager-signals: http and persistence` | Shared 8-second POST helper, v2 response parsing, name-aware timeout retry detection used by existing outbound worker; initial delivery and ledger repositories. |
| `9563949` | `manager-signals: queue enablement` | Lazy isolated Redis queues, enabled/no-op signal API, environment defaults, server/webhook-worker enablement. |

The tree was clean immediately before this handoff file was created. Review the code rather than assuming these initial implementations satisfy every contract: several modules are intentionally skeletal and no feature verifier exists yet.

## Critical unfinished work

1. Implement `manager/stock-sync.service.ts` precisely to §12A.3–§12A.4: resolve targets; one per type only; current-state reads; sorted full demand; ledger `active − present` deletes; delete-before-demand; empty arrays never posted; pre-write/transition ledger and delivery rows; retryable errors throw so BullMQ re-runs against fresh state.
2. Implement `manager/items-processed.service.ts` precisely to §12A.6–§12A.8, including target lookup at send time, stored-body byte identity, attempts/status/response recording, and bounded periodic re-drive (pending after 5 minutes; failed/401-rejected within 7 days; oldest-first max 200).
3. Complete `outbound-webhook-worker.ts`: call `enableManagerSignals()`, consume `manager-stock-sync` at concurrency 1 and `manager-items-processed` at concurrency 5, worker-start and interval enqueue, retention prune, and close all resources on shutdown. Do not change `item_placed` payload/producer; retain only the shared timeout fix.
4. Complete `manager-signals.ts` lifecycle: no import-time Redis connection, swallowed/logged enqueue failures, exact process enablement, `closeManagerSignals()` in `scripts/reconcile-active-sold-items.ts` finally block. Do not enable restore/rebuild/verify scripts.
5. Add post-commit, fire-and-forget trigger calls at every §12A.10 stock site. Add ScanHistory created-record tracking in both creation functions and signal only after successful transaction resolution; append, rollback, and restore must produce no processed message.
6. Add delivery and ledger query modules, controller methods, and admin routes before `/:id` routes; support all §12A.9 filters/order/limits and never expose a secret.
7. Add `scripts/verify-manager-signals.ts` and include it in `verify-all.ts`. It must implement each of the 22 §13A checks, local stub modes, dev.db refusal with exit 3, scratch DB lifecycle, and Redis-required failure behavior.
8. Run all five §13A planted-defect probes. Byte-copy target file before each mutation; run verifier; record actual red checks; restore from the byte copy; confirm no leftover `git diff`.
9. Write `../handoffs/codex_implementation.md` with commits/files, all 22 result lines, `SUMMARY PASS`, each probe/revert, and deviations/stops. Commit each remaining phase with explicit paths and `manager-signals:` subject, then inspect `git show --stat HEAD`.

## Existing files that need special scrutiny

- `manager-queues.ts` has the required queue names/prefix and base options, but no worker consumers yet. Confirm BullMQ option typing/semantics before extending it.
- `manager-signals.ts` creates processed delivery rows, but does not yet supply the stock-sync service or worker handler. Confirm its skipped-row request-body behavior against §12A.9 before relying on it.
- `manager-stock-ledger.repository.ts` currently has an over-broad outcome helper: `category_not_found` must not transition a delete ledger row to `deleted` (§12A.3 says it leaves it as is). Correct it during stock-sync implementation.
- `outbound-delivery.repository.ts` is an initial Prisma wrapper, not proof that each §12A.8 transition/attempt count is correct.
- `outbound-webhook.contract.ts` response schemas are initial; ensure whole-body validation and all endpoint DTOs match §12A.8–§12A.9.
- Migration has not been applied to `dev.db` and must not be applied there. Test it only against a disposable copy.

## Verification record at handoff

- Completed: `cd apps/backend && npm run prisma:generate && npm run typecheck` after phase 1; `npm run typecheck` after phases 2, 3, and 5.
- Not run: migration against a scratch DB, existing verify scripts after the refactor, `verify-all`, any Manager stub tests, checks 1–22, or any planted-defect probe.
- No live Manager HTTP requests and no writes to `prisma/dev.db` were made by the prior implementation session.

## Required reading order before edits

1. Intention §1, §3, §4, all §12A, §13A, §11.
2. Handoff v2 §3–§6.
3. Every §13A file-map code file before modifying it.

If a required behavior is undecided or sources conflict after applying the stated authority order, stop and report rather than choosing.
