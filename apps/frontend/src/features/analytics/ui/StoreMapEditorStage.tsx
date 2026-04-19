import { memo, useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Layer, Rect, Shape, Stage, Text } from "react-konva";

import {
  pct,
  pxToPercent,
  type StoreMapEditorViewportTransform,
} from "../domain/store-map-editor.domain";
import {
  resolveAdaptiveSnapStepPx,
  snapToGridPx,
  snapToGridPxWithinThreshold,
} from "../utils/grid-utils";
import type { StoreZone } from "../types/analytics.types";

interface StoreMapEditorStageProps {
  zones: StoreZone[];
  stageWidth: number;
  stageHeight: number;
  isInteractive: boolean;
  moveZone: (zone: StoreZone, xPx: number, yPx: number) => Promise<void>;
  renameZone: (zone: StoreZone) => Promise<void>;
  viewportTransform: StoreMapEditorViewportTransform | null;
  onStageTouchStart?: (event: KonvaEventObject<TouchEvent>) => void;
  onStageTouchMove?: (event: KonvaEventObject<TouchEvent>) => void;
  onStageTouchEnd?: (event: KonvaEventObject<TouchEvent>) => void;
  onSelectZone?: (zone: StoreZone) => void;
  consumeLastTouchTapIntent?: () => boolean;
  shapeDraft?: StoreZone | null;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  onShapeInteractionStart?: (zone: StoreZone) => void;
  floorBoundaryVertices?: Array<{ xPx: number; yPx: number }>;
  isFloorBoundaryEditMode?: boolean;
  showGrid?: boolean;
  gridStepPxX?: number;
  gridStepPxY?: number;
  onFloorBoundaryDraftChange?: (
    vertices: Array<{ xPx: number; yPx: number }>,
  ) => void;
}

export function StoreMapEditorStage({
  zones,
  stageWidth,
  stageHeight,
  isInteractive,
  moveZone,
  renameZone,
  viewportTransform,
  onStageTouchStart,
  onStageTouchMove,
  onStageTouchEnd,
  onSelectZone,
  consumeLastTouchTapIntent,
  shapeDraft,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  onShapeInteractionStart,
  floorBoundaryVertices = [],
  isFloorBoundaryEditMode = false,
  showGrid = false,
  gridStepPxX = 0,
  gridStepPxY = 0,
  onFloorBoundaryDraftChange,
}: StoreMapEditorStageProps) {
  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      style={{ background: "#0f172a", touchAction: "none" }}
      onTouchStart={isInteractive ? onStageTouchStart : undefined}
      onTouchMove={isInteractive ? onStageTouchMove : undefined}
      onTouchEnd={isInteractive ? onStageTouchEnd : undefined}
    >
      {showGrid && viewportTransform ? (
        <GridLayer
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          viewportScale={viewportTransform.scale}
          viewportOffsetX={viewportTransform.offsetX}
          viewportOffsetY={viewportTransform.offsetY}
          gridStepPxX={gridStepPxX}
          gridStepPxY={gridStepPxY}
        />
      ) : null}
      <Layer>
        <Group
          x={viewportTransform?.offsetX ?? 0}
          y={viewportTransform?.offsetY ?? 0}
          scaleX={viewportTransform?.scale ?? 1}
          scaleY={viewportTransform?.scale ?? 1}
        >
          {floorBoundaryVertices.length > 0 ? (
            <FloorBoundaryShape
              vertices={floorBoundaryVertices}
              isEditMode={isFloorBoundaryEditMode}
              isPreview={!isInteractive}
              scale={viewportTransform?.scale ?? 1}
              onDraftChange={onFloorBoundaryDraftChange}
              onHandleActiveChange={onShapeHandleActiveChange}
              gridStepPxX={gridStepPxX}
              gridStepPxY={gridStepPxY}
            />
          ) : null}
          {zones.map((zone) => (
            <EditableZone
              key={zone.id}
              zone={shapeDraft?.id === zone.id ? shapeDraft : zone}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              onDragEnd={moveZone}
              onRename={renameZone}
              isInteractive={isInteractive}
              onSelectZone={onSelectZone}
              consumeLastTouchTapIntent={consumeLastTouchTapIntent}
              shapeDraftMode={shapeDraft?.id === zone.id}
              onShapeDraftChange={onShapeDraftChange}
              onShapeHandleActiveChange={onShapeHandleActiveChange}
              viewportTransform={viewportTransform}
              onShapeInteractionStart={onShapeInteractionStart}
              isLocked={isFloorBoundaryEditMode}
              gridStepPxX={gridStepPxX}
              gridStepPxY={gridStepPxY}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}

interface EditableZoneProps {
  zone: StoreZone;
  stageWidth: number;
  stageHeight: number;
  onDragEnd: (zone: StoreZone, xPx: number, yPx: number) => Promise<void>;
  onRename: (zone: StoreZone) => Promise<void>;
  isInteractive: boolean;
  onSelectZone?: (zone: StoreZone) => void;
  consumeLastTouchTapIntent?: () => boolean;
  shapeDraftMode?: boolean;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  viewportTransform?: StoreMapEditorViewportTransform | null;
  onShapeInteractionStart?: (zone: StoreZone) => void;
  isLocked?: boolean;
  gridStepPxX?: number;
  gridStepPxY?: number;
}

function EditableZone({
  zone,
  stageWidth,
  stageHeight,
  onDragEnd,
  onRename,
  isInteractive,
  onSelectZone,
  consumeLastTouchTapIntent,
  shapeDraftMode = false,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  viewportTransform,
  onShapeInteractionStart,
  isLocked = false,
  gridStepPxX = 0,
  gridStepPxY = 0,
}: EditableZoneProps) {
  const x = pct(zone.xPct, stageWidth);
  const y = pct(zone.yPct, stageHeight);
  const width = pct(zone.widthPct, stageWidth);
  const height = pct(zone.heightPct, stageHeight);
  const shapeReferenceSizePx = Math.max(1, Math.min(width, height));
  const dragSnapStepPxX = resolveAdaptiveSnapStepPx(
    gridStepPxX,
    shapeReferenceSizePx,
  );
  const dragSnapStepPxY = resolveAdaptiveSnapStepPx(
    gridStepPxY,
    shapeReferenceSizePx,
  );
  const fill = zone.type === "corridor" ? "#475569" : "#0ea5e9";
  const viewportScale = viewportTransform?.scale ?? 1;
  const snapThresholdScreenPx = 12;
  const snapThresholdWorldPx = snapThresholdScreenPx / viewportScale;
  const wasDraggedRef = useRef(false);
  const [dragGhostRect, setDragGhostRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [dragOriginRect, setDragOriginRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressDragRef = useRef<{
    active: boolean;
    startTouchX: number;
    startTouchY: number;
    startZoneXPx: number;
    startZoneYPx: number;
  } | null>(null);
  const activeTouchDraftRef = useRef<{
    xPx: number;
    yPx: number;
  } | null>(null);

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        opacity={0.55}
        stroke="#ffffff"
        strokeWidth={1}
        cornerRadius={6}
        draggable={isInteractive && !shapeDraftMode && !isLocked}
        onDragStart={(event) => {
          wasDraggedRef.current = true;
          if (event.evt.type.startsWith("touch")) {
            event.target.stopDrag();
            wasDraggedRef.current = false;
          }
        }}
        onDragEnd={
          isInteractive
            ? (event) => {
                void onDragEnd(
                  zone,
                  snapToGridPx(event.target.x(), gridStepPxX),
                  snapToGridPx(event.target.y(), gridStepPxY),
                );
                window.setTimeout(() => {
                  wasDraggedRef.current = false;
                }, 0);
              }
            : undefined
        }
        onDblClick={
          isInteractive && !shapeDraftMode && !isLocked
            ? () => void onRename(zone)
            : undefined
        }
        onClick={
          isInteractive && onSelectZone && !shapeDraftMode && !isLocked
            ? () => {
                if (wasDraggedRef.current) {
                  wasDraggedRef.current = false;
                  return;
                }

                onSelectZone(zone);
              }
            : undefined
        }
        onTap={
          isInteractive && onSelectZone && !shapeDraftMode && !isLocked
            ? () => {
                if (wasDraggedRef.current) {
                  wasDraggedRef.current = false;
                  return;
                }

                if (consumeLastTouchTapIntent && !consumeLastTouchTapIntent()) {
                  return;
                }

                onSelectZone(zone);
              }
            : undefined
        }
        onTouchStart={
          shapeDraftMode && !isLocked
            ? (event) => {
                const stage = event.target.getStage();
                const touch = event.evt.touches[0];
                if (!stage || !touch) {
                  return;
                }

                const rect = stage.container().getBoundingClientRect();
                longPressDragRef.current = {
                  active: false,
                  startTouchX: touch.clientX - rect.left,
                  startTouchY: touch.clientY - rect.top,
                  startZoneXPx: x,
                  startZoneYPx: y,
                };

                longPressTimeoutRef.current = window.setTimeout(() => {
                  if (!longPressDragRef.current) {
                    return;
                  }

                  longPressDragRef.current.active = true;
                  onShapeInteractionStart?.(zone);
                  setDragGhostRect({
                    x: longPressDragRef.current.startZoneXPx,
                    y: longPressDragRef.current.startZoneYPx,
                    width,
                    height,
                  });
                  setDragOriginRect({
                    x: longPressDragRef.current.startZoneXPx,
                    y: longPressDragRef.current.startZoneYPx,
                    width,
                    height,
                  });
                  activeTouchDraftRef.current = {
                    xPx: longPressDragRef.current.startZoneXPx,
                    yPx: longPressDragRef.current.startZoneYPx,
                  };
                  onShapeHandleActiveChange?.(true);
                  if (
                    typeof navigator !== "undefined" &&
                    "vibrate" in navigator
                  ) {
                    navigator.vibrate(45);
                  }
                }, 350);
              }
            : undefined
        }
        onTouchMove={
          shapeDraftMode && !isLocked
            ? (event) => {
                const dragState = longPressDragRef.current;
                const stage = event.target.getStage();
                const touch = event.evt.touches[0];

                if (!dragState || !stage || !touch) {
                  return;
                }

                const rect = stage.container().getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;

                if (!dragState.active) {
                  const deltaX = Math.abs(touchX - dragState.startTouchX);
                  const deltaY = Math.abs(touchY - dragState.startTouchY);

                  if (deltaX > 8 || deltaY > 8) {
                    if (longPressTimeoutRef.current !== null) {
                      window.clearTimeout(longPressTimeoutRef.current);
                      longPressTimeoutRef.current = null;
                    }
                    setDragGhostRect(null);
                    setDragOriginRect(null);
                    longPressDragRef.current = null;
                  }
                  return;
                }

                event.cancelBubble = true;
                const scale = viewportTransform?.scale ?? 1;
                const deltaWorldX = (touchX - dragState.startTouchX) / scale;
                const deltaWorldY = (touchY - dragState.startTouchY) / scale;
                const nextXPx = dragState.startZoneXPx + deltaWorldX;
                const nextYPx = dragState.startZoneYPx + deltaWorldY;

                activeTouchDraftRef.current = {
                  xPx: nextXPx,
                  yPx: nextYPx,
                };
                setDragGhostRect({
                  x: nextXPx,
                  y: nextYPx,
                  width,
                  height,
                });

                onShapeDraftChange?.({
                  ...zone,
                  xPct: pxToPercent(nextXPx, stageWidth),
                  yPct: pxToPercent(nextYPx, stageHeight),
                });
              }
            : undefined
        }
        onTouchEnd={
          shapeDraftMode && !isLocked
            ? (event) => {
                if (longPressTimeoutRef.current !== null) {
                  window.clearTimeout(longPressTimeoutRef.current);
                  longPressTimeoutRef.current = null;
                }

                if (longPressDragRef.current?.active) {
                  event.cancelBubble = true;
                  const touchDraft = activeTouchDraftRef.current;
                  if (touchDraft) {
                    onShapeDraftChange?.({
                      ...zone,
                      xPct: pxToPercent(
                        snapToGridPxWithinThreshold(
                          touchDraft.xPx,
                          dragSnapStepPxX,
                          snapThresholdWorldPx,
                        ),
                        stageWidth,
                      ),
                      yPct: pxToPercent(
                        snapToGridPxWithinThreshold(
                          touchDraft.yPx,
                          dragSnapStepPxY,
                          snapThresholdWorldPx,
                        ),
                        stageHeight,
                      ),
                    });
                  }
                  onShapeHandleActiveChange?.(false);
                }

                setDragGhostRect(null);
                setDragOriginRect(null);
                activeTouchDraftRef.current = null;
                longPressDragRef.current = null;
              }
            : undefined
        }
        onTouchCancel={
          shapeDraftMode && !isLocked
            ? (event: KonvaEventObject<TouchEvent>) => {
                if (longPressTimeoutRef.current !== null) {
                  window.clearTimeout(longPressTimeoutRef.current);
                  longPressTimeoutRef.current = null;
                }

                if (longPressDragRef.current?.active) {
                  event.cancelBubble = true;
                  onShapeHandleActiveChange?.(false);
                }

                setDragGhostRect(null);
                setDragOriginRect(null);
                activeTouchDraftRef.current = null;
                longPressDragRef.current = null;
              }
            : undefined
        }
      />
      {shapeDraftMode && dragOriginRect ? (
        <Rect
          x={dragOriginRect.x}
          y={dragOriginRect.y}
          width={dragOriginRect.width}
          height={dragOriginRect.height}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(148,163,184,0.7)"
          strokeWidth={1.25}
          dash={[4, 4]}
          cornerRadius={6}
          listening={false}
        />
      ) : null}
      {shapeDraftMode && dragGhostRect ? (
        <Rect
          x={dragGhostRect.x}
          y={dragGhostRect.y}
          width={dragGhostRect.width}
          height={dragGhostRect.height}
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.48)"
          strokeWidth={1.5}
          dash={[7, 5]}
          cornerRadius={6}
          listening={false}
        />
      ) : null}
      {shapeDraftMode ? (
        <ShapeHandles
          zone={zone}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          onShapeDraftChange={onShapeDraftChange}
          onShapeHandleActiveChange={onShapeHandleActiveChange}
          onShapeInteractionStart={onShapeInteractionStart}
          gridStepPxX={gridStepPxX}
          gridStepPxY={gridStepPxY}
          viewportScale={viewportScale}
        />
      ) : null}
      <Text
        x={x + 6}
        y={y + 6}
        text={zone.label}
        fontSize={11}
        fontStyle="bold"
        fill="#ffffff"
      />
    </>
  );
}

interface ShapeHandlesProps {
  zone: StoreZone;
  stageWidth: number;
  stageHeight: number;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  onShapeInteractionStart?: (zone: StoreZone) => void;
  gridStepPxX?: number;
  gridStepPxY?: number;
  viewportScale?: number;
}

function ShapeHandles({
  zone,
  stageWidth,
  stageHeight,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  onShapeInteractionStart,
  gridStepPxX = 0,
  gridStepPxY = 0,
  viewportScale = 1,
}: ShapeHandlesProps) {
  const x = pct(zone.xPct, stageWidth);
  const y = pct(zone.yPct, stageHeight);
  const width = pct(zone.widthPct, stageWidth);
  const height = pct(zone.heightPct, stageHeight);
  const handleSize = 14;
  const handleTouchTargetSize = 36;
  const shapeReferenceSizePx = Math.max(1, Math.min(width, height));
  const resizeSnapStepPxX = resolveAdaptiveSnapStepPx(
    gridStepPxX,
    shapeReferenceSizePx,
  );
  const resizeSnapStepPxY = resolveAdaptiveSnapStepPx(
    gridStepPxY,
    shapeReferenceSizePx,
  );
  const snapThresholdScreenPx = 12;
  const snapThresholdWorldPx = snapThresholdScreenPx / viewportScale;

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#ffffff"
        strokeWidth={2}
        dash={[8, 5]}
        cornerRadius={6}
        listening={false}
      />
      {(
        [
          { key: "nw", x, y },
          { key: "ne", x: x + width, y },
          { key: "sw", x, y: y + height },
          { key: "se", x: x + width, y: y + height },
        ] as const
      ).map((handle) => (
        <Group key={handle.key}>
          <Rect
            x={handle.x - handleTouchTargetSize / 2}
            y={handle.y - handleTouchTargetSize / 2}
            width={handleTouchTargetSize}
            height={handleTouchTargetSize}
            fill="rgba(255,255,255,0.001)"
            draggable
            onTouchStart={(event) => {
              event.cancelBubble = true;
              onShapeHandleActiveChange?.(true);
            }}
            onTouchMove={(event) => {
              event.cancelBubble = true;
            }}
            onTouchEnd={(event) => {
              event.cancelBubble = true;
              onShapeHandleActiveChange?.(false);
            }}
            onDragStart={() => {
              onShapeInteractionStart?.(zone);
              onShapeHandleActiveChange?.(true);
            }}
            onDragMove={(event) => {
              event.cancelBubble = true;
              const nextHandleCenterX = snapToGridPxWithinThreshold(
                event.target.x() + handleTouchTargetSize / 2,
                resizeSnapStepPxX,
                snapThresholdWorldPx,
              );
              const nextHandleCenterY = snapToGridPxWithinThreshold(
                event.target.y() + handleTouchTargetSize / 2,
                resizeSnapStepPxY,
                snapThresholdWorldPx,
              );
              const minSizePx = 24;

              let nextX = x;
              let nextY = y;
              let nextWidth = width;
              let nextHeight = height;

              if (handle.key === "nw") {
                const clampedX = Math.min(
                  nextHandleCenterX,
                  x + width - minSizePx,
                );
                const clampedY = Math.min(
                  nextHandleCenterY,
                  y + height - minSizePx,
                );
                nextX = clampedX;
                nextY = clampedY;
                nextWidth = x + width - clampedX;
                nextHeight = y + height - clampedY;
              }

              if (handle.key === "ne") {
                const clampedX = Math.max(nextHandleCenterX, x + minSizePx);
                const clampedY = Math.min(
                  nextHandleCenterY,
                  y + height - minSizePx,
                );
                nextY = clampedY;
                nextWidth = clampedX - x;
                nextHeight = y + height - clampedY;
              }

              if (handle.key === "sw") {
                const clampedX = Math.min(
                  nextHandleCenterX,
                  x + width - minSizePx,
                );
                const clampedY = Math.max(nextHandleCenterY, y + minSizePx);
                nextX = clampedX;
                nextWidth = x + width - clampedX;
                nextHeight = clampedY - y;
              }

              if (handle.key === "se") {
                const clampedX = Math.max(nextHandleCenterX, x + minSizePx);
                const clampedY = Math.max(nextHandleCenterY, y + minSizePx);
                nextWidth = clampedX - x;
                nextHeight = clampedY - y;
              }

              onShapeDraftChange?.({
                ...zone,
                xPct: pxToPercent(nextX, stageWidth),
                yPct: pxToPercent(nextY, stageHeight),
                widthPct: pxToPercent(nextWidth, stageWidth),
                heightPct: pxToPercent(nextHeight, stageHeight),
              });
            }}
            onDragEnd={(event) => {
              onShapeHandleActiveChange?.(false);
              event.target.position({
                x: handle.x - handleTouchTargetSize / 2,
                y: handle.y - handleTouchTargetSize / 2,
              });
            }}
          />
          <Rect
            x={handle.x - handleSize / 2}
            y={handle.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#0ea5e9"
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
        </Group>
      ))}
    </>
  );
}

const GridLayer = memo(function GridLayer({
  stageWidth,
  stageHeight,
  viewportScale,
  viewportOffsetX,
  viewportOffsetY,
  gridStepPxX,
  gridStepPxY,
}: {
  stageWidth: number;
  stageHeight: number;
  viewportScale: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
  gridStepPxX: number;
  gridStepPxY: number;
}) {
  const worldLeft = (0 - viewportOffsetX) / viewportScale;
  const worldRight = (stageWidth - viewportOffsetX) / viewportScale;
  const worldTop = (0 - viewportOffsetY) / viewportScale;
  const worldBottom = (stageHeight - viewportOffsetY) / viewportScale;

  return (
    <Layer listening={false}>
      <Shape
        width={stageWidth}
        height={stageHeight}
        sceneFunc={(ctx) => {
          ctx.save();
          ctx.translate(viewportOffsetX, viewportOffsetY);
          ctx.scale(viewportScale, viewportScale);
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.lineWidth = 1 / viewportScale;
          ctx.beginPath();

          if (gridStepPxX > 0) {
            const firstCol = Math.floor(worldLeft / gridStepPxX) - 1;
            const lastCol = Math.ceil(worldRight / gridStepPxX) + 1;

            for (let column = firstCol; column <= lastCol; column += 1) {
              const x = column * gridStepPxX;
              ctx.moveTo(x, worldTop - gridStepPxY);
              ctx.lineTo(x, worldBottom + gridStepPxY);
            }
          }

          if (gridStepPxY > 0) {
            const firstRow = Math.floor(worldTop / gridStepPxY) - 1;
            const lastRow = Math.ceil(worldBottom / gridStepPxY) + 1;

            for (let row = firstRow; row <= lastRow; row += 1) {
              const y = row * gridStepPxY;
              ctx.moveTo(worldLeft - gridStepPxX, y);
              ctx.lineTo(worldRight + gridStepPxX, y);
            }
          }

          ctx.stroke();
          ctx.restore();
        }}
      />
    </Layer>
  );
});

function FloorBoundaryShape({
  vertices,
  isEditMode,
  isPreview,
  scale,
  onDraftChange,
  onHandleActiveChange,
  gridStepPxX,
  gridStepPxY,
}: {
  vertices: Array<{ xPx: number; yPx: number }>;
  isEditMode: boolean;
  isPreview: boolean;
  scale: number;
  onDraftChange?: (vertices: Array<{ xPx: number; yPx: number }>) => void;
  onHandleActiveChange?: (active: boolean) => void;
  gridStepPxX: number;
  gridStepPxY: number;
}) {
  const [localVertices, setLocalVertices] = useState(vertices);

  useEffect(() => {
    setLocalVertices(vertices);
  }, [vertices]);

  if (localVertices.length < 4) {
    return null;
  }

  const x = localVertices[0].xPx;
  const y = localVertices[0].yPx;
  const width = localVertices[1].xPx - localVertices[0].xPx;
  const height = localVertices[3].yPx - localVertices[0].yPx;
  const handleSize = 14;
  const handleTouchTargetSize = 36;
  const shapeReferenceSizePx = Math.max(1, Math.min(width, height));
  const resizeSnapStepPxX = resolveAdaptiveSnapStepPx(
    gridStepPxX,
    shapeReferenceSizePx,
  );
  const resizeSnapStepPxY = resolveAdaptiveSnapStepPx(
    gridStepPxY,
    shapeReferenceSizePx,
  );
  const snapThresholdScreenPx = 12;
  const snapThresholdWorldPx = snapThresholdScreenPx / scale;
  const stroke =
    isEditMode ? "#e2e8f0" : isPreview ? "#64748b" : "#94a3b8";
  const opacity = isEditMode ? 0.7 : isPreview ? 0.2 : 0.4;

  const commitRect = (
    nextX: number,
    nextY: number,
    nextWidth: number,
    nextHeight: number,
  ) => {
    onDraftChange?.([
      { xPx: nextX, yPx: nextY },
      { xPx: nextX + nextWidth, yPx: nextY },
      { xPx: nextX + nextWidth, yPx: nextY + nextHeight },
      { xPx: nextX, yPx: nextY + nextHeight },
    ]);
  };

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={stroke}
        opacity={opacity}
        dash={[8, 6]}
        fill="transparent"
        strokeWidth={2 / scale}
        listening={false}
      />
      {isEditMode
        ? (
            [
              { key: "nw", x, y },
              { key: "ne", x: x + width, y },
              { key: "sw", x, y: y + height },
              { key: "se", x: x + width, y: y + height },
            ] as const
          ).map((handle) => (
            <Group key={handle.key}>
              <Rect
                x={handle.x - handleTouchTargetSize / 2}
                y={handle.y - handleTouchTargetSize / 2}
                width={handleTouchTargetSize}
                height={handleTouchTargetSize}
                fill="rgba(255,255,255,0.001)"
                draggable
                onTouchStart={(event) => {
                  event.cancelBubble = true;
                  onHandleActiveChange?.(true);
                }}
                onTouchMove={(event) => {
                  event.cancelBubble = true;
                }}
                onTouchEnd={(event) => {
                  event.cancelBubble = true;
                  onHandleActiveChange?.(false);
                }}
                onDragStart={() => onHandleActiveChange?.(true)}
                onDragMove={(event) => {
                  event.cancelBubble = true;
                  const snappedX = snapToGridPxWithinThreshold(
                    event.target.x() + handleTouchTargetSize / 2,
                    resizeSnapStepPxX,
                    snapThresholdWorldPx,
                  );
                  const snappedY = snapToGridPxWithinThreshold(
                    event.target.y() + handleTouchTargetSize / 2,
                    resizeSnapStepPxY,
                    snapThresholdWorldPx,
                  );
                  const minSizePx = 24;

                  let nextX = x;
                  let nextY = y;
                  let nextWidth = width;
                  let nextHeight = height;

                  if (handle.key === "nw") {
                    const clampedX = Math.min(snappedX, x + width - minSizePx);
                    const clampedY = Math.min(snappedY, y + height - minSizePx);
                    nextX = clampedX;
                    nextY = clampedY;
                    nextWidth = x + width - clampedX;
                    nextHeight = y + height - clampedY;
                  }

                  if (handle.key === "ne") {
                    const clampedX = Math.max(snappedX, x + minSizePx);
                    const clampedY = Math.min(snappedY, y + height - minSizePx);
                    nextY = clampedY;
                    nextWidth = clampedX - x;
                    nextHeight = y + height - clampedY;
                  }

                  if (handle.key === "sw") {
                    const clampedX = Math.min(snappedX, x + width - minSizePx);
                    const clampedY = Math.max(snappedY, y + minSizePx);
                    nextX = clampedX;
                    nextWidth = x + width - clampedX;
                    nextHeight = clampedY - y;
                  }

                  if (handle.key === "se") {
                    const clampedX = Math.max(snappedX, x + minSizePx);
                    const clampedY = Math.max(snappedY, y + minSizePx);
                    nextWidth = clampedX - x;
                    nextHeight = clampedY - y;
                  }

                  setLocalVertices([
                    { xPx: nextX, yPx: nextY },
                    { xPx: nextX + nextWidth, yPx: nextY },
                    { xPx: nextX + nextWidth, yPx: nextY + nextHeight },
                    { xPx: nextX, yPx: nextY + nextHeight },
                  ]);
                }}
                onDragEnd={(event) => {
                  onHandleActiveChange?.(false);
                  event.target.position({
                    x: handle.x - handleTouchTargetSize / 2,
                    y: handle.y - handleTouchTargetSize / 2,
                  });
                  commitRect(
                    localVertices[0].xPx,
                    localVertices[0].yPx,
                    localVertices[1].xPx - localVertices[0].xPx,
                    localVertices[3].yPx - localVertices[0].yPx,
                  );
                }}
              />
              <Rect
                x={handle.x - handleSize / 2}
                y={handle.y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="#ffffff"
                stroke="#0ea5e9"
                strokeWidth={2}
                cornerRadius={4}
                listening={false}
              />
            </Group>
          ))
        : null}
    </>
  );
}
