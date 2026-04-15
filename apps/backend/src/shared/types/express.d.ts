declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser: {
        userId: string;
        username: string;
        role: "admin" | "manager" | "worker" | "seller";
        shopId: string | null;
        tokenVersion: number;
      };
      webhookContext?: {
        shopId: string;
        shopDomain: string;
        topic: string;
        webhookId: string;
        rawBody: string;
      };
    }
  }
}

export {};
