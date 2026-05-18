import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, } from "react";
import { SearchIcon } from "../../assets/icons";
export const SearchBar = forwardRef(function SearchBar({ wrapperClassName, inputClassName, endAdornment, type = "input", ...inputProps }, ref) {
    return (_jsxs("div", { className: `app-searchbar-surface flex items-center gap-2 focus-within:border-emerald-400 focus-within:bg-white/85 focus-within:ring-4 focus-within:ring-emerald-200/70 ${wrapperClassName ?? ""}`.trim(), children: [_jsx(SearchIcon, { className: "h-4 w-4 shrink-0 text-green-700/50", "aria-hidden": "true" }), _jsx("input", { ref: ref, type: type, className: `app-searchbar-input h-full w-full border-0 bg-transparent p-0 text-slate-900 outline-none ${inputClassName ?? ""}`.trim(), ...inputProps }), endAdornment ? (_jsx("span", { className: "ml-1 inline-flex shrink-0 items-center", children: endAdornment })) : null] }));
});
