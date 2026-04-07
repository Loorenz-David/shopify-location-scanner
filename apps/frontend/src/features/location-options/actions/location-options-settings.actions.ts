import { homeShellActions } from "../../home/actions/home-shell.actions";
import {
  addLocationOptionController,
  hydrateLocationOptionsController,
  removeLocationOptionController,
} from "../controllers/location-options-settings.controller";
import { useLocationOptionsSettingsStore } from "../stores/location-options-settings.store";

export const locationOptionsSettingsActions = {
  async hydrate(): Promise<void> {
    await hydrateLocationOptionsController();
  },
  setQuery(query: string): void {
    useLocationOptionsSettingsStore.getState().setQuery(query);
  },
  toggleExpanded(value: string): void {
    const store = useLocationOptionsSettingsStore.getState();
    store.setExpandedValue(store.expandedValue === value ? null : value);
  },
  async addOption(): Promise<void> {
    const query = useLocationOptionsSettingsStore.getState().query;
    await addLocationOptionController(query);
  },
  async removeOption(value: string): Promise<void> {
    await removeLocationOptionController(value);
  },
  backToSettings(): void {
    homeShellActions.selectNavigationPage("settings");
  },
};
