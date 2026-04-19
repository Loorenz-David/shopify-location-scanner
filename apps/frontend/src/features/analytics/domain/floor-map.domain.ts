import type {
  FloorPlanVertex,
  StoreZone,
} from "../types/analytics.types";

export interface FloorMapViewportTransform {
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

export function buildFloorMapViewportTransform(params: {
  zones: StoreZone[];
  stageWidth: number;
  stageHeight: number;
  boundaryWorldVertices?: Array<{ xPx: number; yPx: number }>;
}): FloorMapViewportTransform | null {
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
