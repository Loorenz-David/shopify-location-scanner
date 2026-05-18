import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { itemScanHistorySearchFieldOptions } from "../domain/item-scan-history-filters.domain";
import { resolveItemScanHistoryDateRangePreset, toDateRangeForPreset, } from "../domain/item-scan-history-date-range.domain";
export function ItemScanHistoryFiltersPanel({ filters, total, onChangeFilters, onResetFilters, onClose, }) {
    const isLocationFieldActive = filters.selectedFields.length === 0 ||
        filters.selectedFields.includes("location");
    const selectedDatePreset = resolveItemScanHistoryDateRangePreset(filters.from, filters.to);
    const [dateRangeMode, setDateRangeMode] = useState(selectedDatePreset);
    const handleDatePresetChange = (preset) => {
        setDateRangeMode(preset);
        if (preset === "none") {
            onChangeFilters({
                from: "",
                to: "",
            });
            return;
        }
        if (preset === "custom") {
            return;
        }
        const range = toDateRangeForPreset(preset);
        onChangeFilters(range);
    };
    const handleResetFilters = () => {
        setDateRangeMode("none");
        onResetFilters();
    };
    return (_jsxs("section", { className: "flex h-full min-h-0 flex-col bg-slate-50", "aria-label": "Scan history filters", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-slate-900/15 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-sm font-semibold text-slate-900", children: "Filters" }), _jsx("p", { className: "m-0 mt-1 text-xs text-slate-600", children: total === 1 ? "1 result" : `${total.toLocaleString()} results` })] }), _jsx("button", { type: "button", className: "rounded-lg border border-slate-900/15 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700", onClick: onClose, children: "Close" })] }), _jsx("div", { className: "flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4", children: _jsxs("div", { className: "grid grid-cols-1 gap-3", children: [_jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white p-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Search fields" }), _jsx("p", { className: "m-0 mt-1 text-xs text-slate-500", children: "Leave all unselected to search in all fields." }), _jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: itemScanHistorySearchFieldOptions.map((field) => {
                                        const selected = filters.selectedFields.includes(field);
                                        return (_jsx(ToggleChip, { label: toFieldLabel(field), checked: selected, onToggle: () => onChangeFilters({
                                                selectedFields: selected
                                                    ? filters.selectedFields.filter((value) => value !== field)
                                                    : [...filters.selectedFields, field],
                                            }) }, field));
                                    }) }), _jsxs("label", { className: `mt-3 flex items-center justify-between rounded-xl border px-3 py-2 ${isLocationFieldActive
                                        ? "border-slate-900/10 bg-slate-50"
                                        : "border-slate-900/5 bg-slate-50/60 opacity-60"}`, children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-sm font-semibold text-slate-900", children: "Include previous locations" }), _jsx("p", { className: "m-0 mt-1 text-xs text-slate-500", children: "Off means location search matches only the latest location." })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": filters.includeLocationHistory, "aria-label": "Include previous locations in search", disabled: !isLocationFieldActive, onClick: () => onChangeFilters({
                                                includeLocationHistory: !filters.includeLocationHistory,
                                            }), className: `relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${filters.includeLocationHistory
                                                ? "bg-sky-500"
                                                : "bg-slate-300"} disabled:cursor-not-allowed`, children: _jsx("span", { className: `absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${filters.includeLocationHistory ? "left-6" : "left-1"}` }) })] })] }), _jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white p-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Status" }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx(ToggleChip, { label: "Active", checked: filters.status === "active", onToggle: () => onChangeFilters({
                                                status: filters.status === "active" ? undefined : "active",
                                            }) }), _jsx(ToggleChip, { label: "Sold", checked: filters.status === "sold", onToggle: () => onChangeFilters({
                                                status: filters.status === "sold" ? undefined : "sold",
                                            }) }), _jsx(ToggleChip, { label: "Completed", checked: filters.status === "completed", onToggle: () => onChangeFilters({
                                                status: filters.status === "completed"
                                                    ? undefined
                                                    : "completed",
                                            }) })] })] }), _jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white p-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sales channel" }), _jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: CHANNEL_OPTIONS.map((channel) => (_jsx(ToggleChip, { label: channel.label, checked: channel.value === "all"
                                            ? !filters.salesChannel
                                            : filters.salesChannel === channel.value, onToggle: () => onChangeFilters({
                                            salesChannel: channel.value === "all" ? undefined : channel.value,
                                        }) }, channel.value))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white p-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Date range" }), _jsxs("label", { className: "mt-2 block", children: [_jsx("span", { className: "sr-only", children: "Date range preset" }), _jsxs("select", { value: dateRangeMode, onChange: (event) => handleDatePresetChange(event.target.value), className: "h-10 w-full rounded-xl border border-slate-900/15 bg-slate-50 px-3 text-sm text-slate-900 outline-none", children: [_jsx("option", { value: "none", children: "No date filter" }), _jsx("option", { value: "today", children: "Today" }), _jsx("option", { value: "yesterday", children: "Yesterday" }), _jsx("option", { value: "last_7_days", children: "Last 7 days" }), _jsx("option", { value: "last_1_month", children: "1 month" }), _jsx("option", { value: "custom", children: "Custom" })] })] }), dateRangeMode === "custom" ? (_jsxs("div", { className: "mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsx(DateField, { label: "From", value: filters.from, onChange: (value) => onChangeFilters({ from: value }) }), _jsx(DateField, { label: "To", value: filters.to, onChange: (value) => onChangeFilters({ to: value }) })] })) : null] })] }) }), _jsx("footer", { className: "border-t border-slate-900/10 px-4 py-3", children: _jsx("button", { type: "button", className: "w-full rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700", onClick: handleResetFilters, children: "Reset filters" }) })] }));
}
const CHANNEL_OPTIONS = [
    { value: "all", label: "All channels" },
    { value: "physical", label: "Physical" },
    { value: "webshop", label: "Webshop" },
    { value: "unknown", label: "Unknown" },
];
function ToggleChip({ label, checked, onToggle }) {
    return (_jsx("button", { type: "button", onClick: onToggle, className: `rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${checked
            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
            : "border-slate-900/15 bg-white text-slate-600"}`, children: label }));
}
function toFieldLabel(field) {
    switch (field) {
        case "sku":
            return "SKU";
        case "barcode":
            return "Barcode";
        case "location":
            return "Location";
        case "itemTitle":
            return "Item title";
        case "itemCategory":
            return "Item category";
        default:
            return field;
    }
}
function DateField({ label, value, onChange }) {
    return (_jsxs("label", { className: "rounded-xl border border-slate-900/10 bg-slate-50 px-3 py-2", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: label }), _jsx("input", { type: "date", value: value, onChange: (event) => onChange(event.target.value), className: "mt-1 h-8 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none" })] }));
}
