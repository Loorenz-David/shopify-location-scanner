import { randomUUID } from "node:crypto";
export const requestContextMiddleware = (req, res, next) => {
    req.requestId = req.headers["x-request-id"]?.toString() || randomUUID();
    res.setHeader("x-request-id", req.requestId);
    next();
};
//# sourceMappingURL=request-context-middleware.js.map