const NICE_CM_STEPS = [5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
export function computeGridSpacingCm(viewportScale, stageWidthPx, floorWidthCm, targetPixelSpacing = 80) {
    const pxPerCm = stageWidthPx / floorWidthCm;
    const targetCm = targetPixelSpacing / (viewportScale * pxPerCm);
    return NICE_CM_STEPS.reduce((best, step) => Math.abs(Math.log(step / targetCm)) < Math.abs(Math.log(best / targetCm))
        ? step
        : best);
}
export function snapToGridPx(worldPx, gridStepPx) {
    if (gridStepPx <= 0) {
        return worldPx;
    }
    return Math.round(worldPx / gridStepPx) * gridStepPx;
}
export function snapToGridPxWithinThreshold(worldPx, gridStepPx, thresholdWorldPx) {
    if (gridStepPx <= 0 || thresholdWorldPx < 0) {
        return worldPx;
    }
    const snappedPx = snapToGridPx(worldPx, gridStepPx);
    return Math.abs(snappedPx - worldPx) <= thresholdWorldPx
        ? snappedPx
        : worldPx;
}
export function resolveAdaptiveSnapStepPx(gridStepPx, subjectSizePx, minStepPx = 6) {
    if (gridStepPx <= 0) {
        return gridStepPx;
    }
    const targetMaxStepPx = Math.max(minStepPx, subjectSizePx / 2);
    let nextStepPx = gridStepPx;
    while (nextStepPx / 2 >= targetMaxStepPx) {
        nextStepPx /= 2;
    }
    return nextStepPx;
}
export function gridStepPx(gridSpacingCm, stageAxisPx, floorAxisCm) {
    return gridSpacingCm * (stageAxisPx / floorAxisCm);
}
export function cmVerticesToWorldPx(vertices, stageWidth, stageHeight, floorWidthCm, floorDepthCm) {
    const scaleX = stageWidth / floorWidthCm;
    const scaleY = stageHeight / floorDepthCm;
    return vertices.map((vertex) => ({
        xPx: vertex.xCm * scaleX,
        yPx: vertex.yCm * scaleY,
    }));
}
export function worldPxToCm(xPx, yPx, stageWidth, stageHeight, floorWidthCm, floorDepthCm) {
    return {
        xCm: Math.round((xPx / stageWidth) * floorWidthCm),
        yCm: Math.round((yPx / stageHeight) * floorDepthCm),
    };
}
