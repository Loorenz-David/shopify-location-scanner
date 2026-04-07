import {
  clearBootstrapController,
  hydrateBootstrapController,
} from "../controllers/bootstrap.controller";

export const bootstrapActions = {
  async hydrate(): Promise<void> {
    await hydrateBootstrapController();
  },
  clear(): void {
    clearBootstrapController();
  },
};
