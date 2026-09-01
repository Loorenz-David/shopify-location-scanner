import { create } from "zustand";

import type { StockInternalView } from "../types/stock.types";

export const STOCK_INTERNAL_ROOT_VIEW: StockInternalView = "locations-root";

interface StockNavigationStoreState {
  viewStack: StockInternalView[];
  push: (view: StockInternalView) => void;
  pop: () => StockInternalView;
  reset: (rootView?: StockInternalView) => void;
}

export const useStockNavigationStore = create<StockNavigationStoreState>(
  (set, get) => ({
    viewStack: [STOCK_INTERNAL_ROOT_VIEW],
    push: (view) => set((state) => ({ viewStack: [...state.viewStack, view] })),
    pop: () => {
      const currentStack = get().viewStack;
      if (currentStack.length <= 1) {
        return currentStack[0] ?? STOCK_INTERNAL_ROOT_VIEW;
      }

      const poppedView = currentStack[currentStack.length - 1]!;
      set({ viewStack: currentStack.slice(0, -1) });
      return poppedView;
    },
    reset: (rootView = STOCK_INTERNAL_ROOT_VIEW) =>
      set({ viewStack: [rootView] }),
  }),
);

export const selectStockNavigationViewStack = (
  state: StockNavigationStoreState,
) => state.viewStack;

export const selectStockNavigationCurrentView = (
  state: StockNavigationStoreState,
) => state.viewStack[state.viewStack.length - 1] ?? STOCK_INTERNAL_ROOT_VIEW;
