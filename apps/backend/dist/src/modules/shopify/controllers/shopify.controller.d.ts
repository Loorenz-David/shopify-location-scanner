import type { Request, Response } from "express";
export declare const shopifyController: {
    handleProductsUpdateWebhook: (req: Request, res: Response) => Promise<void>;
    handleOrdersPaidWebhook: (req: Request, res: Response) => Promise<void>;
    getLinkedShop: (req: Request, res: Response) => Promise<void>;
    install: (req: Request, res: Response) => Promise<void>;
    callback: (req: Request, res: Response) => Promise<void>;
    getProduct: (req: Request, res: Response) => Promise<void>;
    updateLocation: (req: Request, res: Response) => Promise<void>;
    updateLocationByIdentifier: (req: Request, res: Response) => Promise<void>;
    queryBySku: (req: Request, res: Response) => Promise<void>;
    metafieldOptions: (req: Request, res: Response) => Promise<void>;
    setMetafieldOptions: (req: Request, res: Response) => Promise<void>;
    appendMetafieldOptions: (req: Request, res: Response) => Promise<void>;
    removeMetafieldOption: (req: Request, res: Response) => Promise<void>;
    unlinkShop: (req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=shopify.controller.d.ts.map