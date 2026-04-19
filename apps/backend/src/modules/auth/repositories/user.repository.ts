import { prisma } from "../../../shared/database/prisma-client.js";
import type { AuthUser } from "../domain/auth-user.js";

type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "manager" | "worker" | "seller";
  shopId: string | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

const toDomain = (record: UserRecord): AuthUser => {
  return {
    id: record.id,
    username: record.username,
    passwordHash: record.passwordHash,
    role: record.role,
    shopId: record.shopId,
    tokenVersion: record.tokenVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const userRepository = {
  async findByUsername(username: string): Promise<AuthUser | null> {
    const record = await prisma.user.findUnique({
      where: { username },
    });

    return record ? toDomain(record) : null;
  },

  async findById(id: string): Promise<AuthUser | null> {
    const record = await prisma.user.findUnique({
      where: { id },
    });

    return record ? toDomain(record) : null;
  },

  async countUsers(): Promise<number> {
    return prisma.user.count();
  },

  async countAdmins(): Promise<number> {
    return prisma.user.count({
      where: {
        role: "admin",
      },
    });
  },

  async create(input: {
    username: string;
    passwordHash: string;
    role: "admin" | "worker";
    shopId?: string | null;
  }): Promise<AuthUser> {
    const record = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
        shopId: input.shopId ?? null,
      },
    });

    return toDomain(record);
  },

  async assignShop(userId: string, shopId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { shopId },
    });
  },

  async assignUnlinkedUsersToShop(shopId: string): Promise<void> {
    await prisma.user.updateMany({
      where: {
        shopId: null,
      },
      data: {
        shopId,
      },
    });
  },

  async unassignUsersFromShop(shopId: string): Promise<void> {
    await prisma.user.updateMany({
      where: {
        shopId,
      },
      data: {
        shopId: null,
      },
    });
  },

  async findAllByShop(shopId: string): Promise<AuthUser[]> {
    const records = await prisma.user.findMany({
      where: { shopId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toDomain);
  },

  async updateRole(
    userId: string,
    role: "admin" | "manager" | "worker" | "seller",
  ): Promise<AuthUser> {
    const record = await prisma.user.update({
      where: { id: userId },
      data: { role, tokenVersion: { increment: 1 } },
    });
    return toDomain(record);
  },

  async incrementTokenVersion(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  },

  async updateLastOnline(userId: string, date: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastOnline: date },
    });
  },
};
