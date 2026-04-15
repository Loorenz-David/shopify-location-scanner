import type { ShopifyCallbackQuery } from "../contracts/shopify.contract.js";
export declare const handleOauthCallbackCommand: (input: {
    query: ShopifyCallbackQuery;
    rawParams: Record<string, string>;
    skipHmacValidation?: boolean;
}) => Promise<{
    shop: {
        id: string;
        shopDomain: string;
    };
}>;
//# sourceMappingURL=handle-oauth-callback.command.d.ts.map