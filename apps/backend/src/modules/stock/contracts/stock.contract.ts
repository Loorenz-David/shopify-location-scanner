import { z } from "zod";
import { ITEM_CATEGORIES, type ItemCategory } from "../../../shared/category/item-categories.js";
import { getPropertyOptionsForCategory, ITEM_PROPERTY_OPTIONS } from "../../../shared/item-properties/item-property-options.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import type {
  StockCriteria,
  StockCriteriaInput,
} from "../domain/property-criteria.js";
import type {
  StockState,
  StockThreshold,
} from "../domain/stock-state.js";
import { CONFIGURABLE_THRESHOLD_STATES } from "../domain/stock-state.js";
import { normalizeCriteria } from "../domain/property-criteria.js";

export type {
  StockCriteria,
  StockCriteriaInput,
  StockState,
  StockThreshold,
};

const stockCriteriaInputSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.null()]),
);

const stockThresholdSchema = z.object({
  state: z.enum(CONFIGURABLE_THRESHOLD_STATES),
  thresholdQuantity: z.number().int(),
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

const addThresholdValidationIssue = (
  thresholds: readonly StockThreshold[],
  ctx: z.RefinementCtx,
): void => {
  // Zod owns the threshold shape and arity. Domain validation is deliberately
  // called by commands so duplicate and ordering semantics are checked once.
  if (thresholds.length !== 3) {
    ctx.addIssue({
      code: "custom",
      path: ["thresholds"],
      message: "Exactly three thresholds are required",
    });
  }
};

export const CreateLocationStockSchema = z
  .object({
    location: z.string().trim().min(1),
    itemCategory: z.enum(ITEM_CATEGORIES),
    properties: stockCriteriaInputSchema.optional(),
    thresholds: z.array(stockThresholdSchema),
  })
  .superRefine((value, ctx) => {
    addCriteriaValidationIssue(value.itemCategory, value.properties, ctx);
    addThresholdValidationIssue(value.thresholds, ctx);
  });

export const CreateLocationStocksSchema = z.object({
  configurations: z.array(CreateLocationStockSchema).min(1),
});

export const UpdateLocationStockSchema = z
  .object({
    location: z.string().trim().min(1).optional(),
    itemCategory: z.enum(ITEM_CATEGORIES).optional(),
    properties: stockCriteriaInputSchema.optional(),
    thresholds: z.array(stockThresholdSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.thresholds !== undefined) {
      addThresholdValidationIssue(value.thresholds, ctx);
    }
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
  stockState: StockState;
  createdAt: Date;
  createdByUsername: string;
  updatedAt: Date;
  updatedByUsername: string;
  thresholds: StockThreshold[];
};

export type LocationStockCreateData = CreateLocationStockInput & {
  createdByUsername: string;
  updatedByUsername: string;
};

export type LocationStockUpdateData = Omit<UpdateLocationStockInput, "thresholds"> & {
  updatedByUsername: string;
};

export type LocationStockDto = {
  id: string;
  location: string;
  itemCategory: string;
  properties: StockCriteria;
  quantity: number;
  stockState: StockState;
  thresholds: Array<{ state: StockState; thresholdQuantity: number }>;
  createdAt: Date;
  createdByUsername: string;
  updatedAt: Date;
  updatedByUsername: string;
};

export const toLocationStockDto = (locationStock: LocationStock): LocationStockDto => ({
  id: locationStock.id,
  location: locationStock.location,
  itemCategory: locationStock.itemCategory,
  properties: locationStock.properties,
  quantity: locationStock.quantity,
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
});

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
  stockState: StockState;
};
