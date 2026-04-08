import type { ShopifyProductsUpdateWebhookPayload } from "../contracts/shopify.contract.js";
export declare const handleProductsUpdateWebhookCommand: (input: {
    shopId: string;
    shopDomain: string;
    topic: string;
    webhookId: string;
    payload: ShopifyProductsUpdateWebhookPayload;
}) => Promise<{
    duplicate: boolean;
    applied: boolean;
}>;
//# sourceMappingURL=handle-products-update-webhook.command.d.ts.map