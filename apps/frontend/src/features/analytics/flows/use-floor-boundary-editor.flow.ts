import { useCallback } from "react";

import { updateFloorPlanApi } from "../apis/update-floor-plan.api";
import {
  selectActiveFloorPlan,
  useFloorPlanStore,
} from "../stores/floor-plan.store";
import { useFloorMapStore } from "../stores/floor-map.store";
import type { FloorPlanVertex } from "../types/analytics.types";

export function useFloorBoundaryEditorFlow() {
  const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
  const upsertFloorPlan = useFloorPlanStore((state) => state.upsertFloorPlan);
  const setFloorBoundaryDraft = useFloorMapStore(
    (state) => state.setFloorBoundaryDraft,
  );
  const setFloorBoundaryEditMode = useFloorMapStore(
    (state) => state.setFloorBoundaryEditMode,
  );

  const buildDefaultVertices = useCallback((): FloorPlanVertex[] => {
    if (!activeFloorPlan) {
      return [];
    }

    return [
      { xCm: 0, yCm: 0 },
      { xCm: activeFloorPlan.widthCm, yCm: 0 },
      { xCm: activeFloorPlan.widthCm, yCm: activeFloorPlan.depthCm },
      { xCm: 0, yCm: activeFloorPlan.depthCm },
    ];
  }, [activeFloorPlan]);

  const beginBoundaryEdit = useCallback(() => {
    const initialVertices = activeFloorPlan?.shape ?? buildDefaultVertices();
    setFloorBoundaryDraft(initialVertices);
    setFloorBoundaryEditMode(true);
  }, [
    activeFloorPlan,
    buildDefaultVertices,
    setFloorBoundaryDraft,
    setFloorBoundaryEditMode,
  ]);

  const cancelBoundaryEdit = useCallback(() => {
    setFloorBoundaryDraft(null);
    setFloorBoundaryEditMode(false);
  }, [setFloorBoundaryDraft, setFloorBoundaryEditMode]);

  const saveBoundary = useCallback(
    async (draftVertices: FloorPlanVertex[]) => {
      if (!activeFloorPlan) {
        return;
      }

      const xValues = draftVertices.map((vertex) => vertex.xCm);
      const yValues = draftVertices.map((vertex) => vertex.yCm);
      const nextWidthCm = Math.max(...xValues) - Math.min(...xValues);
      const nextDepthCm = Math.max(...yValues) - Math.min(...yValues);

      upsertFloorPlan({
        ...activeFloorPlan,
        widthCm: nextWidthCm,
        depthCm: nextDepthCm,
        shape: draftVertices,
      });
      setFloorBoundaryDraft(null);
      setFloorBoundaryEditMode(false);

      const updated = await updateFloorPlanApi(activeFloorPlan.id, {
        widthCm: nextWidthCm,
        depthCm: nextDepthCm,
        shape: draftVertices,
      });
      upsertFloorPlan(updated);
    },
    [
      activeFloorPlan,
      setFloorBoundaryDraft,
      setFloorBoundaryEditMode,
      upsertFloorPlan,
    ],
  );

  return {
    beginBoundaryEdit,
    cancelBoundaryEdit,
    saveBoundary,
  };
}
