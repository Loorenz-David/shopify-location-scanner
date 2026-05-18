import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QRcodeIcon } from "../../../assets/icons";
import { formatSecondsToHumanDuration, formatTimeInStock, } from "../domain/item-scan-history.domain";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { ItemImagePreviewButton } from "./ItemImagePreviewButton";
import { ItemQuantityPill, resolveItemQuantityPillProps, } from "./ItemQuantityPill";
import { ItemScanHistoryTimeline } from "./ItemScanHistoryTimeline";
export function ItemScanHistoryCard({ item, isExpanded, onToggle, }) {
    const soldChannelBadge = item.lastSoldChannel
        ? CHANNEL_BADGE[item.lastSoldChannel]
        : null;
    const quantityPillProps = resolveItemQuantityPillProps({
        quantity: item.quantity,
        itemCategory: item.categoryLabel,
        properties: item.properties,
    });
    return (_jsxs("article", { className: "relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md", children: [_jsxs("div", { className: "grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left", onClick: onToggle, children: [_jsx(ItemImagePreviewButton, { imageUrls: item.imageUrls ?? item.imageUrl, title: item.title, imageAlt: item.title, buttonClassName: "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition-opacity hover:opacity-80 active:opacity-70", placeholderClassName: "flex items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500", placeholderLabel: "No image", overlay: _jsx(ItemQuantityPill, { ...quantityPillProps, className: "absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/80 px-2 py-1 text-white shadow-sm backdrop-blur" }) }), _jsxs("div", { className: "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1", children: [_jsxs("div", { className: "min-w-0 self-center", children: [_jsx("div", { className: "flex min-w-0 items-center gap-2", children: _jsx("p", { className: "m-0 truncate text-sm font-bold text-slate-900", children: item.skuLabel }) }), _jsx("p", { className: "m-0 mt-1 truncate text-xs text-slate-600", children: item.isSold && item.timeToSellSeconds !== null
                                            ? `Sold in ${formatSecondsToHumanDuration(item.timeToSellSeconds)}`
                                            : `In stock ${formatTimeInStock(item.createdAt)}` })] }), _jsxs("div", { className: "mt-1 flex items-center gap-1.5", children: [_jsx("button", { type: "button", className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200", "aria-label": "Open placement scanner", onClick: (e) => {
                                            e.stopPropagation();
                                            itemScanHistoryActions.openPlacementScanner(item);
                                        }, children: _jsx(QRcodeIcon, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 active:bg-emerald-100", "aria-label": "Open item options", onClick: (e) => {
                                            e.stopPropagation();
                                            itemScanHistoryActions.openItemOptions(item.id);
                                        }, children: _jsxs("span", { className: "flex flex-col items-center gap-0.5", "aria-hidden": "true", children: [_jsx("span", { className: "h-1 w-1 rounded-full bg-current" }), _jsx("span", { className: "h-1 w-1 rounded-full bg-current" }), _jsx("span", { className: "h-1 w-1 rounded-full bg-current" })] }) })] }), _jsxs("div", { className: "col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700", children: "Latest" }), _jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [_jsx("p", { className: "m-0 truncate text-sm font-semibold text-slate-900", children: item.latestLocationLabel }), item.isSold && soldChannelBadge ? (_jsx("span", { className: `inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${soldChannelBadge.color}`, children: soldChannelBadge.label })) : null] })] })] })] }), isExpanded ? (_jsx("div", { className: "border-t border-slate-900/10 px-4 py-4", children: item.timelineEvents.length > 0 ? (_jsx(ItemScanHistoryTimeline, { events: item.timelineEvents })) : (_jsx("p", { className: "m-0 text-sm text-slate-600", children: "No event history is available for this item yet." })) })) : null] }));
}
const CHANNEL_BADGE = {
    physical: { label: "POS", color: "bg-green-100 text-green-700" },
    webshop: { label: "Webshop", color: "bg-indigo-100 text-indigo-700" },
    imported: { label: "Imported", color: "bg-amber-100 text-amber-700" },
    unknown: { label: "?", color: "bg-slate-100 text-slate-500" },
};
