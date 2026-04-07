import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ShopifyMetafieldOptionsDto } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

export const getMetafieldOptionsQuery = async (input: {
  shopId: string;
}): Promise<ShopifyMetafieldOptionsDto> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  return shopifyAdminApi.getMetafieldOptions({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
  });
};
