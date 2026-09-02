import { useStockWizardStore } from "../stores/stock-wizard.store";
import {
  createStockConfigurationController,
  deleteStockConfigurationController,
  hydrateStockLocationDetailController,
  hydrateStockLocationsController,
  updateStockConfigurationController,
} from "../controllers/stock-settings.controller";
import {
  hydrateStockReportController,
  initializeStockPdfExportController,
  previewStockPdfController,
  resetStockReportFilterController,
  setStockPdfExportGroupByLocationController,
  setStockPdfExportQueryController,
  setStockPdfPageCountController,
  setStockReportFilterController,
  generateAndShareStockPdfController,
  toggleStockPdfLocationController,
  toggleStockPdfStateController,
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
  discardWizard(): void {
    useStockWizardStore.getState().reset();
  },
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
  initializePdfExport: initializeStockPdfExportController,
  setPdfExportQuery: setStockPdfExportQueryController,
  setPdfExportGroupByLocation: setStockPdfExportGroupByLocationController,
  togglePdfExportState: toggleStockPdfStateController,
  togglePdfExportLocation: toggleStockPdfLocationController,
  setPdfPageCount: setStockPdfPageCountController,
  generateAndSharePdf: generateAndShareStockPdfController,
  previewPdf: previewStockPdfController,
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
