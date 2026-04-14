import { homeShellActions } from "../../home/actions/home-shell.actions";
import {
  loadLinkedShopController,
  startShopifyInstallController,
  unlinkShopController,
} from "../controllers/shopify-settings.controller";

export const shopifySettingsActions = {
  async loadLinkedShop(): Promise<void> {
    await loadLinkedShopController();
  },
  startInstall(storeInput: string): void {
    startShopifyInstallController(storeInput);
  },
  async unlinkShop(): Promise<void> {
    await unlinkShopController();
  },
  backToSettings(): void {
    homeShellActions.selectNavigationPage("settings");
  },
};
