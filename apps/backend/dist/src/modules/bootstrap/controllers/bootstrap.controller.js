import { buildBootstrapPayloadQuery } from "../queries/build-bootstrap-payload.query.js";
export const bootstrapController = {
    getPayload: async (req, res) => {
        const payload = await buildBootstrapPayloadQuery({
            shopId: req.authUser.shopId,
        });
        res.status(200).json({ payload });
    },
};
//# sourceMappingURL=bootstrap.controller.js.map