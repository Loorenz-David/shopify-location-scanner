import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { pwaActions } from "../actions/pwa.actions";
export function PwaUpdatePrompt({ isVisible, isApplyingUpdate, }) {
    if (!isVisible) {
        return null;
    }
    return (_jsxs("aside", { className: "fixed inset-x-0 z-[120] mx-auto w-[min(92vw,480px)] rounded-2xl border border-slate-900/15 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.18)]", style: { bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }, children: [_jsx("p", { className: "m-0 text-sm font-semibold text-slate-900", children: "A new app version is available." }), _jsx("p", { className: "m-0 mt-1 text-sm text-slate-600", children: "Keep working, then refresh when you are ready." }), _jsxs("div", { className: "mt-3 flex items-center justify-end gap-2", children: [_jsx("button", { type: "button", className: "h-11 rounded-lg border border-slate-900/20 px-4 text-sm font-semibold text-slate-700", onClick: pwaActions.dismissUpdatePrompt, disabled: isApplyingUpdate, children: "Later" }), _jsx("button", { type: "button", className: "h-11 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:opacity-60", onClick: () => pwaActions.applyUpdate(), disabled: isApplyingUpdate, children: isApplyingUpdate ? "Updating..." : "Refresh App" })] })] }));
}
