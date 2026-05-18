import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { BackArrowIcon } from "../../../../assets/icons";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
const PRESETS = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
];
function toIsoDate(value) {
    return value.toISOString().slice(0, 10);
}
function buildPresetRange(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return {
        from: toIsoDate(from),
        to: toIsoDate(to),
    };
}
function buildTodayRange() {
    const today = toIsoDate(new Date());
    return {
        from: today,
        to: today,
    };
}
export function DateRangePicker({ value, onChange }) {
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [draftRange, setDraftRange] = useState(value);
    useEffect(() => {
        setDraftRange(value);
    }, [value]);
    const applyPreset = (days) => {
        onChange(buildPresetRange(days));
    };
    const resolvePresetActiveState = (days) => {
        const expectedRange = buildPresetRange(days);
        return (value.from === expectedRange.from && value.to === expectedRange.to);
    };
    const isCustomActive = useMemo(() => PRESETS.every((preset) => !resolvePresetActiveState(preset.days)), [value.from, value.to]);
    const handleSaveCustomRange = () => {
        if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
            return;
        }
        onChange(draftRange);
        setIsCustomOpen(false);
    };
    const handleClearCustomRange = () => {
        onChange(buildPresetRange(30));
        setIsCustomOpen(false);
    };
    const handleSelectToday = () => {
        setDraftRange(buildTodayRange());
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "hidden items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-2 text-xs text-slate-500 sm:flex", children: [_jsx("span", { children: value.from }), _jsx("span", { children: "to" }), _jsx("span", { children: value.to })] }), PRESETS.map((preset) => (_jsx("button", { type: "button", onClick: () => applyPreset(preset.days), className: `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${resolvePresetActiveState(preset.days)
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"}`, children: preset.label }, preset.label))), _jsx("button", { type: "button", onClick: () => setIsCustomOpen(true), className: `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isCustomActive
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"}`, children: "Custom" })] }), _jsx(SlidingOverlayContainer, { isOpen: isCustomOpen, title: "Custom Date Range", children: _jsxs("div", { className: "flex h-full flex-col", children: [_jsx("button", { type: "button", "aria-label": "Close custom date range", className: "flex-1 cursor-default", onClick: () => setIsCustomOpen(false) }), _jsxs("section", { className: "max-h-[82svh] overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]", children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-slate-900/10 px-4 py-3", children: [_jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-600", onClick: () => setIsCustomOpen(false), "aria-label": "Close custom date range", children: _jsx(BackArrowIcon, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsxs("div", { children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Analytics" }), _jsx("h2", { className: "m-0 mt-1 text-base font-bold text-slate-900", children: "Custom Date Range" })] })] }), _jsxs("div", { className: "flex flex-col gap-4 px-4 py-4", children: [_jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", className: "rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100", onClick: handleSelectToday, children: "Today" }) }), _jsxs("label", { className: "rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "From" }), _jsx("input", { type: "date", value: draftRange.from, max: draftRange.to || undefined, onChange: (event) => setDraftRange((current) => ({
                                                        ...current,
                                                        from: event.target.value,
                                                    })), className: "mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none" })] }), _jsxs("label", { className: "rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "To" }), _jsx("input", { type: "date", value: draftRange.to, min: draftRange.from || undefined, onChange: (event) => setDraftRange((current) => ({
                                                        ...current,
                                                        to: event.target.value,
                                                    })), className: "mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none" })] })] }), _jsx("footer", { className: "border-t border-slate-900/10 px-4 py-3", children: _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", className: "flex-1 rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700", onClick: handleClearCustomRange, children: "Clear" }), _jsx("button", { type: "button", className: "flex-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60", onClick: handleSaveCustomRange, disabled: !draftRange.from ||
                                                    !draftRange.to ||
                                                    draftRange.from > draftRange.to, children: "Save" })] }) })] })] }) })] }));
}
