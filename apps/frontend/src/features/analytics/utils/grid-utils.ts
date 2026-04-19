const NICE_CM_STEPS = [5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

export function computeGridSpacingCm(
  viewportScale: number,
  stageWidthPx: number,
  floorWidthCm: number,
  targetPixelSpacing = 80,
): number {
  const pxPerCm = stageWidthPx / floorWidthCm;
  const targetCm = targetPixelSpacing / (viewportScale * pxPerCm);

  return NICE_CM_STEPS.reduce((best, step) =>
    Math.abs(Math.log(step / targetCm)) < Math.abs(Math.log(best / targetCm))
      ? step
      : best,
  );
}

export function snapToGridPx(worldPx: number, gridStepPx: number): number {
  if (gridStepPx <= 0) {
    return worldPx;
  }

  return Math.round(worldPx / gridStepPx) * gridStepPx;
}

export function snapToGridPxWithinThreshold(
  worldPx: number,
  gridStepPx: number,
  thresholdWorldPx: number,
): number {
  if (gridStepPx <= 0 || thresholdWorldPx < 0) {
    return worldPx;
  }

  const snappedPx = snapToGridPx(worldPx, gridStepPx);
  return Math.abs(snappedPx - worldPx) <= thresholdWorldPx
    ? snappedPx
    : worldPx;
}

export function resolveAdaptiveSnapStepPx(
  gridStepPx: number,
  subjectSizePx: number,
  minStepPx = 6,
): number {
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

export function gridStepPx(
  gridSpacingCm: number,
  stageAxisPx: number,
  floorAxisCm: number,
): number {
  return gridSpacingCm * (stageAxisPx / floorAxisCm);
}

export function cmVerticesToWorldPx(
  vertices: Array<{ xCm: number; yCm: number }>,
  stageWidth: number,
  stageHeight: number,
  floorWidthCm: number,
  floorDepthCm: number,
): Array<{ xPx: number; yPx: number }> {
  const scaleX = stageWidth / floorWidthCm;
  const scaleY = stageHeight / floorDepthCm;

  return vertices.map((vertex) => ({
    xPx: vertex.xCm * scaleX,
    yPx: vertex.yCm * scaleY,
  }));
}

export function worldPxToCm(
  xPx: number,
  yPx: number,
  stageWidth: number,
  stageHeight: number,
  floorWidthCm: number,
  floorDepthCm: number,
): { xCm: number; yCm: number } {
  return {
    xCm: Math.round((xPx / stageWidth) * floorWidthCm),
    yCm: Math.round((yPx / stageHeight) * floorDepthCm),
  };
}
