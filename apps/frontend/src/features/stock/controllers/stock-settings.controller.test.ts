import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "../../../core/api-client";
import * as stockApi from "../api";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { STOCK_STATES } from "../domain/stock-states.domain";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import type { LocationStockDto } from "../types/stock.dto";
import type { WizardDraft } from "../types/stock.types";
import {
  createStockConfigurationController,
  deleteStockConfigurationController,
  hydrateStockLocationDetailController,
  hydrateStockLocationsController,
  updateStockConfigurationController,
} from "./stock-settings.controller";

const thresholds = [
  { state: STOCK_STATES[1], thresholdQuantity: 10 },
  { state: STOCK_STATES[2], thresholdQuantity: 15 },
  { state: STOCK_STATES[3], thresholdQuantity: 20 },
] as const;

const draft: WizardDraft = {
  location: "LC1",
  itemCategory: "Dining Chairs",
  properties: { wood_type: ["Teak"] },
  thresholds: [...thresholds],
};

function definition(overrides: Partial<LocationStockDto> = {}): LocationStockDto {
  return {
    ...stockLocationDetailFixture[0]!,
    ...overrides,
  };
}

function apiError(message: string, details?: Record<string, unknown>): ApiClientError {
  return new ApiClientError("API request failed", {
    status: 409,
    endpoint: "/stock/configurations",
    method: "POST",
    data: {
      error: {
        code: "CONFLICT",
        message,
        details,
        requestId: "request-1",
      },
    },
  });
}

describe("stock settings controller", () => {
  beforeEach(() => {
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
  });

  it("C1(root): hydrates the settings root and toggles loading around the call", async () => {
    let resolveRequest!: (value: { location: string; stockCount: number }[]) => void;
    const locations = [{ location: "LC1", stockCount: 3 }];
    vi.spyOn(stockApi, "getStockLocations").mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const pending = hydrateStockLocationsController();
    expect(useStockSettingsStore.getState().isLoading).toBe(true);

    resolveRequest(locations);
    await pending;

    expect(useStockSettingsStore.getState().locations).toEqual(locations);
    expect(useStockSettingsStore.getState().isLoading).toBe(false);
  });

  it("C1(root error): stores the error string and clears loading when root hydration rejects", async () => {
    vi.spyOn(stockApi, "getStockLocations").mockRejectedValueOnce(new Error("network"));

    await hydrateStockLocationsController();

    expect(useStockSettingsStore.getState().error?.message).toBe(
      "Unable to load stock locations.",
    );
    expect(useStockSettingsStore.getState().isLoading).toBe(false);
  });

  it("C1(detail): hydrates a location detail and toggles loading around the call", async () => {
    const details = [definition({ location: "LC1" })];
    let resolveRequest!: (value: LocationStockDto[]) => void;
    vi.spyOn(stockApi, "getStockLocationDetail").mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const pending = hydrateStockLocationDetailController("LC1");
    expect(useStockSettingsStore.getState().isLoading).toBe(true);

    resolveRequest(details);
    await pending;

    expect(useStockSettingsStore.getState().detailsByLocation.LC1).toEqual(details);
    expect(useStockSettingsStore.getState().isLoading).toBe(false);
  });

  it("C1(detail error): stores the error string and clears loading when detail hydration rejects", async () => {
    vi.spyOn(stockApi, "getStockLocationDetail").mockRejectedValueOnce(new Error("network"));

    await hydrateStockLocationDetailController("LC1");

    expect(useStockSettingsStore.getState().error?.message).toBe(
      "Unable to load stock location detail.",
    );
    expect(useStockSettingsStore.getState().isLoading).toBe(false);
  });

  it("C2: submits one exact draft entry, keeps response quantity/state, and refetches detail", async () => {
    const response = definition({
      quantity: 17,
      stockState: STOCK_STATES[4],
      id: "created-1",
    });
    const createSpy = vi.spyOn(stockApi, "createStockConfigurations")
      .mockResolvedValueOnce([response]);
    const detailSpy = vi.spyOn(stockApi, "getStockLocationDetail")
      .mockResolvedValueOnce([response]);

    await createStockConfigurationController(draft);

    expect(createSpy).toHaveBeenCalledWith({
      configurations: [{
        location: "LC1",
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["Teak"] },
        thresholds: [...thresholds],
      }],
    });
    expect(detailSpy).toHaveBeenCalledTimes(1);
    expect(useStockSettingsStore.getState().detailsByLocation.LC1).toEqual([response]);
    expect(useStockSettingsStore.getState().detailsByLocation.LC1?.[0]?.quantity).toBe(17);
    expect(useStockSettingsStore.getState().detailsByLocation.LC1?.[0]?.stockState).toBe(
      STOCK_STATES[4],
    );
  });

  it("C3(changed): patch refetches both the old and new location details", async () => {
    const updateResponse = definition({ id: "stock-1", location: "H1" });
    const detailSpy = vi.spyOn(stockApi, "getStockLocationDetail")
      .mockImplementation(async (location) => [definition({ location })]);
    vi.spyOn(stockApi, "updateStockConfiguration").mockResolvedValueOnce(updateResponse);

    await updateStockConfigurationController(
      "stock-1",
      { location: "H1" },
      "LC1",
    );

    expect(detailSpy.mock.calls.map(([location]) => location)).toEqual(["LC1", "H1"]);
  });

  it("C3(unchanged): patch refetches exactly one location when location does not change", async () => {
    const updateResponse = definition({ id: "stock-1", location: "LC1" });
    const detailSpy = vi.spyOn(stockApi, "getStockLocationDetail")
      .mockResolvedValueOnce([updateResponse]);
    vi.spyOn(stockApi, "updateStockConfiguration").mockResolvedValueOnce(updateResponse);

    await updateStockConfigurationController(
      "stock-1",
      { thresholds: [...thresholds] },
      "LC1",
    );

    expect(detailSpy).toHaveBeenCalledTimes(1);
    expect(detailSpy).toHaveBeenCalledWith("LC1");
  });

  it("C4: deletes through the API, refetches detail, and leaves the store row gone", async () => {
    const existing = definition({ id: "stock-1", location: "LC1" });
    useStockSettingsStore.getState().setLocationDetails("LC1", [existing]);
    vi.spyOn(stockApi, "deleteStockConfiguration").mockResolvedValueOnce();
    const detailSpy = vi.spyOn(stockApi, "getStockLocationDetail").mockResolvedValueOnce([]);

    await deleteStockConfigurationController("stock-1", "LC1");

    expect(stockApi.deleteStockConfiguration).toHaveBeenCalledWith("stock-1");
    expect(detailSpy).toHaveBeenCalledWith("LC1");
    expect(useStockSettingsStore.getState().detailsByLocation.LC1).toEqual([]);
  });

  it("C5(create/present): maps a stored-definition conflict with category and criteria and makes one call", async () => {
    const conflicting = definition({ id: "conflict-1", itemCategory: "Dining Chairs" });
    useStockSettingsStore.getState().setLocationDetails("LC1", [conflicting]);
    useStockWizardStore.getState().setOptions(stockOptionsFixture);
    const error = apiError("Already configured", { conflictingId: "conflict-1" });
    const createSpy = vi.spyOn(stockApi, "createStockConfigurations").mockRejectedValueOnce(error);

    await expect(createStockConfigurationController(draft)).rejects.toBe(error);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(useStockWizardStore.getState().error).toEqual({
      message: "Already configured",
      conflicting: { category: "Dining Chairs", properties: ["Teak"] },
    });
  });

  it("C5(create/absent): uses only the envelope message for a conflict without an id", async () => {
    const error = apiError("Rows overlap", { batchIndex: 1, conflictsWithBatchIndex: 0 });
    const createSpy = vi.spyOn(stockApi, "createStockConfigurations").mockRejectedValueOnce(error);

    await expect(createStockConfigurationController(draft)).rejects.toBe(error);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(useStockWizardStore.getState().error).toEqual({ message: "Rows overlap" });
  });

  it("C5(patch/present): maps a stored-definition conflict on the patch path and makes one call", async () => {
    const conflicting = definition({ id: "conflict-1", itemCategory: "Dining Chairs" });
    useStockSettingsStore.getState().setLocationDetails("LC1", [conflicting]);
    useStockWizardStore.getState().setOptions(stockOptionsFixture);
    const error = apiError("Already configured", { conflictingId: "conflict-1" });
    const updateSpy = vi.spyOn(stockApi, "updateStockConfiguration").mockRejectedValueOnce(error);

    await expect(
      updateStockConfigurationController("stock-1", { location: "LC1" }, "LC1"),
    ).rejects.toBe(error);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(useStockWizardStore.getState().error).toEqual({
      message: "Already configured",
      conflicting: { category: "Dining Chairs", properties: ["Teak"] },
    });
  });

  it("C5(patch/absent): uses only the envelope message on an id-less patch conflict", async () => {
    const error = apiError("Rows overlap", { batchIndex: 1, conflictsWithBatchIndex: 0 });
    const updateSpy = vi.spyOn(stockApi, "updateStockConfiguration").mockRejectedValueOnce(error);

    await expect(
      updateStockConfigurationController("stock-1", { location: "LC1" }, "LC1"),
    ).rejects.toBe(error);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(useStockWizardStore.getState().error).toEqual({ message: "Rows overlap" });
  });
});
