import type { NextFunction, Request, RequestHandler, Response } from "express";
export declare const asyncHandler: (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => RequestHandler;
//# sourceMappingURL=async-handler.d.ts.map