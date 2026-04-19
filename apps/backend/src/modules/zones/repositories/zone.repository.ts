import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type {
  CreateZoneInput,
  UpdateZoneInput,
} from "../contracts/zone.contract.js";
import type { StoreZone } from "../domain/zone.js";

const toDomain = (record: {
  id: string;
  shopId: string;
  label: string;
  type: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
  floorPlanId: string | null;
  widthCm: number | null;
  depthCm: number | null;
}): StoreZone => ({
  id: record.id,
  shopId: record.shopId,
  label: record.label,
  type: record.type as StoreZone["type"],
  xPct: record.xPct,
  yPct: record.yPct,
  widthPct: record.widthPct,
  heightPct: record.heightPct,
  sortOrder: record.sortOrder,
  floorPlanId: record.floorPlanId,
  widthCm: record.widthCm,
  depthCm: record.depthCm,
});

export const zoneRepository = {
  async list(shopId: string, floorPlanId?: string | null): Promise<StoreZone[]> {
    const rows = await prisma.storeZone.findMany({
      where: {
        shopId,
        ...(floorPlanId !== undefined ? { floorPlanId } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });

    return rows.map(toDomain);
  },

  async create(shopId: string, data: CreateZoneInput): Promise<StoreZone> {
    const createData: Prisma.StoreZoneUncheckedCreateInput = {
      shopId,
      label: data.label,
      type: data.type,
      xPct: data.xPct,
      yPct: data.yPct,
      widthPct: data.widthPct,
      heightPct: data.heightPct,
      sortOrder: data.sortOrder,
      ...(data.floorPlanId !== undefined ? { floorPlanId: data.floorPlanId } : {}),
      ...(data.widthCm !== undefined ? { widthCm: data.widthCm } : {}),
      ...(data.depthCm !== undefined ? { depthCm: data.depthCm } : {}),
    };

    const row = await prisma.storeZone.create({
      data: createData,
    });

    return toDomain(row);
  },

  async update(
    id: string,
    shopId: string,
    data: UpdateZoneInput,
  ): Promise<StoreZone> {
    const row = await prisma.storeZone.findFirst({
      where: { id, shopId },
    });

    if (!row) {
      throw new NotFoundError("Zone not found");
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    const updated = await prisma.storeZone.update({
      where: { id: row.id },
      data: updateData,
    });

    return toDomain(updated);
  },

  async delete(id: string, shopId: string): Promise<void> {
    const deleted = await prisma.storeZone.deleteMany({
      where: { id, shopId },
    });

    if (deleted.count === 0) {
      throw new NotFoundError("Zone not found");
    }
  },

  async reorder(
    shopId: string,
    updates: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.storeZone.updateMany({
          where: { id: update.id, shopId },
          data: { sortOrder: update.sortOrder },
        }),
      ),
    );
  },
};
