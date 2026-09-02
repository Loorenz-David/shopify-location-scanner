import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStockConfigurations,
  deleteStockConfiguration,
  getStockLocationDetail,
  getStockLocations,
  getStockOptions,
  getStockReport,
  updateStockConfiguration,
} from "./index";
import { resolveStockApiMode } from "./stock-api-mode";
import type {
  CreateStockConfigurationsRequestDto,
  StockThresholdDto,
} from "../types/stock.dto";

const createPayload: CreateStockConfigurationsRequestDto = {
  configurations: [
    {
      location: "LC1",
      itemCategory: "Dining Chairs",
      properties: { wood_type: ["Teak"] },
      thresholds: [
        { state: "low_in_stock", thresholdQuantity: 10 },
        { state: "medium_in_stock", thresholdQuantity: 15 },
        { state: "normal_in_stock", thresholdQuantity: 20 },
      ],
    },
  ],
};

const updatePayload: {
  properties: Record<string, string[]>;
  thresholds: StockThresholdDto[];
} = {
  properties: { wood_type: ["Teak"] },
  thresholds: [
    { state: "low_in_stock", thresholdQuantity: 11 },
    { state: "medium_in_stock", thresholdQuantity: 16 },
    { state: "normal_in_stock", thresholdQuantity: 21 },
  ],
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function expectRequest(
  fetchSpy: ReturnType<typeof vi.fn>,
  expected: {
    method: string;
    path: string;
    payload?: unknown;
  },
): void {
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  expect(init.method).toBe(expected.method);
  expect(new URL(url).pathname).toBe(expected.path);
  expect(init.body).toBe(
    expected.payload === undefined ? undefined : JSON.stringify(expected.payload),
  );
}

describe("stock live integration seam", () => {
  beforeEach(() => {
    localStorage.setItem("accessToken", "a.eyJ1c2VySWQiOiIxIn0.c");
  });

  it("C1: production seam defaults to live while mock remains explicit", () => {
    vi.stubEnv("VITE_STOCK_API_MODE", undefined);
    expect(resolveStockApiMode()).toBe("live");

    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    expect(resolveStockApiMode()).toBe("live");

    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    expect(resolveStockApiMode()).toBe("mock");
  });

  it("C2(a): options uses the exact GET contract", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchSpy);

    await getStockOptions();

    expectRequest(fetchSpy, {
      method: "GET",
      path: "/api/stock/options",
    });
  });

  it("C2(b): locations uses the exact GET contract", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    await getStockLocations();

    expectRequest(fetchSpy, {
      method: "GET",
      path: "/api/stock/locations",
    });
  });

  it("C2(c): location detail URL-encodes the exact GET contract path", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    await getStockLocationDetail("L 1");

    expectRequest(fetchSpy, {
      method: "GET",
      path: "/api/stock/locations/L%201",
    });
  });

  it("C2(d): create uses the exact POST contract path and payload", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    await createStockConfigurations(createPayload);

    expectRequest(fetchSpy, {
      method: "POST",
      path: "/api/stock/configurations",
      payload: createPayload,
    });
  });

  it("C2(e): update uses the exact PATCH contract path and payload", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchSpy);

    await updateStockConfiguration("config 1", updatePayload);

    expectRequest(fetchSpy, {
      method: "PATCH",
      path: "/api/stock/configurations/config%201",
      payload: updatePayload,
    });
  });

  it("C2(f): delete uses the exact DELETE contract path without a payload", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await deleteStockConfiguration("config 1");

    expectRequest(fetchSpy, {
      method: "DELETE",
      path: "/api/stock/configurations/config%201",
    });
  });

  it("C2(g): report uses the exact unparameterized GET contract", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({ data: { entries: [] } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await getStockReport();

    expectRequest(fetchSpy, {
      method: "GET",
      path: "/api/stock/report",
    });
  });
});
