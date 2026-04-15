import { homeShellActions } from "../../home/actions/home-shell.actions";
import {
  createLogisticLocationController,
  deleteLogisticLocationController,
  hydrateLogisticLocationsController,
} from "../controllers/logistic-locations.controller";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";
import type { LogisticZoneType } from "../types/logistic-locations.types";

export const logisticLocationsActions = {
  async hydrate(): Promise<void> {
    await hydrateLogisticLocationsController();
  },
  setQuery(query: string): void {
    useLogisticLocationsStore.getState().setQuery(query);
  },
  setSelectedZoneType(zone: LogisticZoneType | null): void {
    useLogisticLocationsStore.getState().setSelectedZoneType(zone);
  },
  toggleExpanded(id: string): void {
    const store = useLogisticLocationsStore.getState();
    store.setExpandedId(store.expandedId === id ? null : id);
  },
  async createLocation(
    location: string,
    zoneType: LogisticZoneType,
  ): Promise<void> {
    await createLogisticLocationController(location, zoneType);
  },
  async deleteLocation(id: string): Promise<void> {
    await deleteLogisticLocationController(id);
  },
  backToSettings(): void {
    homeShellActions.selectNavigationPage("settings");
  },
};
