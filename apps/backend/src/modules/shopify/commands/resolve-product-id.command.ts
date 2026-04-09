import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import type { ResolveItemIdType } from "../contracts/shopify.contract.js";
import { resolveHandleFallback } from "../integrations/resolve-handle-fallback.integration.js";
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
  logger.info("Resolve product id started", {
    idType: input.idType,
    itemId: input.itemId,
    shopDomain: input.shopDomain,
  });

  if (input.idType === "product_id") {
    const resolved = normalizeProductId(input.itemId);
    logger.info("Resolve product id succeeded", {
      idType: input.idType,
      itemId: input.itemId,
      resolvedProductId: resolved,
      strategy: "normalized_product_id",
    });
    return resolved;
  }

  if (input.idType === "handle") {
    const resolved = await shopifyAdminApi.resolveProductIdByHandle({
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      handle: input.itemId,
    });

    if (resolved) {
      logger.info("Resolve product id succeeded", {
        idType: input.idType,
        itemId: input.itemId,
        resolvedProductId: resolved,
        strategy: "handle_lookup",
      });

      return resolved;
    }

    const fallbackHandle = await resolveHandleFallback({
      handle: input.itemId,
      shopDomain: input.shopDomain,
    });

    if (fallbackHandle) {
      const fallbackResolved = await shopifyAdminApi.resolveProductIdByHandle({
        shopDomain: input.shopDomain,
        accessToken: input.accessToken,
        handle: fallbackHandle,
      });

      if (fallbackResolved) {
        logger.info("Resolve product id succeeded", {
          idType: input.idType,
          itemId: input.itemId,
          resolvedProductId: fallbackResolved,
          fallbackHandle,
          strategy: "handle_lookup_redirect_fallback",
        });

        return fallbackResolved;
      }
    }

    logger.warn("Resolve product id failed", {
      idType: input.idType,
      itemId: input.itemId,
      strategy: fallbackHandle
        ? "handle_lookup_redirect_fallback"
        : "handle_lookup",
      reason: "no_match",
      fallbackHandle,
    });

    throw new NotFoundError("No product found for the given handle");
  }

  if (input.idType === "barcode") {
    const resolved = await shopifyAdminApi.resolveProductIdByBarcode({
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      barcode: input.itemId,
    });

    if (!resolved) {
      logger.warn("Resolve product id failed", {
        idType: input.idType,
        itemId: input.itemId,
        strategy: "barcode_lookup",
        reason: "no_match",
      });
      throw new NotFoundError("No product found for the given barcode");
    }

    logger.info("Resolve product id succeeded", {
      idType: input.idType,
      itemId: input.itemId,
      resolvedProductId: resolved,
      strategy: "barcode_lookup",
    });

    return resolved;
  }

  const resolved = await shopifyAdminApi.resolveProductIdBySku({
    shopDomain: input.shopDomain,
    accessToken: input.accessToken,
    sku: input.itemId,
  });

  if (!resolved) {
    logger.warn("Resolve product id failed", {
      idType: input.idType,
      itemId: input.itemId,
      strategy: "sku_lookup",
      reason: "no_match",
    });
    throw new NotFoundError("No product found for the given sku");
  }

  logger.info("Resolve product id succeeded", {
    idType: input.idType,
    itemId: input.itemId,
    resolvedProductId: resolved,
    strategy: "sku_lookup",
  });

  return resolved;
};
