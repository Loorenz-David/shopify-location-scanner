import { ValidationError } from "../../../shared/errors/http-errors.js";

export const STOCK_STATES = [
  "out_of_stock",
  "low_in_stock",
  "medium_in_stock",
  "normal_in_stock",
  "high_in_stock",
] as const;

export type StockState = (typeof STOCK_STATES)[number];

export const CONFIGURABLE_THRESHOLD_STATES = [
  "low_in_stock",
  "medium_in_stock",
  "normal_in_stock",
] as const;

export type StockThreshold = {
  state: StockState;
  thresholdQuantity: number;
};

const configurableStates = new Set<string>(CONFIGURABLE_THRESHOLD_STATES);

export const validateThresholds = (thresholds: readonly StockThreshold[]): void => {
  if (thresholds.length !== CONFIGURABLE_THRESHOLD_STATES.length) {
    throw new ValidationError("Exactly one threshold is required for each configurable stock state");
  }

  const seenStates = new Set<string>();
  for (const threshold of thresholds) {
    if (!configurableStates.has(threshold.state)) {
      throw new ValidationError("Only low, medium, and normal stock states can be configured");
    }
    if (seenStates.has(threshold.state)) {
      throw new ValidationError("Each configurable stock state may appear only once");
    }
    if (!Number.isInteger(threshold.thresholdQuantity) || threshold.thresholdQuantity <= 0) {
      throw new ValidationError("Threshold quantities must be positive integers");
    }
    seenStates.add(threshold.state);
  }

  const thresholdByState = new Map(thresholds.map((threshold) => [threshold.state, threshold.thresholdQuantity]));
  const low = thresholdByState.get("low_in_stock");
  const medium = thresholdByState.get("medium_in_stock");
  const normal = thresholdByState.get("normal_in_stock");

  if (low === undefined || medium === undefined || normal === undefined) {
    throw new ValidationError("All configurable stock states are required");
  }
  if (low >= medium) {
    throw new ValidationError("The low threshold must be lower than the medium threshold");
  }
  if (medium >= normal) {
    throw new ValidationError("The medium threshold must be lower than the normal threshold");
  }
};

export const calculateStockState = (
  quantity: number,
  thresholds: readonly StockThreshold[],
): StockState => {
  validateThresholds(thresholds);

  if (quantity <= 0) {
    return "out_of_stock";
  }

  const thresholdByState = new Map(thresholds.map((threshold) => [threshold.state, threshold.thresholdQuantity]));
  const low = thresholdByState.get("low_in_stock") as number;
  const medium = thresholdByState.get("medium_in_stock") as number;
  const normal = thresholdByState.get("normal_in_stock") as number;

  if (quantity <= low) {
    return "low_in_stock";
  }
  if (quantity <= medium) {
    return "medium_in_stock";
  }
  if (quantity <= normal) {
    return "normal_in_stock";
  }
  return "high_in_stock";
};
