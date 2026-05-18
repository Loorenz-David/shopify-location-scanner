import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import { ItemImagePreviewButton } from "../../item-scan-history/ui/ItemImagePreviewButton";
import { ItemQuantityPill, resolveItemQuantityPillProps, } from "../../item-scan-history/ui/ItemQuantityPill";
import { searchUnifiedItemsApi } from "../api/search-unified-items.api";
const ITEM_SEARCH_DEBOUNCE_MS = 250;
const CHANNEL_BADGE = {
    physical: { label: "POS", color: "bg-green-100 text-green-700" },
    webshop: { label: "Webshop", color: "bg-indigo-100 text-indigo-700" },
    imported: { label: "Imported", color: "bg-amber-100 text-amber-700" },
    unknown: { label: "?", color: "bg-slate-100 text-slate-500" },
};
export function UnifiedItemManualInputPanel({ onClose, onSelect, }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const loadingPlaceholders = useMemo(() => Array.from({ length: 4 }, (_, index) => index), []);
    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        const normalizedQuery = query.trim();
        let disposed = false;
        const timeoutId = window.setTimeout(() => {
            if (!normalizedQuery) {
                setResults([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            void searchUnifiedItemsApi(normalizedQuery).then((items) => {
                if (disposed) {
                    return;
                }
                setResults(items);
                setIsLoading(false);
            });
        }, normalizedQuery ? ITEM_SEARCH_DEBOUNCE_MS : 0);
        return () => {
            disposed = true;
            window.clearTimeout(timeoutId);
        };
    }, [query]);
    return (_jsxs(motion.section, { className: "absolute inset-0 z-40 flex h-full min-h-0 flex-col bg-slate-50", initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.25, ease: "easeOut" }, "aria-label": "Manual unified item input", children: [_jsxs("header", { className: "flex items-center gap-2 border-b border-slate-900/15 px-4 py-4", children: [_jsx(SearchBar, { ref: inputRef, id: "unified-item-search-input", wrapperClassName: "h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search by SKU or barcode", "aria-label": "Search by SKU or barcode" }), _jsx("button", { type: "button", className: "grid h-8 w-8 place-items-center text-sm font-bold text-slate-800", onClick: onClose, "aria-label": "Close manual item input", children: _jsx(CloseIcon, { className: "h-5 w-5 text-green-700", "aria-hidden": "true" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4", children: isLoading ? (_jsx("ul", { className: "m-0 flex list-none flex-col gap-2 p-0", children: loadingPlaceholders.map((placeholderIndex) => (_jsx("li", { children: _jsxs("div", { className: "scanner-skeleton-surface flex w-full items-center gap-3 rounded-xl border border-slate-800/15 bg-white p-2", children: [_jsx("div", { className: "scanner-skeleton-surface h-10 w-10 rounded-lg bg-slate-200/90" }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2", children: [_jsx("div", { className: "scanner-skeleton-surface h-3 w-32 rounded bg-slate-200/90" }), _jsx("div", { className: "scanner-skeleton-surface h-3 w-48 rounded bg-slate-200/80" })] })] }) }, placeholderIndex))) })) : results.length === 0 ? (_jsx("p", { className: "m-0 text-sm text-slate-500", children: query.trim() ? "No items found." : "Search by SKU or barcode." })) : (_jsx("ul", { className: "m-0 flex list-none flex-col gap-2 p-0", children: results.map((item) => {
                        const quantityPillProps = resolveItemQuantityPillProps({
                            quantity: item.quantity,
                            itemCategory: item.itemCategory,
                            properties: item.properties,
                        });
                        return (_jsx("li", { children: _jsxs("div", { role: "button", tabIndex: 0, className: "grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 rounded-[28px] border border-slate-900/10 bg-white/85 px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md active:bg-slate-50", onClick: () => onSelect(item), onKeyDown: (event) => {
                                    if (event.key !== "Enter" && event.key !== " ") {
                                        return;
                                    }
                                    event.preventDefault();
                                    onSelect(item);
                                }, children: [_jsx(ItemImagePreviewButton, { imageUrls: item.imageUrls ?? item.imageUrl, title: item.title ?? item.sku, imageAlt: item.title ?? item.sku, buttonClassName: "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition-opacity hover:opacity-80 active:opacity-70", placeholderClassName: "flex items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500", placeholderLabel: "No image", overlay: _jsx(ItemQuantityPill, { ...quantityPillProps, className: "absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/80 px-2 py-1 text-white shadow-sm backdrop-blur" }) }), _jsxs("div", { className: "grid min-w-0 gap-y-2", children: [_jsx("div", { className: "min-w-0 self-center", children: _jsx("p", { className: "m-0 truncate text-sm font-bold text-slate-900", children: item.sku }) }), _jsxs("div", { className: "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700", children: "Latest" }), _jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [_jsx("p", { className: "m-0 truncate text-sm font-semibold text-slate-900", children: item.currentPosition ?? "No location" }), item.isSold && item.lastSoldChannel ? (_jsx("span", { className: `inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CHANNEL_BADGE[item.lastSoldChannel].color}`, children: CHANNEL_BADGE[item.lastSoldChannel].label })) : null] })] })] })] }) }, `${item.id || item.itemId}-${item.sku}`));
                    }) })) })] }));
}
