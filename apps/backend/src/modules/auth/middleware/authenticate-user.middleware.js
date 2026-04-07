import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import { tokenService } from "../integrations/token.service.js";
const getBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        return null;
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }
    return token;
};
export const authenticateUserMiddleware = (req, _res, next) => {
    const token = getBearerToken(req.header("authorization"));
    if (!token) {
        next(new UnauthorizedError("Missing bearer token"));
        return;
    }
    try {
        const principal = tokenService.verifyAccessToken(token);
        req.authUser = principal;
        next();
    }
    catch {
        next(new UnauthorizedError("Invalid access token"));
    }
};
//# sourceMappingURL=authenticate-user.middleware.js.map