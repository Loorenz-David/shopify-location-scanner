import {
  getStockStateMeta,
  STOCK_STATES,
} from "./stock-states.domain";
import type { StockState } from "../types/stock.types";
import type { ThresholdDraft } from "../types/stock.types";

export type ThresholdRow = keyof ThresholdDraft;

export interface StockThresholdBand {
  state: StockState;
  label: string;
  tint: string;
  text: string;
  minQuantity: number;
  maxQuantity: number | null;
}

function parseThresholdValue(value: number | string): number | null {
  const normalizedValue = typeof value === "number" ? value : value.trim();
  if (normalizedValue === "") {
    return null;
  }

  const parsed =
    typeof normalizedValue === "number"
      ? normalizedValue
      : Number(normalizedValue);

  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
}

function floorFor(row: ThresholdRow): number {
  if (row === "low") {
    return 1;
  }

  if (row === "medium") {
    return 2;
  }

  return 3;
}

export function commitThreshold(
  draft: ThresholdDraft,
  row: ThresholdRow,
  value: number | string,
): ThresholdDraft {
  const parsed = parseThresholdValue(value);
  if (parsed === null) {
    return { ...draft };
  }

  const next = { ...draft, [row]: Math.max(floorFor(row), parsed) };

  if (next[row] < draft[row]) {
    next.medium = Math.min(next.medium, next.normal - 1);
    next.low = Math.min(next.low, next.medium - 1);
  } else if (next[row] > draft[row]) {
    next.medium = Math.max(next.medium, next.low + 1);
    next.normal = Math.max(next.normal, next.medium + 1);
  }

  return next;
}

function rangeLabel(minQuantity: number, maxQuantity: number): string {
  return minQuantity === maxQuantity
    ? String(minQuantity)
    : `${minQuantity}–${maxQuantity}`;
}

export function deriveBands(
  low: number,
  medium: number,
  normal: number,
): StockThresholdBand[] {
  const ranges: readonly [number, number | null][] = [
    [0, 0],
    [1, low],
    [low + 1, medium],
    [medium + 1, normal],
    [normal + 1, null],
  ];

  return ranges.map(([minQuantity, maxQuantity], index) => {
    const state = STOCK_STATES[index];
    const meta = getStockStateMeta(state);

    return {
      state,
      label:
        maxQuantity === null
          ? `${minQuantity}+`
          : rangeLabel(minQuantity, maxQuantity),
      tint: meta.tint,
      text: meta.text,
      minQuantity,
      maxQuantity,
    };
  });
}
