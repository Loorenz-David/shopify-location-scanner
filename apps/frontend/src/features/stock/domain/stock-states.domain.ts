import type { StockState, StockStateMeta } from "../types/stock.types";

export const STOCK_STATES = [
  "out_of_stock",
  "low_in_stock",
  "medium_in_stock",
  "high_in_stock",
  "extra_in_stock",
] as const;

export const STOCK_STATE_META: Record<StockState, StockStateMeta> = {
  out_of_stock: {
    label: "Out of stock",
    text: "#C0392B",
    tint: "#FCEAE7",
    solid: "#D9453D",
  },
  low_in_stock: {
    label: "Low",
    text: "#C4661C",
    tint: "#FDF0E4",
    solid: "#E8843C",
  },
  medium_in_stock: {
    label: "Medium",
    text: "#93750F",
    tint: "#FBF4DC",
    solid: "#E0B93A",
  },
  high_in_stock: {
    label: "High",
    text: "#157F58",
    tint: "#E4F6EC",
    solid: "#0E8A5F",
  },
  extra_in_stock: {
    label: "Extra",
    text: "#2D7FC4",
    tint: "#E6F1FB",
    solid: "#3B9BF0",
  },
};

export class UnknownStockStateError extends Error {
  readonly state: string;

  constructor(state: string) {
    super(`Unknown stock state: ${state}`);
    this.name = "UnknownStockStateError";
    this.state = state;
  }
}

function isStockState(state: string): state is StockState {
  return (STOCK_STATES as readonly string[]).includes(state);
}

function requireStockState(state: string): StockState {
  if (!isStockState(state)) {
    throw new UnknownStockStateError(state);
  }

  return state;
}

export function getStockStateMeta(state: string): StockStateMeta {
  return STOCK_STATE_META[requireStockState(state)];
}

export function compareByStateIndex(a: StockState, b: StockState): number {
  const aIndex = STOCK_STATES.indexOf(requireStockState(a));
  const bIndex = STOCK_STATES.indexOf(requireStockState(b));

  return aIndex - bIndex;
}

export function countByStateBucket(
  states: Iterable<StockState>,
): { out: number; low: number; medium: number; rest: number } {
  const counts = { out: 0, low: 0, medium: 0, rest: 0 };

  for (const state of states) {
    switch (STOCK_STATES.indexOf(requireStockState(state))) {
      case 0:
        counts.out += 1;
        break;
      case 1:
        counts.low += 1;
        break;
      case 2:
        counts.medium += 1;
        break;
      case 3:
      case 4:
        counts.rest += 1;
        break;
    }
  }

  return counts;
}
