import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stockActions } from "../actions/stock.actions";
import { stockLocationDetailFixture } from "../api/mocks/get-stock-location-detail.fixture";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { criteriaChips } from "../domain/stock-criteria.domain";
import { STOCK_STATES } from "../domain/stock-states.domain";
import {
  deriveBands,
  thresholdDraftFrom,
} from "../domain/stock-thresholds.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import type { LocationStockDto, StockPropertiesDto } from "../types/stock.dto";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

import { StockLocationDetailView } from "./StockLocationDetailView";

const LOCATION = "LC1";
const locationInstances = stockLocationDetailFixture.filter(
  (instance) => instance.location === LOCATION,
);

// A chip renders its key label over its value, so its text is the two concatenated.
function chipTexts(properties: StockPropertiesDto): string[] {
  return criteriaChips(properties, stockOptionsFixture).map(
    (chip) => `${chip.label}${chip.values.join(", ")}`,
  );
}

// The card previews the configured bands only: out of stock and extra are fixed
// business rules, not something the instance defines.
function expectedBands(instance: LocationStockDto) {
  return deriveBands(thresholdDraftFrom(instance.thresholds), {
    includeFixedBands: false,
  });
}

function expectedBandLabels(instance: LocationStockDto): string[] {
  return expectedBands(instance).map((band) => band.label);
}

async function renderDetail() {
  useStockWizardStore.getState().setOptions(stockOptionsFixture);
  render(<StockLocationDetailView location={LOCATION} />);
  const cards = await screen.findAllByTestId("stock-instance-card");
  expect(cards).toHaveLength(locationInstances.length);
  return cards;
}

describe("StockLocationDetailView (screen 07)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useStockNavigationStore.getState().reset("location-detail");
    useStockSettingsStore.getState().reset();
    useStockWizardStore.getState().reset();
  });

  it("C4: each card renders category, chips and its own configured-band strip", async () => {
    // S10 self-check: the fixture must be able to tell one instance's bands from another's.
    const distinctLabelSets = new Set(
      locationInstances.map((instance) => expectedBandLabels(instance).join("|")),
    );
    expect(distinctLabelSets.size).toBeGreaterThan(1);
    expect(locationInstances.some((i) => Object.keys(i.properties).length === 0)).toBe(true);

    const cards = await renderDetail();

    locationInstances.forEach((instance, index) => {
      const card = cards[index]!;
      expect(
        within(card).getByRole("heading", { name: instance.itemCategory }),
      ).toBeInTheDocument();

      const expectedChips = chipTexts(instance.properties);
      if (expectedChips.length === 0) {
        const anyProperty = within(card).getByText("any property");
        expect(anyProperty.tagName).toBe("EM");
        expect(within(card).queryAllByTestId("stock-property-chip")).toHaveLength(0);
      } else {
        expect(
          within(card).getAllByTestId("stock-property-chip").map((chip) => chip.textContent),
        ).toEqual(expectedChips);
        expect(within(card).queryByText("any property")).toBeNull();
      }

      const bands = within(card).getAllByTestId("stock-threshold-band");
      expect(bands.map((band) => band.textContent)).toEqual(expectedBandLabels(instance));

      // The fixed states never reach the card: no zero band, no open-ended band.
      const configuredStates = expectedBands(instance).map((band) => band.state);
      expect(configuredStates).not.toContain(STOCK_STATES[0]);
      expect(configuredStates).not.toContain(STOCK_STATES[4]);
      expect(bands.map((band) => band.textContent)).not.toContain("0");
      expect(bands.some((band) => band.textContent?.includes("+"))).toBe(false);

      expectedBands(instance).forEach((band, bandIndex) => {
        expect(bands[bandIndex]).toHaveStyle({
          backgroundColor: band.tint,
          color: band.text,
        });
      });
    });
  });

  it("C4(cold): chips show display casing on a first visit, with no options preloaded", async () => {
    // F1, routed from the P5 handoff. criteriaChips needs the GET 4.1 vocabulary
    // to turn wire values into display casing, and nothing on the settings path fetched
    // it: a cold visit rendered "teak" where the wizard and report screens render "Teak",
    // so the same screen read differently depending on where the user had already been.
    // No setOptions here on purpose — this is the production path a user actually takes.
    const chipped = locationInstances.find(
      (instance) => Object.keys(instance.properties).length > 0,
    )!;
    const expectedChips = chipTexts(chipped.properties);
    expect(
      criteriaChips(chipped.properties, stockOptionsFixture).some((chip) =>
        chip.values.some((value) => /[A-Z][a-z]/.test(value)),
      ),
    ).toBe(true);

    render(<StockLocationDetailView location={LOCATION} />);
    const cards = await screen.findAllByTestId("stock-instance-card");
    const card = cards[locationInstances.indexOf(chipped)]!;

    await waitFor(() => {
      expect(
        within(card).getAllByTestId("stock-property-chip").map((chip) => chip.textContent),
      ).toEqual(expectedChips);
    });
  });

  it("C5: header shows the location code only — no zone name, no Rename", async () => {
    await renderDetail();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe(LOCATION);
    expect(heading.textContent).not.toContain("·");
    expect(screen.queryByText(/rename/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /rename/i })).toBeNull();
    expect(screen.queryByText(/aisle/i)).toBeNull();
    expect(
      screen.getByText(`${locationInstances.length} stock instances`),
    ).toBeInTheDocument();
  });

  it("C6: tapping the second card edits that instance; the pill creates from this location", async () => {
    const editSpy = vi.spyOn(stockActions, "startEditWizard");
    const createSpy = vi.spyOn(stockActions, "startNewWizardFromLocation");
    const cards = await renderDetail();
    const second = locationInstances[1]!;
    expect(second.id).not.toBe(locationInstances[0]!.id);

    await userEvent.click(within(cards[1]!).getByRole("button"));
    await waitFor(() =>
      expect(useStockWizardStore.getState().editingId).toBe(second.id),
    );
    expect(editSpy).toHaveBeenCalledTimes(1);
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({ id: second.id }));
    expect(useStockWizardStore.getState().draft).toMatchObject({
      itemCategory: second.itemCategory,
      location: LOCATION,
    });
    expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("wizard-step1");

    useStockNavigationStore.getState().reset("location-detail");
    useStockWizardStore.getState().reset();
    useStockWizardStore.getState().setOptions(stockOptionsFixture);

    await userEvent.click(
      screen.getByRole("button", { name: `Add instance to ${LOCATION}` }),
    );
    await waitFor(() =>
      expect(useStockWizardStore.getState().draft).not.toBeNull(),
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(LOCATION);
    const wizard = useStockWizardStore.getState();
    expect(wizard.editingId).toBeNull();
    expect(wizard.draft?.location).toBe(LOCATION);
    expect(wizard.availableLocations).toEqual([LOCATION]);
    expect(useStockNavigationStore.getState().viewStack.at(-1)).toBe("wizard-step1");
  });
});
