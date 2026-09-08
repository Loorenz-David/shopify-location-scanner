import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { allocateGroup } from "../domain/allocation.js";
import {
  calculateStockState,
  type StockState,
} from "../domain/stock-state.js";
import type {
  LocationStock,
  ReconciliationValue,
} from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";

export type ReconciliationHooks = {
  betweenPasses?: () => Promise<void>;
  onCategoryReconciled?: (category: { itemCategory: string }) => void;
};

export type ReconciliationResult = Map<string, ReconciliationValue>;

type CategorySnapshot = {
  configurations: LocationStock[];
  values: ReconciliationResult;
};

// The reconciliation unit is the item category, not a single location. A prefix
// definition ("LC%") and a concrete one ("LC10") compete for the same items, so
// any narrower unit would recompute one of them from a set of items that does
// not contain everything it owns — and write that shortfall as an absolute.
const computeCategory = async (
  shopId: string,
  itemCategory: string,
): Promise<CategorySnapshot> => {
  const configurations = await locationStockRepository.listByCategory(
    shopId,
    itemCategory,
  );

  // A deleted configuration's category is reconciled after deletion. Returning
  // before the item read keeps that path empty, silent, and transaction-free.
  if (configurations.length === 0) {
    return { configurations, values: new Map() };
  }

  const eligibleItems = await locationStockRepository.listEligibleItems(
    shopId,
    itemCategory,
  );
  const totals = allocateGroup(
    configurations.map((configuration) => ({
      id: configuration.id,
      createdAt: configuration.createdAt,
      location: configuration.location,
      criteria: configuration.properties,
    })),
    eligibleItems,
  );

  const values = new Map<string, ReconciliationValue>();
  for (const configuration of configurations) {
    const { quantity, instanceCount } = totals.get(configuration.id) ?? {
      quantity: 0,
      instanceCount: 0,
    };
    const stockState = calculateStockState(instanceCount, configuration.thresholds);
    values.set(configuration.id, {
      id: configuration.id,
      quantity,
      instanceCount,
      stockState,
    });
  }

  return { configurations, values };
};

const writeChangedValues = async (
  snapshot: CategorySnapshot,
  target: ReconciliationResult,
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    for (const configuration of snapshot.configurations) {
      const value = target.get(configuration.id);
      if (!value) {
        continue;
      }

      if (
        configuration.quantity === value.quantity &&
        configuration.instanceCount === value.instanceCount &&
        configuration.stockState === value.stockState
      ) {
        continue;
      }

      await locationStockRepository.writeAbsolute(
        configuration.id,
        { quantity: value.quantity, instanceCount: value.instanceCount },
        value.stockState,
        "system:stock-reconciliation",
        tx,
      );
    }
  });
};

const writePassTwoDifferences = async (
  passOne: CategorySnapshot,
  passTwo: CategorySnapshot,
  shopId: string,
  itemCategory: string,
): Promise<void> => {
  const deltas: Array<{
    locationStockId: string;
    from: { quantity: number; instanceCount: number; stockState: StockState } | null;
    to: { quantity: number; instanceCount: number; stockState: StockState };
  }> = [];

  for (const configuration of passTwo.configurations) {
    const next = passTwo.values.get(configuration.id);
    if (!next) {
      continue;
    }

    const previous = passOne.values.get(configuration.id);
    if (
      previous &&
      previous.quantity === next.quantity &&
      previous.instanceCount === next.instanceCount &&
      previous.stockState === next.stockState
    ) {
      continue;
    }

    deltas.push({
      locationStockId: configuration.id,
      from: previous
        ? {
            quantity: previous.quantity,
            instanceCount: previous.instanceCount,
            stockState: previous.stockState,
          }
        : null,
      to: {
        quantity: next.quantity,
        instanceCount: next.instanceCount,
        stockState: next.stockState,
      },
    });
  }

  if (deltas.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const delta of deltas) {
      const value = passTwo.values.get(delta.locationStockId);
      if (!value) {
        continue;
      }

      await locationStockRepository.writeAbsolute(
        delta.locationStockId,
        { quantity: value.quantity, instanceCount: value.instanceCount },
        value.stockState,
        "system:stock-reconciliation",
        tx,
      );
    }
  });

  logger.warn("Stock reconciliation pass 2 corrected an interleaved change", {
    shopId,
    itemCategory,
    delta: deltas,
  });
};

export const reconcileCategory = async (
  shopId: string,
  itemCategory: string,
  hooks?: ReconciliationHooks,
): Promise<ReconciliationResult> => {
  const passOne = await computeCategory(shopId, itemCategory);
  if (passOne.configurations.length === 0) {
    return passOne.values;
  }

  await writeChangedValues(passOne, passOne.values);
  await hooks?.betweenPasses?.();

  const passTwo = await computeCategory(shopId, itemCategory);
  if (passTwo.configurations.length === 0) {
    return passTwo.values;
  }

  await writePassTwoDifferences(passOne, passTwo, shopId, itemCategory);

  return passTwo.values;
};

export const reconcileAllCategories = async (
  shopId: string,
  hooks?: ReconciliationHooks,
): Promise<void> => {
  const configurations = await locationStockRepository.listByShop(shopId);
  const categories = new Set(
    configurations.map((configuration) => configuration.itemCategory),
  );

  for (const itemCategory of categories) {
    await reconcileCategory(shopId, itemCategory, hooks);
    hooks?.onCategoryReconciled?.({ itemCategory });
  }
};

