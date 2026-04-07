import { NotFoundError } from "../errors/http-errors.js";
export const notFoundMiddleware = (req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};
//# sourceMappingURL=not-found-middleware.js.map