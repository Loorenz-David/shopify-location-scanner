import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { CAMERA_REGION_IDS } from "../domain/camera-session.manager";
import { UnifiedItemScanPage } from "./UnifiedItemScanPage";
import { UnifiedItemManualInputPanel } from "./UnifiedItemManualInputPanel";
import { UnifiedLocationManualInputPanel } from "./UnifiedLocationManualInputPanel";
import { UnifiedLocationScanPage } from "./UnifiedLocationScanPage";
export function UnifiedScannerPage() {
    const { scannerStep, selectedItem, isCameraReady, cameraError, onSetDecodePaused, } = useUnifiedScannerPageContext();
    const [manualInputMode, setManualInputMode] = useState(null);
    const [showPreviewStarting, setShowPreviewStarting] = useState(false);
    const previewMessageDelayMs = scannerStep === "location" && selectedItem ? 1500 : 500;
    useEffect(() => {
        if (isCameraReady || cameraError) {
            setShowPreviewStarting(false);
            return;
        }
        const timeoutId = window.setTimeout(() => {
            setShowPreviewStarting(true);
        }, previewMessageDelayMs);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [cameraError, isCameraReady, previewMessageDelayMs]);
    useEffect(() => {
        onSetDecodePaused(manualInputMode !== null);
        return () => {
            onSetDecodePaused(false);
        };
    }, [manualInputMode, onSetDecodePaused]);
    return (_jsxs("section", { className: "relative h-svh w-full overflow-hidden", "aria-label": "Unified scanner", children: [_jsx("div", { id: CAMERA_REGION_IDS["unified-scanner"], className: "absolute inset-0 z-0 pointer-events-none" }), _jsx("div", { className: "absolute inset-0 z-20 overflow-hidden", children: _jsxs(motion.div, { className: "flex h-full w-[200%]", initial: { x: scannerStep === "location" ? "-50%" : "0%" }, animate: { x: scannerStep === "location" ? "-50%" : "0%" }, transition: {
                        type: "spring",
                        stiffness: 320,
                        damping: 34,
                        mass: 0.9,
                    }, children: [_jsx(UnifiedItemScanPage, { onManualInput: () => setManualInputMode("item") }), _jsx(UnifiedLocationScanPage, { onManualInput: () => setManualInputMode("location") })] }) }), showPreviewStarting ? (_jsx("div", { className: "pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2", children: _jsx("div", { className: "mx-auto max-w-sm rounded-2xl bg-slate-950/85 px-5 py-4 text-center text-sm font-semibold text-slate-100 shadow-xl ring-1 ring-white/10", children: "Starting preview..." }) })) : null, cameraError ? (_jsx("div", { className: "pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2 text-center text-sm font-semibold text-rose-100", children: cameraError })) : null, _jsxs(AnimatePresence, { children: [manualInputMode === "item" ? (_jsx(UnifiedItemManualInputPanel, { onClose: () => setManualInputMode(null), onSelect: (item) => {
                            setManualInputMode(null);
                            unifiedScannerActions.applyItem(item, {
                                transition: "immediate",
                            });
                        } })) : null, manualInputMode === "location" ? (_jsx(UnifiedLocationManualInputPanel, { onClose: () => setManualInputMode(null), onSelectValue: (value) => {
                            setManualInputMode(null);
                            unifiedScannerActions.applyLocationByValue(value);
                        } })) : null] })] }));
}
