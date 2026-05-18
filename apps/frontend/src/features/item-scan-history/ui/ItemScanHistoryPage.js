import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useItemScanHistoryFlow, useItemScanHistoryLoadingVisibilityFlow, useItemScanHistoryPullRefreshFlow, } from "../flows/use-item-scan-history.flow";
import { selectItemScanHistoryActiveFilterCount, selectItemScanHistoryErrorMessage, selectItemScanHistoryExpandedItemIds, selectItemScanHistoryHasLoaded, selectItemScanHistoryIsLoading, selectItemScanHistoryVisibleItems, selectItemScanHistoryQuery, useItemScanHistoryStore, } from "../stores/item-scan-history.store";
import { ItemScanHistoryHeader } from "./ItemScanHistoryHeader";
import { ItemScanHistoryLoadingCards } from "./ItemScanHistoryLoadingCards";
import { ItemScanHistoryList } from "./ItemScanHistoryList";
import { ItemScanHistoryPullRefreshIndicator } from "./ItemScanHistoryPullRefreshIndicator";
export function ItemScanHistoryPage() {
    useItemScanHistoryFlow();
    const scrollContainerRef = useRef(null);
    const query = useItemScanHistoryStore(selectItemScanHistoryQuery);
    const items = useItemScanHistoryStore(useShallow(selectItemScanHistoryVisibleItems));
    const activeFilterCount = useItemScanHistoryStore(selectItemScanHistoryActiveFilterCount);
    const isLoading = useItemScanHistoryStore(selectItemScanHistoryIsLoading);
    const errorMessage = useItemScanHistoryStore(selectItemScanHistoryErrorMessage);
    const hasLoaded = useItemScanHistoryStore(selectItemScanHistoryHasLoaded);
    const isLoadingVisible = useItemScanHistoryLoadingVisibilityFlow(isLoading, hasLoaded);
    const expandedItemIds = useItemScanHistoryStore(selectItemScanHistoryExpandedItemIds);
    const pullRefresh = useItemScanHistoryPullRefreshFlow({
        scrollContainerRef,
    });
    return (_jsxs("section", { className: "relative mx-auto -mb-36 flex h-[calc(100svh-2.25rem)] min-h-0 w-full max-w-[720px] flex-col max-[640px]:-mb-32 max-[640px]:h-[calc(100svh-1.5rem)]", children: [_jsx("div", { className: "pointer-events-auto absolute inset-x-0 top-0 z-30 px-5 max-[640px]:px-4", children: _jsx(ItemScanHistoryHeader, { query: query, activeFilterCount: activeFilterCount, onChangeQuery: itemScanHistoryActions.setQuery, onOpenFilters: itemScanHistoryActions.openFilters }) }), _jsxs("div", { className: "relative flex-1 min-h-0", children: [_jsxs("div", { ref: scrollContainerRef, className: "h-full overflow-y-auto overscroll-contain px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-28 max-[640px]:px-4", children: [_jsx(ItemScanHistoryPullRefreshIndicator, { pullDistance: pullRefresh.pullDistance, isArmed: pullRefresh.isArmed, isRefreshing: false }), _jsxs("div", { className: "transition-transform duration-150", style: {
                                    transform: `translateY(${pullRefresh.pullDistance}px)`,
                                }, children: [(isLoadingVisible && !hasLoaded) ||
                                        pullRefresh.isPullLoadingVisible ? (_jsx(ItemScanHistoryLoadingCards, {})) : null, !pullRefresh.isPullLoadingVisible &&
                                        !isLoading &&
                                        hasLoaded &&
                                        items.length === 0 ? (_jsxs("div", { className: "rounded-[28px] border border-slate-900/10 bg-white/75 px-5 py-6 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)] ", children: [_jsx("p", { className: "m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500", children: "No results" }), _jsx("p", { className: "m-0 mt-2 text-base text-slate-700", children: errorMessage
                                                    ? "Unable to load item scan history right now. Refresh the page to try again."
                                                    : "No scan history matched the current search. Refresh the page to try again." })] })) : null, !pullRefresh.isPullLoadingVisible && items.length > 0 ? (_jsxs("div", { className: "flex flex-col gap-3 ", children: [isLoadingVisible ? (_jsx("p", { className: "m-0 text-sm font-medium text-slate-500", children: "Refreshing history..." })) : null, _jsx(ItemScanHistoryList, { items: items, expandedItemIds: expandedItemIds })] })) : null] })] }), _jsx("div", { className: "pointer-events-none fixed inset-x-0 top-0 z-20 h-38 bg-[linear-gradient(180deg,rgba(245,251,248,0.98)_0%,rgba(242,248,248,0.9)_24%,rgba(239,246,252,0.48)_58%,rgba(239,246,252,0)_100%)] backdrop-blur-[1px]", style: {
                            WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 46%, rgba(0,0,0,0.68) 68%, transparent 100%)",
                            maskImage: "linear-gradient(180deg, #000 0%, #000 46%, rgba(0,0,0,0.68) 68%, transparent 100%)",
                        }, "aria-hidden": "true" }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-[linear-gradient(0deg,rgba(238,242,245,0.98)_0%,rgba(238,243,249,0.9)_30%,rgba(238,244,252,0.56)_66%,rgba(238,244,252,0)_100%)] backdrop-blur-[1px]", style: {
                            WebkitMaskImage: "linear-gradient(0deg, #000 0%, #000 48%, rgba(0,0,0,0.68) 70%, transparent 100%)",
                            maskImage: "linear-gradient(0deg, #000 0%, #000 48%, rgba(0,0,0,0.68) 70%, transparent 100%)",
                        }, "aria-hidden": "true" })] })] }));
}
