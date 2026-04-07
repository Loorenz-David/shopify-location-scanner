import { addShopifyMetafieldOptionsApi } from "../../shopify/api/add-metafield-options.api";
import { deleteShopifyMetafieldOptionApi } from "../../shopify/api/delete-metafield-option.api";
import { setShopifyMetafieldOptionsApi } from "../../shopify/api/set-metafield-options.api";
import type { ShopifyMetafieldResponseDto } from "../../shopify/types/shopify.dto";

export async function replaceLocationOptionsApi(
  options: string[],
): Promise<void> {
  await setShopifyMetafieldOptionsApi({ options });
}

export async function addLocationOptionsApi(
  options: string[],
): Promise<ShopifyMetafieldResponseDto> {
  return addShopifyMetafieldOptionsApi({ options });
}

export async function deleteLocationOptionApi(
  optionValue: string,
): Promise<ShopifyMetafieldResponseDto> {
  return deleteShopifyMetafieldOptionApi(optionValue);
}
