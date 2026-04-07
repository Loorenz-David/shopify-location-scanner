import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type { ShopifyMetafieldOptionsDto } from "../contracts/shopify.contract.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";

export const removeMetafieldOptionCommand = async (input: {
  shopId: string;
  optionValue: string;
}): Promise<ShopifyMetafieldOptionsDto> => {
  const shop = await shopRepository.findById(input.shopId);
  if (!shop || !shop.accessToken) {
    throw new NotFoundError("Linked Shopify store not found");
  }

  const current = await shopifyAdminApi.getMetafieldOptions({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
  });

  const optionValue = input.optionValue.trim();
  const exists = current.options.some((option) => option.value === optionValue);
  if (!exists) {
    throw new ValidationError("Metafield option not found", {
      optionValue,
    });
  }

  const nextOptions = current.options
    .map((option) => option.value)
    .filter((value) => value !== optionValue);

  return shopifyAdminApi.upsertMetafieldOptions({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    options: nextOptions,
  });
};
