import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import { stockLocationsFixture } from "../api/mocks/get-stock-locations.fixture";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

import { StockLocationsPage } from "./StockLocationsPage";

const BOOTSTRAP_LOCATIONS = ["LC1", "H1", "L2", "L3"];

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

// The location list lives in a bottom sheet: open it, read it, then close it again so
// the assertions that follow act on the form underneath.
async function readLocationSheetOptions(): Promise<HTMLElement[]> {
  await userEvent.click(screen.getByRole("button", { name: "Location" }));
  const options = await screen.findAllByTestId("stock-sheet-option");
  return options;
}

function cardLabels(cards: HTMLElement[]): (string | null)[] {
  return cards.map((card) => card.getAttribute("aria-label"));
}

// The picker groups locations into letter blocks, so everything on offer is only visible
// one block at a time; this opens one and comes back.
async function readLocationBlock(letter: string): Promise<(string | null)[]> {
  await userEvent.click(screen.getByRole("button", { name: letter }));
  const locations = cardLabels(await screen.findAllByTestId("stock-sheet-option"));
  await userEvent.click(
    screen.getByRole("button", { name: "Back to location blocks" }),
  );
  return locations;
}

async function closeLocationSheet(): Promise<void> {
  await userEvent.click(screen.getAllByRole("button", { name: "Close Location" })[0]!);
}

describe("screen 06 wizard entry points", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useBootstrapStore.getState().reset();
    useStockNavigationStore.getState().reset();
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
    setBootstrapLocations(BOOTSTRAP_LOCATIONS);
  });

  it("C8: the dashed row offers instance-less locations only; the pill offers every location, none preselected", async () => {
    // The fixture must make the two sets differ: some bootstrap locations occupied, some free.
    const occupied = stockLocationsFixture.map(({ location }) => location);
    const instanceLess = BOOTSTRAP_LOCATIONS.filter((location) => !occupied.includes(location));
    expect(occupied.every((location) => BOOTSTRAP_LOCATIONS.includes(location))).toBe(true);
    expect(instanceLess.length).toBeGreaterThan(0);
    expect(instanceLess).not.toEqual(BOOTSTRAP_LOCATIONS);

    render(<StockLocationsPage />);
    await screen.findAllByTestId("stock-location-row");

    // (a) dashed row — D3: instance-less bootstrap locations only
    await userEvent.click(screen.getByRole("button", { name: /new location/i }));
    await screen.findByRole("heading", { name: "New stock instance" });
    expect(useStockWizardStore.getState().availableLocations).toEqual(["L2", "L3"]);
    expect(cardLabels(await readLocationSheetOptions())).toEqual(["L"]);
    expect(await readLocationBlock("L")).toEqual(["L2", "L3"]);
    await closeLocationSheet();
    expect(useStockWizardStore.getState().draft?.location).toBe("");

    // back to 06 (× discards)
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await screen.findAllByTestId("stock-location-row");
    expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("locations-root");

    // (b) floating pill — design 06 line 11: every bootstrap location, no location preselected
    await userEvent.click(screen.getByRole("button", { name: "New instance" }));
    await screen.findByRole("heading", { name: "New stock instance" });
    await waitFor(() =>
      expect(useStockWizardStore.getState().availableLocations).toEqual([
        "LC1",
        "H1",
        "L2",
        "L3",
      ]),
    );
    const cards = await readLocationSheetOptions();
    expect(cardLabels(cards)).toEqual(["H", "L", "LC"]);
    expect(cards.every((card) => card.getAttribute("aria-pressed") === "false")).toBe(true);
    // Every bootstrap location stays reachable, one block down.
    expect(await readLocationBlock("H")).toEqual(["H1"]);
    expect(await readLocationBlock("L")).toEqual(["L2", "L3"]);
    expect(await readLocationBlock("LC")).toEqual(["LC1"]);
    await closeLocationSheet();
    expect(useStockWizardStore.getState().draft).toMatchObject({
      location: "",
      itemCategory: "",
    });
    expect(useStockWizardStore.getState().editingId).toBeNull();
    expect(screen.getByTestId("stock-wizard-step-eyebrow").textContent).toBe("Step 1 of 2");
  });
});
