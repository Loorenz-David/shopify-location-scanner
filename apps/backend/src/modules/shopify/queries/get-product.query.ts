import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ShopifyProductLocationDto } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

const normalizeProductId = (productId: string): string => {
  if (productId.startsWith("gid://shopify/Product/")) {
    return productId;
  }

  if (/^\d+$/.test(productId)) {
    return `gid://shopify/Product/${productId}`;
  }

  return productId;
};

export const getProductQuery = async (input: {
  shopId: string;
  productId: string;
}): Promise<ShopifyProductLocationDto> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  const product = await shopifyAdminApi.getProductWithLocation({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    productId: normalizeProductId(input.productId),
  });

  return {
    id: product.id,
    title: product.title,
    itemCategory: product.itemCategory,
    barcode: product.barcode,
    price: product.price,
    itemHeight: product.itemHeight,
    itemWidth: product.itemWidth,
    itemDepth: product.itemDepth,
    volume: product.volume,
    location: product.location,
    updatedAt: product.updatedAt,
  };
};
