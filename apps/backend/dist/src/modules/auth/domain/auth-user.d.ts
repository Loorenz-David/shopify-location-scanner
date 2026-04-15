export type AuthUser = {
    id: string;
    username: string;
    passwordHash: string;
    role: "admin" | "manager" | "worker" | "seller";
    shopId: string | null;
    tokenVersion: number;
    createdAt: Date;
    updatedAt: Date;
};
export type AuthPrincipal = {
    userId: string;
    username: string;
    role: "admin" | "manager" | "worker" | "seller";
    shopId: string | null;
    tokenVersion: number;
};
//# sourceMappingURL=auth-user.d.ts.map