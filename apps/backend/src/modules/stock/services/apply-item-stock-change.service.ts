import { logger } from "../../../shared/logging/logger.js";
import type {
  GuardedDecrementContext,
  LocationStock,
  StockDelta,
  StockOperation,
} from "../contracts/stock.contract.js";
import { resolveBestMatch } from "../domain/best-match.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";

export type StockItemSnapshot = {
  location: string | null;
  itemCategory: string | null;
  properties: Record<string, string> | null;
  quantity: number;
  isSold: boolean;
};

type StockItemSource = {
  latestLocation: string | null;
  itemCategory: string | null;
  properties: Record<string, unknown> | null;
  quantity: number;
  isSold: boolean;
};

export type ApplyItemStockChangeInput = {
  shopId: string;
  before: StockItemSnapshot | null;
  after: StockItemSnapshot | null;
  operation: StockOperation;
  itemIdentifiers: {
    productId?: string;
    scanHistoryId?: string;
  };
};

type ResolvedStock = Pick<LocationStock, "id" | "location" | "itemCategory">;

const toStockProperties = (
  properties: Record<string, unknown> | null,
): Record<string, string> | null => {
  if (properties === null) {
    return null;
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

export const toStockItemSnapshot = (
  item: StockItemSource | null,
): StockItemSnapshot | null => {
  if (item === null) {
    return null;
  }

  return {
    location: item.latestLocation,
    itemCategory: item.itemCategory,
    properties: toStockProperties(item.properties),
    quantity: item.quantity,
    isSold: item.isSold,
  };
};

const isEligible = (
  item: StockItemSnapshot | null,
): item is StockItemSnapshot =>
  item !== null &&
  !item.isSold &&
  item.location !== null &&
  item.itemCategory !== null;

const resolveConfiguration = async (
  shopId: string,
  item: StockItemSnapshot | null,
): Promise<ResolvedStock | null> => {
  if (!isEligible(item)) {
    return null;
  }

  const { location, itemCategory } = item;
  if (location === null || itemCategory === null) {
    return null;
  }

  const configurations = await locationStockRepository.listByGroup(
    shopId,
    location,
    itemCategory,
  );
  const winner = resolveBestMatch(
    configurations.map((configuration) => ({
      id: configuration.id,
      createdAt: configuration.createdAt,
      criteria: configuration.properties,
    })),
    item.properties,
  );

  if (!winner) {
    return null;
  }

  const configuration = configurations.find(
    (candidate) => candidate.id === winner.id,
  );
  return configuration
    ? {
        id: configuration.id,
        location: configuration.location,
        itemCategory: configuration.itemCategory,
      }
    : null;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unknown error";

const logMutationFailure = (input: {
  error: unknown;
  shopId: string;
  operation: StockOperation;
  configuration: ResolvedStock;
  item: StockItemSnapshot;
  before: StockItemSnapshot | null;
  after: StockItemSnapshot | null;
  itemIdentifiers: ApplyItemStockChangeInput["itemIdentifiers"];
}): void => {
  logger.error("Stock mutation failed; parent operation continues", {
    shopId: input.shopId,
    operation: input.operation,
    group: {
      location: input.configuration.location,
      itemCategory: input.configuration.itemCategory,
    },
    locationStockId: input.configuration.id,
    itemCategory: input.item.itemCategory,
    ...(input.operation === "location_move" ||
    input.operation === "products_update_sync"
      ? {
          locationFrom: input.before?.location ?? null,
          locationTo: input.after?.location ?? null,
        }
      : {}),
    ...input.itemIdentifiers,
    error: errorMessage(input.error),
  });
};

const buildDecrementContext = (input: {
  operation: StockOperation;
  before: StockItemSnapshot | null;
  after: StockItemSnapshot | null;
  item: StockItemSnapshot;
  itemIdentifiers: ApplyItemStockChangeInput["itemIdentifiers"];
}): GuardedDecrementContext => ({
  ...(input.itemIdentifiers.productId !== undefined
    ? { productId: input.itemIdentifiers.productId }
    : {}),
  ...(input.itemIdentifiers.scanHistoryId !== undefined
    ? { scanHistoryId: input.itemIdentifiers.scanHistoryId }
    : {}),
  ...(input.item.itemCategory !== null
    ? { itemCategory: input.item.itemCategory }
    : {}),
  ...(input.operation === "location_move" ||
  input.operation === "products_update_sync"
    ? {
        ...(input.before?.location !== null &&
        input.before?.location !== undefined
          ? { locationFrom: input.before.location }
          : {}),
        ...(input.after?.location !== null &&
        input.after?.location !== undefined
          ? { locationTo: input.after.location }
          : {}),
      }
    : {}),
  operation: input.operation,
});

const applyDecrement = async (input: {
  shopId: string;
  configuration: ResolvedStock;
  delta: StockDelta;
  before: StockItemSnapshot | null;
  after: StockItemSnapshot | null;
  item: StockItemSnapshot;
  operation: StockOperation;
  itemIdentifiers: ApplyItemStockChangeInput["itemIdentifiers"];
}): Promise<boolean> => {
  try {
    return await locationStockRepository.applyGuardedDecrement(
      input.configuration.id,
      input.shopId,
      input.delta,
      buildDecrementContext(input),
    );
  } catch (error) {
    logMutationFailure({
      error,
      shopId: input.shopId,
      operation: input.operation,
      configuration: input.configuration,
      item: input.item,
      before: input.before,
      after: input.after,
      itemIdentifiers: input.itemIdentifiers,
    });
    return false;
  }
};

const applyIncrement = async (input: {
  configuration: ResolvedStock;
  delta: StockDelta;
  shopId: string;
  before: StockItemSnapshot | null;
  after: StockItemSnapshot | null;
  item: StockItemSnapshot;
  operation: StockOperation;
  itemIdentifiers: ApplyItemStockChangeInput["itemIdentifiers"];
}): Promise<boolean> => {
  try {
    await locationStockRepository.applyIncrement(
      input.configuration.id,
      input.delta,
    );
    return true;
  } catch (error) {
    logMutationFailure({
      error,
      shopId: input.shopId,
      operation: input.operation,
      configuration: input.configuration,
      item: input.item,
      before: input.before,
      after: input.after,
      itemIdentifiers: input.itemIdentifiers,
    });
    return false;
  }
};

export const applyItemStockChange = async (
  input: ApplyItemStockChangeInput,
): Promise<{ changed: boolean }> => {
  try {
    const beforeConfiguration = await resolveConfiguration(
      input.shopId,
      input.before,
    );
    const afterConfiguration = await resolveConfiguration(
      input.shopId,
      input.after,
    );

    if (
      beforeConfiguration &&
      afterConfiguration &&
      beforeConfiguration.id === afterConfiguration.id
    ) {
      if (!input.before || !input.after) {
        return { changed: false };
      }

      // The item stayed in the same definition: only its units moved, so the
      // instance count is untouched on both branches.
      const delta = input.after.quantity - input.before.quantity;
      if (delta === 0) {
        return { changed: false };
      }

      if (delta > 0) {
        return {
          changed: await applyIncrement({
            configuration: afterConfiguration,
            delta: { quantity: delta, instances: 0 },
            shopId: input.shopId,
            before: input.before,
            after: input.after,
            item: input.after,
            operation: input.operation,
            itemIdentifiers: input.itemIdentifiers,
          }),
        };
      }

      return {
        changed: await applyDecrement({
          configuration: beforeConfiguration,
          delta: { quantity: Math.abs(delta), instances: 0 },
          shopId: input.shopId,
          before: input.before,
          after: input.after,
          item: input.before,
          operation: input.operation,
          itemIdentifiers: input.itemIdentifiers,
        }),
      };
    }

    let changed = false;
    if (beforeConfiguration && input.before) {
      changed =
        (await applyDecrement({
          configuration: beforeConfiguration,
          delta: { quantity: input.before.quantity, instances: 1 },
          shopId: input.shopId,
          before: input.before,
          after: input.after,
          item: input.before,
          operation: input.operation,
          itemIdentifiers: input.itemIdentifiers,
        })) || changed;
    }

    if (afterConfiguration && input.after) {
      changed =
        (await applyIncrement({
          configuration: afterConfiguration,
          delta: { quantity: input.after.quantity, instances: 1 },
          shopId: input.shopId,
          before: input.before,
          after: input.after,
          item: input.after,
          operation: input.operation,
          itemIdentifiers: input.itemIdentifiers,
        })) || changed;
    }

    return { changed };
  } catch (error) {
    logger.error("Stock change failed; parent operation continues", {
      shopId: input.shopId,
      operation: input.operation,
      beforeGroup: input.before
        ? {
            location: input.before.location,
            itemCategory: input.before.itemCategory,
          }
        : null,
      afterGroup: input.after
        ? {
            location: input.after.location,
            itemCategory: input.after.itemCategory,
          }
        : null,
      ...input.itemIdentifiers,
      error: errorMessage(error),
    });
    return { changed: false };
  }
};
