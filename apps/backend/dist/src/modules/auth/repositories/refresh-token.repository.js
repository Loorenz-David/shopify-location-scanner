import { prisma } from "../../../shared/database/prisma-client.js";
export const refreshTokenRepository = {
    async create(input) {
        await prisma.refreshToken.create({
            data: {
                userId: input.userId,
                tokenHash: input.tokenHash,
            },
        });
    },
    async findActiveByHash(tokenHash) {
        const token = await prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
            },
            select: {
                userId: true,
            },
        });
        return token;
    },
    async revokeByHash(tokenHash) {
        await prisma.refreshToken.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    },
};
//# sourceMappingURL=refresh-token.repository.js.map