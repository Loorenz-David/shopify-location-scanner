import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as stockApi from "../api";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockReportFixture } from "../api/mocks/get-stock-report.fixture";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockReportStore } from "../stores/stock-report.store";

const wsState = vi.hoisted(() => ({
  handler: null as ((event: unknown) => void) | null,
}));

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn((_type: string, handler: (event: unknown) => void) => {
    wsState.handler = handler;
  }),
}));

import { useStockReportFlow } from "./use-stock-report.flow";
import { useStockSettingsFlow } from "./use-stock-settings.flow";

describe("stock flows", () => {
  beforeEach(() => {
    wsState.handler = null;
    useStockReportStore.getState().reset();
    useStockSettingsStore.getState().reset();
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
  });

  it("C6(report): loads on mount and refetches on arbitrary scan history events", async () => {
    const reportSpy = vi.spyOn(stockApi, "getStockReport").mockResolvedValue(stockReportFixture);
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValue(stockOptionsFixture);

    const rendered = renderHook(() => useStockReportFlow());
    await waitFor(() => expect(reportSpy).toHaveBeenCalledTimes(1));

    act(() => {
      wsState.handler?.({ payload: "ignored" });
      wsState.handler?.({ payload: 42 });
    });

    await waitFor(() => expect(reportSpy).toHaveBeenCalledTimes(3));
    rendered.unmount();
  });

  it("C6(settings detail): loads on mount and refetches the mounted detail on every event", async () => {
    const detailSpy = vi.spyOn(stockApi, "getStockLocationDetail")
      .mockResolvedValue([]);
    vi.spyOn(stockApi, "getStockLocations").mockResolvedValue([]);

    const rendered = renderHook(() => useStockSettingsFlow("LC1"));
    await waitFor(() => expect(detailSpy).toHaveBeenCalledTimes(1));

    act(() => {
      wsState.handler?.({ payload: "ignored" });
    });

    await waitFor(() => expect(detailSpy).toHaveBeenCalledTimes(2));
    rendered.unmount();
  });
});
