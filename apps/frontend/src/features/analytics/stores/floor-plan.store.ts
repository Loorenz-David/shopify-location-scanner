import { create } from "zustand";

import type { FloorPlan } from "../types/analytics.types";

interface FloorPlanStoreState {
  floorPlans: FloorPlan[];
  selectedFloorPlanId: string | null;
  setFloorPlans: (plans: FloorPlan[]) => void;
  upsertFloorPlan: (plan: FloorPlan) => void;
  removeFloorPlan: (id: string) => void;
  setSelectedFloorPlanId: (id: string | null) => void;
}

export const useFloorPlanStore = create<FloorPlanStoreState>((set) => ({
  floorPlans: [],
  selectedFloorPlanId: null,
  setFloorPlans: (floorPlans) => set({ floorPlans }),
  upsertFloorPlan: (plan) =>
    set((state) => ({
      floorPlans: state.floorPlans.some((existing) => existing.id === plan.id)
        ? state.floorPlans.map((existing) =>
            existing.id === plan.id ? plan : existing,
          )
        : [...state.floorPlans, plan].sort(
            (left, right) => left.sortOrder - right.sortOrder,
          ),
    })),
  removeFloorPlan: (id) =>
    set((state) => ({
      floorPlans: state.floorPlans.filter((plan) => plan.id !== id),
    })),
  setSelectedFloorPlanId: (selectedFloorPlanId) => set({ selectedFloorPlanId }),
}));

export const selectFloorPlans = (state: FloorPlanStoreState) => state.floorPlans;
export const selectSelectedFloorPlanId = (state: FloorPlanStoreState) =>
  state.selectedFloorPlanId;
export const selectActiveFloorPlan = (state: FloorPlanStoreState) =>
  state.floorPlans.find((plan) => plan.id === state.selectedFloorPlanId) ?? null;
