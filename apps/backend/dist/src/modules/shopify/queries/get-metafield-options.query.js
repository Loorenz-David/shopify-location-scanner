import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
export const getMetafieldOptionsQuery = async (input) => {
    const shop = await shopRepository.findById(input.shopId);
    if (!shop || !shop.accessToken) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    return shopifyAdminApi.getMetafieldOptions({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
    });
};
//# sourceMappingURL=get-metafield-options.query.js.map