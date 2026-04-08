import { getMetafieldOptionsQuery } from "../../shopify/queries/get-metafield-options.query.js";
export const buildBootstrapPayloadQuery = async (input) => {
    const metafields = await getMetafieldOptionsQuery({
        shopId: input.shopId,
    });
    return {
        shopify: {
            metafields,
        },
    };
};
//# sourceMappingURL=build-bootstrap-payload.query.js.map