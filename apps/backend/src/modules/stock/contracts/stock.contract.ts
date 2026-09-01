import type {
  StockCriteria,
  StockCriteriaInput,
} from "../domain/property-criteria.js";
import type {
  StockState,
  StockThreshold,
} from "../domain/stock-state.js";

export type {
  StockCriteria,
  StockCriteriaInput,
  StockState,
  StockThreshold,
};

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

export type CreateLocationStockInput = {
  location: string;
  itemCategory: string;
  properties?: StockCriteriaInput;
  thresholds: readonly StockThreshold[];
};

export type UpdateLocationStockInput = {
  location?: string;
  itemCategory?: string;
  properties?: StockCriteriaInput;
};

export type LocationStockCreateData = CreateLocationStockInput & {
  createdByUsername: string;
  updatedByUsername: string;
};

export type LocationStockUpdateData = UpdateLocationStockInput & {
  updatedByUsername: string;
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
  stockState: StockState;
};

