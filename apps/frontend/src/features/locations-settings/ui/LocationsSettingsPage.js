import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { locationOptionsSettingsActions } from "../../location-options/actions/location-options-settings.actions";
import { logisticLocationsActions } from "../../logistic-locations/actions/logistic-locations.actions";
import { LOGISTIC_ZONE_TYPE_LABELS } from "../../logistic-locations/domain/logistic-locations.domain";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { BackArrowIcon, BoldArrowIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import { useLocationsSettingsFlow } from "../flows/use-locations-settings.flow";
import { LocationTypePicker } from "./LocationTypePicker";
const ZONE_PILL_COLORS = {
    for_delivery: "bg-teal-100 text-teal-800",
    for_pickup: "bg-amber-100 text-amber-800",
    for_fixing: "bg-rose-100 text-rose-800",
};
export function LocationsSettingsPage() {
    const [query, setQuery] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [expandedKey, setExpandedKey] = useState(null);
    const toggleExpanded = (key) => setExpandedKey((prev) => (prev === key ? null : key));
    const { combinedList, showPickerCondition, shopIsLoading, logisticIsLoading, shopIsSubmitting, logisticIsSubmitting, shopError, logisticError, } = useLocationsSettingsFlow(query);
    const isAnySubmitting = shopIsSubmitting || logisticIsSubmitting;
    const isAnyLoading = shopIsLoading || logisticIsLoading;
    const handleSelect = async (option) => {
        if (option.kind === "shop") {
            await locationOptionsSettingsActions.addOption(query);
        }
        else {
            await logisticLocationsActions.createLocation(query, option.zoneType);
        }
        setQuery("");
        setShowPicker(false);
    };
    return (_jsxs("section", { className: "mx-auto flex min-h-svh w-full max-w-[720px] flex-col gap-4 bg-white px-4 pb-32 pt-6", children: [_jsxs("header", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "grid h-9 w-9 flex-shrink-0 place-items-center", onClick: () => homeShellActions.selectNavigationPage("settings"), "aria-label": "Back to settings", children: _jsx(BackArrowIcon, { className: "h-4 w-4 text-green-700", "aria-hidden": "true" }) }), _jsx(SearchBar, { wrapperClassName: "h-11 flex-1 rounded-xl px-3", value: query, onChange: (event) => {
                            setQuery(event.target.value);
                            setShowPicker(false);
                        }, placeholder: "Search locations", "aria-label": "Search locations" })] }), shopError ? (_jsx("div", { className: "rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900", children: shopError })) : null, logisticError ? (_jsx("div", { className: "rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900", children: logisticError })) : null, isAnyLoading ? (_jsx("div", { className: "h-40 animate-pulse rounded-2xl border border-slate-900/10 bg-white/70" })) : (_jsxs("div", { className: "flex flex-col gap-2", children: [combinedList.map((item) => {
                        if (item.kind === "shop") {
                            const key = `shop-${item.value}`;
                            const isExpanded = expandedKey === key;
                            return (_jsxs("article", { className: "overflow-hidden rounded-xl border border-slate-900/10 bg-white/85 shadow-[0_10px_22px_rgba(15,23,42,0.06)]", children: [_jsxs("button", { type: "button", className: "flex h-12 w-full items-center justify-between px-3 text-left", onClick: () => toggleExpanded(key), children: [_jsx("span", { className: "text-sm font-semibold text-slate-900", children: item.label }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800", children: "Shop" }), _jsx("span", { className: `inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-900 transition-transform ${isExpanded ? "rotate-90" : "-rotate-90"}`, "aria-hidden": "true", children: _jsx(BoldArrowIcon, { className: "h-4 w-4" }) })] })] }), isExpanded ? (_jsxs("div", { className: "flex items-center justify-between border-t border-slate-900/10 px-3 py-3", children: [_jsx("span", { className: "text-sm text-slate-500", children: item.value }), _jsx("button", { type: "button", className: "rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70", onClick: () => void locationOptionsSettingsActions.removeOption(item.value), disabled: isAnySubmitting, children: "Remove" })] })) : null] }, key));
                        }
                        const key = `logistic-${item.id}`;
                        const isExpanded = expandedKey === key;
                        return (_jsxs("article", { className: "overflow-hidden rounded-xl border border-slate-900/10 bg-white/85 shadow-[0_10px_22px_rgba(15,23,42,0.06)]", children: [_jsxs("button", { type: "button", className: "flex h-12 w-full items-center justify-between px-3 text-left", onClick: () => toggleExpanded(key), children: [_jsx("span", { className: "text-sm font-semibold text-slate-900", children: item.location }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ZONE_PILL_COLORS[item.zoneType]}`, children: LOGISTIC_ZONE_TYPE_LABELS[item.zoneType] }), _jsx("span", { className: `inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-900 transition-transform ${isExpanded ? "rotate-90" : "-rotate-90"}`, "aria-hidden": "true", children: _jsx(BoldArrowIcon, { className: "h-4 w-4" }) })] })] }), isExpanded ? (_jsxs("div", { className: "flex items-center justify-between border-t border-slate-900/10 px-3 py-3", children: [_jsx("span", { className: "text-sm text-slate-500", children: LOGISTIC_ZONE_TYPE_LABELS[item.zoneType] }), _jsx("button", { type: "button", className: "rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70", onClick: () => void logisticLocationsActions.deleteLocation(item.id), disabled: isAnySubmitting, children: "Delete" })] })) : null] }, key));
                    }), showPickerCondition && !showPicker ? (_jsxs("button", { type: "button", className: "flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-100 text-sm font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-70", onClick: () => setShowPicker(true), disabled: isAnySubmitting, children: [_jsx("span", { className: "text-lg leading-none", "aria-hidden": "true", children: "+" }), "Add \u201C", query.trim(), "\u201D"] })) : null, showPicker ? (_jsx(LocationTypePicker, { onSelect: (option) => void handleSelect(option), isSubmitting: isAnySubmitting })) : null, combinedList.length === 0 &&
                        !showPickerCondition &&
                        !isAnyLoading ? (_jsx("p", { className: "py-8 text-center text-sm text-slate-400", children: "No locations yet" })) : null] }))] }));
}
