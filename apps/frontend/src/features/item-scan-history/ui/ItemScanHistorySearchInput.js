import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { FilterIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
const SEARCH_INPUT_COMMIT_DELAY_MS = 350;
export function ItemScanHistorySearchInput({ value, activeFilterCount, onChange, onOpenFilters, }) {
    const [draftValue, setDraftValue] = useState(value);
    useEffect(() => {
        setDraftValue(value);
    }, [value]);
    useEffect(() => {
        if (draftValue === value) {
            return;
        }
        const timeoutId = window.setTimeout(() => {
            onChange(draftValue);
        }, SEARCH_INPUT_COMMIT_DELAY_MS);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [draftValue, onChange, value]);
    return (_jsx(SearchBar, { value: draftValue, onChange: (event) => setDraftValue(event.target.value), endAdornment: _jsxs("button", { type: "button", className: `inline-flex h-8 items-center gap-1.5 rounded-full border pl-2.5 text-xs font-semibold transition ${activeFilterCount > 0
                ? "border-sky-200 bg-sky-50 text-sky-600 pr-2.5"
                : "border-transparent bg-transparent text-slate-500"}`, onClick: onOpenFilters, "aria-label": activeFilterCount > 0
                ? `Open filters, ${activeFilterCount} active`
                : "Open filters", children: [activeFilterCount > 0 ? (_jsx("span", { className: "min-w-3 text-right", children: activeFilterCount })) : null, _jsx(FilterIcon, { className: "h-5 w-5", "aria-hidden": "true" })] }), placeholder: "Search a scan item", "aria-label": "Search item scan history" }));
}
