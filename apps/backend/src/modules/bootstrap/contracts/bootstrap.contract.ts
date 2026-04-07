import type { ShopifyMetafieldOptionsDto } from "../../shopify/contracts/shopify.contract.js";

export type BootstrapPayload = {
  shopify: {
    metafields: ShopifyMetafieldOptionsDto;
  };
};
