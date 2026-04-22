import { useCallback, useRef } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import type { WsInboundEvent } from "../../../core/ws-client/ws-events";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";

const WS_REFRESH_DEDUPE_MS = 750;
const BATCH_NOTIFICATION_AUTO_DISMISS_MS = 8000;

export function useLogisticTasksRealtimeFlow(): void {
  const lastRefreshByIdRef = useRef(new Map<string, number>());

  const handleItemEvent = useCallback((scanHistoryId: string) => {
    if (!scanHistoryId) return;

    const now = Date.now();
    const lastRefreshAt = lastRefreshByIdRef.current.get(scanHistoryId) ?? 0;

    if (now - lastRefreshAt < WS_REFRESH_DEDUPE_MS) return;

    lastRefreshByIdRef.current.set(scanHistoryId, now);
    void logisticTasksActions.refreshByIds([scanHistoryId]);
  }, []);

  const handleIntentionSet = useCallback(
    (event: Extract<WsInboundEvent, { type: "logistic_intention_set" }>) => {
      handleItemEvent(event.scanHistoryId);
    },
    [handleItemEvent],
  );

  const handleItemPlaced = useCallback(
    (event: Extract<WsInboundEvent, { type: "logistic_item_placed" }>) => {
      handleItemEvent(event.scanHistoryId);
    },
    [handleItemEvent],
  );

  const handleItemFulfilled = useCallback(
    (event: Extract<WsInboundEvent, { type: "logistic_item_fulfilled" }>) => {
      handleItemEvent(event.scanHistoryId);
    },
    [handleItemEvent],
  );

  const handleItemsUpdated = useCallback(
    (event: Extract<WsInboundEvent, { type: "logistic_items_updated" }>) => {
      for (const itemId of event.itemIds) {
        handleItemEvent(itemId);
      }
    },
    [handleItemEvent],
  );

  const handleBatchNotification = useCallback(
    (
      event: Extract<WsInboundEvent, { type: "logistic_batch_notification" }>,
    ) => {
      useLogisticTasksStore
        .getState()
        .setBatchNotification({ count: event.count, message: event.message });

      window.setTimeout(() => {
        logisticTasksActions.dismissBatchNotification();
      }, BATCH_NOTIFICATION_AUTO_DISMISS_MS);
    },
    [],
  );

  useWsEvent("logistic_intention_set", handleIntentionSet);
  useWsEvent("logistic_item_placed", handleItemPlaced);
  useWsEvent("logistic_item_fulfilled", handleItemFulfilled);
  useWsEvent("logistic_items_updated", handleItemsUpdated);
  useWsEvent("logistic_batch_notification", handleBatchNotification);
}
