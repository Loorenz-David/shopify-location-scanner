import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type {
  SetMetafieldOptionsInput,
  ShopifyMetafieldOptionsDto,
} from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

const normalizeOptions = (options: string[]): string[] => {
  const unique = new Set<string>();

  for (const option of options) {
    const value = option.trim();
    if (value.length > 0) {
      unique.add(value);
    }
  }

  return [...unique];
};

export const setMetafieldOptionsCommand = async (input: {
  shopId: string;
  payload: SetMetafieldOptionsInput;
}): Promise<ShopifyMetafieldOptionsDto> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  const normalizedOptions = normalizeOptions(input.payload.options);
  if (normalizedOptions.length === 0) {
    throw new ValidationError("At least one metafield option is required");
  }

  return shopifyAdminApi.upsertMetafieldOptions({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    options: normalizedOptions,
  });
};
