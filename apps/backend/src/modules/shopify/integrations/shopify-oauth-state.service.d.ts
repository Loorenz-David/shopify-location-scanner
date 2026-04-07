type ShopifyOAuthStatePayload = {
    nonce: string;
    userId: string;
    issuedAt: number;
};
export declare const shopifyOauthStateService: {
    sign(userId: string): string;
    verify(state: string): ShopifyOAuthStatePayload;
};
export {};
//# sourceMappingURL=shopify-oauth-state.service.d.ts.map