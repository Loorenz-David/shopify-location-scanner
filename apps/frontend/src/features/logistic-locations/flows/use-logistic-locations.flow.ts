import { useEffect } from "react";

import { logisticLocationsActions } from "../actions/logistic-locations.actions";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";

export function useLogisticLocationsFlow(): void {
  const hasHydrated = useLogisticLocationsStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      void logisticLocationsActions.hydrate();
    }
  }, [hasHydrated]);
}
