import { jsx as _jsx } from "react/jsx-runtime";
const FROZEN_FRAME_OFFSET_TOP_PX = -100;
export function FrozenFrameCanvas({ dataUrl, width, height, }) {
    const offsetCompensationPx = Math.abs(FROZEN_FRAME_OFFSET_TOP_PX);
    return (_jsx("img", { src: dataUrl, className: "absolute inset-0 z-[2] w-full object-cover", style: {
            height: `calc(100% + ${offsetCompensationPx}px)`,
            transform: `translateY(${FROZEN_FRAME_OFFSET_TOP_PX}px)`,
        }, "aria-label": "Frozen scanned frame", "data-frame-width": width, "data-frame-height": height }));
}
