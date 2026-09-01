import { ConflictError } from "../../../shared/errors/http-errors.js";
import { findConflict } from "../domain/conflict.js";
import { validateThresholds } from "../domain/stock-state.js";
import {
  validateStockCriteria,
  type CreateLocationStockInput,
  type LocationStock,
  type StockCriteria,
} from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { reconcileGroup } from "../services/stock-reconciliation.service.js";

type Group = {
  location: string;
  itemCategory: string;
};

type NormalizedConfiguration = CreateLocationStockInput & {
  properties: StockCriteria;
};

const groupKey = (group: Group): string =>
  JSON.stringify([group.location, group.itemCategory]);

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const findExistingConflict = (
  configuration: NormalizedConfiguration,
  siblings: readonly LocationStock[],
): string | null => {
  const conflict = findConflict(
    configuration.properties,
    siblings.map((sibling) => ({
      id: sibling.id,
      criteria: sibling.properties,
    })),
  );
  return conflict?.conflictingId ?? null;
};

export const createLocationStocksCommand = async (input: {
  shopId: string;
  username: string;
  payload: { configurations: CreateLocationStockInput[] };
}): Promise<LocationStock[]> => {
  const normalizedConfigurations = input.payload.configurations.map(
    (configuration) => {
      const properties = validateStockCriteria(
        configuration.itemCategory,
        configuration.properties ?? {},
      );
      validateThresholds(configuration.thresholds);

      return {
        ...configuration,
        properties,
      };
    },
  );

  const groups = new Map<
    string,
    { group: Group; indexes: number[] }
  >();
  for (const [index, configuration] of normalizedConfigurations.entries()) {
    const group = {
      location: configuration.location,
      itemCategory: configuration.itemCategory,
    };
    const key = groupKey(group);
    const entry = groups.get(key);
    if (entry) {
      entry.indexes.push(index);
    } else {
      groups.set(key, { group, indexes: [index] });
    }
  }

  for (const { group, indexes } of groups.values()) {
    const existing = await locationStockRepository.listByGroup(
      input.shopId,
      group.location,
      group.itemCategory,
    );

    for (const [position, index] of indexes.entries()) {
      const configuration = normalizedConfigurations[index];
      if (!configuration) {
        continue;
      }

      const existingConflict = findExistingConflict(configuration, existing);
      if (existingConflict) {
        throw new ConflictError(
          "Stock configuration conflicts with an existing definition",
          { conflictingId: existingConflict, batchIndex: index },
        );
      }

      const earlierIndexes = indexes.slice(0, position);
      const batchConflict = findConflict(
        configuration.properties,
        earlierIndexes.map((earlierIndex) => {
          const earlier = normalizedConfigurations[earlierIndex];
          return {
            id: String(earlierIndex),
            criteria: earlier?.properties ?? {},
          };
        }),
      );
      if (batchConflict) {
        throw new ConflictError(
          "Stock configurations conflict within the submitted batch",
          {
            batchIndex: index,
            conflictsWithBatchIndex: Number(batchConflict.conflictingId),
          },
        );
      }
    }
  }

  let created: LocationStock[];
  try {
    created = await locationStockRepository.createMany(
      input.shopId,
      normalizedConfigurations.map((configuration) => ({
        ...configuration,
        createdByUsername: input.username,
        updatedByUsername: input.username,
      })),
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError(
        "Stock configuration conflicts with an existing definition",
      );
    }
    throw error;
  }

  for (const { group } of groups.values()) {
    await reconcileGroup(
      input.shopId,
      group.location,
      group.itemCategory,
    );
  }

  // Reconciliation correctly attributes sibling changes to the system. The
  // definitions created by this request remain attributed to the acting user,
  // including when their quantity changed during the recount.
  for (const configuration of created) {
    await locationStockRepository.updateConfig(configuration.id, input.shopId, {
      updatedByUsername: input.username,
    });
  }

  const result: LocationStock[] = [];
  for (const configuration of created) {
    const current = await locationStockRepository.findById(
      configuration.id,
      input.shopId,
    );
    if (current) {
      result.push(current);
    }
  }

  return result;
};
