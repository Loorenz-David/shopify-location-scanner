import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ShopifyLinkedShopDto } from "../contracts/shopify.contract.js";
import { shopRepository } from "../repositories/shop.repository.js";

export const getLinkedShopQuery = async (input: {
  shopId: string;
}): Promise<ShopifyLinkedShopDto> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  return {
    shopDomain: shop.shopDomain,
    createdAt: shop.createdAt.toISOString(),
  };
};
