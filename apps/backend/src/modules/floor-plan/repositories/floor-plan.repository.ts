import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type {
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
} from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";

const toPrismaShape = (
  shape: CreateFloorPlanInput["shape"] | UpdateFloorPlanInput["shape"],
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (shape === undefined) {
    return undefined;
  }

  if (shape === null) {
    return Prisma.JsonNull;
  }

  return shape;
};

const toDomain = (record: {
  id: string;
  shopId: string;
  name: string;
  widthCm: number;
  depthCm: number;
  shape: unknown;
  sortOrder: number;
}): FloorPlan => ({
  id: record.id,
  shopId: record.shopId,
  name: record.name,
  widthCm: record.widthCm,
  depthCm: record.depthCm,
  shape: record.shape as FloorPlan["shape"],
  sortOrder: record.sortOrder,
});

export const floorPlanRepository = {
  async list(shopId: string): Promise<FloorPlan[]> {
    const rows = await prisma.floorPlan.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
    });

    return rows.map(toDomain);
  },

  async findById(id: string, shopId: string): Promise<FloorPlan> {
    const row = await prisma.floorPlan.findFirst({
      where: { id, shopId },
    });

    if (!row) {
      throw new NotFoundError("Floor plan not found");
    }

    return toDomain(row);
  },

  async create(shopId: string, data: CreateFloorPlanInput): Promise<FloorPlan> {
    const shape = toPrismaShape(data.shape);
    const createData: Prisma.FloorPlanUncheckedCreateInput = {
      shopId,
      name: data.name,
      widthCm: data.widthCm,
      depthCm: data.depthCm,
      sortOrder: data.sortOrder,
      ...(shape !== undefined ? { shape } : {}),
    };

    const row = await prisma.floorPlan.create({
      data: createData,
    });

    return toDomain(row);
  },

  async update(
    id: string,
    shopId: string,
    data: UpdateFloorPlanInput,
  ): Promise<FloorPlan> {
    const existing = await prisma.floorPlan.findFirst({
      where: { id, shopId },
    });

    if (!existing) {
      throw new NotFoundError("Floor plan not found");
    }

    const shape = toPrismaShape(data.shape);
    const updateData = Object.fromEntries(
      Object.entries({
        ...data,
        shape,
      }).filter(([, value]) => value !== undefined),
    );

    const updated = await prisma.floorPlan.update({
      where: { id: existing.id },
      data: updateData,
    });

    return toDomain(updated);
  },

  async delete(id: string, shopId: string): Promise<void> {
    const existing = await prisma.floorPlan.findFirst({
      where: { id, shopId },
    });

    if (!existing) {
      throw new NotFoundError("Floor plan not found");
    }

    const assignedCount = await prisma.storeZone.count({
      where: { floorPlanId: id },
    });

    if (assignedCount > 0) {
      throw new ValidationError(
        `Cannot delete floor plan - ${assignedCount} zone(s) are still assigned to it. Reassign or remove them first.`,
      );
    }

    await prisma.floorPlan.delete({
      where: { id: existing.id },
    });
  },
};
