import {
  createStockConfigurationController,
  deleteStockConfigurationController,
  hydrateStockLocationDetailController,
  hydrateStockLocationsController,
  updateStockConfigurationController,
} from "../controllers/stock-settings.controller";
import {
  hydrateStockReportController,
  resetStockReportFilterController,
  setStockReportFilterController,
} from "../controllers/stock-report.controller";
import {
  getInstanceLessStockLocations,
  initializeEditStockWizardController,
  ensureWizardOptions,
  initializeNewStockWizardController,
  initializeNewStockWizardOverAllLocationsController,
  setStockWizardStep,
  submitStockWizardController,
  updateStockWizardDraft,
} from "../controllers/stock-wizard.controller";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import type { StockConfigurationPatch } from "../controllers/stock-settings.controller";
import type { StockInternalView } from "../types/stock.types";

export const stockActions = {
  hydrateSettingsRoot: hydrateStockLocationsController,
  hydrateSettingsDetail: hydrateStockLocationDetailController,
  hydrateReport: hydrateStockReportController,
  createConfiguration: createStockConfigurationController,
  updateConfiguration: (
    id: string,
    patch: StockConfigurationPatch,
    originalLocation?: string,
  ) => updateStockConfigurationController(id, patch, originalLocation),
  deleteConfiguration: deleteStockConfigurationController,
  ensureOptions: ensureWizardOptions,
  startNewWizard: initializeNewStockWizardController,
  startNewWizardFromRoot: () => initializeNewStockWizardController(),
  startNewWizardOverAllLocations: initializeNewStockWizardOverAllLocationsController,
  startNewWizardFromLocation: initializeNewStockWizardController,
  startEditWizard: initializeEditStockWizardController,
  updateWizardDraft: updateStockWizardDraft,
  setWizardStep: setStockWizardStep,
  submitWizard: submitStockWizardController,
  getInstanceLessLocations: getInstanceLessStockLocations,
  setReportFilter: setStockReportFilterController,
  resetReportFilter: resetStockReportFilterController,
  pushView(view: StockInternalView): void {
    useStockNavigationStore.getState().push(view);
  },
  popView(): StockInternalView {
    return useStockNavigationStore.getState().pop();
  },
  resetNavigation(rootView?: StockInternalView): void {
    useStockNavigationStore.getState().reset(rootView);
  },
};
