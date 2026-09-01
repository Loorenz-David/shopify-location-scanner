import { describe, expect, it } from "vitest";
import { stockActions } from "./stock.actions";
import { useStockNavigationStore } from "../stores/stock-navigation.store";

describe("stock actions facade", () => {
  it("C8: exposes the navigation transitions through the single facade", () => {
    stockActions.resetNavigation("report");
    stockActions.pushView("location-detail");

    expect(useStockNavigationStore.getState().viewStack).toEqual([
      "report",
      "location-detail",
    ]);
    expect(stockActions.popView()).toBe("location-detail");
  });
});
