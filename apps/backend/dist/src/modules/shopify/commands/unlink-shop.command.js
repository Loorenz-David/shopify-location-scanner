import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
export const unlinkShopCommand = async (input) => {
    const existing = await shopRepository.findById(input.shopId);
    if (!existing) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    if (existing.accessToken) {
        try {
            await shopifyAdminApi.removeManagedWebhookSubscriptions({
                shopDomain: existing.shopDomain,
                accessToken: existing.accessToken,
            });
        }
        catch (error) {
            logger.warn("Failed to remove managed Shopify webhook subscriptions", {
                shopId: existing.id,
                shopDomain: existing.shopDomain,
                error,
            });
        }
    }
    const deleted = await shopRepository.deleteById(existing.id);
    return {
        shopDomain: deleted.shopDomain,
        createdAt: deleted.createdAt.toISOString(),
    };
};
//# sourceMappingURL=unlink-shop.command.js.map