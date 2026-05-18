import { addShopifyMetafieldOptionsApi } from "../../shopify/api/add-metafield-options.api";
import { deleteShopifyMetafieldOptionApi } from "../../shopify/api/delete-metafield-option.api";
import { setShopifyMetafieldOptionsApi } from "../../shopify/api/set-metafield-options.api";
export async function replaceLocationOptionsApi(options) {
    await setShopifyMetafieldOptionsApi({ options });
}
export async function addLocationOptionsApi(options) {
    return addShopifyMetafieldOptionsApi({ options });
}
export async function deleteLocationOptionApi(optionValue) {
    return deleteShopifyMetafieldOptionApi(optionValue);
}
