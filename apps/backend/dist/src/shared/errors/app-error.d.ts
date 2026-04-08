export type AppErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INTERNAL_ERROR";
export declare class AppError extends Error {
    readonly code: AppErrorCode;
    readonly statusCode: number;
    readonly details?: unknown;
    readonly expose: boolean;
    constructor(message: string, options: {
        code: AppErrorCode;
        statusCode: number;
        details?: unknown;
        expose?: boolean;
    });
}
//# sourceMappingURL=app-error.d.ts.map