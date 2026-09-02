import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { resolveBestMatch } from "../domain/best-match.js";
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
  onGroupReconciled?: (group: {
    location: string;
    itemCategory: string;
  }) => void;
};

export type ReconciliationResult = Map<string, ReconciliationValue>;

type GroupSnapshot = {
  configurations: LocationStock[];
  values: ReconciliationResult;
};

const groupKey = (location: string, itemCategory: string): string =>
  JSON.stringify([location, itemCategory]);

const computeGroup = async (
  shopId: string,
  location: string,
  itemCategory: string,
): Promise<GroupSnapshot> => {
  const configurations = await locationStockRepository.listByGroup(
    shopId,
    location,
    itemCategory,
  );

  // A deleted configuration's group is reconciled after deletion. Returning
  // before the item read keeps that path empty, silent, and transaction-free.
  if (configurations.length === 0) {
    return { configurations, values: new Map() };
  }

  const eligibleItems = await locationStockRepository.listEligibleItems(
    shopId,
    location,
    itemCategory,
  );
  const quantities = new Map<string, number>(
    configurations.map((configuration) => [configuration.id, 0]),
  );
  const candidates = configurations.map((configuration) => ({
    id: configuration.id,
    createdAt: configuration.createdAt,
    criteria: configuration.properties,
  }));

  for (const item of eligibleItems) {
    const winner = resolveBestMatch(candidates, item.properties);
    if (!winner) {
      continue;
    }

    quantities.set(
      winner.id,
      (quantities.get(winner.id) ?? 0) + item.quantity,
    );
  }

  const values = new Map<string, ReconciliationValue>();
  for (const configuration of configurations) {
    const quantity = quantities.get(configuration.id) ?? 0;
    const stockState = calculateStockState(quantity, configuration.thresholds);
    values.set(configuration.id, {
      id: configuration.id,
      quantity,
      stockState,
    });
  }

  return { configurations, values };
};

const writeChangedValues = async (
  snapshot: GroupSnapshot,
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
        configuration.stockState === value.stockState
      ) {
        continue;
      }

      await locationStockRepository.writeAbsolute(
        configuration.id,
        value.quantity,
        value.stockState,
        "system:stock-reconciliation",
        tx,
      );
    }
  });
};

const writePassTwoDifferences = async (
  passOne: GroupSnapshot,
  passTwo: GroupSnapshot,
  shopId: string,
  location: string,
  itemCategory: string,
): Promise<void> => {
  const deltas: Array<{
    locationStockId: string;
    from: { quantity: number; stockState: StockState } | null;
    to: { quantity: number; stockState: StockState };
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
      previous.stockState === next.stockState
    ) {
      continue;
    }

    deltas.push({
      locationStockId: configuration.id,
      from: previous
        ? {
            quantity: previous.quantity,
            stockState: previous.stockState,
          }
        : null,
      to: {
        quantity: next.quantity,
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
        value.quantity,
        value.stockState,
        "system:stock-reconciliation",
        tx,
      );
    }
  });

  logger.warn("Stock reconciliation pass 2 corrected an interleaved change", {
    shopId,
    location,
    itemCategory,
    delta: deltas,
  });
};

export const reconcileGroup = async (
  shopId: string,
  location: string,
  itemCategory: string,
  hooks?: ReconciliationHooks,
): Promise<ReconciliationResult> => {
  const passOne = await computeGroup(shopId, location, itemCategory);
  if (passOne.configurations.length === 0) {
    return passOne.values;
  }

  await writeChangedValues(passOne, passOne.values);
  await hooks?.betweenPasses?.();

  const passTwo = await computeGroup(shopId, location, itemCategory);
  if (passTwo.configurations.length === 0) {
    return passTwo.values;
  }

  await writePassTwoDifferences(
    passOne,
    passTwo,
    shopId,
    location,
    itemCategory,
  );

  return passTwo.values;
};

export const reconcileAllGroups = async (
  shopId: string,
  hooks?: ReconciliationHooks,
): Promise<void> => {
  const configurations = await locationStockRepository.listByShop(shopId);
  const groups = new Map<
    string,
    { location: string; itemCategory: string }
  >();

  for (const configuration of configurations) {
    const group = {
      location: configuration.location,
      itemCategory: configuration.itemCategory,
    };
    groups.set(groupKey(group.location, group.itemCategory), group);
  }

  for (const group of groups.values()) {
    await reconcileGroup(shopId, group.location, group.itemCategory, hooks);
    hooks?.onGroupReconciled?.(group);
  }
};

