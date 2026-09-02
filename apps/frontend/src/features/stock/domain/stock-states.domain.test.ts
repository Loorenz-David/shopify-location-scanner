import { describe, expect, it } from "vitest";
import {
  compareByStateIndex,
  countByStateBucket,
  getStockStateMeta,
  STOCK_STATES,
  UnknownStockStateError,
} from "./stock-states.domain";
import type { StockState } from "../types/stock.types";

const expectedStates: StockState[] = [
  "out_of_stock",
  "low_in_stock",
  "medium_in_stock",
  "high_in_stock",
  "extra_in_stock",
];

const expectedMeta = [
  ["out_of_stock", "Out of stock", "#C0392B", "#FCEAE7", "#D9453D"],
  ["low_in_stock", "Low", "#C4661C", "#FDF0E4", "#E8843C"],
  ["medium_in_stock", "Medium", "#93750F", "#FBF4DC", "#E0B93A"],
  ["high_in_stock", "High", "#157F58", "#E4F6EC", "#0E8A5F"],
  ["extra_in_stock", "Extra", "#2D7FC4", "#E6F1FB", "#3B9BF0"],
] as const;

describe("stock state domain", () => {
  it("C2(a): stock states are exactly the canonical five-state order", () => {
    expect(STOCK_STATES).toEqual(expectedStates);
    expect(STOCK_STATES).toHaveLength(5);
  });

  it.each(expectedMeta)(
    "C2(b): metadata for %s matches the global design tokens",
    (state, label, text, tint, solid) => {
      expect(getStockStateMeta(state)).toEqual({ label, text, tint, solid });
    },
  );

  it("C2(c): unknown metadata state throws the named error", () => {
    expect(() => getStockStateMeta("not_a_state")).toThrow(
      UnknownStockStateError,
    );
  });

  it("C2(d): unknown comparator state throws the named error", () => {
    expect(() =>
      compareByStateIndex("not_a_state" as StockState, "low_in_stock"),
    ).toThrow(UnknownStockStateError);
  });

  it("C2(e): sorting distinct states reproduces canonical order", () => {
    const shuffled = [
      "high_in_stock",
      "out_of_stock",
      "extra_in_stock",
      "medium_in_stock",
      "low_in_stock",
    ] as StockState[];

    expect(shuffled.toSorted(compareByStateIndex)).toEqual(expectedStates);
  });

  it.each(expectedStates)(
    "C2(f): comparator returns exactly zero for equal %s values",
    (state) => {
      expect(compareByStateIndex(state, state)).toBe(0);
    },
  );

  it("C7 state buckets: groups out, low, medium, and normal/high as rest", () => {
    expect(countByStateBucket([
      "out_of_stock",
      "low_in_stock",
      "medium_in_stock",
      "high_in_stock",
      "extra_in_stock",
      "extra_in_stock",
    ])).toEqual({ out: 1, low: 1, medium: 1, rest: 3 });
  });
});
