export type WsInboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  | {
      type: "logistic_intention_set";
      scanHistoryId: string;
      orderId: string | null;
      intention: string;
    }
  | {
      type: "logistic_item_placed";
      scanHistoryId: string;
      orderId: string | null;
      logisticLocationId: string;
    }
  | {
      type: "logistic_item_fulfilled";
      scanHistoryId: string;
      orderId: string | null;
    }
  | {
      type: "logistic_batch_notification";
      count: number;
      itemIds: string[];
      message: string;
    }
  | { type: "session_invalidated" };

export type WsOutboundMessage = { type: "auth"; token: string };
