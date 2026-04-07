import { homeShellActions } from "../../home/actions/home-shell.actions";
import { authActions } from "../../auth/actions/auth.actions";
import { loadSettingsProfileController } from "../controllers/settings.controller";
import type { SettingsOptionPageId } from "../types/settings.types";

export const settingsActions = {
  async loadProfile(): Promise<void> {
    await loadSettingsProfileController();
  },
  openOption(pageId: SettingsOptionPageId): void {
    homeShellActions.selectNavigationPage(pageId);
  },
  async logout(): Promise<void> {
    await authActions.logout();
  },
};
