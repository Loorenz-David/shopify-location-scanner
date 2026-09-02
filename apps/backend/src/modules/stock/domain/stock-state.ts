import { ValidationError } from "../../../shared/errors/http-errors.js";

export const STOCK_STATES = [
  "out_of_stock",
  "low_in_stock",
  "medium_in_stock",
  "high_in_stock",
  "extra_in_stock",
] as const;

export type StockState = (typeof STOCK_STATES)[number];

export const CONFIGURABLE_THRESHOLD_STATES = [
  "low_in_stock",
  "medium_in_stock",
  "high_in_stock",
] as const;

export type StockThreshold = {
  state: StockState;
  thresholdQuantity: number;
};

// Wire shape for threshold input: 0 or null quantity means "this state is not
// configured" and the entry is dropped before validation.
export type StockThresholdInput = {
  state: StockState;
  thresholdQuantity: number | null;
};

const configurableStates = new Set<string>(CONFIGURABLE_THRESHOLD_STATES);

const stateIndex = (state: StockState): number => STOCK_STATES.indexOf(state);

const sortByStateIndex = (
  thresholds: readonly StockThreshold[],
): StockThreshold[] =>
  [...thresholds].sort((a, b) => stateIndex(a.state) - stateIndex(b.state));

export const normalizeThresholdInputs = (
  thresholds: readonly StockThresholdInput[],
): StockThreshold[] =>
  thresholds.filter(
    (threshold): threshold is StockThreshold =>
      threshold.thresholdQuantity !== null && threshold.thresholdQuantity !== 0,
  );

export const validateThresholds = (thresholds: readonly StockThreshold[]): void => {
  if (thresholds.length === 0) {
    throw new ValidationError("At least one threshold is required");
  }

  const seenStates = new Set<string>();
  for (const threshold of thresholds) {
    if (!configurableStates.has(threshold.state)) {
      throw new ValidationError("Only low, medium, and high stock states can be configured");
    }
    if (seenStates.has(threshold.state)) {
      throw new ValidationError("Each configurable stock state may appear only once");
    }
    if (!Number.isInteger(threshold.thresholdQuantity) || threshold.thresholdQuantity <= 0) {
      throw new ValidationError("Threshold quantities must be positive integers");
    }
    seenStates.add(threshold.state);
  }

  const ordered = sortByStateIndex(thresholds);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1]!.thresholdQuantity >= ordered[index]!.thresholdQuantity) {
      throw new ValidationError(
        "Threshold quantities must increase from lower to higher stock states",
      );
    }
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

  for (const threshold of sortByStateIndex(thresholds)) {
    if (quantity <= threshold.thresholdQuantity) {
      return threshold.state;
    }
  }
  return "extra_in_stock";
};
