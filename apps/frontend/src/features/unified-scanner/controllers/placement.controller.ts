import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { markPlacementApi } from "../../logistic-tasks/api/mark-placement.api";
import { optimisticMarkPlacement } from "../../logistic-tasks/controllers/logistic-tasks-optimistic.controller";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import { itemScanHistoryActions } from "../../item-scan-history/actions/item-scan-history.actions";
import { linkItemPositionsApi } from "../api/link-item-positions.api";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong. Please try again.";
}

export async function placementController(): Promise<void> {
  const store = useUnifiedScannerStore.getState();
  const item = store.selectedItem;
  const location = store.selectedLocation;

  if (!item || !location) {
    return;
  }

  store.setLastPlacementError(null);

  if (location.mode === "shop") {
    const optimisticToken =
      itemScanHistoryActions.beginOptimisticLocationUpdate(item, location.code);

    try {
      const response = await linkItemPositionsApi({
        idType: item.idType,
        itemId: item.itemId,
        location: location.code,
      });

      itemScanHistoryActions.commitOptimisticLocationUpdate(
        optimisticToken,
        response,
      );
      useUnifiedScannerStore.getState().setPhase("placed");
      return;
    } catch (error) {
      itemScanHistoryActions.rollbackOptimisticLocationUpdate(optimisticToken);

      const currentStore = useUnifiedScannerStore.getState();
      currentStore.setCanScanNext(false);
      currentStore.setLastPlacementError(extractErrorMessage(error));
      currentStore.setPhase("error");
      return;
    }
  }

  if (!item.id) {
    store.setCanScanNext(false);
    store.setLastPlacementError(
      "This item cannot be placed because it is missing its scan history ID.",
    );
    store.setPhase("error");
    return;
  }

  const locationRecord =
    useLogisticLocationsStore
      .getState()
      .locations.find((record) => record.id === location.id) ?? null;
  const previousItem = locationRecord
    ? optimisticMarkPlacement(item.id, locationRecord)
    : null;

  try {
    await markPlacementApi({
      scanHistoryId: item.id,
      logisticLocationId: location.id,
    });
    const currentStore = useUnifiedScannerStore.getState();
    currentStore.setCanScanNext(false);
    currentStore.setPhase("placed");
  } catch (error) {
    if (previousItem) {
      useLogisticTasksStore.getState().upsertItem(previousItem);
    }

    const currentStore = useUnifiedScannerStore.getState();
    currentStore.setCanScanNext(false);
    currentStore.setLastPlacementError(extractErrorMessage(error));
    currentStore.setPhase("error");
  }
}
