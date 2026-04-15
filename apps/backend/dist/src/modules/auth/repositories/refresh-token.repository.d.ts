export declare const refreshTokenRepository: {
    create(input: {
        userId: string;
        tokenHash: string;
    }): Promise<void>;
    findActiveByHash(tokenHash: string): Promise<{
        userId: string;
    } | null>;
    revokeByHash(tokenHash: string): Promise<void>;
    revokeAllByUserId(userId: string): Promise<void>;
};
//# sourceMappingURL=refresh-token.repository.d.ts.map