import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useVirtualizer } from "@tanstack/react-virtual";
import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { selectStatsItemsCardMode, selectStatsItemsError, selectStatsItemsHasMore, selectStatsItemsIsLoading, selectStatsItemsList, selectStatsItemsQuery, useStatsItemsStore, } from "../../stores/stats-items.store";
import { StatsItemCard } from "./StatsItemCard";
function buildRows(items, grouped) {
    if (!grouped) {
        return items.map((item) => ({ kind: "item", key: item.id, item }));
    }
    const rows = [];
    const seen = new Map();
    for (const item of items) {
        const groupKey = item.orderId ?? "__ungrouped__";
        if (!seen.has(groupKey)) {
            seen.set(groupKey, true);
            if (item.orderId) {
                rows.push({
                    kind: "header",
                    key: `header-${groupKey}`,
                    label: item.orderNumber !== null
                        ? `Order #${item.orderNumber}`
                        : `Order ${item.orderId}`,
                });
            }
        }
        rows.push({ kind: "item", key: item.id, item });
    }
    return rows;
}
export function StatsItemsList({ scrollRef }) {
    const items = useStatsItemsStore(selectStatsItemsList);
    const isLoading = useStatsItemsStore(selectStatsItemsIsLoading);
    const hasMore = useStatsItemsStore(selectStatsItemsHasMore);
    const error = useStatsItemsStore(selectStatsItemsError);
    const cardMode = useStatsItemsStore(selectStatsItemsCardMode);
    const query = useStatsItemsStore(selectStatsItemsQuery);
    const focusDimension = getFocusDimension(query);
    const shouldGroup = query?.groupByOrder === true;
    const rows = buildRows(items, shouldGroup);
    // Append sentinel rows for load-more/error/loading indicator
    const totalRows = rows.length + (hasMore || error || isLoading ? 1 : 0);
    const virtualizer = useVirtualizer({
        count: totalRows,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => {
            if (index >= rows.length)
                return 56;
            const row = rows[index];
            return row.kind === "header" ? 28 : 88;
        },
        overscan: 5,
    });
    if (items.length === 0 && !isLoading && !error) {
        return (_jsx("p", { className: "py-12 text-center text-sm font-medium text-slate-500", children: "No items found for this selection." }));
    }
    const virtualItems = virtualizer.getVirtualItems();
    return (_jsx("div", { style: { height: virtualizer.getTotalSize(), position: "relative" }, children: virtualItems.map((vItem) => {
            const isFooter = vItem.index >= rows.length;
            return (_jsx("div", { "data-index": vItem.index, ref: virtualizer.measureElement, style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vItem.start}px)`,
                }, children: isFooter ? (_jsx("div", { className: "flex flex-col items-center gap-2 py-4", children: error ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-sm font-medium text-rose-600", children: error }), _jsx("button", { type: "button", className: "rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700", onClick: statsItemsOverlayActions.retry, children: "Retry" })] })) : isLoading ? (_jsx("p", { className: "text-xs font-medium text-slate-400", children: "Loading\u2026" })) : hasMore ? (_jsx("button", { type: "button", className: "rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-600 shadow-sm", onClick: statsItemsOverlayActions.loadMore, children: "Show more" })) : null })) : ((() => {
                    const row = rows[vItem.index];
                    if (row.kind === "header") {
                        return (_jsx("p", { className: "m-0 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400", children: row.label }));
                    }
                    return (_jsx("div", { className: "pb-3", children: _jsx(StatsItemCard, { item: row.item, cardMode: cardMode, focusDimension: focusDimension }) }));
                })()) }, vItem.key));
        }) }));
}
function getFocusDimension(query) {
    if (!query)
        return null;
    if (query.heightMin !== undefined || query.heightMax !== undefined) {
        return "height";
    }
    if (query.widthMin !== undefined || query.widthMax !== undefined) {
        return "width";
    }
    if (query.depthMin !== undefined || query.depthMax !== undefined) {
        return "depth";
    }
    if (query.volumeLabel !== undefined) {
        return "volume";
    }
    return null;
}
