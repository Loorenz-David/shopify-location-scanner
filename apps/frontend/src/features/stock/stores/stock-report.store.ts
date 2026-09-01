import { create } from "zustand";

import { STOCK_STATES } from "../domain/stock-states.domain";
import type {
  StockOptionsDto,
  StockReportEntryDto,
} from "../types/stock.dto";
import type {
  CounterTiles,
  ReportView,
  StockFilterState,
} from "../types/stock.types";

export function createDefaultStockFilter(): StockFilterState {
  return {
    states: new Set(STOCK_STATES),
    locations: new Set<string>(),
    groupByLocation: false,
  };
}

interface StockReportStoreState {
  entries: StockReportEntryDto[];
  options: StockOptionsDto | null;
  appliedFilter: StockFilterState;
  view: ReportView;
  counterTiles: CounterTiles;
  isLoading: boolean;
  errorMessage: string | null;
  setEntries: (entries: StockReportEntryDto[]) => void;
  setOptions: (options: StockOptionsDto | null) => void;
  setAppliedFilter: (filter: StockFilterState) => void;
  setView: (view: ReportView) => void;
  setCounterTiles: (counterTiles: CounterTiles) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  reset: () => void;
}

export const useStockReportStore = create<StockReportStoreState>((set) => ({
  entries: [],
  options: null,
  appliedFilter: createDefaultStockFilter(),
  view: { rows: [] },
  counterTiles: { out: 0, low: 0, medium: 0, rest: 0 },
  isLoading: false,
  errorMessage: null,
  setEntries: (entries) => set({ entries }),
  setOptions: (options) => set({ options }),
  setAppliedFilter: (filter) =>
    set({
      appliedFilter: {
        states: new Set(filter.states),
        locations: new Set(filter.locations),
        groupByLocation: filter.groupByLocation,
      },
    }),
  setView: (view) => set({ view }),
  setCounterTiles: (counterTiles) => set({ counterTiles }),
  setLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({
      entries: [],
      options: null,
      appliedFilter: createDefaultStockFilter(),
      view: { rows: [] },
      counterTiles: { out: 0, low: 0, medium: 0, rest: 0 },
      isLoading: false,
      errorMessage: null,
    }),
}));

export const selectStockReportEntries = (state: StockReportStoreState) =>
  state.entries;

export const selectStockReportOptions = (state: StockReportStoreState) =>
  state.options;

export const selectStockReportFilter = (state: StockReportStoreState) =>
  state.appliedFilter;

export const selectStockReportView = (state: StockReportStoreState) =>
  state.view;

export const selectStockReportCounterTiles = (state: StockReportStoreState) =>
  state.counterTiles;

export const selectStockReportIsLoading = (state: StockReportStoreState) =>
  state.isLoading;

export const selectStockReportErrorMessage = (state: StockReportStoreState) =>
  state.errorMessage;
