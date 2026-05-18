import { homeShellActions } from "../../home/actions/home-shell.actions";
import { createLogisticLocationController, deleteLogisticLocationController, hydrateLogisticLocationsController, } from "../controllers/logistic-locations.controller";
import { useLogisticLocationsStore } from "../stores/logistic-locations.store";
export const logisticLocationsActions = {
    async hydrate() {
        await hydrateLogisticLocationsController();
    },
    setQuery(query) {
        useLogisticLocationsStore.getState().setQuery(query);
    },
    setSelectedZoneType(zone) {
        useLogisticLocationsStore.getState().setSelectedZoneType(zone);
    },
    toggleExpanded(id) {
        const store = useLogisticLocationsStore.getState();
        store.setExpandedId(store.expandedId === id ? null : id);
    },
    async createLocation(location, zoneType) {
        await createLogisticLocationController(location, zoneType);
    },
    async deleteLocation(id) {
        await deleteLogisticLocationController(id);
    },
    backToSettings() {
        homeShellActions.selectNavigationPage("settings");
    },
};
