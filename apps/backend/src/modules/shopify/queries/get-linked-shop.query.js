import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { shopRepository } from "../repositories/shop.repository.js";
export const getLinkedShopQuery = async (input) => {
    const shop = await shopRepository.findById(input.shopId);
    if (!shop) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    return {
        shopDomain: shop.shopDomain,
        createdAt: shop.createdAt.toISOString(),
    };
};
//# sourceMappingURL=get-linked-shop.query.js.map