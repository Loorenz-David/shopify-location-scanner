import { create } from "zustand";
const initialState = {
    zones: [],
    isEditorMode: false,
    isFloorBoundaryEditMode: false,
    stageWidth: 800,
    stageHeight: 600,
    draftZonePx: null,
    floorBoundaryDraft: null,
};
export const useFloorMapStore = create((set) => ({
    ...initialState,
    setZones: (zones) => set({ zones }),
    upsertZone: (zone) => set((state) => ({
        zones: state.zones.some((existingZone) => existingZone.id === zone.id)
            ? state.zones.map((existingZone) => existingZone.id === zone.id ? zone : existingZone)
            : [...state.zones, zone],
    })),
    removeZone: (id) => set((state) => ({
        zones: state.zones.filter((zone) => zone.id !== id),
    })),
    setEditorMode: (isEditorMode) => set({ isEditorMode }),
    setFloorBoundaryEditMode: (isFloorBoundaryEditMode) => set({ isFloorBoundaryEditMode }),
    setStageSize: (stageWidth, stageHeight) => set({ stageWidth, stageHeight }),
    setDraftZonePx: (draftZonePx) => set({ draftZonePx }),
    setFloorBoundaryDraft: (floorBoundaryDraft) => set({ floorBoundaryDraft }),
    reset: () => set(initialState),
}));
export const selectFloorMapZones = (state) => state.zones;
export const selectFloorMapIsEditorMode = (state) => state.isEditorMode;
export const selectFloorBoundaryEditMode = (state) => state.isFloorBoundaryEditMode;
export const selectFloorMapStageWidth = (state) => state.stageWidth;
export const selectFloorMapStageHeight = (state) => state.stageHeight;
export const selectFloorMapDraftZonePx = (state) => state.draftZonePx;
export const selectFloorBoundaryDraft = (state) => state.floorBoundaryDraft;
