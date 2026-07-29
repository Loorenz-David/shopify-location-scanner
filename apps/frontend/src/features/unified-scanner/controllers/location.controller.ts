import { homeShellActions } from "../../home/actions/home-shell.actions";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { placementController } from "./placement.controller";
import {
  resolveLocation,
  resolveLogisticLocation,
  resolveShopLocation,
} from "../domain/resolve-location.domain";
import { evaluateLocationWarnings } from "../domain/warning-rules.domain";
import { useLocationOptionsStore } from "../stores/location-options.store";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import {
  UNIFIED_SCANNER_POPUP_IDS,
  type LocationScannerMode,
  type ResolvedLocation,
} from "../types/unified-scanner.types";

export function applyLocationByValueController(
  value: string,
  kind?: LocationScannerMode,
): void {
  const store = useUnifiedScannerStore.getState();
  const normalizedValue = value.trim();

  store.setLocationWarningBanner(null);

  if (!normalizedValue) {
    return;
  }

  if (!store.locationMode) {
    store.setPendingLocationValue(normalizedValue, kind ?? null);
    return;
  }

  const shopOptions = useLocationOptionsStore.getState().options;
  const logisticLocations = useLogisticLocationsStore.getState().locations;
  // An explicit kind (tapped tile in the manual panel) wins over the item's
  // preferred mode, so overlapping names resolve to the tapped set.
  const location = kind
    ? kind === "shop"
      ? resolveShopLocation(normalizedValue, shopOptions)
      : resolveLogisticLocation(normalizedValue, logisticLocations)
    : resolveLocation(
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

  store.setReturnToStore(false);

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
  store.setCanScanNext(false);
  store.setLastPlacementError(null);
  store.setPhase("placing");

  homeShellActions.closeOverlayPage();
  void placementController();
}
