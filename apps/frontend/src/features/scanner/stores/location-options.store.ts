import { create } from "zustand";

import type { ScannerLocationOption } from "../types/scanner.types";

interface LocationOptionsStoreState {
  options: ScannerLocationOption[];
  setOptions: (options: ScannerLocationOption[]) => void;
  reset: () => void;
}

export const useLocationOptionsStore = create<LocationOptionsStoreState>(
  (set) => ({
    options: [],
    setOptions: (options) => set({ options }),
    reset: () => set({ options: [] }),
  }),
);

export const selectLocationOptions = (state: LocationOptionsStoreState) =>
  state.options;
