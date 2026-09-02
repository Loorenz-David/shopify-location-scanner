import { beforeEach, describe, expect, it, vi } from "vitest";
import * as stockApi from "../api";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import {
  getInstanceLessStockLocations,
  initializeEditStockWizardController,
  initializeNewStockWizardController,
  submitStockWizardController,
  updateStockWizardDraft,
} from "./stock-wizard.controller";

describe("stock wizard controller", () => {
  beforeEach(() => {
    useBootstrapStore.getState().reset();
    useStockNavigationStore.getState().reset("location-detail");
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    vi.spyOn(stockApi, "getStockOptions").mockResolvedValue(stockOptionsFixture);
  });

  it("C7: subtracts occupied root locations and returns all bootstrap locations when the root is empty", () => {
    useBootstrapStore.getState().setPayload({
      shopify: {
        metafields: {
          namespace: "stock",
          key: "locations",
          type: "single_line_text_field",
          options: [
            { label: "L1", value: "L1" },
            { label: "L2", value: "L2" },
            { label: "L3", value: "L3" },
          ],
        },
      },
      logisticLocations: [],
      vapidPublicKey: "",
    });
    useStockSettingsStore.getState().setLocations([
      { location: "L1", stockCount: 1 },
    ]);

    expect(getInstanceLessStockLocations()).toEqual(["L2", "L3"]);

    useStockSettingsStore.getState().setLocations([]);
    expect(getInstanceLessStockLocations()).toEqual(["L1", "L2", "L3"]);
  });

  it("C7(edit-prefill): reuses the criteria renderer for an edited wildcard definition", async () => {
    const edited = {
      ...stockLocationDetailFixture[0]!,
      properties: { upholstery: null },
    };

    await initializeEditStockWizardController(edited);

    const state = useStockWizardStore.getState();
    expect(state.draft).toMatchObject({
      location: edited.location,
      itemCategory: edited.itemCategory,
      properties: edited.properties,
      thresholds: edited.thresholds,
    });
    expect(state.renderedCriteriaChips).toEqual(["Upholstery: Any"]);
    expect(state.editingId).toBe(edited.id);
  });

  it("C2(wizard submit path): submits the selected draft through the single-entry create path", async () => {
    const created = {
      ...stockLocationDetailFixture[0]!,
      id: "created-1",
      location: "L2",
      quantity: 17,
    };
    const createSpy = vi.spyOn(stockApi, "createStockConfigurations")
      .mockResolvedValueOnce([created]);
    vi.spyOn(stockApi, "getStockLocationDetail").mockResolvedValueOnce([created]);

    await initializeNewStockWizardController("L2");
    updateStockWizardDraft({
      itemCategory: "Dining Chairs",
      properties: { wood_type: ["Teak"] },
    });
    await submitStockWizardController();

    expect(createSpy).toHaveBeenCalledWith({
      configurations: [{
        location: "L2",
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["Teak"] },
        thresholds: [
          { state: "low_in_stock", thresholdQuantity: 10 },
          { state: "medium_in_stock", thresholdQuantity: 15 },
          { state: "high_in_stock", thresholdQuantity: 20 },
        ],
      }],
    });
    expect(useStockWizardStore.getState().draft).toBeNull();
    expect(useStockNavigationStore.getState().viewStack).toEqual(["location-detail"]);
  });

  it("C2(save from the root): the detail it lands on keeps the root underneath it", async () => {
    // A save used to reset the stack to the detail alone, so the detail's back
    // button — a plain pop, which refuses to empty the stack — did nothing at all.
    const created = {
      ...stockLocationDetailFixture[0]!,
      id: "created-2",
      location: "L2",
    };
    vi.spyOn(stockApi, "createStockConfigurations").mockResolvedValueOnce([created]);
    vi.spyOn(stockApi, "getStockLocationDetail").mockResolvedValueOnce([created]);
    useStockNavigationStore.getState().reset("locations-root");

    await initializeNewStockWizardController("L2");
    updateStockWizardDraft({ itemCategory: "Dining Chairs", properties: {} });
    useStockNavigationStore.getState().push("wizard-step1");
    useStockNavigationStore.getState().push("wizard-step2");
    await submitStockWizardController();

    expect(useStockNavigationStore.getState().viewStack).toEqual([
      "locations-root",
      "location-detail",
    ]);
    expect(useStockNavigationStore.getState().pop()).toBe("location-detail");
    expect(useStockNavigationStore.getState().viewStack).toEqual(["locations-root"]);
  });
});
