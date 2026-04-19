import type {
  FloorPlanVertex,
  StoreZone,
} from "../types/analytics.types";
import {
  buildDefaultFloorBoundaryVertices,
  buildFloorMapViewportTransform,
  pct,
  pxToPercent,
  type FloorMapViewportTransform,
} from "./floor-map.domain";

export type StoreMapEditorViewportTransform = FloorMapViewportTransform;
export { buildDefaultFloorBoundaryVertices, pct, pxToPercent };

export function formatShapeMetric(valuePct: number, axisCm?: number): number {
  if (!axisCm || axisCm <= 0) {
    return valuePct;
  }

  return (valuePct / 100) * axisCm;
}

export function areFloorBoundaryVerticesEqual(
  left: FloorPlanVertex[] | null,
  right: FloorPlanVertex[] | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every(
    (vertex, index) =>
      vertex.xCm === right[index]?.xCm && vertex.yCm === right[index]?.yCm,
  );
}

export function hasShapeDraftChanges(
  selectedZone: StoreZone | null,
  shapeDraft: StoreZone | null,
): boolean {
  if (!selectedZone || !shapeDraft) {
    return false;
  }

  return (
    selectedZone.xPct !== shapeDraft.xPct ||
    selectedZone.yPct !== shapeDraft.yPct ||
    selectedZone.widthPct !== shapeDraft.widthPct ||
    selectedZone.heightPct !== shapeDraft.heightPct
  );
}

export function hasUnsavedEditorChanges(params: {
  hasPendingShapeChanges: boolean;
  hasPendingBoundaryChanges: boolean;
  isDraftZone: boolean;
}): boolean {
  return (
    params.hasPendingShapeChanges ||
    params.hasPendingBoundaryChanges ||
    params.isDraftZone
  );
}

export function buildCenteredDraftZone(params: {
  stageWidth: number;
  stageHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  zonesLength: number;
  floorPlanId: string | null;
}): StoreZone {
  const defaultWidthPct = 18;
  const defaultHeightPct = 18;
  const centerWorldX = (params.stageWidth / 2 - params.offsetX) / params.scale;
  const centerWorldY =
    (params.stageHeight / 2 - params.offsetY) / params.scale;
  const zoneWidthPx = pct(defaultWidthPct, params.stageWidth);
  const zoneHeightPx = pct(defaultHeightPct, params.stageHeight);
  const centerXPct = pxToPercent(
    centerWorldX - zoneWidthPx / 2,
    params.stageWidth,
  );
  const centerYPct = pxToPercent(
    centerWorldY - zoneHeightPx / 2,
    params.stageHeight,
  );

  return {
    id: "__draft-zone__",
    label: "",
    type: "zone",
    xPct: Math.min(centerXPct, 100 - defaultWidthPct),
    yPct: Math.min(centerYPct, 100 - defaultHeightPct),
    widthPct: defaultWidthPct,
    heightPct: defaultHeightPct,
    sortOrder: params.zonesLength,
    floorPlanId: params.floorPlanId,
    widthCm: null,
    depthCm: null,
  };
}

export function buildEditorViewportTransform(params: {
  zones: StoreZone[];
  stageWidth: number;
  stageHeight: number;
  boundaryWorldVertices?: Array<{ xPx: number; yPx: number }>;
}): StoreMapEditorViewportTransform | null {
  return buildFloorMapViewportTransform(params);
}
