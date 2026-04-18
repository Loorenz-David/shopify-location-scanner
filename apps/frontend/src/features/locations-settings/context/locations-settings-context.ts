import { createContext, useContext } from "react";

import type { LocationsSettingsContextValue } from "../types/locations-settings.types";

const LocationsSettingsContext =
  createContext<LocationsSettingsContextValue | null>(null);

export const LocationsSettingsProvider = LocationsSettingsContext.Provider;

export function useLocationsSettingsContext(): LocationsSettingsContextValue {
  const ctx = useContext(LocationsSettingsContext);
  if (!ctx) {
    throw new Error(
      "useLocationsSettingsContext must be used within LocationsSettingsProvider",
    );
  }
  return ctx;
}
