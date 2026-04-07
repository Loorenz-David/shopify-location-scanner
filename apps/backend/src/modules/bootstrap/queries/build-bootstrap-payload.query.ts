import type { BootstrapPayload } from "../contracts/bootstrap.contract.js";
import { getMetafieldOptionsQuery } from "../../shopify/queries/get-metafield-options.query.js";

export const buildBootstrapPayloadQuery = async (input: {
  shopId: string;
}): Promise<BootstrapPayload> => {
  const metafields = await getMetafieldOptionsQuery({
    shopId: input.shopId,
  });

  return {
    shopify: {
      metafields,
    },
  };
};
