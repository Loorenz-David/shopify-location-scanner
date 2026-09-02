import type { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  canonicalCriteriaString,
  normalizeCriteria,
  type StockCriteriaInput,
} from "../domain/property-criteria.js";
import {
  calculateStockState,
  type StockState,
} from "../domain/stock-state.js";
import type {
  GuardedDecrementContext,
  LocationStock,
  LocationStockCreateData,
  LocationStockUpdateData,
  StockDelta,
} from "../contracts/stock.contract.js";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;
type LocationStockWithThresholds = Prisma.LocationStockGetPayload<{
  include: { thresholds: true };
}>;

export type EligibleItem = {
  id: string;
  productId: string;
  quantity: number;
  properties: Record<string, string> | null;
};

const thresholdsInclude = {
  thresholds: {
    orderBy: { state: "asc" },
  },
} as const;

const normalizeStoredProperties = (
  properties: Prisma.JsonValue | null | undefined,
): Record<string, string> => {
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (normalizedKey && normalizedValue) {
      normalized[normalizedKey] = normalizedValue;
    }
  }

  return normalized;
};

const toCriteriaInput = (properties: Prisma.JsonValue): StockCriteriaInput =>
  properties as StockCriteriaInput;

const toDomain = (record: LocationStockWithThresholds): LocationStock => {
  const properties = normalizeCriteria(toCriteriaInput(record.properties));

  return {
    id: record.id,
    shopId: record.shopId,
    location: record.location,
    itemCategory: record.itemCategory,
    properties,
    propertiesCanonical: record.propertiesCanonical,
    quantity: record.quantity,
    instanceCount: record.instanceCount,
    stockState: record.stockState as StockState,
    createdAt: record.createdAt,
    createdByUsername: record.createdByUsername,
    updatedAt: record.updatedAt,
    updatedByUsername: record.updatedByUsername,
    thresholds: record.thresholds.map((threshold) => ({
      state: threshold.state as StockState,
      thresholdQuantity: threshold.thresholdQuantity,
    })),
  };
};

const createConfigurations = async (
  client: DatabaseClient,
  shopId: string,
  configurations: readonly LocationStockCreateData[],
): Promise<LocationStock[]> => {
  const rows: LocationStockWithThresholds[] = [];

  for (const configuration of configurations) {
    const properties = normalizeCriteria(configuration.properties ?? {});
    const row = await client.locationStock.create({
      data: {
        shopId,
        location: configuration.location,
        itemCategory: configuration.itemCategory,
        properties,
        propertiesCanonical: canonicalCriteriaString(properties),
        createdByUsername: configuration.createdByUsername,
        updatedByUsername: configuration.updatedByUsername,
        thresholds: {
          create: configuration.thresholds.map((threshold) => ({
            shopId,
            state: threshold.state,
            thresholdQuantity: threshold.thresholdQuantity,
            createdByUsername: configuration.createdByUsername,
            updatedByUsername: configuration.updatedByUsername,
          })),
        },
      },
      include: thresholdsInclude,
    });
    rows.push(row);
  }

  return rows.map(toDomain);
};

const updateState = async (
  id: string,
  client: DatabaseClient,
): Promise<LocationStock> => {
  const row = await client.locationStock.findUnique({
    where: { id },
    include: thresholdsInclude,
  });

  if (!row) {
    throw new NotFoundError("Location stock not found");
  }

  // Thresholds are item-based (P7): the state follows how many ScanHistory
  // rows sit in the definition, never the unit sum.
  const stockState = calculateStockState(
    row.instanceCount,
    row.thresholds.map((threshold) => ({
      state: threshold.state as StockState,
      thresholdQuantity: threshold.thresholdQuantity,
    })),
  );

  if (row.stockState === stockState) {
    return toDomain({ ...row, stockState });
  }

  const updated = await client.locationStock.update({
    where: { id },
    data: { stockState },
    include: thresholdsInclude,
  });

  return toDomain(updated);
};

const replaceThresholdRows = async (
  client: DatabaseClient,
  id: string,
  shopId: string,
  thresholds: ReadonlyArray<LocationStockCreateData["thresholds"][number]>,
  updatedByUsername: string,
): Promise<void> => {
  const existing = await client.locationStock.findFirst({
    where: { id, shopId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Location stock not found");
  }

  await client.stockThresholdsLocation.deleteMany({
    where: { locationStockId: existing.id, shopId },
  });

  await client.stockThresholdsLocation.createMany({
    data: thresholds.map((threshold) => ({
      shopId,
      locationStockId: existing.id,
      state: threshold.state,
      thresholdQuantity: threshold.thresholdQuantity,
      createdByUsername: updatedByUsername,
      updatedByUsername,
    })),
  });
};

export const locationStockRepository = {
  async runInTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(work);
  },

  async createMany(
    shopId: string,
    configurations: readonly LocationStockCreateData[],
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock[]> {
    if (tx) {
      return createConfigurations(tx, shopId, configurations);
    }

    return prisma.$transaction((transaction) =>
      createConfigurations(transaction, shopId, configurations),
    );
  },

  async updateConfig(
    id: string,
    shopId: string,
    data: LocationStockUpdateData,
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock> {
    const client = tx ?? prisma;
    const existing = await client.locationStock.findFirst({
      where: { id, shopId },
    });

    if (!existing) {
      throw new NotFoundError("Location stock not found");
    }

    const normalizedProperties =
      data.properties !== undefined
        ? normalizeCriteria(data.properties)
        : undefined;
    const updateData: Prisma.LocationStockUncheckedUpdateInput = {
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.itemCategory !== undefined
        ? { itemCategory: data.itemCategory }
        : {}),
      ...(normalizedProperties !== undefined
        ? {
            properties: normalizedProperties,
            propertiesCanonical: canonicalCriteriaString(normalizedProperties),
          }
        : {}),
      updatedByUsername: data.updatedByUsername,
    };

    const updated = await client.locationStock.update({
      where: { id: existing.id },
      data: updateData,
      include: thresholdsInclude,
    });

    return toDomain(updated);
  },

  async replaceThresholds(
    id: string,
    shopId: string,
    thresholds: ReadonlyArray<LocationStockCreateData["thresholds"][number]>,
    updatedByUsername: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) {
      await replaceThresholdRows(
        tx,
        id,
        shopId,
        thresholds,
        updatedByUsername,
      );
      return;
    }

    await prisma.$transaction((transaction) =>
      replaceThresholdRows(
        transaction,
        id,
        shopId,
        thresholds,
        updatedByUsername,
      ),
    );
  },

  async deleteById(
    id: string,
    shopId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    const deleted = await client.locationStock.deleteMany({
      where: { id, shopId },
    });

    if (deleted.count === 0) {
      throw new NotFoundError("Location stock not found");
    }
  },

  async listByGroup(
    shopId: string,
    location: string,
    itemCategory: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock[]> {
    const client = tx ?? prisma;
    const rows = await client.locationStock.findMany({
      where: { shopId, location, itemCategory },
      include: thresholdsInclude,
    });

    return rows.map(toDomain);
  },

  async listByShop(
    shopId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock[]> {
    const client = tx ?? prisma;
    const rows = await client.locationStock.findMany({
      where: { shopId },
      include: thresholdsInclude,
    });

    return rows.map(toDomain);
  },

  async findById(
    id: string,
    shopId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock | null> {
    const client = tx ?? prisma;
    const row = await client.locationStock.findFirst({
      where: { id, shopId },
      include: thresholdsInclude,
    });

    return row ? toDomain(row) : null;
  },

  async listEligibleItems(
    shopId: string,
    location: string,
    itemCategory: string,
    tx?: Prisma.TransactionClient,
  ): Promise<EligibleItem[]> {
    const client = tx ?? prisma;
    const rows = await client.scanHistory.findMany({
      where: {
        shopId,
        latestLocation: location,
        itemCategory,
        isSold: false,
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        properties: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      properties:
        row.properties === null ? null : normalizeStoredProperties(row.properties),
    }));
  },

  // One guarded statement covers both columns: a refusal writes neither, so
  // `instanceCount` can never drift negative while `quantity` is applied.
  async applyGuardedDecrement(
    id: string,
    shopId: string,
    delta: StockDelta,
    context: GuardedDecrementContext,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const result = await client.locationStock.updateMany({
      where: {
        id,
        shopId,
        quantity: { gte: delta.quantity },
        instanceCount: { gte: delta.instances },
      },
      data: {
        quantity: { decrement: delta.quantity },
        instanceCount: { decrement: delta.instances },
      },
    });

    if (result.count === 0) {
      const current = await client.locationStock.findFirst({
        where: { id, shopId },
        select: { location: true, quantity: true, instanceCount: true },
      });

      logger.error("Location stock decrement refused by non-negative guard", {
        locationStockId: id,
        location: current?.location ?? null,
        shopId,
        requestedDecrement: delta.quantity,
        requestedInstanceDecrement: delta.instances,
        currentQuantity: current?.quantity ?? null,
        currentInstanceCount: current?.instanceCount ?? null,
        ...context,
      });
      return false;
    }

    await updateState(id, client);
    return true;
  },

  async applyIncrement(
    id: string,
    delta: StockDelta,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.locationStock.update({
      where: { id },
      data: {
        quantity: { increment: delta.quantity },
        instanceCount: { increment: delta.instances },
      },
    });
    await updateState(id, client);
  },

  async writeAbsolute(
    id: string,
    values: { quantity: number; instanceCount: number },
    stockState: StockState,
    updatedByUsername: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.locationStock.update({
      where: { id },
      data: {
        quantity: values.quantity,
        instanceCount: values.instanceCount,
        stockState,
        updatedByUsername,
      },
    });
  },

  async recalculateState(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LocationStock> {
    return updateState(id, tx ?? prisma);
  },
};
