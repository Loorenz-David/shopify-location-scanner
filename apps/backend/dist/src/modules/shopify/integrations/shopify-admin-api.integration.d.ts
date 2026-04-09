import type { ProductLocationData, ProductLocationSnapshot } from "../domain/shopify-shop.js";
import type { ShopifyMetafieldOptionsDto, ShopifySkuSearchItemDto } from "../contracts/shopify.contract.js";
export declare const shopifyAdminApi: {
    exchangeCodeForAccessToken(input: {
        shopDomain: string;
        code: string;
        redirectUri: string;
    }): Promise<string>;
    getProductWithLocation(input: {
        shopDomain: string;
        accessToken: string;
        productId: string;
    }): Promise<ProductLocationData>;
    listProductsWithLocation(input: {
        shopDomain: string;
        accessToken: string;
        pageSize?: number;
    }): Promise<ProductLocationSnapshot[]>;
    resolveProductIdByHandle(input: {
        shopDomain: string;
        accessToken: string;
        handle: string;
    }): Promise<string | null>;
    resolveProductIdBySku(input: {
        shopDomain: string;
        accessToken: string;
        sku: string;
    }): Promise<string | null>;
    resolveProductIdByBarcode(input: {
        shopDomain: string;
        accessToken: string;
        barcode: string;
    }): Promise<string | null>;
    searchProductsBySku(input: {
        shopDomain: string;
        accessToken: string;
        sku: string;
        limit?: number;
    }): Promise<ShopifySkuSearchItemDto[]>;
    getMetafieldOptions(input: {
        shopDomain: string;
        accessToken: string;
    }): Promise<ShopifyMetafieldOptionsDto>;
    upsertMetafieldOptions(input: {
        shopDomain: string;
        accessToken: string;
        options: string[];
    }): Promise<ShopifyMetafieldOptionsDto>;
    ensureWebhookSubscriptions(input: {
        shopDomain: string;
        accessToken: string;
    }): Promise<void>;
    removeManagedWebhookSubscriptions(input: {
        shopDomain: string;
        accessToken: string;
    }): Promise<void>;
    updateProductLocation(input: {
        shopDomain: string;
        accessToken: string;
        productId: string;
        location: string;
    }): Promise<void>;
};
//# sourceMappingURL=shopify-admin-api.integration.d.ts.map