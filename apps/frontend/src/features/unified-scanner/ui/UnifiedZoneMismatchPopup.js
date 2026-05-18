import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LOGISTIC_ZONE_TYPE_LABELS } from "../../logistic-locations/domain/logistic-locations.domain";
import { LOGISTIC_INTENTION_LABELS } from "../../logistic-tasks/domain/logistic-tasks.domain";
import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
export function UnifiedZoneMismatchPopup() {
    const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
    const pendingLocation = useUnifiedScannerStore((state) => state.pendingLocation);
    if (!selectedItem || !pendingLocation || pendingLocation.mode !== "logistic") {
        return null;
    }
    const intentionLabel = selectedItem.intention
        ? LOGISTIC_INTENTION_LABELS[selectedItem.intention]
        : "Unknown intention";
    const zoneLabel = LOGISTIC_ZONE_TYPE_LABELS[pendingLocation.zoneType];
    const handleConfirm = (event) => {
        event.preventDefault();
        event.stopPropagation();
        unifiedScannerActions.confirmZoneMismatch();
    };
    const handleCancel = (event) => {
        event.preventDefault();
        event.stopPropagation();
        unifiedScannerActions.cancelPlacement();
    };
    return (_jsxs("div", { className: "flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("p", { className: "text-base font-bold text-slate-900", children: "Wrong zone?" }), _jsxs("p", { className: "text-sm text-slate-600", children: ["This item is marked as", " ", _jsx("span", { className: "font-semibold text-slate-800", children: intentionLabel }), " ", "but you scanned a", " ", _jsx("span", { className: "font-semibold text-slate-800", children: zoneLabel }), " ", "location."] }), _jsx("p", { className: "text-sm text-slate-500", children: "Do you want to place it here anyway?" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("button", { type: "button", className: "w-full touch-manipulation rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:bg-slate-800", onClick: handleConfirm, children: "Confirm \u2014 Place Here" }), _jsx("button", { type: "button", className: "w-full touch-manipulation rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200", onClick: handleCancel, children: "Cancel" })] })] }));
}
