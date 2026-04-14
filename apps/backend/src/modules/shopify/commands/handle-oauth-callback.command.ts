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
import { backendPublicUrl } from "../../../config/env.js";
import { logger } from "../../../shared/logging/logger.js";

export const handleOauthCallbackCommand = async (input: {
  query: ShopifyCallbackQuery;
  rawParams: Record<string, string>;
  skipHmacValidation?: boolean;
}): Promise<{ shop: { id: string; shopDomain: string } }> => {
  logger.info("Shopify OAuth callback command started", {
    shop: input.query.shop,
    rawParamKeys: Object.keys(input.rawParams),
    skipHmacValidation: input.skipHmacValidation ?? false,
  });

  if (input.skipHmacValidation) {
    logger.warn("Shopify HMAC validation SKIPPED — debug mode only, disable SHOPIFY_DEBUG_SKIP_HMAC before production use");
  } else {
    const hmacValid = verifyShopifyCallbackHmac(input.rawParams);
    logger.info("Shopify HMAC validation result", {
      shop: input.query.shop,
      valid: hmacValid,
    });
    if (!hmacValid) {
      throw new UnauthorizedError("Invalid Shopify callback signature");
    }
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

  logger.info("Shopify OAuth token exchange started", {
    shop: input.query.shop,
    redirectUri: `${backendPublicUrl}/api/shopify/oauth/callback`,
  });

  const accessToken = await shopifyAdminApi.exchangeCodeForAccessToken({
    shopDomain: input.query.shop,
    code: input.query.code,
    redirectUri: `${backendPublicUrl}/api/shopify/oauth/callback`,
  });

  if (!accessToken) {
    logger.error("Shopify OAuth token exchange returned no token", {
      shop: input.query.shop,
    });
    throw new ValidationError("Shopify OAuth token exchange failed");
  }

  logger.info("Shopify OAuth token exchange succeeded", {
    shop: input.query.shop,
  });

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

  logger.info("Shopify OAuth callback completed", {
    shopId: shop.id,
    shopDomain: shop.shopDomain,
    userId: user.id,
  });

  return {
    shop: {
      id: shop.id,
      shopDomain: shop.shopDomain,
    },
  };
};
