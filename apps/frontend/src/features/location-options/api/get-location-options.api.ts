import { getShopifyMetafieldOptionsApi } from "../../shopify/api/get-metafield-options.api";

export async function getLocationOptionsApi(): Promise<string[]> {
  const response = await getShopifyMetafieldOptionsApi();
  return response.metafield.options.map((option) => option.value);
}
