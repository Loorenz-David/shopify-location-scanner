import { logger } from "../logging/logger.js";
const suspiciousPathFragments = [
    "/vendor/phpunit",
    "/.env",
    "/wp-admin",
    "/wp-login.php",
    "/phpmyadmin",
    "/.git",
    "/boaform",
    "/cgi-bin",
    "eval-stdin.php",
];
const isSuspiciousPath = (path) => {
    const lowerPath = path.toLowerCase();
    return suspiciousPathFragments.some((fragment) => lowerPath.includes(fragment.toLowerCase()));
};
export const requestFilterMiddleware = (req, res, next) => {
    const path = req.path || req.originalUrl || "";
    if (!isSuspiciousPath(path)) {
        next();
        return;
    }
    logger.warn("Suspicious request blocked", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
    });
    res.status(404).json({
        ok: false,
        code: "NOT_FOUND",
        message: "Not found",
    });
};
//# sourceMappingURL=request-filter-middleware.js.map