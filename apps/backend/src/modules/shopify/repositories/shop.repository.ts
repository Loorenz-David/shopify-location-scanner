import { prisma } from "../../../shared/database/prisma-client.js";
import type { LinkedShop } from "../domain/shopify-shop.js";

type ShopRecord = {
  id: string;
  shopDomain: string;
  accessToken: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toDomain = (record: ShopRecord): LinkedShop => {
  return {
    id: record.id,
    shopDomain: record.shopDomain,
    accessToken: record.accessToken,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const shopRepository = {
  async findAnyLinkedShop(): Promise<LinkedShop | null> {
    const record = await prisma.shop.findFirst({
      orderBy: { createdAt: "asc" },
    });

    return record ? toDomain(record) : null;
  },

  async findById(id: string): Promise<LinkedShop | null> {
    const record = await prisma.shop.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  },

  async findByDomain(shopDomain: string): Promise<LinkedShop | null> {
    const record = await prisma.shop.findUnique({ where: { shopDomain } });
    return record ? toDomain(record) : null;
  },

  async upsertByDomain(input: {
    shopDomain: string;
    accessToken: string;
  }): Promise<LinkedShop> {
    const record = await prisma.shop.upsert({
      where: { shopDomain: input.shopDomain },
      create: {
        shopDomain: input.shopDomain,
        accessToken: input.accessToken,
      },
      update: {
        accessToken: input.accessToken,
      },
    });

    return toDomain(record);
  },

  async deleteById(id: string): Promise<LinkedShop> {
    const record = await prisma.shop.delete({
      where: { id },
    });

    return toDomain(record);
  },
};
