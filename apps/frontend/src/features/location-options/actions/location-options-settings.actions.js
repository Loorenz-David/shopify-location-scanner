import { homeShellActions } from "../../home/actions/home-shell.actions";
import { addLocationOptionController, hydrateLocationOptionsController, removeLocationOptionController, } from "../controllers/location-options-settings.controller";
import { useLocationOptionsSettingsStore } from "../stores/location-options-settings.store";
export const locationOptionsSettingsActions = {
    async hydrate() {
        await hydrateLocationOptionsController();
    },
    setQuery(query) {
        useLocationOptionsSettingsStore.getState().setQuery(query);
    },
    toggleExpanded(value) {
        const store = useLocationOptionsSettingsStore.getState();
        store.setExpandedValue(store.expandedValue === value ? null : value);
    },
    async addOption(query) {
        const resolvedQuery = query ?? useLocationOptionsSettingsStore.getState().query;
        await addLocationOptionController(resolvedQuery);
    },
    async removeOption(value) {
        await removeLocationOptionController(value);
    },
    backToSettings() {
        homeShellActions.selectNavigationPage("settings");
    },
};
