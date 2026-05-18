import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef } from "react";
import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { useStatsItemsFlow } from "../../flows/use-stats-items.flow";
import { selectStatsItemsControls, selectStatsItemsError, selectStatsItemsFilters, selectStatsItemsIsLoading, selectStatsItemsIsOpen, selectStatsItemsList, selectStatsItemsTitle, useStatsItemsStore, } from "../../stores/stats-items.store";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
import { useSlidingOverlayReady } from "../../../home/ui/sliding-overlay-ready.context";
import { StatsItemsList } from "./StatsItemsList";
export function StatsItemsOverlay() {
    useStatsItemsFlow();
    const isOpen = useStatsItemsStore(selectStatsItemsIsOpen);
    const title = useStatsItemsStore(selectStatsItemsTitle);
    return (_jsx(SlidingOverlayContainer, { isOpen: isOpen, title: title, zIndexClassName: "z-70", children: _jsx(OverlayBody, { title: title }) }));
}
// Rendered inside SlidingOverlayContainer so useSlidingOverlayReady() reads
// the correct context value (the provider is inside the container).
function OverlayBody({ title }) {
    const scrollRef = useRef(null);
    const isReady = useSlidingOverlayReady();
    const isLoading = useStatsItemsStore(selectStatsItemsIsLoading);
    const items = useStatsItemsStore(selectStatsItemsList);
    const error = useStatsItemsStore(selectStatsItemsError);
    const controls = useStatsItemsStore(selectStatsItemsControls);
    const filters = useStatsItemsStore(selectStatsItemsFilters);
    const isEmpty = !isLoading && !error && items.length === 0;
    const showStatusFilter = controls.showStatusFilter;
    const showSortToggle = controls.showSortToggle;
    const showTimeToSellSort = controls.showTimeToSellSort;
    const showSalesChannelFilters = controls.salesChannelOptions.length > 0;
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden bg-white", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-900/10 px-4 py-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h2", { className: "m-0 text-base font-bold text-slate-900", children: title }), showSortToggle ? (_jsxs("button", { type: "button", className: "mt-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors", onClick: () => statsItemsOverlayActions.setSortOrderFilter(filters.sortOrder === "oldest" ? "newest" : "oldest"), children: ["Sort by", " ", filters.sortOrder === "oldest" ? "oldest" : "newest"] })) : null, showTimeToSellSort ? (_jsx("button", { type: "button", className: "mt-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors", onClick: () => statsItemsOverlayActions.setSortOrderFilter(filters.sortOrder === "oldest" ? "newest" : "oldest"), children: filters.sortOrder === "oldest"
                                    ? "Fastest sold first"
                                    : "Slowest sold first" })) : null] }), _jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500", onClick: statsItemsOverlayActions.close, "aria-label": "Close", children: _jsx("svg", { className: "h-4 w-4", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M4 4l8 8M12 4l-8 8", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }) }) })] }), showStatusFilter || showSalesChannelFilters ? (_jsx("div", { className: "border-b border-slate-900/10 px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap gap-2", children: [showStatusFilter ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filters.isSold === true
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-slate-200 bg-white text-slate-600"}`, onClick: () => statsItemsOverlayActions.toggleIsSoldFilter(true), children: "Sold" }), _jsx("button", { type: "button", className: `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filters.isSold === false
                                        ? "border-slate-700 bg-slate-700 text-white"
                                        : "border-slate-200 bg-white text-slate-600"}`, onClick: () => statsItemsOverlayActions.toggleIsSoldFilter(false), children: "Not sold" })] })) : null, showSalesChannelFilters ? (_jsx(_Fragment, { children: controls.salesChannelOptions.map((channel) => (_jsx("button", { type: "button", className: `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filters.lastSoldChannel === channel
                                    ? "border-indigo-500 bg-indigo-500 text-white"
                                    : "border-slate-200 bg-white text-slate-600"}`, onClick: () => statsItemsOverlayActions.toggleLastSoldChannelFilter(channel), children: channel === "physical" ? "Physical" : "Webshop" }, channel))) })) : null] }) })) : null, _jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-4 py-4", children: [!isReady || (isLoading && items.length === 0) ? (_jsx("div", { className: "flex h-40 items-center justify-center", children: _jsx("p", { className: "text-sm font-medium text-slate-500", children: "Loading\u2026" }) })) : isEmpty ? (_jsx("div", { className: "flex h-40 items-center justify-center", children: _jsx("p", { className: "text-sm font-medium text-slate-500", children: "No items found for this selection." }) })) : (_jsx(StatsItemsList, { scrollRef: scrollRef })), error && items.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center gap-3 py-12", children: [_jsx("p", { className: "text-sm font-medium text-rose-600", children: error }), _jsx("button", { type: "button", className: "rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700", onClick: statsItemsOverlayActions.retry, children: "Retry" })] })) : null] })] }));
}
