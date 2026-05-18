import { homeShellActions } from "../../home/actions/home-shell.actions";
import { loadLinkedShopController, startShopifyInstallController, unlinkShopController, } from "../controllers/shopify-settings.controller";
export const shopifySettingsActions = {
    async loadLinkedShop() {
        await loadLinkedShopController();
    },
    startInstall(storeInput) {
        startShopifyInstallController(storeInput);
    },
    async unlinkShop() {
        await unlinkShopController();
    },
    backToSettings() {
        homeShellActions.selectNavigationPage("settings");
    },
};
