import { beforeEach, describe, expect, it, vi } from "vitest";
import * as stockApi from "../api";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockReportFixture } from "../api/mocks/get-stock-report.fixture";
import { buildReportView } from "../domain/stock-report.domain";
import { useStockReportStore } from "../stores/stock-report.store";
import {
  hydrateStockReportController,
  setStockReportFilterController,
} from "./stock-report.controller";

describe("stock report controller", () => {
  beforeEach(() => {
    useStockReportStore.getState().reset();
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
  });

  it("C1(report): hydrates entries and options while toggling loading", async () => {
    let resolveReport!: (value: typeof stockReportFixture) => void;
    vi.spyOn(stockApi, "getStockReport").mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReport = resolve;
      }),
    );
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValueOnce(stockOptionsFixture);

    const pending = hydrateStockReportController();
    expect(useStockReportStore.getState().isLoading).toBe(true);

    resolveReport(stockReportFixture);
    await pending;

    expect(useStockReportStore.getState().entries).toEqual(stockReportFixture);
    expect(useStockReportStore.getState().options).toEqual(stockOptionsFixture);
    expect(useStockReportStore.getState().isLoading).toBe(false);
  });

  it("C1(report error): stores the error string and clears loading when report hydration rejects", async () => {
    vi.spyOn(stockApi, "getStockReport").mockRejectedValueOnce(new Error("network"));
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValueOnce(stockOptionsFixture);

    await hydrateStockReportController();

    expect(useStockReportStore.getState().errorMessage).toBe(
      "Unable to load stock report.",
    );
    expect(useStockReportStore.getState().isLoading).toBe(false);
  });

  it("C9: exposes the direct report-domain composition and a non-empty options-derived key order", async () => {
    vi.spyOn(stockApi, "getStockReport").mockResolvedValueOnce(stockReportFixture);
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValueOnce(stockOptionsFixture);

    await hydrateStockReportController();

    const state = useStockReportStore.getState();
    const keyOrder = state.options!.propertyOptions.map((option) => option.key);
    const expected = buildReportView(state.entries, state.appliedFilter, keyOrder);

    expect(state.view).toEqual(expected);
    expect(keyOrder.length).toBeGreaterThan(0);
  });

  it("C9(vocabulary): orders on the fetched key order, not on code points", async () => {
    // Two rows that tie on state, quantity and category, so the properties
    // comparison alone decides their order. Under the fetched key order
    // wood_type leads (oak < pine); under an empty key order every key falls
    // into MC2a's unknown-key branch and country leads instead (aaa < zzz),
    // which flips them. This is what makes C9 above able to fail at all.
    const discriminating = [
      {
        location: "LC1",
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["oak"], country: ["zzz"] },
        mergeKey: "vocab-oak",
        quantity: 5,
        stockState: "low_in_stock",
        thresholds: stockReportFixture[0]!.thresholds,
        unitsToRestockTarget: 15,
      },
      {
        location: "LC1",
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["pine"], country: ["aaa"] },
        mergeKey: "vocab-pine",
        quantity: 5,
        stockState: "low_in_stock",
        thresholds: stockReportFixture[0]!.thresholds,
        unitsToRestockTarget: 15,
      },
    ] satisfies typeof stockReportFixture;

    vi.spyOn(stockApi, "getStockReport").mockResolvedValueOnce(discriminating);
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValueOnce(stockOptionsFixture);

    await hydrateStockReportController();

    const state = useStockReportStore.getState();
    const view = state.view!;
    expect("rows" in view && view.rows.map((row) => row.mergeKey)).toEqual([
      "vocab-oak",
      "vocab-pine",
    ]);

    // The input actually discriminates: an empty vocabulary reverses it.
    const withoutVocabulary = buildReportView(state.entries, state.appliedFilter, []);
    expect(withoutVocabulary).not.toEqual(view);
  });

  it("C9(filter): updates the exposed view through the same composed domain call", async () => {
    vi.spyOn(stockApi, "getStockReport").mockResolvedValueOnce(stockReportFixture);
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValueOnce(stockOptionsFixture);
    await hydrateStockReportController();

    const nextFilter = {
      ...useStockReportStore.getState().appliedFilter,
      locations: new Set(["H1"]),
    };
    setStockReportFilterController(nextFilter);

    const state = useStockReportStore.getState();
    const keyOrder = state.options!.propertyOptions.map((option) => option.key);
    expect(state.view).toEqual(buildReportView(state.entries, nextFilter, keyOrder));
  });
});
