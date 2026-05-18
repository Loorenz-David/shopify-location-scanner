import { jsx as _jsx } from "react/jsx-runtime";
export function ItemImagePaginationIndicator({ currentIndex, totalCount, onDotClick, }) {
    if (totalCount <= 1) {
        return null; // Don't show pagination for single image
    }
    return (_jsx("div", { className: "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-1.5 rounded-full bg-slate-950/75 px-4 py-2.5 backdrop-blur-sm", children: Array.from({ length: totalCount }).map((_, index) => {
            const isCurrent = index === currentIndex;
            return (_jsx("button", { type: "button", onClick: () => onDotClick?.(index), className: `rounded-full transition-all ${isCurrent
                    ? "h-2.5 w-2.5 bg-white"
                    : "h-1.5 w-1.5 bg-white/40 hover:bg-white/60"}`, "aria-label": `Go to image ${index + 1}`, "aria-current": isCurrent ? "true" : "false" }, index));
        }) }));
}
