import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type { ShopifyCallbackQuery } from "../contracts/shopify.contract.js";
import { shopifyOauthStateService } from "../integrations/shopify-oauth-state.service.js";
import { verifyShopifyCallbackHmac } from "../integrations/shopify-hmac.service.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { userRepository } from "../../auth/repositories/user.repository.js";
import { env } from "../../../config/env.js";

export const handleOauthCallbackCommand = async (input: {
  query: ShopifyCallbackQuery;
  rawParams: Record<string, string>;
}): Promise<{ shop: { id: string; shopDomain: string } }> => {
  const hmacValid = verifyShopifyCallbackHmac(input.rawParams);
  if (!hmacValid) {
    throw new UnauthorizedError("Invalid Shopify callback signature");
  }

  const statePayload = shopifyOauthStateService.verify(input.query.state);
  const user = await userRepository.findById(statePayload.userId);

  if (!user) {
    throw new UnauthorizedError("Invalid OAuth state");
  }

  if (user.role !== "admin") {
    throw new ForbiddenError("Only admin users can connect a Shopify store");
  }

  if (user.shopId) {
    const linked = await shopRepository.findById(user.shopId);
    if (linked && linked.shopDomain !== input.query.shop) {
      throw new ConflictError(
        "User is already linked to a different Shopify store",
      );
    }
  }

  const existingShop = await shopRepository.findAnyLinkedShop();
  if (existingShop && existingShop.shopDomain !== input.query.shop) {
    throw new ConflictError(
      "A different Shopify store is already linked. Relink is required by an admin.",
    );
  }

  const accessToken = await shopifyAdminApi.exchangeCodeForAccessToken({
    shopDomain: input.query.shop,
    code: input.query.code,
    redirectUri: `${env.SHOPIFY_APP_URL}/api/shopify/oauth/callback`,
  });

  if (!accessToken) {
    throw new ValidationError("Shopify OAuth token exchange failed");
  }

  const shop = await shopRepository.upsertByDomain({
    shopDomain: input.query.shop,
    accessToken,
  });

  await userRepository.assignShop(user.id, shop.id);
  await userRepository.assignUnlinkedUsersToShop(shop.id);
  await shopifyAdminApi.ensureWebhookSubscriptions({
    shopDomain: shop.shopDomain,
    accessToken,
  });

  return {
    shop: {
      id: shop.id,
      shopDomain: shop.shopDomain,
    },
  };
};
