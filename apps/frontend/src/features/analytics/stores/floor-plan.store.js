import { create } from "zustand";
export const useFloorPlanStore = create((set) => ({
    floorPlans: [],
    selectedFloorPlanId: null,
    setFloorPlans: (floorPlans) => set({ floorPlans }),
    upsertFloorPlan: (plan) => set((state) => ({
        floorPlans: state.floorPlans.some((existing) => existing.id === plan.id)
            ? state.floorPlans.map((existing) => existing.id === plan.id ? plan : existing)
            : [...state.floorPlans, plan].sort((left, right) => left.sortOrder - right.sortOrder),
    })),
    removeFloorPlan: (id) => set((state) => ({
        floorPlans: state.floorPlans.filter((plan) => plan.id !== id),
    })),
    setSelectedFloorPlanId: (selectedFloorPlanId) => set({ selectedFloorPlanId }),
}));
export const selectFloorPlans = (state) => state.floorPlans;
export const selectSelectedFloorPlanId = (state) => state.selectedFloorPlanId;
export const selectActiveFloorPlan = (state) => state.floorPlans.find((plan) => plan.id === state.selectedFloorPlanId) ?? null;
