import { normalizeLogisticLocations } from "../domain/logistic-locations.domain";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";
export function hydrateLogisticLocationsFromBootstrap(dtos) {
    const locations = normalizeLogisticLocations(dtos);
    useLogisticLocationsStore.getState().setLocations(locations);
    useLogisticLocationsStore.getState().setHasHydrated(true);
}
