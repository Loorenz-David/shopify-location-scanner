import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useScannerLogisticPlacementStore } from "../stores/scanner-logistic-placement.store";
import { logisticTasksActions } from "../../logistic-tasks/actions/logistic-tasks.actions";
export function PlacementItemFixedPopup() {
    const scanHistoryId = useScannerLogisticPlacementStore((s) => s.scanHistoryId);
    if (!scanHistoryId)
        return null;
    const handleYes = async () => {
        await logisticTasksActions.markItemFixed(scanHistoryId);
        await logisticTasksActions.confirmPendingPlacement();
    };
    const handleNo = async () => {
        await logisticTasksActions.confirmPendingPlacement();
    };
    return (_jsxs("div", { className: "flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("p", { className: "text-base font-bold text-slate-900", children: "Has this item been fixed?" }), _jsx("p", { className: "text-sm text-slate-500", children: "This item was marked as requiring a fix. Let us know before placing it." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("button", { type: "button", className: "w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:bg-emerald-700", onClick: () => void handleYes(), children: "Yes \u2014 Mark as Fixed & Place" }), _jsx("button", { type: "button", className: "w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200", onClick: () => void handleNo(), children: "No \u2014 Place Without Fixing" })] })] }));
}
