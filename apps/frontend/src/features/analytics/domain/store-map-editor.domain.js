import { buildDefaultFloorBoundaryVertices, buildFloorMapViewportTransform, pct, pxToPercent, } from "./floor-map.domain";
export { buildDefaultFloorBoundaryVertices, pct, pxToPercent };
export function formatShapeMetric(valuePct, axisCm) {
    if (!axisCm || axisCm <= 0) {
        return valuePct;
    }
    return (valuePct / 100) * axisCm;
}
export function areFloorBoundaryVerticesEqual(left, right) {
    if (left === right) {
        return true;
    }
    if (!left || !right || left.length !== right.length) {
        return false;
    }
    return left.every((vertex, index) => vertex.xCm === right[index]?.xCm && vertex.yCm === right[index]?.yCm);
}
export function hasShapeDraftChanges(selectedZone, shapeDraft) {
    if (!selectedZone || !shapeDraft) {
        return false;
    }
    return (selectedZone.xPct !== shapeDraft.xPct ||
        selectedZone.yPct !== shapeDraft.yPct ||
        selectedZone.widthPct !== shapeDraft.widthPct ||
        selectedZone.heightPct !== shapeDraft.heightPct);
}
function normalizeZoneRect(zone) {
    const x = Math.max(0, Math.min(100, zone.xPct));
    const y = Math.max(0, Math.min(100, zone.yPct));
    const width = Math.max(0, Math.min(100 - x, zone.widthPct));
    const height = Math.max(0, Math.min(100 - y, zone.heightPct));
    return {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
    };
}
export function doZonesOverlap(left, right) {
    const a = normalizeZoneRect(left);
    const b = normalizeZoneRect(right);
    return (a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top);
}
export function hasZoneOverlap(candidate, zones, ignoreZoneId) {
    return zones.some((zone) => {
        if (zone.id === ignoreZoneId || zone.id === candidate.id) {
            return false;
        }
        return doZonesOverlap(candidate, zone);
    });
}
export function clampZoneShapeToBounds(zone) {
    const widthPct = Math.max(0, Math.min(100, zone.widthPct));
    const heightPct = Math.max(0, Math.min(100, zone.heightPct));
    const xPct = Math.max(0, Math.min(100 - widthPct, zone.xPct));
    const yPct = Math.max(0, Math.min(100 - heightPct, zone.yPct));
    return {
        ...zone,
        xPct,
        yPct,
        widthPct,
        heightPct,
    };
}
export function findNonOverlappingDraftZone(draftZone, zones) {
    const boundedDraft = clampZoneShapeToBounds(draftZone);
    if (!hasZoneOverlap(boundedDraft, zones, boundedDraft.id)) {
        return boundedDraft;
    }
    const maxXPct = Math.max(0, 100 - boundedDraft.widthPct);
    const maxYPct = Math.max(0, 100 - boundedDraft.heightPct);
    const stepPct = 2;
    for (let yPct = 0; yPct <= maxYPct; yPct += stepPct) {
        for (let xPct = 0; xPct <= maxXPct; xPct += stepPct) {
            const candidate = {
                ...boundedDraft,
                xPct,
                yPct,
            };
            if (!hasZoneOverlap(candidate, zones, boundedDraft.id)) {
                return candidate;
            }
        }
    }
    return boundedDraft;
}
export function resolveCollisionAwareDraft(currentDraft, nextDraft, zones) {
    const boundedNextDraft = clampZoneShapeToBounds(nextDraft);
    if (!hasZoneOverlap(boundedNextDraft, zones, boundedNextDraft.id)) {
        return boundedNextDraft;
    }
    if (!currentDraft) {
        return null;
    }
    const boundedCurrentDraft = clampZoneShapeToBounds(currentDraft);
    const horizontalDelta = Math.abs(boundedNextDraft.xPct - boundedCurrentDraft.xPct) +
        Math.abs(boundedNextDraft.widthPct - boundedCurrentDraft.widthPct);
    const verticalDelta = Math.abs(boundedNextDraft.yPct - boundedCurrentDraft.yPct) +
        Math.abs(boundedNextDraft.heightPct - boundedCurrentDraft.heightPct);
    const horizontalCandidate = clampZoneShapeToBounds({
        ...boundedNextDraft,
        yPct: boundedCurrentDraft.yPct,
        heightPct: boundedCurrentDraft.heightPct,
    });
    const verticalCandidate = clampZoneShapeToBounds({
        ...boundedNextDraft,
        xPct: boundedCurrentDraft.xPct,
        widthPct: boundedCurrentDraft.widthPct,
    });
    const preferredCandidates = verticalDelta >= horizontalDelta
        ? [verticalCandidate, horizontalCandidate]
        : [horizontalCandidate, verticalCandidate];
    for (const candidate of preferredCandidates) {
        if (!hasZoneOverlap(candidate, zones, candidate.id)) {
            return candidate;
        }
    }
    return boundedCurrentDraft;
}
export function findNearestNonOverlappingZoneShape(candidate, zones) {
    const boundedCandidate = clampZoneShapeToBounds(candidate);
    if (!hasZoneOverlap(boundedCandidate, zones, boundedCandidate.id)) {
        return boundedCandidate;
    }
    const overlappedZones = zones.filter((zone) => {
        if (zone.id === boundedCandidate.id) {
            return false;
        }
        return doZonesOverlap(boundedCandidate, zone);
    });
    const candidateRect = normalizeZoneRect(boundedCandidate);
    const boundaryAlignedCandidates = new Map();
    const pushBoundaryCandidate = (nextCandidate) => {
        const boundedNextCandidate = clampZoneShapeToBounds(nextCandidate);
        const key = [
            boundedNextCandidate.xPct.toFixed(3),
            boundedNextCandidate.yPct.toFixed(3),
        ].join(":");
        if (!boundaryAlignedCandidates.has(key)) {
            boundaryAlignedCandidates.set(key, boundedNextCandidate);
        }
    };
    const xAlignedPositions = [];
    const yAlignedPositions = [];
    for (const zone of overlappedZones) {
        const zoneRect = normalizeZoneRect(zone);
        const leftAlignedXPct = zoneRect.left - boundedCandidate.widthPct;
        const rightAlignedXPct = zoneRect.right;
        const topAlignedYPct = zoneRect.top - boundedCandidate.heightPct;
        const bottomAlignedYPct = zoneRect.bottom;
        xAlignedPositions.push(leftAlignedXPct, rightAlignedXPct);
        yAlignedPositions.push(topAlignedYPct, bottomAlignedYPct);
        pushBoundaryCandidate({
            ...boundedCandidate,
            xPct: leftAlignedXPct,
            yPct: boundedCandidate.yPct,
        });
        pushBoundaryCandidate({
            ...boundedCandidate,
            xPct: rightAlignedXPct,
            yPct: boundedCandidate.yPct,
        });
        pushBoundaryCandidate({
            ...boundedCandidate,
            xPct: boundedCandidate.xPct,
            yPct: topAlignedYPct,
        });
        pushBoundaryCandidate({
            ...boundedCandidate,
            xPct: boundedCandidate.xPct,
            yPct: bottomAlignedYPct,
        });
    }
    for (const xPct of xAlignedPositions) {
        for (const yPct of yAlignedPositions) {
            pushBoundaryCandidate({
                ...boundedCandidate,
                xPct,
                yPct,
            });
        }
    }
    const nearestBoundaryCandidate = Array.from(boundaryAlignedCandidates.values())
        .filter((nextCandidate) => !hasZoneOverlap(nextCandidate, zones, boundedCandidate.id))
        .sort((left, right) => {
        const leftRect = normalizeZoneRect(left);
        const rightRect = normalizeZoneRect(right);
        const leftDistance = Math.hypot(leftRect.left - candidateRect.left, leftRect.top - candidateRect.top);
        const rightDistance = Math.hypot(rightRect.left - candidateRect.left, rightRect.top - candidateRect.top);
        return leftDistance - rightDistance;
    })[0];
    if (nearestBoundaryCandidate) {
        return nearestBoundaryCandidate;
    }
    const stepPct = 1;
    const maxXPct = Math.max(0, 100 - boundedCandidate.widthPct);
    const maxYPct = Math.max(0, 100 - boundedCandidate.heightPct);
    for (let radius = stepPct; radius <= 100; radius += stepPct) {
        for (let deltaYPct = -radius; deltaYPct <= radius; deltaYPct += stepPct) {
            const remainingRadius = radius - Math.abs(deltaYPct);
            const deltaXs = remainingRadius === 0
                ? [0]
                : [-remainingRadius, remainingRadius];
            for (const deltaXPct of deltaXs) {
                const nextXPct = Math.max(0, Math.min(maxXPct, boundedCandidate.xPct + deltaXPct));
                const nextYPct = Math.max(0, Math.min(maxYPct, boundedCandidate.yPct + deltaYPct));
                const nextCandidate = {
                    ...boundedCandidate,
                    xPct: nextXPct,
                    yPct: nextYPct,
                };
                if (!hasZoneOverlap(nextCandidate, zones, boundedCandidate.id)) {
                    return nextCandidate;
                }
            }
        }
    }
    return null;
}
export function hasUnsavedEditorChanges(params) {
    return (params.hasPendingShapeChanges ||
        params.hasPendingBoundaryChanges ||
        params.isDraftZone);
}
export function buildCenteredDraftZone(params) {
    const defaultWidthPct = 18;
    const defaultHeightPct = 18;
    const centerWorldX = (params.stageWidth / 2 - params.offsetX) / params.scale;
    const centerWorldY = (params.stageHeight / 2 - params.offsetY) / params.scale;
    const zoneWidthPx = pct(defaultWidthPct, params.stageWidth);
    const zoneHeightPx = pct(defaultHeightPct, params.stageHeight);
    const centerXPct = pxToPercent(centerWorldX - zoneWidthPx / 2, params.stageWidth);
    const centerYPct = pxToPercent(centerWorldY - zoneHeightPx / 2, params.stageHeight);
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
export function buildEditorViewportTransform(params) {
    return buildFloorMapViewportTransform(params);
}
