import { createContext, useContext } from "react";
const LocationsSettingsContext = createContext(null);
export const LocationsSettingsProvider = LocationsSettingsContext.Provider;
export function useLocationsSettingsContext() {
    const ctx = useContext(LocationsSettingsContext);
    if (!ctx) {
        throw new Error("useLocationsSettingsContext must be used within LocationsSettingsProvider");
    }
    return ctx;
}
