import { prisma } from "../../../shared/database/prisma-client.js";

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  shopId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const toDomain = (record: {
  id: string;
  userId: string;
  shopId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): PushSubscriptionRecord => ({
  id: record.id,
  userId: record.userId,
  shopId: record.shopId,
  endpoint: record.endpoint,
  p256dh: record.p256dh,
  auth: record.auth,
});

const SELECT = {
  id: true,
  userId: true,
  shopId: true,
  endpoint: true,
  p256dh: true,
  auth: true,
} as const;

export const pushSubscriptionRepository = {
  async upsert(input: {
    userId: string;
    shopId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }): Promise<PushSubscriptionRecord> {
    const record = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: input.userId, endpoint: input.endpoint },
      },
      update: { p256dh: input.p256dh, auth: input.auth },
      create: {
        userId: input.userId,
        shopId: input.shopId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async deleteByEndpoint(input: {
    userId: string;
    endpoint: string;
  }): Promise<boolean> {
    const existing = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: { userId: input.userId, endpoint: input.endpoint },
      },
    });

    if (!existing) return false;

    await prisma.pushSubscription.delete({
      where: {
        userId_endpoint: { userId: input.userId, endpoint: input.endpoint },
      },
    });

    return true;
  },

  async findByUser(input: {
    userId: string;
  }): Promise<PushSubscriptionRecord[]> {
    const records = await prisma.pushSubscription.findMany({
      where: { userId: input.userId },
      select: SELECT,
    });

    return records.map(toDomain);
  },

  async findByShopAndRole(input: {
    shopId: string;
    role: string;
  }): Promise<PushSubscriptionRecord[]> {
    const records = await prisma.pushSubscription.findMany({
      where: {
        shopId: input.shopId,
        user: { role: input.role as any },
      },
      select: SELECT,
    });

    return records.map(toDomain);
  },
};
