import type {
  FloorPlanVertex,
  StoreZone,
} from "../types/analytics.types";

export interface StoreMapEditorViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function pct(value: number, axisPx: number): number {
  return (value / 100) * axisPx;
}

export function pxToPercent(valuePx: number, axisPx: number): number {
  if (axisPx <= 0) {
    return 0;
  }

  return clampPercent((valuePx / axisPx) * 100);
}

export function formatShapeMetric(valuePct: number, axisCm?: number): number {
  if (!axisCm || axisCm <= 0) {
    return valuePct;
  }

  return (valuePct / 100) * axisCm;
}

export function buildDefaultFloorBoundaryVertices(
  floorWidthCm: number,
  floorDepthCm: number,
): FloorPlanVertex[] {
  return [
    { xCm: 0, yCm: 0 },
    { xCm: floorWidthCm, yCm: 0 },
    { xCm: floorWidthCm, yCm: floorDepthCm },
    { xCm: 0, yCm: floorDepthCm },
  ];
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
  const { zones, stageWidth, stageHeight, boundaryWorldVertices = [] } = params;

  if (stageWidth <= 0 || stageHeight <= 0) {
    return null;
  }

  const zoneBounds =
    zones.length > 0
      ? zones.reduce(
          (current, zone) => {
            const x = pct(zone.xPct, stageWidth);
            const y = pct(zone.yPct, stageHeight);
            const width = pct(zone.widthPct, stageWidth);
            const height = pct(zone.heightPct, stageHeight);

            return {
              minX: Math.min(current.minX, x),
              minY: Math.min(current.minY, y),
              maxX: Math.max(current.maxX, x + width),
              maxY: Math.max(current.maxY, y + height),
            };
          },
          {
            minX: Number.POSITIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
          },
        )
      : null;

  const boundaryBounds =
    boundaryWorldVertices.length > 0
      ? boundaryWorldVertices.reduce(
          (current, vertex) => ({
            minX: Math.min(current.minX, vertex.xPx),
            minY: Math.min(current.minY, vertex.yPx),
            maxX: Math.max(current.maxX, vertex.xPx),
            maxY: Math.max(current.maxY, vertex.yPx),
          }),
          {
            minX: Number.POSITIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
          },
        )
      : null;

  const bounds = boundaryBounds ?? zoneBounds;
  if (!bounds) {
    return null;
  }

  const padding = 64;
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const availableWidth = Math.max(stageWidth - padding * 2, 1);
  const availableHeight = Math.max(stageHeight - padding * 2, 1);
  const scale = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );

  return {
    scale,
    offsetX:
      padding +
      (availableWidth - contentWidth * scale) / 2 -
      bounds.minX * scale,
    offsetY:
      padding +
      (availableHeight - contentHeight * scale) / 2 -
      bounds.minY * scale,
  };
}
