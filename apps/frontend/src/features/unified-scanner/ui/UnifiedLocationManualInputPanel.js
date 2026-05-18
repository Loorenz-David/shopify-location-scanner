import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import { filterLogisticLocations, } from "../../logistic-locations/domain/logistic-locations.domain";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { useLocationOptionsStore } from "../stores/location-options.store";
const LETTER_NUMBER_RE = /^([A-Za-z]+)(\d+)$/;
function parseLetterNumber(name) {
    const m = name.match(LETTER_NUMBER_RE);
    return m ? { letter: m[1].toUpperCase(), number: m[2] } : null;
}
function buildLetterGroups(items) {
    const map = new Map();
    const unstructured = [];
    for (const item of items) {
        const parsed = parseLetterNumber(item.label);
        if (parsed) {
            const bucket = map.get(parsed.letter) ?? [];
            bucket.push(item);
            map.set(parsed.letter, bucket);
        }
        else {
            unstructured.push(item);
        }
    }
    const groups = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, its]) => ({
        letter,
        items: its.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    }));
    return { groups, unstructured };
}
export function UnifiedLocationManualInputPanel({ onClose, onSelectValue, }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [selectedLetter, setSelectedLetter] = useState(null);
    const { locationMode } = useUnifiedScannerPageContext();
    const shopOptions = useLocationOptionsStore((state) => state.options);
    const logisticLocations = useLogisticLocationsStore((state) => state.locations);
    const shopItems = useMemo(() => shopOptions.map((opt) => ({
        key: opt.value,
        value: opt.value,
        label: opt.label,
        kind: "shop",
    })), [shopOptions]);
    const logisticItems = useMemo(() => logisticLocations.map((loc) => ({
        key: `${loc.id}-${loc.location}`,
        value: loc.location,
        label: loc.location,
        kind: "logistic",
    })), [logisticLocations]);
    const browseItems = useMemo(() => {
        if (locationMode === "shop")
            return shopItems;
        if (locationMode === "logistic")
            return logisticItems;
        return [...shopItems, ...logisticItems];
    }, [locationMode, shopItems, logisticItems]);
    const { groups, unstructured } = useMemo(() => buildLetterGroups(browseItems), [browseItems]);
    const searchResults = useMemo(() => {
        if (!query.trim())
            return [];
        const logistic = locationMode !== "shop"
            ? filterLogisticLocations(logisticLocations, query).map((loc) => ({
                key: `${loc.id}-${loc.location}`,
                value: loc.location,
                label: loc.location,
                kind: "logistic",
            }))
            : [];
        const q = query.trim().toLowerCase();
        const shop = locationMode !== "logistic"
            ? shopOptions
                .filter((opt) => opt.label.toLowerCase().includes(q) ||
                opt.value.toLowerCase().includes(q))
                .map((opt) => ({
                key: opt.value,
                value: opt.value,
                label: opt.label,
                kind: "shop",
            }))
            : [];
        return [...shop, ...logistic];
    }, [locationMode, logisticLocations, query, shopOptions]);
    const isSearching = query.trim().length > 0;
    const activeGroup = selectedLetter
        ? (groups.find((g) => g.letter === selectedLetter) ?? null)
        : null;
    return (_jsxs(motion.section, { className: "absolute inset-0 z-40 flex h-full min-h-0 flex-col bg-slate-50", initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.25, ease: "easeOut" }, "aria-label": "Manual unified location input", children: [_jsxs("header", { className: "flex items-center gap-2 border-b border-slate-900/15 px-4 py-4", children: [selectedLetter && !isSearching && (_jsxs("button", { type: "button", className: "flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-800/20 bg-white px-3 text-sm font-bold text-sky-900", onClick: () => setSelectedLetter(null), "aria-label": "Back to letter selection", children: [_jsx("span", { children: "\u2190" }), _jsx("span", { children: selectedLetter })] })), _jsx(SearchBar, { ref: inputRef, id: "unified-location-search-input", wrapperClassName: "h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3", value: query, onChange: (event) => {
                            setQuery(event.target.value);
                            setSelectedLetter(null);
                        }, placeholder: "Search location", "aria-label": "Search location" }), _jsx("button", { type: "button", className: "grid h-8 w-8 place-items-center text-sm font-bold text-slate-800", onClick: onClose, "aria-label": "Close manual location input", children: _jsx(CloseIcon, { className: "h-5 w-5 text-green-700", "aria-hidden": "true" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4", children: isSearching ? (searchResults.length === 0 ? (_jsx("p", { className: "m-0 text-sm text-slate-500", children: "No locations found." })) : (_jsx("div", { className: "grid grid-cols-4 gap-2", children: searchResults.map((item) => (_jsxs("button", { type: "button", className: "flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900", onClick: () => onSelectValue(item.value), children: [_jsx("span", { className: "text-sm font-semibold leading-tight", children: item.label }), locationMode === null && (_jsx("span", { className: "mt-0.5 text-[10px] text-slate-500", children: item.kind === "shop" ? "Shop" : "Logistic" }))] }, item.key))) }))) : activeGroup ? (_jsx("div", { className: "grid grid-cols-4 gap-2", children: activeGroup.items.map((item) => {
                        const parsed = parseLetterNumber(item.label);
                        return (_jsx("button", { type: "button", className: "flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900", onClick: () => onSelectValue(item.value), children: _jsx("span", { className: "text-xl font-bold", children: parsed ? parsed.number : item.label }) }, item.key));
                    }) })) : groups.length === 0 && unstructured.length === 0 ? (_jsx("p", { className: "m-0 text-sm text-slate-500", children: "No locations found." })) : (_jsxs("div", { className: "flex flex-col gap-4", children: [groups.length > 0 && (_jsx("div", { className: "grid grid-cols-4 gap-2", children: groups.map((group) => (_jsxs("button", { type: "button", className: "flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900", onClick: () => setSelectedLetter(group.letter), children: [_jsx("span", { className: "text-xl font-bold", children: group.letter }), _jsx("span", { className: "mt-0.5 text-[10px] text-slate-500", children: group.items.length })] }, `letter-${group.letter}`))) })), unstructured.length > 0 && (_jsx("div", { className: "grid grid-cols-4 gap-2", children: unstructured.map((item) => (_jsxs("button", { type: "button", className: "flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900", onClick: () => onSelectValue(item.value), children: [_jsx("span", { className: "text-sm font-semibold leading-tight", children: item.label }), locationMode === null && (_jsx("span", { className: "mt-0.5 text-[10px] text-slate-500", children: item.kind === "shop" ? "Shop" : "Logistic" }))] }, item.key))) }))] })) })] }));
}
