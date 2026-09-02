import * as stockApi from "../api";
import { pdfFilename } from "../domain/stock-pdf.domain";
import { saveStockCountMode } from "../domain/stock-report-settings.domain";
import {
  buildReportView,
  computeCounterTiles,
} from "../domain/stock-report.domain";
import {
  createDefaultStockFilter,
  useStockReportStore,
} from "../stores/stock-report.store";
import type {
  StockCountMode,
  StockFilterState,
  StockState,
} from "../types/stock.types";
import type { StockPdfExportQuery } from "../domain/stock-pdf.domain";
import type { UsePDFInstance } from "@react-pdf/renderer";

export type StockPdfRenderHandle = UsePDFInstance;

export type StockPdfDeliveryMethod =
  | "shared"
  | "downloaded"
  | "cancelled"
  | "previewed";

export interface StockPdfDeliveryResult {
  blob: Blob;
  filename: string;
  method: StockPdfDeliveryMethod;
}

function currentKeyOrder(): string[] {
  return useStockReportStore.getState().options?.propertyOptions.map(
    (option) => option.key,
  ) ?? [];
}

function rebuildReportView(): void {
  const store = useStockReportStore.getState();
  const keyOrder = currentKeyOrder();
  store.setView(
    buildReportView(store.entries, store.appliedFilter, keyOrder, store.countMode),
  );
  store.setCounterTiles(computeCounterTiles(store.entries, store.appliedFilter));
}

export async function hydrateStockReportController(): Promise<void> {
  const store = useStockReportStore.getState();
  store.setLoading(true);
  store.setErrorMessage(null);

  try {
    const [entries, options] = await Promise.all([
      stockApi.getStockReport(),
      stockApi.getStockOptions(),
    ]);
    useStockReportStore.getState().setEntries(entries);
    useStockReportStore.getState().setOptions(options);
    rebuildReportView();
  } catch {
    useStockReportStore.getState().setErrorMessage(
      "Unable to load stock report.",
    );
  } finally {
    useStockReportStore.getState().setLoading(false);
  }
}

export function setStockReportFilterController(filter: StockFilterState): void {
  useStockReportStore.getState().setAppliedFilter(filter);
  rebuildReportView();
}

export function resetStockReportFilterController(): void {
  setStockReportFilterController(createDefaultStockFilter());
}

// Persist first, then apply: a reload after the tap must land on the same mode.
export function setStockReportCountModeController(countMode: StockCountMode): void {
  saveStockCountMode(countMode);
  useStockReportStore.getState().setCountMode(countMode);
  rebuildReportView();
}

export function initializeStockPdfExportController(): StockPdfExportQuery {
  const store = useStockReportStore.getState();
  const activeFilter = store.appliedFilter;
  const query: StockPdfExportQuery = {
    states: new Set(activeFilter.states),
    locations: new Set(activeFilter.locations),
    groupByLocation: activeFilter.groupByLocation,
    includeSummaryCounts: true,
    showContributingLocations: true,
    countMode: store.countMode,
    propertyKeyOrder: currentKeyOrder(),
  };

  store.setExportQuery(query);
  store.setExportPageCount(null);
  store.setExportErrorMessage(null);
  return query;
}

export function setStockPdfExportQueryController(
  patch: Partial<StockPdfExportQuery>,
): void {
  const current = useStockReportStore.getState().exportState.query;
  if (current === null) {
    return;
  }

  useStockReportStore.getState().setExportQuery({
    ...current,
    ...patch,
    states: patch.states === undefined
      ? new Set(current.states)
      : new Set(patch.states),
    locations: patch.locations === undefined
      ? new Set(current.locations)
      : new Set(patch.locations),
    propertyKeyOrder: patch.propertyKeyOrder === undefined
      ? current.propertyKeyOrder
      : [...patch.propertyKeyOrder],
  });
}

export function setStockPdfExportGroupByLocationController(
  groupByLocation: boolean,
): void {
  setStockPdfExportQueryController({ groupByLocation });
}

export function toggleStockPdfStateController(state: StockState): void {
  const current = useStockReportStore.getState().exportState.query;
  if (current === null) {
    return;
  }

  const states = new Set(current.states);
  if (states.has(state)) {
    states.delete(state);
  } else {
    states.add(state);
  }
  setStockPdfExportQueryController({ states });
}

export function toggleStockPdfLocationController(location: string): void {
  const current = useStockReportStore.getState().exportState.query;
  if (current === null) {
    return;
  }

  const locations = new Set(current.locations);
  if (locations.has(location)) {
    locations.delete(location);
  } else {
    locations.add(location);
  }
  setStockPdfExportQueryController({ locations });
}

export function setStockPdfPageCountController(pageCount: number | null): void {
  useStockReportStore.getState().setExportPageCount(pageCount);
}

function blobFromRenderHandle(renderHandle: StockPdfRenderHandle): Blob {
  if (renderHandle.error !== null) {
    throw new Error(renderHandle.error);
  }
  if (renderHandle.loading || renderHandle.blob === null) {
    throw new Error("The stock PDF is not ready yet.");
  }

  return renderHandle.blob;
}

function canSharePdf(
  currentNavigator: Navigator,
  file: File,
): boolean {
  if (typeof currentNavigator.share !== "function") {
    return false;
  }
  if (typeof currentNavigator.canShare !== "function") {
    return true;
  }

  try {
    return currentNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function generateAndShareStockPdfController(
  renderHandle: StockPdfRenderHandle,
  date = new Date(),
): Promise<StockPdfDeliveryResult> {
  const blob = blobFromRenderHandle(renderHandle);
  const filename = pdfFilename(date);
  const file = new File([blob], filename, { type: "application/pdf" });
  const currentNavigator = navigator;
  useStockReportStore.getState().setExportGenerating(true);

  try {
    if (canSharePdf(currentNavigator, file)) {
      try {
        await currentNavigator.share!({ files: [file] });
        return { blob, filename, method: "shared" };
      } catch {
        return { blob, filename, method: "cancelled" };
      }
    }

    downloadPdf(blob, filename);
    return { blob, filename, method: "downloaded" };
  } finally {
    useStockReportStore.getState().setExportGenerating(false);
  }
}

export async function previewStockPdfController(
  renderHandle: StockPdfRenderHandle,
  date = new Date(),
): Promise<StockPdfDeliveryResult> {
  const blob = blobFromRenderHandle(renderHandle);
  const filename = pdfFilename(date);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");

  return { blob, filename, method: "previewed" };
}
