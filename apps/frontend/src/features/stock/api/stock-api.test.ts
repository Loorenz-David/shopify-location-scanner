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
import { __resetMockState } from "./mocks/mock-state";
import type { CreateStockConfigurationsRequestDto } from "../types/stock.dto";

const thresholds = [
  { state: "low_in_stock", thresholdQuantity: 10 },
  { state: "medium_in_stock", thresholdQuantity: 15 },
  { state: "high_in_stock", thresholdQuantity: 20 },
] as const;

const createBody: CreateStockConfigurationsRequestDto = {
  configurations: [
    {
      location: "LC1",
      itemCategory: "Dining Chairs",
      properties: { wood_type: ["Teak"] },
      thresholds: [...thresholds],
    },
  ],
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("stock API seam", () => {
  beforeEach(() => {
    __resetMockState();
    localStorage.setItem("accessToken", "a.eyJ1c2VySWQiOiIxIn0.c");
  });

  it("C3(a): every report entry has exactly the eight contract fields", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const entries = await getStockReport();
    const keys = [
      "location",
      "itemCategory",
      "properties",
      "mergeKey",
      "quantity",
      "stockState",
      "thresholds",
      "unitsToRestockTarget",
    ];

    for (const entry of entries) {
      expect(Object.keys(entry).toSorted()).toEqual(keys.toSorted());
    }
  });

  it("C3(b): the report has one same-state pair across two locations", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const entries = await getStockReport();
    const matching = entries.filter(
      (entry) => entry.mergeKey === "report-walnut-chairs",
    );

    expect(matching).toHaveLength(2);
    expect(new Set(matching.map((entry) => entry.stockState)).size).toBe(1);
    expect(new Set(matching.map((entry) => entry.location))).toEqual(
      new Set(["LC1", "H1"]),
    );
  });

  it("C3(c): the report has one different-state pair across two locations", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const entries = await getStockReport();
    const matching = entries.filter(
      (entry) => entry.mergeKey === "report-state-split",
    );

    expect(matching).toHaveLength(2);
    expect(new Set(matching.map((entry) => entry.stockState)).size).toBe(2);
    expect(new Set(matching.map((entry) => entry.location))).toEqual(
      new Set(["LC1", "H1"]),
    );
  });

  it("C3(d): exactly one zero-quantity entry is out of stock in a third group", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const entries = await getStockReport();
    const zeroQuantityEntries = entries.filter((entry) => entry.quantity === 0);

    expect(zeroQuantityEntries).toHaveLength(1);
    expect(zeroQuantityEntries[0]?.stockState).toBe("out_of_stock");
    expect(zeroQuantityEntries[0]?.mergeKey).toBe("report-zero-entry");
    expect(
      entries.filter((entry) => entry.mergeKey === "report-zero-entry"),
    ).toHaveLength(1);
  });

  it("C3(e): report thresholds are state-keyed and full-target missing units stay visible in normal", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const entries = await getStockReport();
    const normal = entries.find((entry) =>
      entry.stockState === "high_in_stock" && entry.quantity === 18
    );

    expect(normal).toBeDefined();
    expect(
      normal!.thresholds.find((threshold) =>
        threshold.state === "high_in_stock"
      )?.thresholdQuantity,
    ).toBe(20);
    expect(normal!.unitsToRestockTarget).toBe(2);
  });

  it("C4(a): options expose the exact eight-key final vocabulary", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const options = await getStockOptions();

    expect(options.propertyOptions).toEqual([
      {
        key: "wood_type",
        values: [
          "Beech",
          "Birch",
          "Cherry",
          "Elm",
          "Mahogany",
          "Oak",
          "Santos Rosewood",
          "Teak",
          "Walnut",
        ],
        categories: "universal",
      },
      {
        key: "years",
        values: [
          "1950-1960s",
          "1960-1970s",
          "1970-1980s",
          "1980-1990s",
          "Early 20th century furniture",
        ],
        categories: "universal",
      },
      {
        key: "weight_definition",
        values: ["1-20 kg", "21-40 kg", "41-60 kg", "61+ kg"],
        categories: "universal",
      },
      {
        key: "country",
        values: ["Denmark", "Sweden", "Germany", "United Kingdom", "Italy", "Netherland"],
        categories: "universal",
      },
      {
        key: "shape",
        values: ["Oval", "Rectangular", "Round", "Square"],
        categories: [
          "Dining Tables",
          "Bedside Tables",
          "Coffee Tables",
          "Side Tables",
          "Hall Tables",
          "Nest Of Tables",
        ],
      },
      {
        key: "extension_type",
        values: ["Inside Extension", "Outside Extension"],
        categories: [
          "Dining Tables",
          "Bedside Tables",
          "Coffee Tables",
          "Side Tables",
          "Hall Tables",
          "Nest Of Tables",
        ],
      },
      {
        key: "extension_quantity",
        values: ["1", "2", "3", "4"],
        categories: [
          "Dining Tables",
          "Bedside Tables",
          "Coffee Tables",
          "Side Tables",
          "Hall Tables",
          "Nest Of Tables",
        ],
      },
      {
        key: "upholstery",
        values: ["Down", "Up & Down", "None"],
        categories: ["Dining Chairs", "Easy Chairs", "Armchairs"],
      },
      {
        key: "quantity",
        values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12"],
        categories: ["Dining Chairs", "Easy Chairs", "Armchairs"],
      },
    ]);
  });

  it("C4(b): options expose exactly the 28 item categories in order", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    expect((await getStockOptions()).itemCategories).toEqual([
      "Dining Chairs",
      "Easy Chairs",
      "Armchairs",
      "Sofas",
      "Stools",
      "Seating Benches",
      "Serving Trolleys",
      "Dining Tables",
      "Bedside Tables",
      "Coffee Tables",
      "Side Tables",
      "Hall Tables",
      "Writing Desks",
      "Nest Of Tables",
      "Sideboards",
      "Highboards",
      "Bookshelves",
      "Shelving Units",
      "Chest of Drawers",
      "Secretary Cabinets",
      "Bar Cabinets",
      "Wardrobes",
      "Storage Cabinets",
      "Posters",
      "Mirrors",
      "Porcelain",
      "Carpets",
      "Lamps",
    ]);
  });

  it("C5(a): mock mode resolves all seven functions without fetch", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await getStockOptions();
    await getStockLocations();
    await getStockLocationDetail("LC1");
    await createStockConfigurations(createBody);
    await updateStockConfiguration("stock-lc1-walnut", {
      thresholds: [...thresholds],
    });
    await deleteStockConfiguration("stock-lc1-walnut");
    await getStockReport();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("C5(b): live mode calls each endpoint once at its resolved non-api-prefixed path", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [] })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await getStockOptions();
    await getStockLocations();
    await getStockLocationDetail("LC1");
    await createStockConfigurations(createBody);
    await updateStockConfiguration("config-1", { properties: {} });
    await deleteStockConfiguration("config-1");
    await getStockReport();

    expect(fetchSpy).toHaveBeenCalledTimes(7);
    const urls = fetchSpy.mock.calls.map(([url]) => String(url));
    const expectedSuffixes = [
      "/stock/options",
      "/stock/locations",
      "/stock/locations/LC1",
      "/stock/configurations",
      "/stock/configurations/config-1",
      "/stock/configurations/config-1",
      "/stock/report",
    ];

    expect(urls.every((url, index) => url.endsWith(expectedSuffixes[index]!))).toBe(true);
    expect(urls.every((url) => !url.includes("/api/api/"))).toBe(true);
  });

  it("C5(c): an unset mode defaults observably to live", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", undefined);
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [] })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    expect(resolveStockApiMode()).toBe("live");
    await getStockOptions();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toMatch(/\/stock\/options$/);
  });

  it("C5(d): location detail URL-encodes its location path segment", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "live");
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [] })),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await getStockLocationDetail("L 1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toMatch(/\/stock\/locations\/L%201$/);
  });

  it("C5(e): mock mutations persist into reads and deletion removes the row", async () => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    const [created] = await createStockConfigurations({
      configurations: [
        {
          location: "L 1",
          itemCategory: "Armchairs",
          properties: {},
          thresholds: [...thresholds],
        },
      ],
    });

    expect(created).toBeDefined();
    const afterCreate = await getStockLocationDetail("L 1");
    expect(afterCreate).toContainEqual(created);

    await deleteStockConfiguration(created!.id);
    const afterDelete = await getStockLocationDetail("L 1");
    expect(afterDelete).not.toContainEqual(created);
  });
});
