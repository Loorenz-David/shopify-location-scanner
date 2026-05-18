import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Rect, Shape, Stage, Text } from "react-konva";
import { clampZoneShapeToBounds, findNearestNonOverlappingZoneShape, hasZoneOverlap, pct, pxToPercent, } from "../domain/store-map-editor.domain";
import { resolveAdaptiveSnapStepPx, snapToGridPxWithinThreshold, } from "../utils/grid-utils";
import { useGesturePerformanceDebug } from "../hooks/use-gesture-performance-debug";
export function StoreMapEditorStage({ zones, stageWidth, stageHeight, isInteractive, renameZone, viewportTransform, onStageTouchStart, onStageTouchMove, onStageTouchEnd, onSelectZone, consumeLastTouchTapIntent, shapeDraft, onShapeDraftChange, onShapeHandleActiveChange, onShapeInteractionStart, floorBoundaryVertices = [], isFloorBoundaryEditMode = false, showGrid = false, gridStepPxX = 0, gridStepPxY = 0, onFloorBoundaryDraftChange, labelRenderMode = "full", }) {
    const staticWorldGroupRef = useRef(null);
    const activeShapeDraftId = shapeDraft?.id ?? null;
    const cachePixelRatio = Math.min(2, Math.max(1, viewportTransform?.scale ?? 1));
    const staticZones = useMemo(() => activeShapeDraftId
        ? zones.filter((zone) => zone.id !== activeShapeDraftId)
        : zones, [activeShapeDraftId, zones]);
    const staticVisualSignature = useMemo(() => [
        activeShapeDraftId ?? "no-draft",
        cachePixelRatio.toFixed(2),
        floorBoundaryVertices
            .map((vertex) => `${vertex.xPx}:${vertex.yPx}`)
            .join("|"),
        isFloorBoundaryEditMode ? "boundary-edit" : "boundary-view",
        labelRenderMode,
        staticZones
            .map((zone) => `${zone.id}:${zone.label}:${zone.type}:${zone.xPct}:${zone.yPct}:${zone.widthPct}:${zone.heightPct}`)
            .join("|"),
    ].join("::"), [
        activeShapeDraftId,
        cachePixelRatio,
        floorBoundaryVertices,
        isFloorBoundaryEditMode,
        labelRenderMode,
        staticZones,
    ]);
    useGesturePerformanceDebug("store-map-editor", labelRenderMode === "gesture-lite");
    useEffect(() => {
        const group = staticWorldGroupRef.current;
        if (!group) {
            return;
        }
        let frameId = window.requestAnimationFrame(() => {
            group.clearCache();
            group.cache({ pixelRatio: cachePixelRatio });
            group.getLayer()?.batchDraw();
        });
        return () => {
            window.cancelAnimationFrame(frameId);
            group.clearCache();
        };
    }, [
        cachePixelRatio,
        staticVisualSignature,
        stageHeight,
        stageWidth,
    ]);
    return (_jsxs(Stage, { width: stageWidth, height: stageHeight, style: { background: "#0f172a", touchAction: "none" }, onTouchStart: isInteractive ? onStageTouchStart : undefined, onTouchMove: isInteractive ? onStageTouchMove : undefined, onTouchEnd: isInteractive ? onStageTouchEnd : undefined, children: [showGrid && viewportTransform ? (_jsx(GridLayer, { stageWidth: stageWidth, stageHeight: stageHeight, viewportScale: viewportTransform.scale, viewportOffsetX: viewportTransform.offsetX, viewportOffsetY: viewportTransform.offsetY, gridStepPxX: gridStepPxX, gridStepPxY: gridStepPxY })) : null, _jsx(Layer, { listening: false, children: _jsxs(Group, { id: "store-map-static-world-group", ref: staticWorldGroupRef, x: viewportTransform?.offsetX ?? 0, y: viewportTransform?.offsetY ?? 0, scaleX: viewportTransform?.scale ?? 1, scaleY: viewportTransform?.scale ?? 1, children: [floorBoundaryVertices.length > 0 ? (_jsx(FloorBoundaryShape, { vertices: floorBoundaryVertices, isEditMode: false, isPreview: !isInteractive, scale: viewportTransform?.scale ?? 1, gridStepPxX: gridStepPxX, gridStepPxY: gridStepPxY, renderHandles: false })) : null, staticZones.map((zone) => (_jsx(ZoneVisual, { zone: zone, stageWidth: stageWidth, stageHeight: stageHeight, labelRenderMode: labelRenderMode }, zone.id)))] }) }), _jsx(Layer, { children: _jsxs(Group, { id: "store-map-world-group", x: viewportTransform?.offsetX ?? 0, y: viewportTransform?.offsetY ?? 0, scaleX: viewportTransform?.scale ?? 1, scaleY: viewportTransform?.scale ?? 1, children: [floorBoundaryVertices.length > 0 && isFloorBoundaryEditMode ? (_jsx(FloorBoundaryShape, { vertices: floorBoundaryVertices, isEditMode: true, isPreview: false, scale: viewportTransform?.scale ?? 1, onDraftChange: onFloorBoundaryDraftChange, onHandleActiveChange: onShapeHandleActiveChange, gridStepPxX: gridStepPxX, gridStepPxY: gridStepPxY, renderHandles: true })) : null, zones.map((zone) => (_jsx(EditableZoneOverlay, { zone: shapeDraft?.id === zone.id ? shapeDraft : zone, zones: zones, stageWidth: stageWidth, stageHeight: stageHeight, onRename: renameZone, isInteractive: isInteractive, onSelectZone: onSelectZone, consumeLastTouchTapIntent: consumeLastTouchTapIntent, shapeDraftMode: shapeDraft?.id === zone.id, onShapeDraftChange: onShapeDraftChange, onShapeHandleActiveChange: onShapeHandleActiveChange, viewportTransform: viewportTransform, onShapeInteractionStart: onShapeInteractionStart, isLocked: isFloorBoundaryEditMode, gridStepPxX: gridStepPxX, gridStepPxY: gridStepPxY }, zone.id)))] }) })] }));
}
const ZoneVisual = memo(function ZoneVisual({ zone, stageWidth, stageHeight, labelRenderMode = "full", overrideXPx, overrideYPx, fillOverride, strokeOverride, opacityOverride, }) {
    const x = overrideXPx ?? pct(zone.xPct, stageWidth);
    const y = overrideYPx ?? pct(zone.yPct, stageHeight);
    const width = pct(zone.widthPct, stageWidth);
    const height = pct(zone.heightPct, stageHeight);
    const fill = fillOverride ?? (zone.type === "corridor" ? "#475569" : "#0ea5e9");
    const stroke = strokeOverride ?? "#ffffff";
    const opacity = opacityOverride ?? 0.55;
    return (_jsxs(_Fragment, { children: [_jsx(Rect, { x: x, y: y, width: width, height: height, fill: fill, opacity: opacity, stroke: stroke, strokeWidth: 1, cornerRadius: 6, listening: false, perfectDrawEnabled: false, shadowForStrokeEnabled: false }), _jsx(Text, { x: x + 6, y: y + 6, text: zone.label, fontSize: 11, fontStyle: "bold", fill: "#ffffff", listening: false, perfectDrawEnabled: false, shadowEnabled: false, opacity: labelRenderMode === "full" ? 1 : 0.92 })] }));
});
const EditableZoneOverlay = memo(function EditableZoneOverlay({ zone, zones, stageWidth, stageHeight, onRename, isInteractive, onSelectZone, consumeLastTouchTapIntent, shapeDraftMode = false, onShapeDraftChange, onShapeHandleActiveChange, viewportTransform, onShapeInteractionStart, isLocked = false, gridStepPxX = 0, gridStepPxY = 0, }) {
    const x = pct(zone.xPct, stageWidth);
    const y = pct(zone.yPct, stageHeight);
    const width = pct(zone.widthPct, stageWidth);
    const height = pct(zone.heightPct, stageHeight);
    const shapeReferenceSizePx = Math.max(1, Math.min(width, height));
    const dragSnapStepPxX = resolveAdaptiveSnapStepPx(gridStepPxX, shapeReferenceSizePx);
    const dragSnapStepPxY = resolveAdaptiveSnapStepPx(gridStepPxY, shapeReferenceSizePx);
    const viewportScale = viewportTransform?.scale ?? 1;
    const snapThresholdScreenPx = 12;
    const snapThresholdWorldPx = snapThresholdScreenPx / viewportScale;
    const [dragGhostRect, setDragGhostRect] = useState(null);
    const [dragOriginRect, setDragOriginRect] = useState(null);
    const longPressTimeoutRef = useRef(null);
    const longPressDragRef = useRef(null);
    const trackedTouchIdRef = useRef(null);
    const stageContainerRef = useRef(null);
    const activeTouchDraftRef = useRef(null);
    const hasDetachedGhost = !!dragGhostRect &&
        !dragGhostRect.isValid &&
        (Math.abs(dragGhostRect.x - x) > 0.5 || Math.abs(dragGhostRect.y - y) > 0.5);
    const clearLongPressState = useCallback((shouldDeactivateHandles) => {
        if (longPressTimeoutRef.current !== null) {
            window.clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
        if (shouldDeactivateHandles && longPressDragRef.current?.active) {
            onShapeHandleActiveChange?.(false);
        }
        setDragGhostRect(null);
        setDragOriginRect(null);
        activeTouchDraftRef.current = null;
        longPressDragRef.current = null;
        trackedTouchIdRef.current = null;
        stageContainerRef.current = null;
    }, [onShapeHandleActiveChange]);
    const handleTrackedTouchMove = useCallback((touch) => {
        const dragState = longPressDragRef.current;
        const stageContainer = stageContainerRef.current;
        if (!dragState || !stageContainer) {
            return;
        }
        const rect = stageContainer.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        if (!dragState.active) {
            const deltaX = Math.abs(touchX - dragState.startTouchX);
            const deltaY = Math.abs(touchY - dragState.startTouchY);
            if (deltaX > 8 || deltaY > 8) {
                clearLongPressState(false);
            }
            return;
        }
        const scale = viewportTransform?.scale ?? 1;
        const deltaWorldX = (touchX - dragState.startTouchX) / scale;
        const deltaWorldY = (touchY - dragState.startTouchY) / scale;
        const nextXPx = dragState.startZoneXPx + deltaWorldX;
        const nextYPx = dragState.startZoneYPx + deltaWorldY;
        activeTouchDraftRef.current = {
            xPx: nextXPx,
            yPx: nextYPx,
        };
        const candidateDraft = clampZoneShapeToBounds({
            ...zone,
            xPct: pxToPercent(nextXPx, stageWidth),
            yPct: pxToPercent(nextYPx, stageHeight),
        });
        const isValidPosition = !hasZoneOverlap(candidateDraft, zones, candidateDraft.id);
        setDragGhostRect({
            x: nextXPx,
            y: nextYPx,
            width,
            height,
            isValid: isValidPosition,
        });
        onShapeDraftChange?.(candidateDraft);
    }, [
        clearLongPressState,
        height,
        onShapeDraftChange,
        stageHeight,
        stageWidth,
        viewportTransform?.scale,
        width,
        zone,
        zones,
    ]);
    const finalizeTrackedTouchDrag = useCallback(() => {
        const touchDraft = activeTouchDraftRef.current;
        if (longPressDragRef.current?.active && touchDraft) {
            const snappedDraft = clampZoneShapeToBounds({
                ...zone,
                xPct: pxToPercent(snapToGridPxWithinThreshold(touchDraft.xPx, dragSnapStepPxX, snapThresholdWorldPx), stageWidth),
                yPct: pxToPercent(snapToGridPxWithinThreshold(touchDraft.yPx, dragSnapStepPxY, snapThresholdWorldPx), stageHeight),
            });
            const resolvedDroppedDraft = hasZoneOverlap(snappedDraft, zones, snappedDraft.id)
                ? findNearestNonOverlappingZoneShape(snappedDraft, zones)
                : snappedDraft;
            if (resolvedDroppedDraft) {
                onShapeDraftChange?.(resolvedDroppedDraft);
            }
        }
        clearLongPressState(true);
    }, [
        clearLongPressState,
        dragSnapStepPxX,
        dragSnapStepPxY,
        onShapeDraftChange,
        snapThresholdWorldPx,
        stageHeight,
        stageWidth,
        zone,
        zones,
    ]);
    useEffect(() => {
        if (!shapeDraftMode || isLocked) {
            return;
        }
        const handleWindowTouchMove = (event) => {
            const trackedTouchId = trackedTouchIdRef.current;
            if (trackedTouchId === null) {
                return;
            }
            const touch = Array.from(event.touches).find((candidate) => candidate.identifier === trackedTouchId);
            if (!touch) {
                return;
            }
            event.preventDefault();
            handleTrackedTouchMove(touch);
        };
        const handleWindowTouchEnd = (event) => {
            const trackedTouchId = trackedTouchIdRef.current;
            if (trackedTouchId === null) {
                return;
            }
            const stillActive = Array.from(event.touches).some((candidate) => candidate.identifier === trackedTouchId);
            if (stillActive) {
                return;
            }
            event.preventDefault();
            finalizeTrackedTouchDrag();
        };
        window.addEventListener("touchmove", handleWindowTouchMove, {
            passive: false,
        });
        window.addEventListener("touchend", handleWindowTouchEnd, {
            passive: false,
        });
        window.addEventListener("touchcancel", handleWindowTouchEnd, {
            passive: false,
        });
        return () => {
            window.removeEventListener("touchmove", handleWindowTouchMove);
            window.removeEventListener("touchend", handleWindowTouchEnd);
            window.removeEventListener("touchcancel", handleWindowTouchEnd);
        };
    }, [
        finalizeTrackedTouchDrag,
        handleTrackedTouchMove,
        isLocked,
        shapeDraftMode,
    ]);
    return (_jsxs(_Fragment, { children: [shapeDraftMode ? (_jsx(ZoneVisual, { zone: zone, stageWidth: stageWidth, stageHeight: stageHeight, labelRenderMode: "full" })) : null, shapeDraftMode && dragGhostRect && hasDetachedGhost ? (_jsx(ZoneVisual, { zone: zone, stageWidth: stageWidth, stageHeight: stageHeight, labelRenderMode: "full", overrideXPx: dragGhostRect.x, overrideYPx: dragGhostRect.y, fillOverride: dragGhostRect.isValid ? undefined : "rgba(239,68,68,0.32)", strokeOverride: dragGhostRect.isValid ? "#ffffff" : "rgba(248,113,113,0.95)", opacityOverride: dragGhostRect.isValid ? 0.55 : 0.72 })) : null, _jsx(Rect, { x: x, y: y, width: width, height: height, fill: "rgba(255,255,255,0.001)", cornerRadius: 6, onDblClick: isInteractive && !shapeDraftMode && !isLocked
                    ? () => void onRename(zone)
                    : undefined, onClick: isInteractive && onSelectZone && !shapeDraftMode && !isLocked
                    ? () => {
                        onSelectZone(zone);
                    }
                    : undefined, onTap: isInteractive && onSelectZone && !shapeDraftMode && !isLocked
                    ? () => {
                        if (consumeLastTouchTapIntent && !consumeLastTouchTapIntent()) {
                            return;
                        }
                        onSelectZone(zone);
                    }
                    : undefined, onTouchStart: shapeDraftMode && !isLocked
                    ? (event) => {
                        const stage = event.target.getStage();
                        const touch = event.evt.touches[0];
                        if (!stage || !touch) {
                            return;
                        }
                        const rect = stage.container().getBoundingClientRect();
                        stageContainerRef.current = stage.container();
                        trackedTouchIdRef.current = touch.identifier;
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
                                isValid: true,
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
                            if (typeof navigator !== "undefined" &&
                                "vibrate" in navigator) {
                                navigator.vibrate(45);
                            }
                        }, 350);
                    }
                    : undefined }), shapeDraftMode && dragOriginRect ? (_jsx(Rect, { x: dragOriginRect.x, y: dragOriginRect.y, width: dragOriginRect.width, height: dragOriginRect.height, fill: "rgba(255,255,255,0.03)", stroke: "rgba(148,163,184,0.7)", strokeWidth: 1.25, dash: [4, 4], cornerRadius: 6, listening: false })) : null, shapeDraftMode && dragGhostRect ? (_jsx(Rect, { x: dragGhostRect.x, y: dragGhostRect.y, width: dragGhostRect.width, height: dragGhostRect.height, fill: dragGhostRect.isValid
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(239,68,68,0.14)", stroke: dragGhostRect.isValid
                    ? "rgba(255,255,255,0.48)"
                    : "rgba(248,113,113,0.85)", strokeWidth: 1.5, dash: [7, 5], cornerRadius: 6, listening: false })) : null, shapeDraftMode ? (_jsx(ShapeHandles, { zone: zone, stageWidth: stageWidth, stageHeight: stageHeight, onShapeDraftChange: onShapeDraftChange, onShapeHandleActiveChange: onShapeHandleActiveChange, onShapeInteractionStart: onShapeInteractionStart, gridStepPxX: gridStepPxX, gridStepPxY: gridStepPxY, viewportScale: viewportScale })) : null] }));
});
function ShapeHandles({ zone, stageWidth, stageHeight, onShapeDraftChange, onShapeHandleActiveChange, onShapeInteractionStart, gridStepPxX = 0, gridStepPxY = 0, viewportScale = 1, }) {
    const x = pct(zone.xPct, stageWidth);
    const y = pct(zone.yPct, stageHeight);
    const width = pct(zone.widthPct, stageWidth);
    const height = pct(zone.heightPct, stageHeight);
    const handleSize = 14;
    const handleTouchTargetSize = 36;
    const shapeReferenceSizePx = Math.max(1, Math.min(width, height));
    const resizeSnapStepPxX = resolveAdaptiveSnapStepPx(gridStepPxX, shapeReferenceSizePx);
    const resizeSnapStepPxY = resolveAdaptiveSnapStepPx(gridStepPxY, shapeReferenceSizePx);
    const snapThresholdScreenPx = 12;
    const snapThresholdWorldPx = snapThresholdScreenPx / viewportScale;
    return (_jsxs(_Fragment, { children: [_jsx(Rect, { x: x, y: y, width: width, height: height, stroke: "#ffffff", strokeWidth: 2, dash: [8, 5], cornerRadius: 6, listening: false }), [
                { key: "nw", x, y },
                { key: "ne", x: x + width, y },
                { key: "sw", x, y: y + height },
                { key: "se", x: x + width, y: y + height },
            ].map((handle) => (_jsxs(Group, { children: [_jsx(Rect, { x: handle.x - handleTouchTargetSize / 2, y: handle.y - handleTouchTargetSize / 2, width: handleTouchTargetSize, height: handleTouchTargetSize, fill: "rgba(255,255,255,0.001)", draggable: true, onTouchStart: (event) => {
                            event.cancelBubble = true;
                            onShapeHandleActiveChange?.(true);
                        }, onTouchMove: (event) => {
                            event.cancelBubble = true;
                        }, onTouchEnd: (event) => {
                            event.cancelBubble = true;
                            onShapeHandleActiveChange?.(false);
                        }, onDragStart: () => {
                            onShapeInteractionStart?.(zone);
                            onShapeHandleActiveChange?.(true);
                        }, onDragMove: (event) => {
                            event.cancelBubble = true;
                            const nextHandleCenterX = snapToGridPxWithinThreshold(event.target.x() + handleTouchTargetSize / 2, resizeSnapStepPxX, snapThresholdWorldPx);
                            const nextHandleCenterY = snapToGridPxWithinThreshold(event.target.y() + handleTouchTargetSize / 2, resizeSnapStepPxY, snapThresholdWorldPx);
                            const minSizePx = 24;
                            let nextX = x;
                            let nextY = y;
                            let nextWidth = width;
                            let nextHeight = height;
                            if (handle.key === "nw") {
                                const clampedX = Math.min(nextHandleCenterX, x + width - minSizePx);
                                const clampedY = Math.min(nextHandleCenterY, y + height - minSizePx);
                                nextX = clampedX;
                                nextY = clampedY;
                                nextWidth = x + width - clampedX;
                                nextHeight = y + height - clampedY;
                            }
                            if (handle.key === "ne") {
                                const clampedX = Math.max(nextHandleCenterX, x + minSizePx);
                                const clampedY = Math.min(nextHandleCenterY, y + height - minSizePx);
                                nextY = clampedY;
                                nextWidth = clampedX - x;
                                nextHeight = y + height - clampedY;
                            }
                            if (handle.key === "sw") {
                                const clampedX = Math.min(nextHandleCenterX, x + width - minSizePx);
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
                        }, onDragEnd: (event) => {
                            onShapeHandleActiveChange?.(false);
                            event.target.position({
                                x: handle.x - handleTouchTargetSize / 2,
                                y: handle.y - handleTouchTargetSize / 2,
                            });
                        } }), _jsx(Rect, { x: handle.x - handleSize / 2, y: handle.y - handleSize / 2, width: handleSize, height: handleSize, fill: "#ffffff", stroke: "#0ea5e9", strokeWidth: 2, cornerRadius: 4, listening: false })] }, handle.key)))] }));
}
const GridLayer = memo(function GridLayer({ stageWidth, stageHeight, viewportScale, viewportOffsetX, viewportOffsetY, gridStepPxX, gridStepPxY, }) {
    const worldLeft = (0 - viewportOffsetX) / viewportScale;
    const worldRight = (stageWidth - viewportOffsetX) / viewportScale;
    const worldTop = (0 - viewportOffsetY) / viewportScale;
    const worldBottom = (stageHeight - viewportOffsetY) / viewportScale;
    return (_jsx(Layer, { listening: false, children: _jsx(Shape, { width: stageWidth, height: stageHeight, sceneFunc: (ctx) => {
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
            } }) }));
});
function FloorBoundaryShape({ vertices, isEditMode, isPreview, scale, onDraftChange, onHandleActiveChange, gridStepPxX, gridStepPxY, renderHandles, }) {
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
    const resizeSnapStepPxX = resolveAdaptiveSnapStepPx(gridStepPxX, shapeReferenceSizePx);
    const resizeSnapStepPxY = resolveAdaptiveSnapStepPx(gridStepPxY, shapeReferenceSizePx);
    const snapThresholdScreenPx = 12;
    const snapThresholdWorldPx = snapThresholdScreenPx / scale;
    const stroke = isEditMode ? "#e2e8f0" : isPreview ? "#64748b" : "#94a3b8";
    const opacity = isEditMode ? 0.7 : isPreview ? 0.2 : 0.4;
    const commitRect = (nextX, nextY, nextWidth, nextHeight) => {
        onDraftChange?.([
            { xPx: nextX, yPx: nextY },
            { xPx: nextX + nextWidth, yPx: nextY },
            { xPx: nextX + nextWidth, yPx: nextY + nextHeight },
            { xPx: nextX, yPx: nextY + nextHeight },
        ]);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Rect, { x: x, y: y, width: width, height: height, stroke: stroke, opacity: opacity, dash: [8, 6], fill: "transparent", strokeWidth: 2 / scale, listening: false }), isEditMode && renderHandles
                ? [
                    { key: "nw", x, y },
                    { key: "ne", x: x + width, y },
                    { key: "sw", x, y: y + height },
                    { key: "se", x: x + width, y: y + height },
                ].map((handle) => (_jsxs(Group, { children: [_jsx(Rect, { x: handle.x - handleTouchTargetSize / 2, y: handle.y - handleTouchTargetSize / 2, width: handleTouchTargetSize, height: handleTouchTargetSize, fill: "rgba(255,255,255,0.001)", draggable: true, onTouchStart: (event) => {
                                event.cancelBubble = true;
                                onHandleActiveChange?.(true);
                            }, onTouchMove: (event) => {
                                event.cancelBubble = true;
                            }, onTouchEnd: (event) => {
                                event.cancelBubble = true;
                                onHandleActiveChange?.(false);
                            }, onDragStart: () => onHandleActiveChange?.(true), onDragMove: (event) => {
                                event.cancelBubble = true;
                                const snappedX = snapToGridPxWithinThreshold(event.target.x() + handleTouchTargetSize / 2, resizeSnapStepPxX, snapThresholdWorldPx);
                                const snappedY = snapToGridPxWithinThreshold(event.target.y() + handleTouchTargetSize / 2, resizeSnapStepPxY, snapThresholdWorldPx);
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
                            }, onDragEnd: (event) => {
                                onHandleActiveChange?.(false);
                                event.target.position({
                                    x: handle.x - handleTouchTargetSize / 2,
                                    y: handle.y - handleTouchTargetSize / 2,
                                });
                                commitRect(localVertices[0].xPx, localVertices[0].yPx, localVertices[1].xPx - localVertices[0].xPx, localVertices[3].yPx - localVertices[0].yPx);
                            } }), _jsx(Rect, { x: handle.x - handleSize / 2, y: handle.y - handleSize / 2, width: handleSize, height: handleSize, fill: "#ffffff", stroke: "#0ea5e9", strokeWidth: 2, cornerRadius: 4, listening: false })] }, handle.key)))
                : null] }));
}
