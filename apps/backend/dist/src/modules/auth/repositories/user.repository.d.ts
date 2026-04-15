import type { AuthUser } from "../domain/auth-user.js";
export declare const userRepository: {
    findByUsername(username: string): Promise<AuthUser | null>;
    findById(id: string): Promise<AuthUser | null>;
    countUsers(): Promise<number>;
    countAdmins(): Promise<number>;
    create(input: {
        username: string;
        passwordHash: string;
        role: "admin" | "worker";
        shopId?: string | null;
    }): Promise<AuthUser>;
    assignShop(userId: string, shopId: string): Promise<void>;
    assignUnlinkedUsersToShop(shopId: string): Promise<void>;
    unassignUsersFromShop(shopId: string): Promise<void>;
    findAllByShop(shopId: string): Promise<AuthUser[]>;
    updateRole(userId: string, role: "admin" | "manager" | "worker" | "seller"): Promise<AuthUser>;
    incrementTokenVersion(userId: string): Promise<void>;
};
//# sourceMappingURL=user.repository.d.ts.map