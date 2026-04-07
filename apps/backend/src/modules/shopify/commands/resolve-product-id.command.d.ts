import type { ResolveItemIdType } from "../contracts/shopify.contract.js";
export declare const resolveProductIdCommand: (input: {
    idType: ResolveItemIdType;
    itemId: string;
    shopDomain: string;
    accessToken: string;
}) => Promise<string>;
//# sourceMappingURL=resolve-product-id.command.d.ts.map