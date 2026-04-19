import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import {
  buildDefaultFloorBoundaryVertices,
  buildEditorViewportTransform,
  pct,
} from "../../domain/store-map-editor.domain";
import { cmVerticesToWorldPx } from "../../utils/grid-utils";
import type {
  FloorPlan,
  StoreZone,
  ZoneOverviewItem,
} from "../../types/analytics.types";
import { getZoneHeatColor } from "./FloorMapHeatOverlay";

interface FloorMapCanvasProps {
  zones: StoreZone[];
  zonesOverview: ZoneOverviewItem[];
  stageWidth: number;
  stageHeight: number;
  selectedZone: string | null;
  onZoneTap: (location: string) => void;
  activeFloorPlan: FloorPlan | null;
}

const JOYSTICK_RADIUS_PX = 34;
const JOYSTICK_KNOB_RADIUS_PX = 17;
const JOYSTICK_MOVE_SPEED = 1;
const JOYSTICK_INPUT_RADIUS_PX = 110;
const MIN_VIEWER_ZOOM = 0.75;
const MAX_VIEWER_ZOOM = 3;

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
}: FloorMapCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const activeJoystickPointerIdRef = useRef<number | null>(null);

  const updateJoystickVector = (
    clientX: number,
    clientY: number,
    radiusPx = JOYSTICK_INPUT_RADIUS_PX,
  ) => {
    const center = joystickCenterRef.current;
    if (!center) {
      return;
    }

    setJoystickVector(
      clampVectorToRadius(clientX - center.x, clientY - center.y, radiusPx),
    );
  };

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
      buildEditorViewportTransform({
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

  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setJoystickVector({ x: 0, y: 0 });
    joystickCenterRef.current = null;
  }, [activeFloorPlan?.id, stageHeight, stageWidth]);

  useEffect(() => {
    if (joystickVector.x === 0 && joystickVector.y === 0) {
      return;
    }

    let frameId = 0;

    const tick = () => {
      setPanOffset((current) => ({
        x: current.x - joystickVector.x * 0.08 * JOYSTICK_MOVE_SPEED,
        y: current.y - joystickVector.y * 0.08 * JOYSTICK_MOVE_SPEED,
      }));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [joystickVector.x, joystickVector.y]);

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

  const resolvedTransform = {
    scale: baseViewportTransform.scale * zoom,
    offsetX: baseViewportTransform.offsetX + panOffset.x,
    offsetY: baseViewportTransform.offsetY + panOffset.y,
  };
  const joystickKnobOffset = clampVectorToRadius(
    joystickVector.x,
    joystickVector.y,
    JOYSTICK_RADIUS_PX,
  );

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
            x={resolvedTransform.offsetX}
            y={resolvedTransform.offsetY}
            scaleX={resolvedTransform.scale}
            scaleY={resolvedTransform.scale}
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
                strokeWidth={2 / resolvedTransform.scale}
                listening={false}
              />
            ) : null}
            {zones.map((zone) => {
              const x = pct(zone.xPct, stageWidth);
              const y = pct(zone.yPct, stageHeight);
              const width = pct(zone.widthPct, stageWidth);
              const height = pct(zone.heightPct, stageHeight);

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
                    />
                    <Text
                      x={x + 6}
                      y={y + 6}
                      text={zone.label}
                      fontSize={9}
                      fill="#94a3b8"
                    />
                  </Group>
                );
              }

              const heatColor = getZoneHeatColor(zone.label, zonesOverview);
              const isSelected = selectedZone === zone.label;
              const zoneOverview = zonesOverview.find(
                (overview) => overview.location === zone.label,
              );

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
                  />
                  <Text
                    x={x + 6}
                    y={y + 6}
                    text={zone.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#ffffff"
                    shadowColor="#0f172a"
                    shadowBlur={4}
                    shadowOpacity={0.6}
                  />
                  {zoneOverview ? (
                    <Text
                      x={x + 6}
                      y={y + 22}
                      text={`${zoneOverview.itemsSold} sold`}
                      fontSize={10}
                      fill="#ffffff"
                      shadowColor="#0f172a"
                      shadowBlur={3}
                      shadowOpacity={0.5}
                    />
                  ) : null}
                </Group>
              );
            })}
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
            event.currentTarget.setPointerCapture?.(event.pointerId);
            joystickCenterRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            updateJoystickVector(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            updateJoystickVector(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            activeJoystickPointerIdRef.current = null;
            joystickCenterRef.current = null;
            setJoystickVector({ x: 0, y: 0 });
          }}
          onPointerCancel={(event) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            activeJoystickPointerIdRef.current = null;
            joystickCenterRef.current = null;
            setJoystickVector({ x: 0, y: 0 });
          }}
          onLostPointerCapture={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (activeJoystickPointerIdRef.current !== event.pointerId) {
              return;
            }

            activeJoystickPointerIdRef.current = null;
            joystickCenterRef.current = null;
            setJoystickVector({ x: 0, y: 0 });
          }}
          aria-label="Pan floor map"
        >
          <span
            className="block rounded-full border border-white/30 bg-white/80 transition-transform"
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
