import type { ShopifyOrdersPaidWebhookPayload } from "../contracts/shopify.contract.js";
export declare const handleOrdersPaidWebhookCommand: (input: {
    shopId: string;
    shopDomain: string;
    topic: string;
    webhookId: string;
    payload: ShopifyOrdersPaidWebhookPayload;
}) => Promise<{
    duplicate: boolean;
    processedProducts: number;
    skippedProducts: number;
}>;
//# sourceMappingURL=handle-orders-paid-webhook.command.d.ts.map