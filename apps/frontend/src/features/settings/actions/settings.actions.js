import { homeShellActions } from "../../home/actions/home-shell.actions";
import { authActions } from "../../auth/actions/auth.actions";
import { loadSettingsProfileController } from "../controllers/settings.controller";
export const settingsActions = {
    async loadProfile() {
        await loadSettingsProfileController();
    },
    openOption(pageId) {
        homeShellActions.selectNavigationPage(pageId);
    },
    async logout() {
        await authActions.logout();
    },
};
