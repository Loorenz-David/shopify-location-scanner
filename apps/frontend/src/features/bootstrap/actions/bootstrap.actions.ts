import { connectWsClient, tokenAuthController } from "../../../core/api-client";
import {
  clearBootstrapController,
  hydrateBootstrapController,
} from "../controllers/bootstrap.controller";

export const bootstrapActions = {
  async hydrate(): Promise<void> {
    await hydrateBootstrapController();
    connectWsClient(() => tokenAuthController.getAccessToken());
  },
  clear(): void {
    clearBootstrapController();
  },
};
