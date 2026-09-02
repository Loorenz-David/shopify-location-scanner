import { ConflictError, NotFoundError } from "../../../shared/errors/http-errors.js";
import { canonicalCriteriaString } from "../domain/property-criteria.js";
import { findConflict } from "../domain/conflict.js";
import { validateThresholds } from "../domain/stock-state.js";
import {
  validateStockCriteria,
  type LocationStock,
  type UpdateLocationStockInput,
} from "../contracts/stock.contract.js";
import { locationStockRepository } from "../repositories/location-stock.repository.js";
import { reconcileGroup } from "../services/stock-reconciliation.service.js";

type Group = {
  location: string;
  itemCategory: string;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const sameGroup = (left: Group, right: Group): boolean =>
  left.location === right.location && left.itemCategory === right.itemCategory;

export const updateLocationStockCommand = async (input: {
  id: string;
  shopId: string;
  username: string;
  payload: UpdateLocationStockInput;
}): Promise<LocationStock> => {
  const existing = await locationStockRepository.findById(input.id, input.shopId);
  if (!existing) {
    throw new NotFoundError("Location stock not found");
  }

  const effectiveItemCategory =
    input.payload.itemCategory ?? existing.itemCategory;
  const effectiveProperties = validateStockCriteria(
    effectiveItemCategory,
    input.payload.properties ?? existing.properties,
  );

  if (input.payload.thresholds !== undefined) {
    validateThresholds(input.payload.thresholds);
  }

  const nextGroup = {
    location: input.payload.location ?? existing.location,
    itemCategory: effectiveItemCategory,
  };
  const previousGroup = {
    location: existing.location,
    itemCategory: existing.itemCategory,
  };
  const propertiesChanged =
    canonicalCriteriaString(effectiveProperties) !== existing.propertiesCanonical;
  const allocationChanged =
    !sameGroup(previousGroup, nextGroup) || propertiesChanged;

  if (allocationChanged) {
    const siblings = await locationStockRepository.listByGroup(
      input.shopId,
      nextGroup.location,
      nextGroup.itemCategory,
    );
    const conflict = findConflict(
      effectiveProperties,
      siblings
        .filter((sibling) => sibling.id !== input.id)
        .map((sibling) => ({ id: sibling.id, criteria: sibling.properties })),
    );
    if (conflict) {
      throw new ConflictError(
        "Stock configuration conflicts with an existing definition",
        { conflictingId: conflict.conflictingId },
      );
    }
  }

  const { thresholds, ...patch } = input.payload;
  try {
    await locationStockRepository.runInTransaction(async (tx) => {
      await locationStockRepository.updateConfig(
        input.id,
        input.shopId,
        {
          ...patch,
          updatedByUsername: input.username,
        },
        tx,
      );

      if (thresholds !== undefined) {
        await locationStockRepository.replaceThresholds(
          input.id,
          input.shopId,
          thresholds,
          input.username,
          tx,
        );

        if (!allocationChanged) {
          await locationStockRepository.recalculateState(input.id, tx);
        }
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError(
        "Stock configuration conflicts with an existing definition",
      );
    }
    throw error;
  }

  if (allocationChanged) {
    const groups = new Map<string, Group>();
    for (const group of [previousGroup, nextGroup]) {
      groups.set(JSON.stringify([group.location, group.itemCategory]), group);
    }

    for (const group of groups.values()) {
      await reconcileGroup(input.shopId, group.location, group.itemCategory);
    }

    // The recount stamps changed rows with the system sentinel. Restore the
    // acting user's attribution only on the definition edited by this request.
    await locationStockRepository.updateConfig(input.id, input.shopId, {
      updatedByUsername: input.username,
    });
  }

  const result = await locationStockRepository.findById(input.id, input.shopId);
  if (!result) {
    throw new NotFoundError("Location stock not found");
  }
  return result;
};
