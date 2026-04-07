import { useEffect } from "react";

import { locationOptionsSettingsActions } from "../actions/location-options-settings.actions";
import { useLocationOptionsSettingsStore } from "../stores/location-options-settings.store";

export function useLocationOptionsSettingsFlow(): void {
  const hasHydrated = useLocationOptionsSettingsStore(
    (state) => state.hasHydrated,
  );

  useEffect(() => {
    if (!hasHydrated) {
      void locationOptionsSettingsActions.hydrate();
    }
  }, [hasHydrated]);
}
