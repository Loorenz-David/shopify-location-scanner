import type { LinkedShop } from "../domain/shopify-shop.js";
export declare const shopRepository: {
    findAnyLinkedShop(): Promise<LinkedShop | null>;
    findById(id: string): Promise<LinkedShop | null>;
    upsertByDomain(input: {
        shopDomain: string;
        accessToken: string;
    }): Promise<LinkedShop>;
    deleteById(id: string): Promise<LinkedShop>;
};
//# sourceMappingURL=shop.repository.d.ts.map