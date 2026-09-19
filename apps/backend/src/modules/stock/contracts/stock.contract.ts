import { z } from "zod";
import { ITEM_CATEGORIES, type ItemCategory } from "../../../shared/category/item-categories.js";
import { getPropertyOptionsForCategory, ITEM_PROPERTY_OPTIONS } from "../../../shared/item-properties/item-property-options.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import {
  WOOD_GROUP_KEY,
  WOOD_GROUPS,
  WOOD_TYPE_KEY,
} from "../../../shared/item-properties/wood-groups.js";
import type {
  StockCriteria,
  StockCriteriaInput,
} from "../domain/property-criteria.js";
import { isLocationPattern, parseLocationPattern } from "../domain/location-pattern.js";
import type {
  StockState,
  StockThreshold,
  StockThresholdInput,
} from "../domain/stock-state.js";
import { CONFIGURABLE_THRESHOLD_STATES } from "../domain/stock-state.js";
import { normalizeCriteria } from "../domain/property-criteria.js";

export type {
  StockCriteria,
  StockCriteriaInput,
  StockState,
  StockThreshold,
  StockThresholdInput,
};

/**
 * A location is either one code ("LC10") or a prefix pattern ("LC%"). The
 * grammar lives in the domain; this schema is the only door it enters through,
 * so a `%` can never reach the column in a position the matcher cannot read.
 */
const locationSchema = z
  .string()
  .trim()
  .min(1)
  .superRefine((value, ctx) => {
    try {
      parseLocationPattern(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Invalid location pattern",
      });
    }
  });

const stockCriteriaInputSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.null()]),
);

// A 0 or null quantity means "delete / do not configure this state"; commands
// drop those entries (normalizeThresholdInputs) before domain validation.
const stockThresholdSchema = z.object({
  state: z.enum(CONFIGURABLE_THRESHOLD_STATES),
  thresholdQuantity: z.number().int().nullable(),
});

const isItemCategory = (value: string): value is ItemCategory =>
  (ITEM_CATEGORIES as readonly string[]).includes(value);

/**
 * Normalize and validate criteria against the category-specific options map.
 * The same function is used by create parsing and update orchestration because
 * PATCH receives the category and criteria as separate optional fields.
 */
export const validateStockCriteria = (
  itemCategory: string,
  criteria: StockCriteriaInput,
): StockCriteria => {
  if (!isItemCategory(itemCategory)) {
    throw new ValidationError("Unknown item category");
  }

  const normalized = normalizeCriteria(criteria);

  if (Object.prototype.hasOwnProperty.call(normalized, "quantity") &&
      (normalized.quantity === null || (Array.isArray(normalized.quantity) && normalized.quantity.length > 1))) {
    throw new ValidationError("A stock definition can use only one set size");
  }

  // Criteria are AND-ed, so a definition holding both a named wood and a wood
  // group can only ever match items in the intersection — usually none. Refused
  // at the door rather than saved as a definition that silently counts nothing.
  if (
    normalized[WOOD_TYPE_KEY] !== undefined &&
    normalized[WOOD_GROUP_KEY] !== undefined
  ) {
    throw new ValidationError(
      "A stock definition uses either a wood type or a wood group, not both",
    );
  }

  const optionsByKey = new Map<string, (typeof ITEM_PROPERTY_OPTIONS)[number]>(
    getPropertyOptionsForCategory(itemCategory).map((option) => [option.key, option]),
  );

  for (const [key, values] of Object.entries(normalized)) {
    const option = optionsByKey.get(key);
    if (!option) {
      throw new ValidationError(
        `Property key '${key}' is not valid for item category '${itemCategory}'`,
      );
    }

    if (values === null) {
      continue;
    }

    const allowedValues = new Set(option.values.map((value) => value.toLowerCase()));
    if (!values.every((value) => allowedValues.has(value.toLowerCase()))) {
      throw new ValidationError(
        `One or more values for property '${key}' are not valid for item category '${itemCategory}'`,
      );
    }
  }

  return normalized;
};

const addCriteriaValidationIssue = (
  itemCategory: string,
  criteria: StockCriteriaInput | undefined,
  ctx: z.RefinementCtx,
): void => {
  if (criteria === undefined) {
    return;
  }

  try {
    validateStockCriteria(itemCategory, criteria);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      path: ["properties"],
      message: error instanceof Error ? error.message : "Invalid stock criteria",
    });
  }
};

export const CreateLocationStockSchema = z
  .object({
    location: locationSchema,
    itemCategory: z.enum(ITEM_CATEGORIES),
    properties: stockCriteriaInputSchema.optional(),
    thresholds: z.array(stockThresholdSchema).min(1),
  })
  .superRefine((value, ctx) => {
    addCriteriaValidationIssue(value.itemCategory, value.properties, ctx);
  });

export const CreateLocationStocksSchema = z.object({
  configurations: z.array(CreateLocationStockSchema).min(1),
});

export const UpdateLocationStockSchema = z
  .object({
    location: locationSchema.optional(),
    itemCategory: z.enum(ITEM_CATEGORIES).optional(),
    properties: stockCriteriaInputSchema.optional(),
    thresholds: z.array(stockThresholdSchema).min(1).optional(),
  });

export type CreateLocationStockInput = z.infer<typeof CreateLocationStockSchema>;
export type UpdateLocationStockInput = z.infer<typeof UpdateLocationStockSchema>;

export const STOCK_OPERATIONS = [
  "location_move",
  "sold",
  "return_to_store",
  "products_update_sync",
  "reconciliation",
] as const;

export type StockOperation = (typeof STOCK_OPERATIONS)[number];

export type LocationStock = {
  id: string;
  shopId: string;
  location: string;
  itemCategory: string;
  properties: StockCriteria;
  propertiesCanonical: string;
  quantity: number;
  instanceCount: number;
  stockState: StockState;
  createdAt: Date;
  createdByUsername: string;
  updatedAt: Date;
  updatedByUsername: string;
  thresholds: StockThreshold[];
};

export type LocationStockCreateData = Omit<CreateLocationStockInput, "thresholds"> & {
  thresholds: StockThreshold[];
  createdByUsername: string;
  updatedByUsername: string;
};

export type LocationStockUpdateData = Omit<UpdateLocationStockInput, "thresholds"> & {
  updatedByUsername: string;
};

export type LocationStockDto = {
  id: string;
  location: string;
  // True when `location` is a prefix pattern ("LC%") rather than one code, so
  // the UI can label it as a block without re-parsing the string.
  isLocationPattern: boolean;
  itemCategory: string;
  properties: StockCriteria;
  quantity: number;
  instanceCount: number;
  stockState: StockState;
  thresholds: Array<{ state: StockState; thresholdQuantity: number }>;
  createdAt: Date;
  createdByUsername: string;
  updatedAt: Date;
  updatedByUsername: string;
};

export type StockReportEntry = {
  location: string;
  isLocationPattern: boolean;
  itemCategory: string;
  properties: StockCriteria;
  mergeKey: string;
  quantity: number;
  instanceCount: number;
  stockState: StockState;
  thresholds: Array<{ state: StockState; thresholdQuantity: number }>;
  unitsToRestockTarget: number;
};

export type StockReportDto = {
  entries: StockReportEntry[];
};

export const toLocationStockDto = (locationStock: LocationStock): LocationStockDto => ({
  id: locationStock.id,
  location: locationStock.location,
  isLocationPattern: isLocationPattern(locationStock.location),
  itemCategory: locationStock.itemCategory,
  properties: locationStock.properties,
  quantity: locationStock.quantity,
  instanceCount: locationStock.instanceCount,
  stockState: locationStock.stockState,
  thresholds: locationStock.thresholds.map((threshold) => ({
    state: threshold.state,
    thresholdQuantity: threshold.thresholdQuantity,
  })),
  createdAt: locationStock.createdAt,
  createdByUsername: locationStock.createdByUsername,
  updatedAt: locationStock.updatedAt,
  updatedByUsername: locationStock.updatedByUsername,
});

export const getStockConfigurationOptions = () => ({
  itemCategories: ITEM_CATEGORIES,
  propertyOptions: ITEM_PROPERTY_OPTIONS,
  // The members behind each group name, so the picker can caption a group with
  // the woods it catches instead of the client keeping its own copy.
  woodGroups: WOOD_GROUPS,
});

// One movement of stock into or out of a definition: `quantity` in units,
// `instances` in ScanHistory rows. Same-definition quantity edits carry
// `instances: 0`; an item leaving or entering carries `instances: 1`.
export type StockDelta = {
  quantity: number;
  instances: number;
};

export type GuardedDecrementContext = {
  productId?: string;
  scanHistoryId?: string;
  itemCategory?: string;
  locationFrom?: string;
  locationTo?: string;
  operation: StockOperation;
};

export type ReconciliationValue = {
  id: string;
  quantity: number;
  instanceCount: number;
  stockState: StockState;
};
