import { NotFoundError, ValidationError, } from "../../../shared/errors/http-errors.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
const normalizeOptions = (options) => {
    const unique = new Set();
    for (const option of options) {
        const value = option.trim();
        if (value.length > 0) {
            unique.add(value);
        }
    }
    return [...unique];
};
export const appendMetafieldOptionsCommand = async (input) => {
    const shop = await shopRepository.findById(input.shopId);
    if (!shop || !shop.accessToken) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    const incomingOptions = normalizeOptions(input.payload.options);
    if (incomingOptions.length === 0) {
        throw new ValidationError("At least one metafield option is required");
    }
    const current = await shopifyAdminApi.getMetafieldOptions({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
    });
    const mergedOptions = [
        ...new Set([...current.options.map((o) => o.value), ...incomingOptions]),
    ];
    return shopifyAdminApi.upsertMetafieldOptions({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        options: mergedOptions,
    });
};
//# sourceMappingURL=append-metafield-options.command.js.map