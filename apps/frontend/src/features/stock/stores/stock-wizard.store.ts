import { create } from "zustand";

import type { StockOptionsDto } from "../types/stock.dto";
import type {
  StockOperationError,
  WizardDraft,
} from "../types/stock.types";

export type StockWizardStep = 1 | 2;

interface StockWizardStoreState {
  draft: WizardDraft | null;
  editingId: string | null;
  originalLocation: string | null;
  availableLocations: string[];
  options: StockOptionsDto | null;
  renderedCriteriaChips: string[];
  step: StockWizardStep;
  isLoading: boolean;
  isSubmitting: boolean;
  error: StockOperationError | null;
  errorMessage: string | null;
  setDraft: (draft: WizardDraft | null) => void;
  updateDraft: (patch: Partial<WizardDraft>) => void;
  setEditingId: (editingId: string | null) => void;
  setOriginalLocation: (location: string | null) => void;
  setAvailableLocations: (locations: string[]) => void;
  setOptions: (options: StockOptionsDto | null) => void;
  setRenderedCriteriaChips: (chips: string[]) => void;
  setStep: (step: StockWizardStep) => void;
  setLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: StockOperationError | null) => void;
  reset: () => void;
}

export const useStockWizardStore = create<StockWizardStoreState>((set) => ({
  draft: null,
  editingId: null,
  originalLocation: null,
  availableLocations: [],
  options: null,
  renderedCriteriaChips: [],
  step: 1,
  isLoading: false,
  isSubmitting: false,
  error: null,
  errorMessage: null,
  setDraft: (draft) => set({ draft }),
  updateDraft: (patch) =>
    set((state) => ({
      draft: state.draft === null ? null : { ...state.draft, ...patch },
    })),
  setEditingId: (editingId) => set({ editingId }),
  setOriginalLocation: (originalLocation) => set({ originalLocation }),
  setAvailableLocations: (availableLocations) => set({ availableLocations }),
  setOptions: (options) => set({ options }),
  setRenderedCriteriaChips: (renderedCriteriaChips) =>
    set({ renderedCriteriaChips }),
  setStep: (step) => set({ step }),
  setLoading: (isLoading) => set({ isLoading }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error, errorMessage: error?.message ?? null }),
  reset: () =>
    set({
      draft: null,
      editingId: null,
      originalLocation: null,
      availableLocations: [],
      options: null,
      renderedCriteriaChips: [],
      step: 1,
      isLoading: false,
      isSubmitting: false,
      error: null,
      errorMessage: null,
    }),
}));

export const selectStockWizardDraft = (state: StockWizardStoreState) =>
  state.draft;

export const selectStockWizardIsEditing = (state: StockWizardStoreState) =>
  state.editingId !== null;

export const selectStockWizardOptions = (state: StockWizardStoreState) =>
  state.options;

export const selectStockWizardAvailableLocations = (
  state: StockWizardStoreState,
) => state.availableLocations;

export const selectStockWizardRenderedCriteriaChips = (
  state: StockWizardStoreState,
) => state.renderedCriteriaChips;

export const selectStockWizardError = (state: StockWizardStoreState) =>
  state.error;

export const selectStockWizardErrorMessage = (state: StockWizardStoreState) =>
  state.errorMessage;
