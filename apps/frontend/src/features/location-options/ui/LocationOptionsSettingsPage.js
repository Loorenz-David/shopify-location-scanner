import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { locationOptionsSettingsActions } from "../actions/location-options-settings.actions";
import { filterLocationOptions } from "../domain/location-options.domain";
import { useLocationOptionsSettingsFlow } from "../flows/use-location-options-settings.flow";
import { useLocationOptionsSettingsStore } from "../stores/location-options-settings.store";
import { BackArrowIcon, BoldArrowIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
export function LocationOptionsSettingsPage() {
    useLocationOptionsSettingsFlow();
    const options = useLocationOptionsSettingsStore((state) => state.options);
    const query = useLocationOptionsSettingsStore((state) => state.query);
    const expandedValue = useLocationOptionsSettingsStore((state) => state.expandedValue);
    const isLoading = useLocationOptionsSettingsStore((state) => state.isLoading);
    const isSubmitting = useLocationOptionsSettingsStore((state) => state.isSubmitting);
    const errorMessage = useLocationOptionsSettingsStore((state) => state.errorMessage);
    const filteredOptions = filterLocationOptions(options, query);
    const canAddOption = query.trim().length > 0 &&
        !options.some((option) => option.value.toLowerCase() === query.trim().toLowerCase());
    return (_jsxs("section", { className: "mx-auto flex h-full min-h-full w-full max-w-[720px] flex-col gap-4 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900", children: [_jsxs("header", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center ", onClick: locationOptionsSettingsActions.backToSettings, "aria-label": "Back to settings", children: _jsx(BackArrowIcon, { className: "h-4 w-4 text-green-700", "aria-hidden": "true" }) }), _jsx(SearchBar, { wrapperClassName: "h-11 flex-1 rounded-xl px-3", value: query, onChange: (event) => locationOptionsSettingsActions.setQuery(event.target.value), placeholder: "Search options", "aria-label": "Search location options" })] }), errorMessage ? (_jsx("div", { className: "rounded-xl bg-rose-100 px-3 py-2 mt-4 text-sm font-semibold text-rose-900 border border-rose-300", children: errorMessage })) : null, isLoading ? (_jsx("div", { className: "h-40 animate-pulse rounded-2xl border border-slate-900/10 bg-white/70" })) : (_jsxs("div", { className: "flex flex-col gap-2", children: [filteredOptions.map((option) => {
                        const isExpanded = expandedValue === option.value;
                        return (_jsxs("article", { className: "rounded-xl border border-slate-900/10 bg-white/85 shadow-[0_10px_22px_rgba(15,23,42,0.06)]", children: [_jsxs("button", { type: "button", className: "flex h-12 w-full items-center justify-between px-3 text-left", onClick: () => locationOptionsSettingsActions.toggleExpanded(option.value), children: [_jsx("span", { className: "text-sm font-semibold text-slate-900", children: option.label }), _jsx("span", { className: `inline-flex h-7 w-7 items-center justify-center rounded-full  text-slate-900 transition-transform ${isExpanded ? "rotate-90" : "-rotate-90"}`, "aria-hidden": "true", children: _jsx(BoldArrowIcon, { className: "h-4 w-4" }) })] }), isExpanded ? (_jsxs("div", { className: "flex items-center justify-between border-t border-slate-900/10 px-3 py-3", children: [_jsx("span", { className: "text-sm text-slate-600", children: option.value }), _jsx("button", { type: "button", className: "rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70", onClick: () => void locationOptionsSettingsActions.removeOption(option.value), disabled: isSubmitting, children: "Remove" })] })) : null] }, option.value));
                    }), filteredOptions.length === 0 && canAddOption ? (_jsxs("button", { type: "button", className: "flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-100 text-sm font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-70", onClick: () => void locationOptionsSettingsActions.addOption(), disabled: isSubmitting, children: [_jsx("span", { className: "text-lg leading-none", "aria-hidden": "true", children: "+" }), "Add option"] })) : null] }))] }));
}
