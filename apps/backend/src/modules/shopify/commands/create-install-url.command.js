import {
  ConflictError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { env } from "../../../config/env.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { shopifyOauthStateService } from "../integrations/shopify-oauth-state.service.js";
const resolveShopDomain = (input) => {
  if (input.shopDomain) {
    return input.shopDomain.trim().toLowerCase();
  }
  const storeName = input.storeName?.trim().toLowerCase();
  if (!storeName) {
    throw new ValidationError("Either shopDomain or storeName is required");
  }
  return `${storeName}.myshopify.com`;
};
export const createInstallUrlCommand = async (input, userId) => {
  const shopDomain = resolveShopDomain(input);
  const existingShop = await shopRepository.findAnyLinkedShop();
  if (existingShop && existingShop.shopDomain !== shopDomain) {
    throw new ConflictError(
      "A different Shopify store is already linked. Relink is required by an admin.",
    );
  }
  const state = shopifyOauthStateService.sign(userId);
  const redirectUri = `${env.SHOPIFY_APP_URL}/api/shopify/oauth/callback`;
  const scopes = env.SHOPIFY_SCOPES;
  const authorizationUrl = new URL(
    `https://${shopDomain}/admin/oauth/authorize`,
  );
  authorizationUrl.searchParams.set("client_id", env.SHOPIFY_API_KEY);
  authorizationUrl.searchParams.set("scope", scopes);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);
  if (!authorizationUrl.toString().startsWith("https://")) {
    throw new ValidationError("Invalid Shopify authorization URL");
  }
  return { authorizationUrl: authorizationUrl.toString() };
};
//# sourceMappingURL=create-install-url.command.js.map
