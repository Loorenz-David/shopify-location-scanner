import * as stockApi from "../api";
import {
  buildReportView,
  computeCounterTiles,
} from "../domain/stock-report.domain";
import {
  createDefaultStockFilter,
  useStockReportStore,
} from "../stores/stock-report.store";
import type { StockFilterState } from "../types/stock.types";

function currentKeyOrder(): string[] {
  return useStockReportStore.getState().options?.propertyOptions.map(
    (option) => option.key,
  ) ?? [];
}

function rebuildReportView(): void {
  const store = useStockReportStore.getState();
  const keyOrder = currentKeyOrder();
  store.setView(buildReportView(store.entries, store.appliedFilter, keyOrder));
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
