import { getMetafieldOptionsQuery } from "../../shopify/queries/get-metafield-options.query.js";
import { getLogisticLocationsQuery } from "../../logistic/queries/get-logistic-locations.query.js";
import { env } from "../../../config/env.js";
export const buildBootstrapPayloadQuery = async (input) => {
    const [metafields, logisticLocations] = await Promise.all([
        getMetafieldOptionsQuery({ shopId: input.shopId }),
        getLogisticLocationsQuery({ shopId: input.shopId }),
    ]);
    return {
        shopify: {
            metafields,
        },
        logisticLocations,
        vapidPublicKey: env.VAPID_PUBLIC_KEY,
    };
};
//# sourceMappingURL=build-bootstrap-payload.query.js.map