import { useBootstrapStore } from "../../bootstrap/stores/bootstrap.store";
import * as stockApi from "../api";
import { criteriaSummaryText } from "../domain/stock-criteria.domain";
import { STOCK_STATES } from "../domain/stock-states.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import type {
  LocationStockDto,
  StockOptionsDto,
  StockThresholdDto,
} from "../types/stock.dto";
import type { WizardDraft } from "../types/stock.types";
import {
  createStockConfigurationController,
  updateStockConfigurationController,
} from "./stock-settings.controller";

function defaultThresholds(): StockThresholdDto[] {
  return [
    { state: STOCK_STATES[1], thresholdQuantity: 10 },
    { state: STOCK_STATES[2], thresholdQuantity: 15 },
    { state: STOCK_STATES[3], thresholdQuantity: 20 },
  ];
}

function newDraft(location = ""): WizardDraft {
  return {
    location,
    itemCategory: "",
    properties: {},
    thresholds: defaultThresholds(),
  };
}

export async function ensureWizardOptions(): Promise<StockOptionsDto> {
  const currentOptions = useStockWizardStore.getState().options;
  if (currentOptions !== null) {
    return currentOptions;
  }

  const store = useStockWizardStore.getState();
  store.setLoading(true);

  try {
    const options = await stockApi.getStockOptions();
    useStockWizardStore.getState().setOptions(options);
    return options;
  } catch (error) {
    useStockWizardStore.getState().setError({
      message: "Unable to load stock options.",
    });
    throw error;
  } finally {
    useStockWizardStore.getState().setLoading(false);
  }
}

function getBootstrapStockLocations(): string[] {
  const bootstrapOptions = useBootstrapStore.getState().payload?.shopify.metafields.options ?? [];
  return bootstrapOptions.map(({ value }) => value);
}

export function getInstanceLessStockLocations(): string[] {
  const occupiedLocations = new Set(
    useStockSettingsStore.getState().locations.map(({ location }) => location),
  );

  return getBootstrapStockLocations().filter(
    (location) => !occupiedLocations.has(location),
  );
}

async function startNewStockWizard(
  availableLocations: string[],
  location?: string,
): Promise<void> {
  await ensureWizardOptions();
  const store = useStockWizardStore.getState();
  store.setDraft(newDraft(location));
  store.setEditingId(null);
  store.setOriginalLocation(location ?? null);
  store.setAvailableLocations(availableLocations);
  store.setRenderedCriteriaChips([]);
  store.setStep(1);
  store.setError(null);
}

export async function initializeNewStockWizardController(
  location?: string,
): Promise<void> {
  await startNewStockWizard(
    location === undefined ? getInstanceLessStockLocations() : [location],
    location,
  );
}

// Screen 06's floating pill (design 06 line 11): every bootstrap location on offer, none
// preselected. D3's instance-less restriction binds only the dashed row, which keeps using
// the no-argument controller above (plan 6 C8).
export async function initializeNewStockWizardOverAllLocationsController(): Promise<void> {
  await startNewStockWizard(getBootstrapStockLocations());
}

export async function initializeEditStockWizardController(
  definition: LocationStockDto,
): Promise<void> {
  const options = await ensureWizardOptions();
  const store = useStockWizardStore.getState();
  const draft: WizardDraft = {
    location: definition.location,
    itemCategory: definition.itemCategory,
    properties: structuredClone(definition.properties),
    thresholds: structuredClone(definition.thresholds),
  };

  store.setDraft(draft);
  store.setEditingId(definition.id);
  store.setOriginalLocation(definition.location);
  store.setAvailableLocations([definition.location]);
  store.setRenderedCriteriaChips(
    criteriaSummaryText(definition.properties, options),
  );
  store.setStep(1);
  store.setError(null);
}

export function updateStockWizardDraft(patch: Partial<WizardDraft>): void {
  useStockWizardStore.getState().updateDraft(patch);
}

export function setStockWizardStep(step: 1 | 2): void {
  useStockWizardStore.getState().setStep(step);
}

export async function submitStockWizardController(): Promise<void> {
  const state = useStockWizardStore.getState();
  if (state.draft === null) {
    return;
  }

  if (state.editingId === null) {
    await createStockConfigurationController(state.draft);
  } else {
    await updateStockConfigurationController(
      state.editingId,
      state.draft,
      state.originalLocation ?? state.draft.location,
    );
  }

  while (true) {
    const navigationStore = useStockNavigationStore.getState();
    const currentView = navigationStore.viewStack.at(-1);
    if (navigationStore.viewStack.length <= 1 || currentView === "location-detail") {
      break;
    }

    navigationStore.pop();
  }
  if (useStockNavigationStore.getState().viewStack.at(-1) !== "location-detail") {
    useStockNavigationStore.getState().reset("location-detail");
  }
  useStockWizardStore.getState().reset();
}
