import type { AuthPrincipal } from "../domain/auth-user.js";
export declare const tokenService: {
    createAccessToken(principal: AuthPrincipal): string;
    verifyAccessToken(token: string): AuthPrincipal;
    createRefreshToken(): string;
    hashRefreshToken(token: string): string;
};
//# sourceMappingURL=token.service.d.ts.map