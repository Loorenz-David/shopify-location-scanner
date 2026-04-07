export type AuthUser = {
    id: string;
    username: string;
    passwordHash: string;
    role: "admin" | "worker";
    shopId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type AuthPrincipal = {
    userId: string;
    username: string;
    role: "admin" | "worker";
    shopId: string | null;
};
//# sourceMappingURL=auth-user.d.ts.map