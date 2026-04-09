import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import { userRepository } from "../../auth/repositories/user.repository.js";
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
    await userRepository.unassignUsersFromShop(existing.id);
    const unlinked = await shopRepository.clearAccessToken(existing.id);
    return {
        shopDomain: unlinked.shopDomain,
        createdAt: unlinked.createdAt.toISOString(),
    };
};
//# sourceMappingURL=unlink-shop.command.js.map