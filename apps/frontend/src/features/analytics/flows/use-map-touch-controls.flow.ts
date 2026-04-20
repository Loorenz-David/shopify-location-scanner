import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Group as KonvaGroup } from "konva/lib/Group";

import type { EditorViewportTransform } from "./use-zone-editor.flow";

const MIN_SCALE = 0.75;
const MAX_SCALE = 4;
const WORLD_GROUP_ID = "store-map-world-group";
const STATIC_WORLD_GROUP_ID = "store-map-static-world-group";

type TouchPoint = { x: number; y: number };
type TouchGestureState =
  | {
      type: "pan";
      lastPoint: TouchPoint;
    }
  | {
      type: "pinch";
      startDistance: number;
      startMidpoint: TouchPoint;
      startTransform: EditorViewportTransform;
      worldAnchor: TouchPoint;
    };

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function getTouchPoints(
  event: KonvaEventObject<TouchEvent>,
): TouchPoint[] {
  const stage = event.target.getStage();
  if (!stage) {
    return [];
  }

  const rect = stage.container().getBoundingClientRect();
  return Array.from(event.evt.touches).map((touch) => ({
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  }));
}

function getDistance(first: TouchPoint, second: TouchPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: TouchPoint, second: TouchPoint): TouchPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function useMapTouchControlsFlow(
  isEnabled: boolean,
  baseTransform: EditorViewportTransform | null,
) {
  const [committedGestureTransform, setCommittedGestureTransform] =
    useState<EditorViewportTransform>({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  const [isGestureActive, setIsGestureActive] = useState(false);
  const gestureTransformRef = useRef<EditorViewportTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const gestureStateRef = useRef<TouchGestureState | null>(null);
  const didGestureMoveRef = useRef(false);
  const lastTouchWasTapRef = useRef(false);

  useEffect(() => {
    if (!isEnabled) {
      gestureStateRef.current = null;
      didGestureMoveRef.current = false;
      lastTouchWasTapRef.current = false;
    }
  }, [isEnabled]);

  const resolvedBaseTransform = baseTransform ?? {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  const resolvedTransform = useMemo<EditorViewportTransform>(
    () => ({
      scale: resolvedBaseTransform.scale * committedGestureTransform.scale,
      offsetX: resolvedBaseTransform.offsetX + committedGestureTransform.offsetX,
      offsetY: resolvedBaseTransform.offsetY + committedGestureTransform.offsetY,
    }),
    [committedGestureTransform, resolvedBaseTransform],
  );

  const applyLiveTransform = useCallback(
    (
      event: KonvaEventObject<TouchEvent>,
      liveGestureTransform: EditorViewportTransform,
    ) => {
      const stage = event.target.getStage();
      const worldGroups: KonvaGroup[] = stage
        ? [
            stage.findOne(`#${STATIC_WORLD_GROUP_ID}`),
            stage.findOne(`#${WORLD_GROUP_ID}`),
          ].filter((group): group is KonvaGroup => group !== undefined)
        : [];

      if (worldGroups.length === 0) {
        return;
      }

      const nextScale = resolvedBaseTransform.scale * liveGestureTransform.scale;
      for (const worldGroup of worldGroups) {
        worldGroup.position({
          x: resolvedBaseTransform.offsetX + liveGestureTransform.offsetX,
          y: resolvedBaseTransform.offsetY + liveGestureTransform.offsetY,
        });
        worldGroup.scale({ x: nextScale, y: nextScale });
        worldGroup.getLayer()?.batchDraw();
      }
    },
    [resolvedBaseTransform],
  );

  const handleTouchStart = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      if (!isEnabled) {
        return;
      }

      event.evt.preventDefault();
      const touchPoints = getTouchPoints(event);
      didGestureMoveRef.current = false;
      lastTouchWasTapRef.current = false;
      setIsGestureActive(true);

      if (touchPoints.length >= 2) {
        const [first, second] = touchPoints;
        const midpoint = getMidpoint(first, second);
        const startTransform = resolvedTransform;
        const totalScale = startTransform.scale || 1;

        gestureStateRef.current = {
          type: "pinch",
          startDistance: getDistance(first, second),
          startMidpoint: midpoint,
          startTransform,
          worldAnchor: {
            x: (midpoint.x - startTransform.offsetX) / totalScale,
            y: (midpoint.y - startTransform.offsetY) / totalScale,
          },
        };
        return;
      }

      if (touchPoints.length === 1) {
        gestureStateRef.current = {
          type: "pan",
          lastPoint: touchPoints[0],
        };
      }
    },
    [isEnabled, resolvedTransform],
  );

  const handleTouchMove = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      if (!isEnabled) {
        return;
      }

      event.evt.preventDefault();
      const touchPoints = getTouchPoints(event);
      const gestureState = gestureStateRef.current;

      if (!gestureState) {
        return;
      }

      if (touchPoints.length >= 2) {
        const [first, second] = touchPoints;
        const midpoint = getMidpoint(first, second);

        if (gestureState.type !== "pinch") {
          didGestureMoveRef.current = true;
          const totalScale = resolvedTransform.scale || 1;
          gestureStateRef.current = {
            type: "pinch",
            startDistance: getDistance(first, second),
            startMidpoint: midpoint,
            startTransform: resolvedTransform,
            worldAnchor: {
              x: (midpoint.x - resolvedTransform.offsetX) / totalScale,
              y: (midpoint.y - resolvedTransform.offsetY) / totalScale,
            },
          };
          return;
        }

        const nextTotalScale = clampScale(
          gestureState.startTransform.scale *
            (getDistance(first, second) / gestureState.startDistance),
        );
        if (
          Math.abs(nextTotalScale - resolvedTransform.scale) > 0.01 ||
          Math.abs(midpoint.x - gestureState.startMidpoint.x) > 2 ||
          Math.abs(midpoint.y - gestureState.startMidpoint.y) > 2
        ) {
          didGestureMoveRef.current = true;
        }
        const nextTotalOffsetX =
          midpoint.x - gestureState.worldAnchor.x * nextTotalScale;
        const nextTotalOffsetY =
          midpoint.y - gestureState.worldAnchor.y * nextTotalScale;

        const nextGestureTransform = {
          scale: nextTotalScale / resolvedBaseTransform.scale,
          offsetX: nextTotalOffsetX - resolvedBaseTransform.offsetX,
          offsetY: nextTotalOffsetY - resolvedBaseTransform.offsetY,
        };
        gestureTransformRef.current = nextGestureTransform;
        applyLiveTransform(event, nextGestureTransform);
        return;
      }

      if (touchPoints.length === 1 && gestureState.type === "pan") {
        const nextPoint = touchPoints[0];
        const deltaX = nextPoint.x - gestureState.lastPoint.x;
        const deltaY = nextPoint.y - gestureState.lastPoint.y;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          didGestureMoveRef.current = true;
        }

        const nextGestureTransform = {
          ...gestureTransformRef.current,
          offsetX: gestureTransformRef.current.offsetX + deltaX,
          offsetY: gestureTransformRef.current.offsetY + deltaY,
        };
        gestureTransformRef.current = nextGestureTransform;
        applyLiveTransform(event, nextGestureTransform);

        gestureStateRef.current = {
          type: "pan",
          lastPoint: nextPoint,
        };
      }
    },
    [isEnabled, resolvedBaseTransform, resolvedTransform],
  );

  const handleTouchEnd = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      if (!isEnabled) {
        return;
      }

      event.evt.preventDefault();
      const touchPoints = getTouchPoints(event);

      if (touchPoints.length >= 2) {
        const [first, second] = touchPoints;
        const midpoint = getMidpoint(first, second);
        const totalScale = resolvedTransform.scale || 1;

        gestureStateRef.current = {
          type: "pinch",
          startDistance: getDistance(first, second),
          startMidpoint: midpoint,
          startTransform: resolvedTransform,
          worldAnchor: {
            x: (midpoint.x - resolvedTransform.offsetX) / totalScale,
            y: (midpoint.y - resolvedTransform.offsetY) / totalScale,
          },
        };
        return;
      }

      if (touchPoints.length === 1) {
        gestureStateRef.current = {
          type: "pan",
          lastPoint: touchPoints[0],
        };
        return;
      }

      lastTouchWasTapRef.current = !didGestureMoveRef.current;
      didGestureMoveRef.current = false;
      gestureStateRef.current = null;
      setCommittedGestureTransform({ ...gestureTransformRef.current });
      setIsGestureActive(false);
    },
    [isEnabled, resolvedTransform],
  );

  const resetTouchTransform = useCallback(() => {
    const resetTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    setCommittedGestureTransform(resetTransform);
    gestureTransformRef.current = resetTransform;
    gestureStateRef.current = null;
    didGestureMoveRef.current = false;
    lastTouchWasTapRef.current = false;
    setIsGestureActive(false);
  }, []);

  const consumeLastTouchTapIntent = useCallback(() => {
    const value = lastTouchWasTapRef.current;
    lastTouchWasTapRef.current = false;
    return value;
  }, []);

  return {
    viewportTransform: resolvedTransform,
    isGestureActive,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouchTransform,
    consumeLastTouchTapIntent,
  };
}
