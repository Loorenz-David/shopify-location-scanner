import { ApiClientError } from "../../../core/api-client";
import * as stockApi from "../api";
import { renderCriteriaChips } from "../domain/stock-criteria.domain";
import { useStockSettingsStore } from "../stores/stock-settings.store";
import { useStockWizardStore } from "../stores/stock-wizard.store";
import type {
  CreateStockConfigurationsRequestDto,
  LocationStockDto,
  StockPropertiesDto,
  StockThresholdDto,
} from "../types/stock.dto";
import type {
  StockOperationError,
  WizardDraft,
} from "../types/stock.types";

export type StockConfigurationPatch = Partial<
  Pick<LocationStockDto, "location" | "itemCategory" | "properties">
> & { thresholds?: StockThresholdDto[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorEnvelope(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof ApiClientError) || !isRecord(error.data)) {
    return null;
  }

  const envelope = error.data.error;
  return isRecord(envelope) ? envelope : null;
}

function getLoadedDefinition(conflictingId: string): LocationStockDto | undefined {
  const detailsByLocation = useStockSettingsStore.getState().detailsByLocation;

  return Object.values(detailsByLocation)
    .flat()
    .find((definition) => definition.id === conflictingId);
}

function createOperationError(error: unknown): StockOperationError {
  const envelope = getErrorEnvelope(error);
  const message = typeof envelope?.message === "string"
    ? envelope.message
    : error instanceof Error
      ? error.message
      : "Unable to save stock configuration.";
  const details = envelope?.details;
  const conflictingId = isRecord(details) && typeof details.conflictingId === "string"
    ? details.conflictingId
    : null;
  const conflicting = conflictingId === null
    ? undefined
    : getLoadedDefinition(conflictingId);

  if (!conflicting) {
    return { message };
  }

  const options = useStockWizardStore.getState().options ?? {
    itemCategories: [],
    propertyOptions: [],
  };
  const properties: StockPropertiesDto = conflicting.properties;

  return {
    message,
    conflicting: {
      category: conflicting.itemCategory,
      properties: renderCriteriaChips(properties, options),
    },
  };
}

function setOperationError(error: unknown): StockOperationError {
  const operationError = createOperationError(error);
  useStockSettingsStore.getState().setError(operationError);
  useStockWizardStore.getState().setError(operationError);
  return operationError;
}

function getConfigurationLocation(id: string): string | null {
  const detailsByLocation = useStockSettingsStore.getState().detailsByLocation;

  for (const [location, details] of Object.entries(detailsByLocation)) {
    if (details.some((definition) => definition.id === id)) {
      return location;
    }
  }

  return useStockSettingsStore.getState().selectedLocation;
}

export async function hydrateStockLocationsController(): Promise<void> {
  const store = useStockSettingsStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    store.setLocations(await stockApi.getStockLocations());
  } catch {
    store.setError({
      message: "Unable to load stock locations.",
    });
  } finally {
    useStockSettingsStore.getState().setLoading(false);
  }
}

export async function hydrateStockLocationDetailController(
  location: string,
): Promise<void> {
  const store = useStockSettingsStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const details = await stockApi.getStockLocationDetail(location);
    useStockSettingsStore.getState().setLocationDetails(location, details);
  } catch {
    useStockSettingsStore.getState().setError({
      message: "Unable to load stock location detail.",
    });
  } finally {
    useStockSettingsStore.getState().setLoading(false);
  }
}

export async function createStockConfigurationController(
  draft: WizardDraft,
): Promise<LocationStockDto[]> {
  const request: CreateStockConfigurationsRequestDto = {
    configurations: [{
      location: draft.location,
      itemCategory: draft.itemCategory,
      properties: draft.properties,
      thresholds: structuredClone(draft.thresholds),
    }],
  };
  const settingsStore = useStockSettingsStore.getState();
  const wizardStore = useStockWizardStore.getState();

  settingsStore.setError(null);
  wizardStore.setError(null);
  wizardStore.setSubmitting(true);

  try {
    const response = await stockApi.createStockConfigurations(request);
    useStockSettingsStore.getState().setLocationDetails(draft.location, response);
    const refreshedDetails = await stockApi.getStockLocationDetail(draft.location);
    useStockSettingsStore.getState().setLocationDetails(
      draft.location,
      refreshedDetails,
    );
    return response;
  } catch (error) {
    setOperationError(error);
    throw error;
  } finally {
    useStockWizardStore.getState().setSubmitting(false);
  }
}

export async function updateStockConfigurationController(
  id: string,
  patch: StockConfigurationPatch,
  originalLocation?: string,
): Promise<LocationStockDto> {
  const settingsStore = useStockSettingsStore.getState();
  const wizardStore = useStockWizardStore.getState();
  const previousLocation = originalLocation ?? getConfigurationLocation(id);

  settingsStore.setError(null);
  wizardStore.setError(null);
  wizardStore.setSubmitting(true);

  try {
    const response = await stockApi.updateStockConfiguration(id, patch);
    useStockSettingsStore.getState().setLocationDetails(response.location, [response]);

    const locationsToRefresh = [
      previousLocation,
      response.location,
    ].filter((location, index, locations): location is string =>
      location !== null && locations.indexOf(location) === index,
    );
    const refreshed = await Promise.all(
      locationsToRefresh.map(async (location) => ({
        location,
        details: await stockApi.getStockLocationDetail(location),
      })),
    );

    for (const { location, details } of refreshed) {
      useStockSettingsStore.getState().setLocationDetails(location, details);
    }

    return response;
  } catch (error) {
    setOperationError(error);
    throw error;
  } finally {
    useStockWizardStore.getState().setSubmitting(false);
  }
}

export async function deleteStockConfigurationController(
  id: string,
  location?: string,
): Promise<void> {
  const settingsStore = useStockSettingsStore.getState();
  const wizardStore = useStockWizardStore.getState();
  const locationToRefresh = location ?? getConfigurationLocation(id);

  settingsStore.setError(null);
  wizardStore.setError(null);
  wizardStore.setSubmitting(true);

  try {
    await stockApi.deleteStockConfiguration(id);
    if (locationToRefresh !== null) {
      const details = await stockApi.getStockLocationDetail(locationToRefresh);
      useStockSettingsStore.getState().setLocationDetails(locationToRefresh, details);
    }
  } catch (error) {
    setOperationError(error);
    throw error;
  } finally {
    useStockWizardStore.getState().setSubmitting(false);
  }
}
