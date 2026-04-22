import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  LogisticLocationDto,
  LogisticZoneType,
} from "../contracts/logistic.contract.js";

const SELECT = {
  id: true,
  shopId: true,
  location: true,
  zoneType: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toDomain = (record: {
  id: string;
  shopId: string;
  location: string;
  zoneType: string;
  createdAt: Date;
  updatedAt: Date;
}): LogisticLocationDto => ({
  id: record.id,
  shopId: record.shopId,
  location: record.location,
  zoneType: record.zoneType as LogisticZoneType,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const logisticLocationRepository = {
  async findByShop(input: {
    shopId: string;
    q?: string;
    zoneType?: string;
  }): Promise<LogisticLocationDto[]> {
    const records = await prisma.logisticLocation.findMany({
      where: {
        shopId: input.shopId,
        ...(input.zoneType ? { zoneType: input.zoneType as any } : {}),
        ...(input.q ? { location: { contains: input.q } } : {}),
      },
      orderBy: { location: "asc" },
      select: SELECT,
    });

    return records.map(toDomain);
  },

  async findById(input: {
    id: string;
    shopId: string;
  }): Promise<LogisticLocationDto | null> {
    const record = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
      select: SELECT,
    });

    return record ? toDomain(record) : null;
  },

  async create(input: {
    shopId: string;
    location: string;
    zoneType: string;
  }): Promise<LogisticLocationDto> {
    const record = await prisma.logisticLocation.create({
      data: {
        shopId: input.shopId,
        location: input.location,
        zoneType: input.zoneType as any,
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async update(input: {
    id: string;
    shopId: string;
    location?: string;
    zoneType?: string;
  }): Promise<LogisticLocationDto | null> {
    const existing = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
    });

    if (!existing) return null;

    const record = await prisma.logisticLocation.update({
      where: { id: input.id },
      data: {
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.zoneType !== undefined
          ? { zoneType: input.zoneType as any }
          : {}),
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async delete(input: { id: string; shopId: string }): Promise<boolean> {
    const existing = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
    });

    if (!existing) return false;

    await prisma.logisticLocation.delete({ where: { id: input.id } });
    return true;
  },
};
