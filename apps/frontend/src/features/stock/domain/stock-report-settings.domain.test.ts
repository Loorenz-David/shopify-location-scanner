import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_STOCK_COUNT_MODE,
  readStockReportSettings,
  saveStockCountMode,
} from "./stock-report-settings.domain";

const KEY = "stock-report-settings";

describe("stock report settings (P7 C6(f))", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("C6(f): defaults to instances on empty storage", () => {
    expect(readStockReportSettings()).toEqual({ countMode: "instances" });
    expect(DEFAULT_STOCK_COUNT_MODE).toBe("instances");
  });

  it("C6(f): defaults to instances on corrupt or foreign storage values", () => {
    localStorage.setItem(KEY, "{not json");
    expect(readStockReportSettings().countMode).toBe("instances");
    localStorage.setItem(KEY, JSON.stringify({ countMode: "kilograms" }));
    expect(readStockReportSettings().countMode).toBe("instances");
    localStorage.setItem(KEY, JSON.stringify(null));
    expect(readStockReportSettings().countMode).toBe("instances");
  });

  it("C6(f): round-trips a saved units mode and back", () => {
    saveStockCountMode("units");
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({ countMode: "units" });
    expect(readStockReportSettings().countMode).toBe("units");
    saveStockCountMode("instances");
    expect(readStockReportSettings().countMode).toBe("instances");
  });
});
