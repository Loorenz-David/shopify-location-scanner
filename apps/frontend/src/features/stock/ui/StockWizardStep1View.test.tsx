import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import * as stockApi from "../api";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { STOCK_STATES } from "../domain/stock-states.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import type { LocationStockDto } from "../types/stock.dto";

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

// The production path: Settings → screen 06 → the floating pill → step 1 with every
// location on offer and nothing chosen. The vocabulary is loaded by the controller,
// never seeded here (S10).
async function openWizardFromRootPill() {
  render(<StockLocationsPage />);
  await screen.findAllByTestId("stock-location-row");
  await userEvent.click(screen.getByRole("button", { name: "New instance" }));
  await screen.findByRole("heading", { name: "New stock instance" });
}

// Location is picked in a bottom sheet now: tap the selector, tap the option.
// The picker is two steps: the letter block, then the number inside it.
async function chooseLocation(location: string) {
  await userEvent.click(screen.getByRole("button", { name: "Location" }));
  await userEvent.click(
    await screen.findByRole("button", { name: location.replace(/\d+$/, "") }),
  );
  await userEvent.click(await screen.findByRole("button", { name: location }));
}

function sheetOptions(): string[] {
  return screen.getAllByTestId("stock-sheet-option").map((option) => option.textContent);
}

async function closeSheet(title: string) {
  await userEvent.click(screen.getAllByRole("button", { name: `Close ${title}` })[0]!);
}

// Item type is a typeahead now: focus the field, then pick from the dropdown.
async function chooseItemType(category: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "Item type" }));
  await userEvent.click(await screen.findByRole("option", { name: category }));
}

function propertyRows() {
  return screen.queryAllByTestId("stock-wizard-property-row");
}

describe("StockWizardStep1View (screen 08)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useBootstrapStore.getState().reset();
    useStockNavigationStore.getState().reset();
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
    setBootstrapLocations(BOOTSTRAP_LOCATIONS);
  });

  it("C1: Next is gated on location AND item type; properties stay optional", async () => {
    await openWizardFromRootPill();
    const next = () => screen.getByRole("button", { name: "Next · thresholds" });

    // (a) neither chosen
    expect(next()).toBeDisabled();

    // (b) location only
    await chooseLocation("L2");
    expect(useStockWizardStore.getState().draft?.location).toBe("L2");
    expect(next()).toBeDisabled();

    // (d) both, with zero properties
    await chooseItemType("Sofas");
    expect(useStockWizardStore.getState().draft?.itemCategory).toBe("Sofas");
    expect(propertyRows()).toHaveLength(0);
    expect(useStockWizardStore.getState().draft?.properties).toEqual({});
    expect(next()).toBeEnabled();

    // (c) item type only — discard, reopen from the pill, pick the type before the location
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await userEvent.click(await screen.findByRole("button", { name: "New instance" }));
    await screen.findByRole("heading", { name: "New stock instance" });
    expect(useStockWizardStore.getState().draft).toMatchObject({ location: "", itemCategory: "" });
    await chooseItemType("Sofas");
    expect(useStockWizardStore.getState().draft).toMatchObject({
      location: "",
      itemCategory: "Sofas",
    });
    expect(next()).toBeDisabled();
  });

  it("C2: the definition picker offers universal + bound keys only, each at most once", async () => {
    await openWizardFromRootPill();
    await chooseLocation("L2");

    // Bound category: four universal keys plus the three table-bound keys; upholstery excluded.
    await chooseItemType("Dining Tables");
    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(sheetOptions()).toEqual([
      "wood_type",
      "years",
      "weight_definition",
      "country",
      "shape",
      "extension_type",
      "extension_quantity",
    ]);
    await closeSheet("Add property");

    // A different binding: the chair key appears, the table keys do not.
    await chooseItemType("Dining Chairs");
    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(sheetOptions()).toEqual([
      "wood_type",
      "years",
      "weight_definition",
      "country",
      "upholstery",
    ]);
    await closeSheet("Add property");

    // The majority case (S4a): a category with no bound key offers the four universal keys only.
    await chooseItemType("Sofas");
    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(sheetOptions()).toEqual([
      "wood_type",
      "years",
      "weight_definition",
      "country",
    ]);

    // Adding a definition removes it from the picker, and it renders once.
    await userEvent.click(screen.getByRole("button", { name: "wood_type" }));
    await userEvent.click(screen.getByRole("button", { name: "Teak" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    const rows = propertyRows();
    expect(rows).toHaveLength(1);
    expect(rows.filter((row) => within(row).queryByText("wood_type"))).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(sheetOptions()).toEqual(["years", "weight_definition", "country"]);
  });

  it("C3: the value picker offers the key's values plus Any value, and the draft maps through buildCriteria", async () => {
    await openWizardFromRootPill();
    await chooseLocation("L2");
    await chooseItemType("Dining Chairs");
    const draftProperties = () => useStockWizardStore.getState().draft?.properties;

    // none case — nothing chosen yet
    expect(draftProperties()).toEqual({});

    // values case
    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    await userEvent.click(screen.getByRole("button", { name: "wood_type" }));
    expect(sheetOptions()).toEqual([
      "Any value",
      "Beech",
      "Birch",
      "Cherry",
      "Elm",
      "Mahogany",
      "Oak",
      "Santos Rosewood",
      "Teak",
      "Walnut",
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Teak" }));
    await userEvent.click(screen.getByRole("button", { name: "Oak" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(draftProperties()).toEqual({ wood_type: ["Teak", "Oak"] });
    const woodRow = propertyRows()[0]!;
    expect(within(woodRow).getByText("wood_type")).toBeInTheDocument();
    expect(within(woodRow).getByText("Teak, Oak")).toBeInTheDocument();

    // any-value case (D9) — a second definition, wildcard
    await userEvent.click(screen.getByRole("button", { name: "Add property" }));
    await userEvent.click(screen.getByRole("button", { name: "upholstery" }));
    await userEvent.click(screen.getByRole("button", { name: "Any value" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(draftProperties()).toEqual({ wood_type: ["Teak", "Oak"], upholstery: null });
    const rows = propertyRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[1]!).getByText("upholstery")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Any value")).toBeInTheDocument();

    // step 2's context line carries the same criteria as chips
    await userEvent.click(screen.getByRole("button", { name: "Next · thresholds" }));
    await screen.findByRole("heading", { name: "Stock thresholds" });
    expect(screen.getByTestId("stock-wizard-context").textContent).toBe(
      "L2 · Dining Chairs · Teak, Oak, UPHOLSTERY · any",
    );
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "New stock instance" });

    // none case again — removing both rows omits the keys entirely (omission ≠ wildcard)
    await userEvent.click(screen.getByRole("button", { name: "Remove upholstery" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove wood_type" }));
    expect(propertyRows()).toHaveLength(0);
    expect(draftProperties()).toEqual({});
  });

  it("F1: discarding clears a wizard error so it does not follow the user back to the location screen", async () => {
    // Routed from the P6 handoff. Screens 06/07 render
    // `settingsErrorMessage ?? wizardErrorMessage`, so an error left in the wizard store after a
    // 409 stayed on the location screen until the next wizard start. Unreachable against the mock
    // layer, which never 409s — and routine against the real backend, where trying to create a
    // definition that already exists is the first thing anyone does.
    await openWizardFromRootPill();
    useStockWizardStore.getState().setError({ message: "Already configured for this location." });
    expect(useStockWizardStore.getState().error).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(useStockWizardStore.getState().error).toBeNull();
    expect(useStockNavigationStore.getState().viewStack.at(-1)).not.toBe("wizard-step1");
  });

  it("C7: editing the second instance prefills location, category, rows (incl. a wildcard) and thresholds", async () => {
    // S10: the edited instance is not the first, and differs from it in category and thresholds.
    const [first, second] = stockLocationDetailFixture;
    expect(second!.location).toBe(first!.location);
    expect(second!.itemCategory).not.toBe(first!.itemCategory);
    expect(second!.thresholds).not.toEqual(first!.thresholds);

    // The fixture carries no wildcard; the detail response the user's path loads gains one on
    // the second instance. Wire casing on purpose (S4c): the screen must display-case it.
    const instances: LocationStockDto[] = stockLocationDetailFixture.map((instance) =>
      instance.id === second!.id
        ? { ...instance, properties: { shape: ["oval"], extension_type: null } }
        : instance,
    );
    vi.spyOn(stockApi, "getStockLocationDetail").mockResolvedValue(
      instances.filter((instance) => instance.location === first!.location),
    );

    render(<StockLocationsPage />);
    const rows = await screen.findAllByTestId("stock-location-row");
    await userEvent.click(rows.find((row) => within(row).queryAllByText(first!.location).length > 0)!);
    const cards = await screen.findAllByTestId("stock-instance-card");
    await userEvent.click(within(cards[1]!).getByRole("button"));
    await screen.findByRole("heading", { name: "Edit stock instance" });

    const locationSelect = screen.getByTestId("stock-wizard-location-select");
    expect(locationSelect).toHaveTextContent(second!.location);
    // The edited instance's location is the only one on offer, and it is checked.
    await userEvent.click(locationSelect);
    // The picker opens on the letter blocks; the block holding the selection is marked.
    const blocks = await screen.findAllByTestId("stock-sheet-option");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(blocks[0]!);
    const locationOptions = await screen.findAllByTestId("stock-sheet-option");
    expect(locationOptions).toHaveLength(1);
    expect(locationOptions[0]).toHaveAttribute("aria-label", second!.location);
    expect(locationOptions[0]).toHaveAttribute("aria-pressed", "true");
    await closeSheet("Location");
    expect(screen.getByRole("combobox", { name: "Item type" })).toHaveValue(
      second!.itemCategory,
    );

    await waitFor(() => {
      const propertyRowsRendered = propertyRows();
      expect(propertyRowsRendered).toHaveLength(2);
      expect(within(propertyRowsRendered[0]!).getByText("shape")).toBeInTheDocument();
      expect(within(propertyRowsRendered[0]!).getByText("Oval")).toBeInTheDocument();
      expect(within(propertyRowsRendered[1]!).getByText("extension_type")).toBeInTheDocument();
      expect(within(propertyRowsRendered[1]!).getByText("Any value")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Next · thresholds" }));
    await screen.findByRole("heading", { name: "Stock thresholds" });
    const limitFor = (index: 1 | 2 | 3) =>
      second!.thresholds.find((threshold) => threshold.state === STOCK_STATES[index])!
        .thresholdQuantity;
    expect(screen.getByRole("textbox", { name: "Low limit" })).toHaveValue(String(limitFor(1)));
    expect(screen.getByRole("textbox", { name: "Medium limit" })).toHaveValue(
      String(limitFor(2)),
    );
    expect(screen.getByRole("textbox", { name: "Normal limit" })).toHaveValue(
      String(limitFor(3)),
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save instance" })).toBeNull();
  });
});
