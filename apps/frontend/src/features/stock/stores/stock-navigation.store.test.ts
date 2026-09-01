import { describe, expect, it } from "vitest";
import { STOCK_INTERNAL_ROOT_VIEW, useStockNavigationStore } from "./stock-navigation.store";
import type { StockInternalView } from "../types/stock.types";

describe("stock navigation store", () => {
  it("C8: pushes, pops, resets, and treats an empty stack as the root", () => {
    const viewIds: StockInternalView[] = [
      "report",
      "report-entry-detail",
      "report-filter-sheet",
      "report-pdf-sheet",
      "locations-root",
      "location-detail",
      "wizard-step1",
      "wizard-step2",
    ];

    useStockNavigationStore.getState().reset("report");
    for (const viewId of viewIds) {
      useStockNavigationStore.getState().push(viewId);
    }

    expect(useStockNavigationStore.getState().viewStack).toEqual([
      "report",
      ...viewIds,
    ]);
    expect(useStockNavigationStore.getState().pop()).toBe("wizard-step2");

    useStockNavigationStore.getState().reset("locations-root");
    expect(useStockNavigationStore.getState().viewStack).toEqual([
      "locations-root",
    ]);
    expect(useStockNavigationStore.getState().pop()).toBe("locations-root");
    expect(useStockNavigationStore.getState().viewStack).toEqual([
      STOCK_INTERNAL_ROOT_VIEW,
    ]);
  });
});
