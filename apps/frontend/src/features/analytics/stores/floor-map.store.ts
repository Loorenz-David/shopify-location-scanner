import { create } from "zustand";

import type { FloorPlanVertex, StoreZone } from "../types/analytics.types";

interface FloorMapStoreState {
  zones: StoreZone[];
  isEditorMode: boolean;
  isFloorBoundaryEditMode: boolean;
  stageWidth: number;
  stageHeight: number;
  draftZonePx: { x: number; y: number; width: number; height: number } | null;
  floorBoundaryDraft: FloorPlanVertex[] | null;
  setZones: (zones: StoreZone[]) => void;
  upsertZone: (zone: StoreZone) => void;
  removeZone: (id: string) => void;
  setEditorMode: (value: boolean) => void;
  setFloorBoundaryEditMode: (value: boolean) => void;
  setStageSize: (stageWidth: number, stageHeight: number) => void;
  setDraftZonePx: (
    draftZonePx: { x: number; y: number; width: number; height: number } | null,
  ) => void;
  setFloorBoundaryDraft: (vertices: FloorPlanVertex[] | null) => void;
  reset: () => void;
}

const initialState = {
  zones: [],
  isEditorMode: false,
  isFloorBoundaryEditMode: false,
  stageWidth: 800,
  stageHeight: 600,
  draftZonePx: null,
  floorBoundaryDraft: null,
};

export const useFloorMapStore = create<FloorMapStoreState>((set) => ({
  ...initialState,
  setZones: (zones) => set({ zones }),
  upsertZone: (zone) =>
    set((state) => ({
      zones: state.zones.some((existingZone) => existingZone.id === zone.id)
        ? state.zones.map((existingZone) =>
            existingZone.id === zone.id ? zone : existingZone,
          )
        : [...state.zones, zone],
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
  setEditorMode: (isEditorMode) => set({ isEditorMode }),
  setFloorBoundaryEditMode: (isFloorBoundaryEditMode) =>
    set({ isFloorBoundaryEditMode }),
  setStageSize: (stageWidth, stageHeight) => set({ stageWidth, stageHeight }),
  setDraftZonePx: (draftZonePx) => set({ draftZonePx }),
  setFloorBoundaryDraft: (floorBoundaryDraft) => set({ floorBoundaryDraft }),
  reset: () => set(initialState),
}));

export const selectFloorMapZones = (state: FloorMapStoreState) => state.zones;
export const selectFloorMapIsEditorMode = (state: FloorMapStoreState) =>
  state.isEditorMode;
export const selectFloorBoundaryEditMode = (state: FloorMapStoreState) =>
  state.isFloorBoundaryEditMode;
export const selectFloorMapStageWidth = (state: FloorMapStoreState) =>
  state.stageWidth;
export const selectFloorMapStageHeight = (state: FloorMapStoreState) =>
  state.stageHeight;
export const selectFloorMapDraftZonePx = (state: FloorMapStoreState) =>
  state.draftZonePx;
export const selectFloorBoundaryDraft = (state: FloorMapStoreState) =>
  state.floorBoundaryDraft;
