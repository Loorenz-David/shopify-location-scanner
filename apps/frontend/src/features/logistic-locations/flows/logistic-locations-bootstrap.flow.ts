import { normalizeLogisticLocations } from "../domain/logistic-locations.domain";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";
import type { LogisticLocationBootstrapDto } from "../../bootstrap/types/bootstrap.dto";

export function hydrateLogisticLocationsFromBootstrap(
  dtos: LogisticLocationBootstrapDto[],
): void {
  const locations = normalizeLogisticLocations(dtos);
  useLogisticLocationsStore.getState().setLocations(locations);
  useLogisticLocationsStore.getState().setHasHydrated(true);
}
