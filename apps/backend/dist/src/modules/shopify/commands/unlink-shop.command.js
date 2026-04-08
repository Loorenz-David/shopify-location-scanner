import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { shopRepository } from "../repositories/shop.repository.js";
export const unlinkShopCommand = async (input) => {
    const existing = await shopRepository.findById(input.shopId);
    if (!existing) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    const deleted = await shopRepository.deleteById(existing.id);
    return {
        shopDomain: deleted.shopDomain,
        createdAt: deleted.createdAt.toISOString(),
    };
};
//# sourceMappingURL=unlink-shop.command.js.map