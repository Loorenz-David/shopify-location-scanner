import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { stockLocationsFixture } from "../api/mocks/get-stock-locations.fixture";
import { STOCK_STATES, getStockStateMeta } from "../domain/stock-states.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

import { StockLocationsPage } from "./StockLocationsPage";

function setBootstrapLocations(values: string[]): void {
  useBootstrapStore.getState().setPayload({
    shopify: {
      metafields: {
        namespace: "stock",
        key: "locations",
        type: "single_line_text_field",
        options: values.map((value) => ({ label: value, value })),
      },
    },
    logisticLocations: [],
    vapidPublicKey: "",
  });
}

describe("StockLocationsPage (screen 06)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useBootstrapStore.getState().reset();
    useStockNavigationStore.getState().reset();
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
  });

  it("C2: one row per location with its instance count, no quantities or states", async () => {
    render(<StockLocationsPage />);

    const rows = await screen.findAllByTestId("stock-location-row");
    expect(rows).toHaveLength(stockLocationsFixture.length);

    for (const { location, stockCount } of stockLocationsFixture) {
      const matching = rows.filter(
        (candidate) => within(candidate).queryAllByText(location).length > 0,
      );
      expect(matching).toHaveLength(1);
      const row = matching[0]!;
      const noun = stockCount === 1 ? "instance" : "instances";
      expect(
        within(row).getByText(`${stockCount} stock ${noun} configured`),
      ).toBeInTheDocument();
    }

    for (const state of STOCK_STATES) {
      expect(screen.queryByText(getStockStateMeta(state).label)).toBeNull();
    }
    for (const { quantity } of stockLocationDetailFixture) {
      expect(screen.queryByText(String(quantity))).toBeNull();
    }
    expect(screen.queryByTestId("stock-state-badge")).toBeNull();
    expect(screen.queryByTestId("stock-threshold-band")).toBeNull();
  });

  it("C3: dashed row opens the wizard over the instance-less locations", async () => {
    setBootstrapLocations(["LC1", "H1", "L2", "L3"]);
    render(<StockLocationsPage />);
    await screen.findAllByTestId("stock-location-row");

    await userEvent.click(screen.getByRole("button", { name: /new location/i }));

    await waitFor(() =>
      expect(useStockWizardStore.getState().draft).not.toBeNull(),
    );
    const wizard = useStockWizardStore.getState();
    expect(wizard.availableLocations).toEqual(["L2", "L3"]);
    expect(wizard.draft).toMatchObject({ location: "", itemCategory: "" });
    expect(wizard.editingId).toBeNull();
    expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe(
      "wizard-step1",
    );
  });
});
