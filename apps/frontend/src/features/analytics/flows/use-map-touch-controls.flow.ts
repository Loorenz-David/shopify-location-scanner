import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";

import type { EditorViewportTransform } from "./use-zone-editor.flow";

const MIN_SCALE = 0.75;
const MAX_SCALE = 4;

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
  const [gestureTransform, setGestureTransform] = useState<EditorViewportTransform>({
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
      scale: resolvedBaseTransform.scale * gestureTransform.scale,
      offsetX: resolvedBaseTransform.offsetX + gestureTransform.offsetX,
      offsetY: resolvedBaseTransform.offsetY + gestureTransform.offsetY,
    }),
    [gestureTransform, resolvedBaseTransform],
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

        setGestureTransform({
          scale: nextTotalScale / resolvedBaseTransform.scale,
          offsetX: nextTotalOffsetX - resolvedBaseTransform.offsetX,
          offsetY: nextTotalOffsetY - resolvedBaseTransform.offsetY,
        });
        return;
      }

      if (touchPoints.length === 1 && gestureState.type === "pan") {
        const nextPoint = touchPoints[0];
        const deltaX = nextPoint.x - gestureState.lastPoint.x;
        const deltaY = nextPoint.y - gestureState.lastPoint.y;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          didGestureMoveRef.current = true;
        }

        setGestureTransform((current) => ({
          ...current,
          offsetX: current.offsetX + deltaX,
          offsetY: current.offsetY + deltaY,
        }));

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
    },
    [isEnabled, resolvedTransform],
  );

  const resetTouchTransform = useCallback(() => {
    setGestureTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    gestureStateRef.current = null;
    didGestureMoveRef.current = false;
    lastTouchWasTapRef.current = false;
  }, []);

  const consumeLastTouchTapIntent = useCallback(() => {
    const value = lastTouchWasTapRef.current;
    lastTouchWasTapRef.current = false;
    return value;
  }, []);

  return {
    viewportTransform: resolvedTransform,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouchTransform,
    consumeLastTouchTapIntent,
  };
}
