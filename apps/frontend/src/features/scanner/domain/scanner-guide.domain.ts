export const SCANNER_GUIDE_OFFSET_TOP_PX = -100;
export const SCANNER_GUIDE_VIEWPORT_SIZE_RATIO = 0.62;
export const SCANNER_GUIDE_MIN_SIZE_PX = 220;
export const SCANNER_GUIDE_MAX_SIZE_PX = 420;
export const SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX = 28;

interface ScannerGuideRectInput {
  viewportWidth: number;
  viewportHeight: number;
  paddingPx?: number;
}

export interface ScannerGuideRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getScannerGuideRect({
  viewportWidth,
  viewportHeight,
  paddingPx = 0,
}: ScannerGuideRectInput): ScannerGuideRect {
  const shortestEdge = Math.min(viewportWidth, viewportHeight);
  const guideBaseSize = clamp(
    shortestEdge * SCANNER_GUIDE_VIEWPORT_SIZE_RATIO,
    SCANNER_GUIDE_MIN_SIZE_PX,
    SCANNER_GUIDE_MAX_SIZE_PX,
  );
  const guideSize = Math.max(0, guideBaseSize + paddingPx * 2);

  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2 + SCANNER_GUIDE_OFFSET_TOP_PX;

  const left = centerX - guideSize / 2;
  const top = centerY - guideSize / 2;

  return {
    left,
    top,
    right: left + guideSize,
    bottom: top + guideSize,
  };
}
