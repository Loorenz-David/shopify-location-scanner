declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser: {
        userId: string;
        username: string;
        role: "admin" | "worker";
        shopId: string | null;
      };
    }
  }
}

export {};
