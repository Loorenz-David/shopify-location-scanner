import { ForbiddenError } from "../../../shared/errors/http-errors.js";
export const requireAdminMiddleware = (req, _res, next) => {
    if (req.authUser.role !== "admin") {
        next(new ForbiddenError("Admin role is required"));
        return;
    }
    next();
};
//# sourceMappingURL=require-admin.middleware.js.map