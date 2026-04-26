import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ShopifySkuSearchItemDto } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
import type { ScanValueType } from "../../../shared/utils/scan-value-normalizer.js";

export const searchProductsBySkuQuery = async (input: {
  shopId: string;
  sku: string;
  type?: ScanValueType;
}): Promise<ShopifySkuSearchItemDto[]> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  return shopifyAdminApi.searchProductsBySku({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    sku: input.sku,
    type: input.type,
    limit: 10,
  });
};
