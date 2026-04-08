export class AppError extends Error {
    code;
    statusCode;
    details;
    expose;
    constructor(message, options) {
        super(message);
        this.name = "AppError";
        this.code = options.code;
        this.statusCode = options.statusCode;
        this.details = options.details;
        this.expose = options.expose ?? true;
    }
}
//# sourceMappingURL=app-error.js.map