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
import type { StockPdfExportQuery } from "../domain/stock-pdf.domain";

export function createDefaultStockFilter(): StockFilterState {
  return {
    states: new Set(STOCK_STATES),
    locations: new Set<string>(),
    groupByLocation: false,
  };
}

export interface StockReportExportState {
  query: StockPdfExportQuery | null;
  pageCount: number | null;
  isGenerating: boolean;
  errorMessage: string | null;
}

export function createDefaultStockReportExportState(): StockReportExportState {
  return {
    query: null,
    pageCount: null,
    isGenerating: false,
    errorMessage: null,
  };
}

export interface StockReportStoreState {
  entries: StockReportEntryDto[];
  options: StockOptionsDto | null;
  appliedFilter: StockFilterState;
  view: ReportView;
  counterTiles: CounterTiles;
  exportState: StockReportExportState;
  isLoading: boolean;
  errorMessage: string | null;
  setEntries: (entries: StockReportEntryDto[]) => void;
  setOptions: (options: StockOptionsDto | null) => void;
  setAppliedFilter: (filter: StockFilterState) => void;
  setView: (view: ReportView) => void;
  setCounterTiles: (counterTiles: CounterTiles) => void;
  setExportQuery: (query: StockPdfExportQuery | null) => void;
  setExportPageCount: (pageCount: number | null) => void;
  setExportGenerating: (isGenerating: boolean) => void;
  setExportErrorMessage: (errorMessage: string | null) => void;
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
  exportState: createDefaultStockReportExportState(),
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
  setExportQuery: (query) =>
    set((state) => ({
      exportState: { ...state.exportState, query },
    })),
  setExportPageCount: (pageCount) =>
    set((state) => ({
      exportState: { ...state.exportState, pageCount },
    })),
  setExportGenerating: (isGenerating) =>
    set((state) => ({
      exportState: { ...state.exportState, isGenerating },
    })),
  setExportErrorMessage: (errorMessage) =>
    set((state) => ({
      exportState: { ...state.exportState, errorMessage },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({
      entries: [],
      options: null,
      appliedFilter: createDefaultStockFilter(),
      view: { rows: [] },
      counterTiles: { out: 0, low: 0, medium: 0, rest: 0 },
      exportState: createDefaultStockReportExportState(),
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

export const selectStockReportExportState = (state: StockReportStoreState) =>
  state.exportState;

export const selectStockReportExportQuery = (state: StockReportStoreState) =>
  state.exportState.query;

export const selectStockReportExportPageCount = (state: StockReportStoreState) =>
  state.exportState.pageCount;

export const selectStockReportExportIsGenerating = (state: StockReportStoreState) =>
  state.exportState.isGenerating;

export const selectStockReportExportErrorMessage = (state: StockReportStoreState) =>
  state.exportState.errorMessage;

export const selectStockReportIsLoading = (state: StockReportStoreState) =>
  state.isLoading;

export const selectStockReportErrorMessage = (state: StockReportStoreState) =>
  state.errorMessage;
