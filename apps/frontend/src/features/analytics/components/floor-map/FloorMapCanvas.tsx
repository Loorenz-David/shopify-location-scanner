import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Group as KonvaGroupNode } from "konva/lib/Group";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import {
  buildDefaultFloorBoundaryVertices,
  pct,
  buildFloorMapViewportTransform,
} from "../../domain/floor-map.domain";
import { formatKrCompactValue } from "../../domain/format-currency.domain";
import { cmVerticesToWorldPx } from "../../utils/grid-utils";
import { useGesturePerformanceDebug } from "../../hooks/use-gesture-performance-debug";
import type {
  FloorPlan,
  StoreZone,
  ZoneOverviewItem,
} from "../../types/analytics.types";
import { getZoneHeatColor, type FloorMapMetric } from "./FloorMapHeatOverlay";

interface FloorMapCanvasProps {
  zones: StoreZone[];
  zonesOverview: ZoneOverviewItem[];
  stageWidth: number;
  stageHeight: number;
  selectedZone: string | null;
  onZoneTap: (location: string) => void;
  activeFloorPlan: FloorPlan | null;
  metric?: FloorMapMetric;
}

const JOYSTICK_RADIUS_PX = 34;
const JOYSTICK_KNOB_RADIUS_PX = 17;
const JOYSTICK_MOVE_SPEED = 1;
const JOYSTICK_INPUT_RADIUS_PX = 110;
const JOYSTICK_PAN_PX_PER_MS = 0.0015;
const MIN_VIEWER_ZOOM = 0.75;
const MAX_VIEWER_ZOOM = 3;
const GESTURE_VISUAL_IDLE_MS = 120;

type MapLabelRenderMode = "full" | "gesture-lite";

function clampVectorToRadius(x: number, y: number, radiusPx: number) {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= radiusPx || magnitude === 0) {
    return { x, y };
  }

  const scale = radiusPx / magnitude;
  return {
    x: x * scale,
    y: y * scale,
  };
}

function clampZoom(value: number) {
  return Math.min(MAX_VIEWER_ZOOM, Math.max(MIN_VIEWER_ZOOM, value));
}

export function FloorMapCanvas({
  zones,
  zonesOverview,
  stageWidth,
  stageHeight,
  selectedZone,
  onZoneTap,
  activeFloorPlan,
  metric = "itemsSold",
}: FloorMapCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [labelRenderMode, setLabelRenderMode] =
    useState<MapLabelRenderMode>("full");
  const worldGroupRef = useRef<KonvaGroupNode | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const activeJoystickPointerIdRef = useRef<number | null>(null);
  const joystickVectorRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const baseViewportTransformRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const gestureVisualTimeoutRef = useRef<number | null>(null);

  const boundaryWorldVertices = useMemo(() => {
    if (!activeFloorPlan) {
      return [];
    }

    const sourceVertices =
      activeFloorPlan.shape ??
      buildDefaultFloorBoundaryVertices(
        activeFloorPlan.widthCm,
        activeFloorPlan.depthCm,
      );

    return cmVerticesToWorldPx(
      sourceVertices,
      stageWidth,
      stageHeight,
      activeFloorPlan.widthCm,
      activeFloorPlan.depthCm,
    ).map((vertex) => ({
      xPx: vertex.xPx,
      yPx: vertex.yPx,
    }));
  }, [activeFloorPlan, stageHeight, stageWidth]);

  const baseViewportTransform = useMemo(
    () =>
      buildFloorMapViewportTransform({
        zones,
        stageWidth,
        stageHeight,
        boundaryWorldVertices,
      }) ?? {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
    [boundaryWorldVertices, stageHeight, stageWidth, zones],
  );

  const zoneOverviewByLocation = useMemo(
    () =>
      new Map(zonesOverview.map((overview) => [overview.location, overview])),
    [zonesOverview],
  );

  const zoneDrawModels = useMemo(
    () =>
      zones.map((zone) => ({
        zone,
        x: pct(zone.xPct, stageWidth),
        y: pct(zone.yPct, stageHeight),
        width: pct(zone.widthPct, stageWidth),
        height: pct(zone.heightPct, stageHeight),
        zoneOverview: zoneOverviewByLocation.get(zone.label) ?? null,
        heatColor: getZoneHeatColor(zone.label, zonesOverview, metric),
        isSelected: selectedZone === zone.label,
      })),
    [metric, selectedZone, stageHeight, stageWidth, zoneOverviewByLocation, zones, zonesOverview],
  );

  useGesturePerformanceDebug("analytics-map-preview", isJoystickActive);

  const applyWorldTransform = useCallback(
    (nextPanOffset = panOffsetRef.current) => {
      const group = worldGroupRef.current;
      if (!group) {
        return;
      }

      const nextScale = baseViewportTransformRef.current.scale * zoomRef.current;
      group.position({
        x: baseViewportTransformRef.current.offsetX + nextPanOffset.x,
        y: baseViewportTransformRef.current.offsetY + nextPanOffset.y,
      });
      group.scale({ x: nextScale, y: nextScale });
      group.getLayer()?.batchDraw();
    },
    [],
  );

  const clearGestureVisualReleaseTimer = useCallback(() => {
    if (gestureVisualTimeoutRef.current !== null) {
      window.clearTimeout(gestureVisualTimeoutRef.current);
      gestureVisualTimeoutRef.current = null;
    }
  }, []);

  const beginGestureVisualReduction = useCallback(() => {
    clearGestureVisualReleaseTimer();
    setLabelRenderMode("gesture-lite");
  }, [clearGestureVisualReleaseTimer]);

  const releaseGestureVisualReduction = useCallback(() => {
    clearGestureVisualReleaseTimer();
    gestureVisualTimeoutRef.current = window.setTimeout(() => {
      setLabelRenderMode("full");
      gestureVisualTimeoutRef.current = null;
    }, GESTURE_VISUAL_IDLE_MS);
  }, [clearGestureVisualReleaseTimer]);

  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    setJoystickVector({ x: 0, y: 0 });
    setIsJoystickActive(false);
    setLabelRenderMode("full");
    joystickVectorRef.current = { x: 0, y: 0 };
    joystickCenterRef.current = null;
    activeJoystickPointerIdRef.current = null;
    clearGestureVisualReleaseTimer();
  }, [activeFloorPlan?.id, clearGestureVisualReleaseTimer, stageHeight, stageWidth]);

  useEffect(() => {
    baseViewportTransformRef.current = baseViewportTransform;
    applyWorldTransform();
  }, [applyWorldTransform, baseViewportTransform]);

  useEffect(() => {
    zoomRef.current = zoom;
    applyWorldTransform();
  }, [applyWorldTransform, zoom]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
    applyWorldTransform();
  }, [applyWorldTransform, panOffset]);

  useEffect(() => {
    if (!isJoystickActive) {
      return;
    }

    beginGestureVisualReduction();

    let frameId = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      if (activeJoystickPointerIdRef.current === null) {
        return;
      }

      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      const currentVector = joystickVectorRef.current;

      if (currentVector.x !== 0 || currentVector.y !== 0) {
        panOffsetRef.current = {
          x:
            panOffsetRef.current.x -
            currentVector.x * JOYSTICK_MOVE_SPEED * deltaMs * JOYSTICK_PAN_PX_PER_MS,
          y:
            panOffsetRef.current.y -
            currentVector.y * JOYSTICK_MOVE_SPEED * deltaMs * JOYSTICK_PAN_PX_PER_MS,
        };
        applyWorldTransform(panOffsetRef.current);
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      releaseGestureVisualReduction();
    };
  }, [applyWorldTransform, beginGestureVisualReduction, isJoystickActive, releaseGestureVisualReduction]);

  useEffect(
    () => () => {
      clearGestureVisualReleaseTimer();
    },
    [clearGestureVisualReleaseTimer],
  );

  if (zones.length === 0) {
    return (
      <div
        style={{
          width: stageWidth,
          height: stageHeight,
          background: "#1e293b",
          borderRadius: 20,
        }}
        className="flex flex-col items-center justify-center gap-2"
      >
        <span className="text-sm font-medium text-slate-400">
          No zones drawn yet
        </span>
        <span className="text-xs text-slate-500">
          Go to Settings then Store Map to draw your floor plan
        </span>
      </div>
    );
  }

  const joystickKnobOffset = clampVectorToRadius(
    joystickVector.x,
    joystickVector.y,
    JOYSTICK_RADIUS_PX,
  );

  const formatZoneMetricValue = (
    zoneOverview: ZoneOverviewItem | null,
    options?: { compact?: boolean },
  ) => {
    if (!zoneOverview) {
      return null;
    }

    return metric === "revenue"
      ? formatKrCompactValue(zoneOverview.revenue)
      : options?.compact
        ? String(zoneOverview.itemsSold)
        : `${zoneOverview.itemsSold} sold`;
  };

  return (
    <div className="relative">
      <Stage
        width={stageWidth}
        height={stageHeight}
        style={{
          background: "#1e293b",
          borderRadius: 20,
        }}
      >
        <Layer>
          <Group
            ref={worldGroupRef}
            x={baseViewportTransform.offsetX + panOffset.x}
            y={baseViewportTransform.offsetY + panOffset.y}
            scaleX={baseViewportTransform.scale * zoom}
            scaleY={baseViewportTransform.scale * zoom}
          >
            {boundaryWorldVertices.length > 0 ? (
              <Rect
                x={boundaryWorldVertices[0].xPx}
                y={boundaryWorldVertices[0].yPx}
                width={
                  boundaryWorldVertices[1].xPx - boundaryWorldVertices[0].xPx
                }
                height={
                  boundaryWorldVertices[3].yPx - boundaryWorldVertices[0].yPx
                }
                stroke="#94a3b8"
                opacity={0.35}
                dash={[8, 6]}
                fill="transparent"
                strokeWidth={2 / (baseViewportTransform.scale * zoom)}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
            ) : null}
            {zoneDrawModels.map(
              ({
                zone,
                x,
                y,
                width,
                height,
                zoneOverview,
                heatColor,
                isSelected,
              }) => {
                const canShowSecondaryLabel = width >= 56 && height >= 34;
                const shouldUseCompactSoldLabel =
                  metric === "itemsSold" && (width < 72 || height < 40);
                const fullSecondaryValue = formatZoneMetricValue(zoneOverview);
                const compactSecondaryValue = formatZoneMetricValue(
                  zoneOverview,
                  {
                    compact: shouldUseCompactSoldLabel,
                  },
                );
                const canShowCompactUprightLabel =
                  metric === "itemsSold" &&
                  shouldUseCompactSoldLabel &&
                  !!compactSecondaryValue &&
                  !canShowSecondaryLabel &&
                  width >= 22 &&
                  height >= 44;
                const canShowVerticalSecondaryLabel =
                  !!fullSecondaryValue &&
                  !canShowSecondaryLabel &&
                  !canShowCompactUprightLabel &&
                  width >= 18 &&
                  height >= 72;
                const secondaryValue = canShowVerticalSecondaryLabel
                  ? fullSecondaryValue
                  : compactSecondaryValue;

                if (zone.type === "corridor") {
                return (
                  <Group key={zone.id}>
                    <Rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="#334155"
                      opacity={0.5}
                      stroke="#475569"
                      strokeWidth={1}
                      cornerRadius={4}
                      perfectDrawEnabled={false}
                      shadowForStrokeEnabled={false}
                    />
                    {labelRenderMode === "full" ? (
                      <Text
                        x={x + 6}
                        y={y + 6}
                        text={zone.label}
                        fontSize={9}
                        fill="#94a3b8"
                        listening={false}
                        perfectDrawEnabled={false}
                        shadowEnabled={false}
                      />
                    ) : null}
                  </Group>
                );
              }

              return (
                <Group
                  key={zone.id}
                  onClick={() => onZoneTap(zone.label)}
                  onTap={() => onZoneTap(zone.label)}
                >
                  <Rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={heatColor}
                    opacity={isSelected ? 0.88 : 0.58}
                    stroke={isSelected ? "#ffffff" : "#475569"}
                    strokeWidth={isSelected ? 2 : 1}
                    cornerRadius={6}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                  />
                  <Text
                    x={x + 6}
                    y={y + 6}
                    text={zone.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#ffffff"
                    shadowColor="#0f172a"
                    shadowBlur={labelRenderMode === "full" ? 4 : 0}
                    shadowOpacity={labelRenderMode === "full" ? 0.6 : 0}
                    listening={false}
                    perfectDrawEnabled={false}
                    shadowEnabled={labelRenderMode === "full"}
                  />
                  {secondaryValue &&
                  canShowSecondaryLabel &&
                  labelRenderMode === "full" ? (
                    <Text
                      x={x + 6}
                      y={y + 22}
                      text={secondaryValue}
                      fontSize={10}
                      fill="#ffffff"
                      shadowColor="#0f172a"
                      shadowBlur={3}
                      shadowOpacity={0.5}
                      listening={false}
                      perfectDrawEnabled={false}
                      shadowEnabled
                    />
                  ) : null}
                  {secondaryValue &&
                  canShowCompactUprightLabel &&
                  labelRenderMode === "full" ? (
                    <Text
                      x={x + 6}
                      y={y + 22}
                      text={secondaryValue}
                      fontSize={10}
                      fill="#ffffff"
                      shadowColor="#0f172a"
                      shadowBlur={3}
                      shadowOpacity={0.5}
                      listening={false}
                      perfectDrawEnabled={false}
                      shadowEnabled
                    />
                  ) : null}
                  {canShowVerticalSecondaryLabel &&
                  labelRenderMode === "full" ? (
                    <Text
                      x={x + width / 2 + 5}
                      y={y + 24}
                      text={secondaryValue ?? undefined}
                      fontSize={10}
                      fill="#ffffff"
                      rotation={90}
                      shadowColor="#0f172a"
                      shadowBlur={3}
                      shadowOpacity={0.5}
                      listening={false}
                      perfectDrawEnabled={false}
                      shadowEnabled
                    />
                  ) : null}
                </Group>
              );
            },
            )}
          </Group>
        </Layer>
      </Stage>

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute bottom-4 left-4 right-28">
          <input
            type="range"
            min={MIN_VIEWER_ZOOM}
            max={MAX_VIEWER_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => {
              setZoom(clampZoom(Number(event.target.value)));
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
            aria-label="Zoom floor map"
          />
        </div>

        <button
          type="button"
          className="pointer-events-auto absolute bottom-4 right-4 grid h-[68px] w-[68px] touch-none select-none place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            activeJoystickPointerIdRef.current = event.pointerId;
            setIsJoystickActive(true);
            event.currentTarget.setPointerCapture?.(event.pointerId);
            joystickCenterRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            const nextVector = clampVectorToRadius(
              event.clientX - joystickCenterRef.current.x,
              event.clientY - joystickCenterRef.current.y,
              JOYSTICK_INPUT_RADIUS_PX,
            );
            joystickVectorRef.current = nextVector;
            setJoystickVector(nextVector);
          }}
          onPointerMove={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            const center = joystickCenterRef.current;
            if (!center) {
              return;
            }

            const nextVector = clampVectorToRadius(
              event.clientX - center.x,
              event.clientY - center.y,
              JOYSTICK_INPUT_RADIUS_PX,
            );
            joystickVectorRef.current = nextVector;
            setJoystickVector(nextVector);
          }}
          onPointerUp={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            activeJoystickPointerIdRef.current = null;
            setIsJoystickActive(false);
            joystickCenterRef.current = null;
            joystickVectorRef.current = { x: 0, y: 0 };
            setJoystickVector({ x: 0, y: 0 });
            setPanOffset({ ...panOffsetRef.current });
          }}
          onPointerCancel={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            activeJoystickPointerIdRef.current = null;
            setIsJoystickActive(false);
            joystickCenterRef.current = null;
            joystickVectorRef.current = { x: 0, y: 0 };
            setJoystickVector({ x: 0, y: 0 });
            setPanOffset({ ...panOffsetRef.current });
          }}
          onLostPointerCapture={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            activeJoystickPointerIdRef.current = null;
            setIsJoystickActive(false);
            joystickCenterRef.current = null;
            joystickVectorRef.current = { x: 0, y: 0 };
            setJoystickVector({ x: 0, y: 0 });
            setPanOffset({ ...panOffsetRef.current });
          }}
          aria-label="Pan floor map"
        >
          <span
            className="block rounded-full border border-white/30 bg-white/80"
            style={{
              width: `${JOYSTICK_KNOB_RADIUS_PX * 2}px`,
              height: `${JOYSTICK_KNOB_RADIUS_PX * 2}px`,
              transform: `translate(${joystickKnobOffset.x}px, ${joystickKnobOffset.y}px)`,
            }}
          />
        </button>
      </div>
    </div>
  );
}
