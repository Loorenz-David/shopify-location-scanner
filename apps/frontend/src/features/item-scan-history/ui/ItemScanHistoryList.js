import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { selectItemScanHistoryHasMore, selectItemScanHistoryIsLoadingMore, useItemScanHistoryStore, } from "../stores/item-scan-history.store";
import { ItemScanHistoryCard } from "./ItemScanHistoryCard";
export function ItemScanHistoryList({ items, expandedItemIds, }) {
    const hasMore = useItemScanHistoryStore(selectItemScanHistoryHasMore);
    const isLoadingMore = useItemScanHistoryStore(selectItemScanHistoryIsLoadingMore);
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [items.map((item) => (_jsx(ItemScanHistoryCard, { item: item, isExpanded: expandedItemIds.includes(item.id), onToggle: () => itemScanHistoryActions.toggleExpandedItem(item.id) }, item.id))), hasMore && (_jsx("div", { className: "flex justify-center pt-2 pb-2", children: _jsx("button", { type: "button", onClick: () => void itemScanHistoryActions.loadMoreHistory(), disabled: isLoadingMore, className: "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 disabled:opacity-50", children: isLoadingMore ? "Loading…" : "Show more" }) }))] }));
}
