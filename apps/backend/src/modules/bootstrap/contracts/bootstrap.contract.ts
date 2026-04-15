import type { ShopifyMetafieldOptionsDto } from "../../shopify/contracts/shopify.contract.js";
import type { LogisticLocationDto } from "../../logistic/contracts/logistic.contract.js";

export type BootstrapPayload = {
  shopify: {
    metafields: ShopifyMetafieldOptionsDto;
  };
  logisticLocations: LogisticLocationDto[];
  vapidPublicKey: string;
};
