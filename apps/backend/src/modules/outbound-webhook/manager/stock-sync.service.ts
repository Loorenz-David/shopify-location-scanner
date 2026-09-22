import { logger } from "../../../shared/logging/logger.js";
import { canonicalCriteriaString } from "../../stock/domain/property-criteria.js";
import {
  computeStockDemand,
  hasAmbiguousSetSize,
  identityKey,
  identityKeyOf,
  type DemandEntry,
} from "../../stock/domain/stock-demand.js";
import { locationStockRepository } from "../../stock/repositories/location-stock.repository.js";
import type {
  ManagerStockLedgerRecord,
  OutboundEventType,
} from "../contracts/outbound-webhook.contract.js";
import { managerStockLedgerRepository } from "../repositories/manager-stock-ledger.repository.js";
import { outboundDeliveryRepository } from "../repositories/outbound-delivery.repository.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import {
  logRejectedResponse,
  postJson,
  sendManagerRequest,
  truncateResponseBody,
  type ManagerKind,
  type PostJson,
  type ManagerResult,
} from "./manager-http.js";
import type { StockSyncMode } from "./manager-queues.js";

export type StockSyncDeps = {
  post: PostJson;
  now: () => Date;
};

export const defaultStockSyncDeps: StockSyncDeps = {
  post: postJson,
  now: () => new Date(),
};

type Target = { id: string; targetUrl: string; secret: string };

/**
 * Thrown so BullMQ retries the whole run. A retry re-reads state, so it can
 * never send an older number or a delete for an identity that has come back
 * (handoff v2 §6.3, §4A.2).
 */
export class StockSyncRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockSyncRetryError";
  }
}

const ledgerIdentityKey = (row: ManagerStockLedgerRecord): string =>
  identityKeyOf(row.itemCategory, row.propertiesCanonical);

const demandEntryIdentityKey = (entry: DemandEntry): string =>
  identityKeyOf(entry.itemCategory, canonicalCriteriaString(entry.properties));

const writeSkipped = async (input: {
  shopId: string;
  eventType: OutboundEventType;
  requestBody: string;
  lastError: string;
  now: Date;
}): Promise<void> => {
  await outboundDeliveryRepository.create({
    shopId: input.shopId,
    targetId: null,
    eventType: input.eventType,
    status: "skipped",
    requestBody: input.requestBody,
    lastError: input.lastError,
    completedAt: input.now,
  });
};

/**
 * One stock HTTP request: its own delivery row (§12A.9 granularity), the §12A.8
 * classification, and the row update. Returns the per-entry results when Manager
 * answered a well-formed 2xx, otherwise null; throws when the failure is
 * retryable, after marking the row `failed`.
 */
const sendStockRequest = async (input: {
  shopId: string;
  kind: Extract<ManagerKind, "demand" | "delete">;
  eventType: OutboundEventType;
  target: Target;
  body: string;
  entryCount: number;
  mode: StockSyncMode;
  deps: StockSyncDeps;
  beforeSend?: (deliveryId: string, sentAt: Date) => Promise<void>;
}): Promise<{ results: ManagerResult[]; deliveryId: string; sentAt: Date } | null> => {
  const sentAt = input.deps.now();
  const delivery = await outboundDeliveryRepository.create({
    shopId: input.shopId,
    targetId: input.target.id,
    eventType: input.eventType,
    status: "pending",
    requestBody: input.body,
  });

  if (input.beforeSend) {
    await input.beforeSend(delivery.id, sentAt);
  }

  const response = await sendManagerRequest({
    kind: input.kind,
    url: input.target.targetUrl,
    secret: input.target.secret,
    body: input.body,
    entryCount: input.entryCount,
    post: input.deps.post,
  });

  const context = {
    shopId: input.shopId,
    deliveryId: delivery.id,
    targetId: input.target.id,
    eventType: input.eventType,
    mode: input.mode,
  };
  const attemptAt = input.deps.now();

  if (response.kind === "ok") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "delivered",
      attempts: 1,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.info("Manager stock request delivered", { ...context, status: response.status });
    return { results: response.results, deliveryId: delivery.id, sentAt };
  }

  if (response.kind === "unparseable") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "delivered",
      attempts: 1,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastError: "unparseable_response",
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.error("Manager stock response could not be read", {
      ...context,
      status: response.status,
    });
    return null;
  }

  if (response.kind === "rejected") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "rejected",
      attempts: 1,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logRejectedResponse(response.status, response.body, context);
    return null;
  }

  if (response.kind === "fatal") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "failed",
      attempts: 1,
      lastError: response.error,
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.error("Manager stock request failed without a retry", {
      ...context,
      error: response.error,
    });
    return null;
  }

  await outboundDeliveryRepository.recordAttempt({
    id: delivery.id,
    status: "failed",
    attempts: 1,
    responseStatus: response.status,
    responseBody: truncateResponseBody(response.body),
    lastError: response.error,
    lastAttemptAt: attemptAt,
    completedAt: attemptAt,
  });
  logger.warn("Manager stock request failed; the run will be retried", {
    ...context,
    error: response.error,
  });
  throw new StockSyncRetryError(response.error);
};

/**
 * §12A.4, one run. Everything is read here, when the job runs — never at enqueue
 * time (handoff v2 §6.3, "required"). A delta still computes every local group:
 * that is what makes a group spanning several locations authoritative, while the
 * HTTP body contains only groups Manager has not confirmed at that quantity.
 */
export const runStockSync = async (
  shopId: string,
  deps: StockSyncDeps = defaultStockSyncDeps,
  mode: StockSyncMode = "full",
): Promise<void> => {
  // 1. Targets (§12A.3).
  const [demandTargets, deleteTargets] = await Promise.all([
    outboundWebhookTargetRepository.findActiveByShopAndEvent({
      shopId,
      eventType: "stock_demand",
    }),
    outboundWebhookTargetRepository.findActiveByShopAndEvent({
      shopId,
      eventType: "stock_demand_deleted",
    }),
  ]);

  // §12A.3 / check 20: with no demand target the sync is a silent no-op —
  // nothing written, nothing logged above `debug` (this logger has no `debug`).
  if (demandTargets.length === 0) {
    return;
  }

  if (demandTargets.length > 1 || deleteTargets.length > 1) {
    await writeSkipped({
      shopId,
      eventType: "stock_demand",
      requestBody: "[]",
      lastError: "ambiguous_targets",
      now: deps.now(),
    });
    logger.error("Manager stock sync skipped: more than one active target", {
      shopId,
      demandTargets: demandTargets.length,
      deleteTargets: deleteTargets.length,
    });
    return;
  }

  const demandTarget = demandTargets[0] as Target;
  const deleteTarget = (deleteTargets[0] as Target | undefined) ?? null;

  // 2. Current state. The demand payload and the delete list come from this one read.
  const rows = await locationStockRepository.listByShop(shopId);
  const entries = computeStockDemand(rows);
  const present = new Set(rows.map((row) => identityKey(row)));

  // 3. Deletes = ledger `active` minus present. Derived from the same read, so
  //    handoff v2 §4A.2's send-time re-check is inherent.
  const ledgerActive = await managerStockLedgerRepository.listActive(shopId);
  const ledgerByIdentity = new Map(
    ledgerActive.map((row) => [ledgerIdentityKey(row), row]),
  );
  const deletes = ledgerActive
    .filter((row) => !present.has(ledgerIdentityKey(row)))
    .sort((left, right) => {
      const leftKey = ledgerIdentityKey(left);
      const rightKey = ledgerIdentityKey(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  // 4. Deletes first, and never an empty array (Manager answers 422 to `[]`).
  if (deletes.length > 0) {
    const deleteBody = JSON.stringify(
      deletes.map((row) => ({ itemCategory: row.itemCategory, properties: row.properties })),
    );

    if (!deleteTarget) {
      await writeSkipped({
        shopId,
        eventType: "stock_demand_deleted",
        requestBody: deleteBody,
        lastError: "no_delete_target",
        now: deps.now(),
      });
      logger.warn("Manager stock deletes not sent: no active delete target", {
        shopId,
        identities: deletes.length,
      });
    } else {
      const sent = await sendStockRequest({
        shopId,
        kind: "delete",
        eventType: "stock_demand_deleted",
        target: deleteTarget,
        body: deleteBody,
        entryCount: deletes.length,
        mode,
        deps,
      });

      if (sent) {
        for (const [index, row] of deletes.entries()) {
          const outcome = sent.results[index]?.outcome;
          if (!outcome) {
            continue;
          }
          if (outcome === "category_not_found") {
            logger.error("Manager has no category for a deleted stock rule", {
              shopId,
              itemCategory: row.itemCategory,
              propertiesCanonical: row.propertiesCanonical,
            });
          }
          await managerStockLedgerRepository.recordDeleteOutcome({
            id: row.id,
            outcome,
            deliveryId: sent.deliveryId,
            sentAt: sent.sentAt,
          });
        }
      }
    }
  }

  // 5. Then demand — reached even after a final, non-retryable delete answer
  //    (§12A.4 step 7); the next sync re-derives the delete. A full run is the
  //    scheduled/startup reconciliation. A delta contains only identities whose
  //    last *applied* Manager quantity differs; unconfirmed rows stay eligible so
  //    a timeout or rejected response cannot be silently treated as delivered.
  const demandEntries =
    mode === "full"
      ? entries
      : entries.filter(
          (entry) =>
            ledgerByIdentity.get(demandEntryIdentityKey(entry))?.lastAppliedQuantity !==
            entry.quantityRequested,
        );

  if (demandEntries.length === 0) {
    return;
  }

  for (const entry of demandEntries) {
    if (hasAmbiguousSetSize(entry.properties)) {
      logger.warn("Stock rule states no single set size; counting one unit per item", {
        shopId,
        mode,
        itemCategory: entry.itemCategory,
        properties: entry.properties,
      });
    }
  }

  const demandBody = JSON.stringify(demandEntries);
  const canonicalByEntry = demandEntries.map((entry: DemandEntry) =>
    canonicalCriteriaString(entry.properties),
  );
  const ledgerIds: string[] = [];

  const sent = await sendStockRequest({
    shopId,
    kind: "demand",
    eventType: "stock_demand",
    target: demandTarget,
    body: demandBody,
    entryCount: demandEntries.length,
    mode,
    deps,
    beforeSend: async (deliveryId, sentAt) => {
      for (const [index, entry] of demandEntries.entries()) {
        const written = await managerStockLedgerRepository.prewriteDemand({
          shopId,
          itemCategory: entry.itemCategory,
          propertiesCanonical: canonicalByEntry[index] as string,
          properties: entry.properties as never,
          quantity: entry.quantityRequested,
          deliveryId,
          sentAt,
        });
        ledgerIds.push(written.id);
      }
    },
  });

  if (!sent) {
    return;
  }

  for (const [index, entry] of demandEntries.entries()) {
    const outcome = sent.results[index]?.outcome;
    const ledgerId = ledgerIds[index];
    if (!outcome || !ledgerId) {
      continue;
    }
    if (outcome === "category_not_found") {
      logger.error("Manager has no category for a stock rule", {
        shopId,
        itemCategory: entry.itemCategory,
        properties: entry.properties,
      });
    }
    await managerStockLedgerRepository.recordDemandOutcome({
      id: ledgerId,
      outcome,
      ...(outcome === "applied" ? { appliedQuantity: entry.quantityRequested } : {}),
    });
  }
};
