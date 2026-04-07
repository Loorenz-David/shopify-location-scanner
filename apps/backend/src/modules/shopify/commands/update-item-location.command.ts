import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type {
  ShopifyProductLocationDto,
  UpdateItemLocationInput,
} from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { userRepository } from "../../auth/repositories/user.repository.js";
import type { ScanHistoryRecord } from "../../scanner/domain/scan-history.js";

export const updateItemLocationCommand = async (input: {
  shopId: string;
  userId: string;
  resolvedProductId: string;
  originalItemId: string;
  idType: "product_id" | "handle" | "sku";
  payload: UpdateItemLocationInput;
}): Promise<{
  product: ShopifyProductLocationDto & { previousLocation: string | null };
  historyItem: ScanHistoryRecord;
}> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  const before = await shopifyAdminApi.getProductWithLocation({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    productId: input.resolvedProductId,
  });

  if (before.location !== input.payload.location) {
    await shopifyAdminApi.updateProductLocation({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      productId: input.resolvedProductId,
      location: input.payload.location,
    });
  }

  const after = await shopifyAdminApi.getProductWithLocation({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    productId: input.resolvedProductId,
  });

  const user = await userRepository.findById(input.userId);

  const historyItem = await scanHistoryRepository.appendLocationEvent({
    shopId: shop.id,
    userId: input.userId,
    username: user?.username ?? "unknown",
    productId: input.resolvedProductId,
    itemSku: input.idType === "sku" ? input.originalItemId : after.sku,
    itemImageUrl: after.imageUrl,
    itemType: input.idType,
    itemTitle: after.title,
    location: after.location ?? input.payload.location,
  });

  return {
    product: {
      id: after.id,
      title: after.title,
      location: after.location,
      previousLocation: before.location,
      updatedAt: after.updatedAt,
    },
    historyItem,
  };
};
