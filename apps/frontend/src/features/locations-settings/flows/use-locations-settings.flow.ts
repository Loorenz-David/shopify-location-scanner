import { useMemo } from "react";

import { filterLocationOptions } from "../../location-options/domain/location-options.domain";
import { useLocationOptionsSettingsFlow } from "../../location-options/flows/use-location-options-settings.flow";
import { useLocationOptionsSettingsStore } from "../../location-options/stores/location-options-settings.store";
import {
  filterLogisticLocations,
  sortWithRecentFirst,
} from "../../logistic-locations/domain/logistic-locations.domain";
import { useLogisticLocationsFlow } from "../../logistic-locations/flows/use-logistic-locations.flow";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import type { UnifiedLocationItem } from "../types/locations-settings.types";

interface LocationsSettingsFlowResult {
  combinedList: UnifiedLocationItem[];
  showPickerCondition: boolean;
  shopIsLoading: boolean;
  logisticIsLoading: boolean;
  shopIsSubmitting: boolean;
  logisticIsSubmitting: boolean;
  shopError: string | null;
  logisticError: string | null;
}

export function useLocationsSettingsFlow(
  query: string,
): LocationsSettingsFlowResult {
  useLocationOptionsSettingsFlow();
  useLogisticLocationsFlow();

  const options = useLocationOptionsSettingsStore((state) => state.options);
  const shopIsLoading = useLocationOptionsSettingsStore(
    (state) => state.isLoading,
  );
  const shopIsSubmitting = useLocationOptionsSettingsStore(
    (state) => state.isSubmitting,
  );
  const shopError = useLocationOptionsSettingsStore(
    (state) => state.errorMessage,
  );

  const rawLocations = useLogisticLocationsStore((state) => state.locations);
  const recentlyAddedIds = useLogisticLocationsStore(
    (state) => state.recentlyAddedIds,
  );
  const logisticIsLoading = useLogisticLocationsStore(
    (state) => state.isLoading,
  );
  const logisticIsSubmitting = useLogisticLocationsStore(
    (state) => state.isSubmitting,
  );
  const logisticError = useLogisticLocationsStore(
    (state) => state.errorMessage,
  );

  const combinedList = useMemo<UnifiedLocationItem[]>(() => {
    const filteredLogistic = sortWithRecentFirst(
      filterLogisticLocations(rawLocations, query),
      recentlyAddedIds,
    );
    const filteredShop = filterLocationOptions(options, query);

    const logisticItems: UnifiedLocationItem[] = filteredLogistic.map(
      (loc) => ({
        kind: "logistic",
        id: loc.id,
        location: loc.location,
        zoneType: loc.zoneType,
      }),
    );

    const shopItems: UnifiedLocationItem[] = filteredShop.map((opt) => ({
      kind: "shop",
      label: opt.label,
      value: opt.value,
    }));

    return [...logisticItems, ...shopItems];
  }, [rawLocations, recentlyAddedIds, options, query]);

  const showPickerCondition =
    query.trim().length > 0 &&
    !combinedList.some((item) => {
      const name = item.kind === "shop" ? item.label : item.location;
      return name.toLowerCase() === query.trim().toLowerCase();
    });

  return {
    combinedList,
    showPickerCondition,
    shopIsLoading,
    logisticIsLoading,
    shopIsSubmitting,
    logisticIsSubmitting,
    shopError,
    logisticError,
  };
}
