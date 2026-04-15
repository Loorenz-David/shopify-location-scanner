import { normalizeLogisticLocations } from "../domain/logistic-locations.domain";
import { createLogisticLocationApi } from "../api/create-logistic-location.api";
import { deleteLogisticLocationApi } from "../api/delete-logistic-location.api";
import { getLogisticLocationsApi } from "../api/get-logistic-locations.api";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";
import type { LogisticZoneType } from "../types/logistic-locations.types";

export async function hydrateLogisticLocationsController(): Promise<void> {
  const store = useLogisticLocationsStore.getState();

  store.setLoading(true);
  store.setErrorMessage(null);

  try {
    const response = await getLogisticLocationsApi();
    store.setLocations(normalizeLogisticLocations(response.locations));
    store.setHasHydrated(true);
  } catch {
    store.setErrorMessage("Unable to load logistic locations.");
  } finally {
    store.setLoading(false);
  }
}

export async function createLogisticLocationController(
  location: string,
  zoneType: LogisticZoneType,
): Promise<void> {
  const store = useLogisticLocationsStore.getState();
  const currentLocations = store.locations;

  const isDuplicate = currentLocations.some(
    (l) => l.location.toLowerCase() === location.trim().toLowerCase(),
  );

  if (!location.trim() || isDuplicate) {
    store.setErrorMessage(
      isDuplicate
        ? "A location with this name already exists."
        : "Location name cannot be empty.",
    );
    return;
  }

  const optimisticId = `optimistic-${Date.now()}`;
  const optimisticRecord = {
    id: optimisticId,
    shopId: "",
    location: location.trim(),
    zoneType,
    createdAt: new Date().toISOString(),
  };

  store.setLocations([optimisticRecord, ...currentLocations]);
  store.addRecentlyAddedId(optimisticId);
  store.setQuery("");
  store.setSelectedZoneType(null);
  store.setSubmitting(true);
  store.setErrorMessage(null);

  try {
    const response = await createLogisticLocationApi({
      location: location.trim(),
      zoneType,
    });

    const serverRecord = {
      id: response.location.id,
      shopId: response.location.shopId,
      location: response.location.location,
      zoneType: response.location.zoneType,
      createdAt: response.location.createdAt,
    };

    store.setLocations(
      useLogisticLocationsStore
        .getState()
        .locations.map((l) => (l.id === optimisticId ? serverRecord : l)),
    );
    store.replaceRecentlyAddedId(optimisticId, serverRecord.id);
  } catch {
    store.setLocations(currentLocations);
    store.setErrorMessage("Unable to create location. Please try again.");
  } finally {
    store.setSubmitting(false);
  }
}

export async function deleteLogisticLocationController(
  id: string,
): Promise<void> {
  const store = useLogisticLocationsStore.getState();
  const currentLocations = store.locations;

  store.setLocations(currentLocations.filter((l) => l.id !== id));
  store.setExpandedId(null);
  store.setSubmitting(true);
  store.setErrorMessage(null);

  try {
    await deleteLogisticLocationApi(id);
  } catch {
    store.setLocations(currentLocations);
    store.setErrorMessage("Unable to delete location. Please try again.");
  } finally {
    store.setSubmitting(false);
  }
}
