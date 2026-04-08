import { AppError } from "./app-error.js";
export class ValidationError extends AppError {
    constructor(message = "Request validation failed", details) {
        super(message, { code: "VALIDATION_ERROR", statusCode: 400, details });
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Resource not found", details) {
        super(message, { code: "NOT_FOUND", statusCode: 404, details });
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details) {
        super(message, { code: "UNAUTHORIZED", statusCode: 401, details });
    }
}
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden", details) {
        super(message, { code: "FORBIDDEN", statusCode: 403, details });
    }
}
export class ConflictError extends AppError {
    constructor(message = "Conflict", details) {
        super(message, { code: "CONFLICT", statusCode: 409, details });
    }
}
//# sourceMappingURL=http-errors.js.map