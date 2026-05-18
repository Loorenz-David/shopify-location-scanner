import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QRcodeIcon, RetryIcon } from "../../../assets/icons";
import { ItemImagePreviewButton } from "../../item-scan-history/ui/ItemImagePreviewButton";
import { ItemQuantityPill, resolveItemQuantityPillProps, } from "../../item-scan-history/ui/ItemQuantityPill";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { FrozenFrameCanvas } from "./FrozenFrameCanvas";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";
export function UnifiedLocationScanPage({ onManualInput, }) {
    const { locationFrozenFrame, locationDecodedText, locationMode, selectedLocation, phase, selectedItem, itemDecodedText, isLookingUpItem, canScanNext, flashEnabled, availableLenses, selectedLensId, lastPlacementError, locationWarningBanner, onBack, onToggleFlash, onSelectLens, onClearLocationScan, onScanNext, onDismissLocationWarning, onDismissPlacementError, onClearItemScan, } = useUnifiedScannerPageContext();
    const quantityPillProps = selectedItem
        ? resolveItemQuantityPillProps({
            quantity: selectedItem.quantity,
            itemCategory: selectedItem.itemCategory,
            properties: selectedItem.properties,
        })
        : null;
    const canChangeLocation = Boolean(selectedLocation);
    const isPlacementPending = phase === "placing";
    const selectedLocationLabel = selectedLocation
        ? selectedLocation.mode === "shop"
            ? selectedLocation.label
            : selectedLocation.location
        : null;
    return (_jsxs("section", { className: "relative h-full w-1/2 shrink-0 basis-1/2 overflow-hidden", "aria-label": "Unified location scanner", children: [locationFrozenFrame ? (_jsx(FrozenFrameCanvas, { dataUrl: locationFrozenFrame.dataUrl, width: locationFrozenFrame.width, height: locationFrozenFrame.height })) : null, _jsx(ScannerGuideOverlay, { isFrozen: Boolean(locationFrozenFrame) }), selectedItem || isLookingUpItem ? (_jsx("div", { className: "absolute left-1/2 z-30 w-[min(88vw,440px)] -translate-x-1/2", style: {
                    bottom: "max(10.5rem, calc(env(safe-area-inset-bottom) + 9rem))",
                }, children: _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-slate-950 px-3 py-2 text-slate-100 ring-1 ring-white/15", children: [selectedItem ? (_jsx(ItemImagePreviewButton, { imageUrls: selectedItem.imageUrls ?? selectedItem.imageUrl, title: selectedItem.title ?? selectedItem.sku, buttonClassName: "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-800 transition-opacity hover:opacity-80 active:opacity-70", placeholderClassName: "rounded-2xl bg-slate-800", overlay: quantityPillProps ? (_jsx(ItemQuantityPill, { ...quantityPillProps, className: "absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/85 px-2 py-1 text-white shadow-sm backdrop-blur" })) : null })) : isLookingUpItem ? (_jsx("div", { className: "grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-800", children: _jsx("span", { className: "h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent", "aria-hidden": "true" }) })) : null, _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "flex min-w-0 items-center gap-2", children: _jsx("p", { className: "m-0 truncate text-sm font-semibold", children: selectedItem?.sku ?? itemDecodedText ?? "Looking up item..." }) }), _jsx("p", { className: "m-0 truncate text-xs text-slate-300", children: selectedLocationLabel ??
                                                selectedItem?.currentPosition ??
                                                (isLookingUpItem ? "Searching..." : "") })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [canChangeLocation ? (_jsxs("button", { type: "button", className: "flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-800 text-slate-100 ring-1 ring-white/15 transition active:bg-slate-700", onClick: onClearLocationScan, "aria-label": "Scan a different location", title: "Scan a different location", children: [_jsx(QRcodeIcon, { className: "h-4 w-4", "aria-hidden": "true" }), _jsx("span", { className: "text-[10px] font-semibold leading-none", children: "Location" })] })) : null, _jsxs("button", { type: "button", className: "flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-800 text-slate-100 ring-1 ring-white/15 transition active:bg-slate-700", onClick: onClearItemScan, "aria-label": "Scan a different item", title: "Scan a different item", children: [_jsx(RetryIcon, { className: "h-4 w-4", "aria-hidden": "true" }), _jsx("span", { className: "text-[10px] font-semibold leading-none", children: "Item" })] })] })] }), locationMode === "shop" && selectedLocation ? (_jsx("button", { type: "button", className: `w-full rounded-lg px-3 py-3 text-md font-bold ${canScanNext
                                ? "bg-sky-500/90 text-sky-50"
                                : "bg-slate-800 text-slate-300"}`, onClick: onScanNext, disabled: !canScanNext, children: isPlacementPending ? "Saving..." : "Next scan" })) : null] }) })) : null, locationDecodedText && !canScanNext && !selectedLocation ? (_jsx(DecodedTextPanel, { value: locationDecodedText, onClear: onClearLocationScan })) : null, locationWarningBanner ? (_jsxs("div", { className: "absolute left-4 right-4 z-30 rounded-xl bg-amber-500/95 px-4 py-3 text-sm text-slate-950 shadow", style: {
                    bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))",
                }, children: [_jsx("p", { className: "m-0 font-medium", children: locationWarningBanner }), _jsx("button", { type: "button", className: "mt-2 text-xs font-semibold underline", onClick: onDismissLocationWarning, children: "Dismiss" })] })) : null, lastPlacementError ? (_jsxs("div", { className: "absolute left-4 right-4 z-30 rounded-xl bg-rose-700/90 px-4 py-3 text-sm text-white shadow", style: {
                    top: "max(5rem, calc(env(safe-area-inset-top) + 4rem))",
                }, children: [_jsx("p", { className: "m-0", children: lastPlacementError }), _jsx("button", { type: "button", className: "mt-2 text-xs font-semibold text-rose-100 underline", onClick: onDismissPlacementError, children: "Retry" })] })) : null, _jsx(ScannerActionsOverlay, { stepTitle: "Scan Location", flashEnabled: flashEnabled, availableLenses: availableLenses, selectedLensId: selectedLensId, onBack: onBack, onToggleFlash: onToggleFlash, onSelectLens: onSelectLens, onManualInput: onManualInput })] }));
}
