import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { ResolveItemIdType } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";

const normalizeProductId = (productId: string): string => {
  if (productId.startsWith("gid://shopify/Product/")) {
    return productId;
  }

  if (/^\d+$/.test(productId)) {
    return `gid://shopify/Product/${productId}`;
  }

  return productId;
};

export const resolveProductIdCommand = async (input: {
  idType: ResolveItemIdType;
  itemId: string;
  shopDomain: string;
  accessToken: string;
}): Promise<string> => {
  if (input.idType === "product_id") {
    return normalizeProductId(input.itemId);
  }

  if (input.idType === "handle") {
    const resolved = await shopifyAdminApi.resolveProductIdByHandle({
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      handle: input.itemId,
    });

    if (!resolved) {
      throw new NotFoundError("No product found for the given handle");
    }

    return resolved;
  }

  if (input.idType === "barcode") {
    const resolved = await shopifyAdminApi.resolveProductIdByBarcode({
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      barcode: input.itemId,
    });

    if (!resolved) {
      throw new NotFoundError("No product found for the given barcode");
    }

    return resolved;
  }

  const resolved = await shopifyAdminApi.resolveProductIdBySku({
    shopDomain: input.shopDomain,
    accessToken: input.accessToken,
    sku: input.itemId,
  });

  if (!resolved) {
    throw new NotFoundError("No product found for the given sku");
  }

  return resolved;
};
