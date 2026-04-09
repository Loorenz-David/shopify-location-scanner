export type WsOutboundEvent = {
    type: "authenticated";
    shopId: string;
} | {
    type: "scan_history_updated";
    productId: string;
};
export declare const broadcastToShop: (shopId: string, event: WsOutboundEvent) => void;
//# sourceMappingURL=ws-broadcaster.d.ts.map