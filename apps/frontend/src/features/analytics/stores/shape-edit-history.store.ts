import { create } from "zustand";

import type { StoreZone } from "../types/analytics.types";

interface ShapeEditHistoryState {
  history: StoreZone[];
  reset: () => void;
  pushSnapshot: (zone: StoreZone) => void;
  undo: () => StoreZone | null;
}

function areSameShape(left: StoreZone, right: StoreZone): boolean {
  return (
    left.xPct === right.xPct &&
    left.yPct === right.yPct &&
    left.widthPct === right.widthPct &&
    left.heightPct === right.heightPct
  );
}

export const useShapeEditHistoryStore = create<ShapeEditHistoryState>((set, get) => ({
  history: [],
  reset: () => set({ history: [] }),
  pushSnapshot: (zone) =>
    set((state) => {
      const last = state.history.at(-1);
      if (last && areSameShape(last, zone)) {
        return state;
      }

      return {
        history: [
          ...state.history,
          {
            ...zone,
          },
        ],
      };
    }),
  undo: () => {
    const state = get();
    const previous = state.history.at(-1) ?? null;

    if (!previous) {
      return null;
    }

    set({
      history: state.history.slice(0, -1),
    });

    return previous;
  },
}));

export const selectShapeEditCanUndo = (state: ShapeEditHistoryState) =>
  state.history.length > 0;
