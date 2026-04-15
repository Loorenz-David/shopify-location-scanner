import { prisma } from "../../../shared/database/prisma-client.js";

export const refreshTokenRepository = {
  async create(input: { userId: string; tokenHash: string }): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
      },
    });
  },

  async findActiveByHash(
    tokenHash: string,
  ): Promise<{ userId: string } | null> {
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

  async revokeByHash(tokenHash: string): Promise<void> {
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

  async revokeAllByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },
};
