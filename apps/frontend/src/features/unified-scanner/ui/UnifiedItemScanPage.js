import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { FrozenFrameCanvas } from "./FrozenFrameCanvas";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";
export function UnifiedItemScanPage({ onManualInput, }) {
    const { itemFrozenFrame, itemDecodedText, phase, selectedItem, onScanAsk, isLookingUpItem, itemLookupError, flashEnabled, availableLenses, selectedLensId, onBack, onToggleFlash, onSelectLens, onClearItemScan, onGoToLocationStep, onDismissItemError, } = useUnifiedScannerPageContext();
    return (_jsxs("section", { className: "relative h-full w-1/2 shrink-0 basis-1/2 overflow-hidden", "aria-label": "Unified item scanner", children: [itemFrozenFrame ? (_jsx(FrozenFrameCanvas, { dataUrl: itemFrozenFrame.dataUrl, width: itemFrozenFrame.width, height: itemFrozenFrame.height })) : null, _jsx(ScannerGuideOverlay, { isFrozen: Boolean(itemFrozenFrame) }), itemDecodedText ? (_jsx(DecodedTextPanel, { value: itemDecodedText, onClear: selectedItem ? undefined : onClearItemScan, secondaryActionLabel: onScanAsk && phase === "item-confirmed" && selectedItem
                    ? "Continue"
                    : undefined, onSecondaryAction: onScanAsk && phase === "item-confirmed" && selectedItem
                    ? onGoToLocationStep
                    : undefined })) : null, isLookingUpItem ? (_jsx("div", { className: "absolute inset-0 z-30 grid place-items-center bg-slate-950/55 text-sm font-semibold text-slate-100", children: "Looking up item..." })) : null, itemLookupError ? (_jsxs("div", { className: "absolute left-4 right-4 z-30 rounded-xl bg-rose-700/90 px-4 py-3 text-sm text-white shadow", style: {
                    bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))",
                }, children: [_jsx("p", { className: "m-0", children: itemLookupError }), _jsx("button", { type: "button", className: "mt-2 text-xs font-semibold text-rose-100 underline", onClick: onDismissItemError, children: "Dismiss" })] })) : null, _jsx(ScannerActionsOverlay, { stepTitle: "Scan Item", flashEnabled: flashEnabled, availableLenses: availableLenses, selectedLensId: selectedLensId, onBack: onBack, onToggleFlash: onToggleFlash, onSelectLens: onSelectLens, onManualInput: onManualInput })] }));
}
