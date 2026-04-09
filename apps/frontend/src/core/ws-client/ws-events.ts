export type WsInboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string };

export type WsOutboundMessage = { type: "auth"; token: string };
