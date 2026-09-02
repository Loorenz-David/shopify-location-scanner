import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../../../core/api-client";
import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import * as stockApi from "../api";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { STOCK_STATES } from "../domain/stock-states.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

import { StockLocationsPage } from "./StockLocationsPage";

const LOCATION = "LC1";

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

function conflictError(message: string, details?: Record<string, unknown>): ApiClientError {
  return new ApiClientError("API request failed", {
    status: 409,
    endpoint: "/stock/configurations",
    method: "POST",
    data: {
      error: { code: "CONFLICT", message, details, requestId: "request-1" },
    },
  });
}

// Screen 06 → LC1 (screen 07) → the "Add instance to LC1" pill → step 1 preselected.
async function openLocationDetail() {
  render(<StockLocationsPage />);
  const rows = await screen.findAllByTestId("stock-location-row");
  await userEvent.click(rows.find((row) => within(row).queryAllByText(LOCATION).length > 0)!);
  return screen.findAllByTestId("stock-instance-card");
}

async function openCreateFromLocation(category: string) {
  await openLocationDetail();
  await userEvent.click(screen.getByRole("button", { name: `Add instance to ${LOCATION}` }));
  await screen.findByRole("heading", { name: "New stock instance" });
  await userEvent.click(screen.getByRole("combobox", { name: "Item type" }));
  await userEvent.click(await screen.findByRole("option", { name: category }));
  await userEvent.click(screen.getByRole("button", { name: "Next · thresholds" }));
  await screen.findByRole("heading", { name: "Stock thresholds" });
}

function limitInput(row: "Low" | "Medium" | "High") {
  return screen.getByRole("textbox", { name: `${row} limit` });
}

function displayedTriple(): [number, number, number] {
  return [
    Number((limitInput("Low") as HTMLInputElement).value),
    Number((limitInput("Medium") as HTMLInputElement).value),
    Number((limitInput("High") as HTMLInputElement).value),
  ];
}

function expectStrictLadder([low, medium, high]: [number, number, number]) {
  expect(low).toBeGreaterThanOrEqual(1);
  expect(low).toBeLessThan(medium);
  expect(medium).toBeLessThan(high);
}

function ladderRow(row: string): HTMLElement {
  const match = screen
    .getAllByTestId("stock-ladder-row")
    .find((candidate) => candidate.dataset.row === row);
  if (!match) {
    throw new Error(`no ladder row ${row}`);
  }
  return match;
}

describe("StockWizardStep2View (screen 09)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useBootstrapStore.getState().reset();
    useStockNavigationStore.getState().reset();
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
    setBootstrapLocations([LOCATION, "H1", "L2"]);
  });

  it("C4: exactly three steppers, derived rows carry no input, every edit commits through commitThreshold", async () => {
    await openCreateFromLocation("Sofas");

    // (a) three steppers and nothing else
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /^Decrease / })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /^Increase / })).toHaveLength(3);
    expect(screen.getAllByTestId("stock-ladder-row").map((row) => row.dataset.row)).toEqual([
      "extra",
      "high",
      "medium",
      "low",
      "out",
    ]);

    // (b) the derived rows have no input of any kind
    for (const derived of ["extra", "out"]) {
      const row = ladderRow(derived);
      expect(within(row).queryAllByRole("textbox")).toHaveLength(0);
      expect(within(row).queryAllByRole("spinbutton")).toHaveLength(0);
      expect(within(row).queryAllByRole("button")).toHaveLength(0);
      expect(row.querySelector("input")).toBeNull();
      expect(within(row).getByText("derived")).toBeInTheDocument();
    }

    // defaults from the controller
    expect(displayedTriple()).toEqual([10, 15, 20]);
    expect(ladderRow("extra")).toHaveTextContent("21 and above");
    expect(ladderRow("out")).toHaveTextContent("nothing on the shelf");

    // (c) a stepper tap moves one row by one and leaves the others alone
    await userEvent.click(screen.getByRole("button", { name: "Increase low" }));
    expect(displayedTriple()).toEqual([11, 15, 20]);
    expectStrictLadder(displayedTriple());

    // (d) D14 push: typing low past medium shifts medium up in the UI — only commitThreshold
    // produces 17 here; a local clamp or re-sort would not.
    await userEvent.clear(limitInput("Low"));
    await userEvent.type(limitInput("Low"), "16{enter}");
    expect(displayedTriple()).toEqual([16, 17, 20]);
    expectStrictLadder(displayedTriple());

    // lowering direction: stepping medium down pulls low below it
    await userEvent.click(screen.getByRole("button", { name: "Decrease medium" }));
    expect(displayedTriple()).toEqual([15, 16, 20]);
    expectStrictLadder(displayedTriple());

    // derived rows follow the three values
    expect(ladderRow("extra")).toHaveTextContent("21 and above");
    await userEvent.click(screen.getByRole("button", { name: "Increase high" }));
    expect(displayedTriple()).toEqual([15, 16, 21]);
    expect(ladderRow("extra")).toHaveTextContent("22 and above");

    // non-numeric typed input reverts, the ladder is untouched
    await userEvent.clear(limitInput("Medium"));
    await userEvent.type(limitInput("Medium"), "abc{enter}");
    expect(displayedTriple()).toEqual([15, 16, 21]);

    // the draft the store holds is what the UI shows (the DTO round-trip)
    const draftThresholds = useStockWizardStore.getState().draft!.thresholds;
    expect(draftThresholds).toEqual([
      { state: STOCK_STATES[1], thresholdQuantity: 15 },
      { state: STOCK_STATES[2], thresholdQuantity: 16 },
      { state: STOCK_STATES[3], thresholdQuantity: 21 },
    ]);
  });

  it("C5(create): Save instance posts the draft as a single-entry batch and pops to the location detail", async () => {
    const createSpy = vi.spyOn(stockApi, "createStockConfigurations");
    await openCreateFromLocation("Sofas");
    await userEvent.click(screen.getByRole("button", { name: "Increase high" }));
    const draft = structuredClone(useStockWizardStore.getState().draft!);
    expect(draft).toMatchObject({ location: LOCATION, itemCategory: "Sofas", properties: {} });

    await userEvent.click(screen.getByRole("button", { name: "Save instance" }));

    await waitFor(() =>
      expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("location-detail"),
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({
      configurations: [
        {
          location: LOCATION,
          itemCategory: "Sofas",
          properties: {},
          thresholds: [
            { state: STOCK_STATES[1], thresholdQuantity: 10 },
            { state: STOCK_STATES[2], thresholdQuantity: 15 },
            { state: STOCK_STATES[3], thresholdQuantity: 21 },
          ],
        },
      ],
    });
    expect(useStockWizardStore.getState().draft).toBeNull();
    // screen 07 is back, now holding the created instance from the mock layer
    expect(await screen.findByRole("heading", { level: 1, name: LOCATION })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Sofas" })).toBeInTheDocument(),
    );
  });

  it("C5(edit): the second card's wizard reads Save changes, patches that id and pops to the detail", async () => {
    const updateSpy = vi.spyOn(stockApi, "updateStockConfiguration");
    const second = stockLocationDetailFixture.filter((i) => i.location === LOCATION)[1]!;
    const cards = await openLocationDetail();
    await userEvent.click(within(cards[1]!).getByRole("button"));
    await screen.findByRole("heading", { name: "Edit stock instance" });
    await userEvent.click(screen.getByRole("button", { name: "Next · thresholds" }));
    await screen.findByRole("heading", { name: "Stock thresholds" });

    expect(screen.queryByRole("button", { name: "Save instance" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Increase low" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("location-detail"),
    );
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const lowBefore = second.thresholds.find((t) => t.state === STOCK_STATES[1])!.thresholdQuantity;
    expect(updateSpy).toHaveBeenCalledWith(second.id, {
      location: second.location,
      itemCategory: second.itemCategory,
      properties: second.properties,
      thresholds: second.thresholds.map((threshold) =>
        threshold.state === STOCK_STATES[1]
          ? { ...threshold, thresholdQuantity: lowBefore + 1 }
          : threshold,
      ),
    });
    expect(await screen.findByRole("heading", { level: 1, name: LOCATION })).toBeInTheDocument();
  });

  it("C6: a 409 names the conflicting definition's category and keeps the form open with its values", async () => {
    // The user's path loaded LC1's detail (screen 07), so the conflicting definition is in memory.
    const conflicting = stockLocationDetailFixture.find(
      (instance) => instance.location === LOCATION && Object.keys(instance.properties).length > 0,
    )!;
    const createSpy = vi
      .spyOn(stockApi, "createStockConfigurations")
      .mockRejectedValue(
        conflictError("Already configured for this location", {
          conflictingId: conflicting.id,
          batchIndex: 0,
        }),
      );
    await openCreateFromLocation("Sofas");
    await userEvent.click(screen.getByRole("button", { name: "Increase high" }));
    const tripleBefore = displayedTriple();
    const draftBefore = structuredClone(useStockWizardStore.getState().draft);

    await userEvent.click(screen.getByRole("button", { name: "Save instance" }));

    const conflict = await screen.findByTestId("stock-wizard-conflict");
    expect(conflict).toHaveTextContent("Already configured for this location");
    expect(conflict).toHaveTextContent(conflicting.itemCategory);
    expect(within(conflict).getByText("Teak")).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledTimes(1);

    // never retried, still on step 2, values intact
    expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("wizard-step2");
    expect(screen.getByRole("button", { name: "Save instance" })).toBeEnabled();
    expect(displayedTriple()).toEqual(tripleBefore);
    expect(useStockWizardStore.getState().draft).toEqual(draftBefore);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});
