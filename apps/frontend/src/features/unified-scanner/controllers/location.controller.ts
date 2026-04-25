import { homeShellActions } from "../../home/actions/home-shell.actions";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { placementController } from "./placement.controller";
import { resolveLocation } from "../domain/resolve-location.domain";
import { evaluateLocationWarnings } from "../domain/warning-rules.domain";
import { useLocationOptionsStore } from "../stores/location-options.store";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import {
  UNIFIED_SCANNER_POPUP_IDS,
  type ResolvedLocation,
} from "../types/unified-scanner.types";

export function applyLocationByValueController(value: string): void {
  const store = useUnifiedScannerStore.getState();
  const normalizedValue = value.trim();

  store.setLocationWarningBanner(null);

  if (!normalizedValue) {
    return;
  }

  if (!store.locationMode) {
    store.setPendingLocationValue(normalizedValue);
    return;
  }

  const shopOptions = useLocationOptionsStore.getState().options;
  const logisticLocations = useLogisticLocationsStore.getState().locations;
  const location = resolveLocation(
    normalizedValue,
    store.locationMode,
    shopOptions,
    logisticLocations,
  );

  if (!location) {
    store.setLocationWarningBanner(
      `Location "${normalizedValue}" not recognised.`,
    );
    store.setPendingLocationValue(null);
    return;
  }

  applyResolvedLocationController(location);
}

export function applyResolvedLocationController(location: ResolvedLocation): void {
  const store = useUnifiedScannerStore.getState();
  const selectedItem = store.selectedItem;

  if (!selectedItem) {
    return;
  }

  const warnings = evaluateLocationWarnings(selectedItem, location);

  if (warnings.length > 0) {
    const [nextWarning, ...restWarnings] = warnings;

    store.setPendingLocation(location);
    store.setActiveWarning(nextWarning ?? null);
    store.setPendingWarnings(restWarnings);
    store.setRequiresZoneMismatchAfterFixCheck(
      nextWarning?.type === "fix-check" &&
        warnings.some((warning) => warning.type === "zone-mismatch"),
    );
    store.setPhase("warning-pending");

    homeShellActions.popupFeaturePage(
      UNIFIED_SCANNER_POPUP_IDS[nextWarning.type],
    );
    homeShellActions.closeOverlayPage();
    return;
  }

  store.setSelectedLocation(location);
  store.setPendingLocationValue(null);
  store.setPendingLocation(null);
  store.setPendingWarnings([]);
  store.setActiveWarning(null);
  store.setRequiresZoneMismatchAfterFixCheck(false);
  store.setCanScanNext(true);
  store.setLastPlacementError(null);
  store.setPhase("placing");

  homeShellActions.closeOverlayPage();
  void placementController();
}
