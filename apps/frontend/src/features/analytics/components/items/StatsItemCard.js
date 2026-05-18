import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { formatKr } from "../../domain/format-currency.domain";
import { ItemImagePreviewButton } from "../../../item-scan-history/ui/ItemImagePreviewButton";
import { ItemQuantityPill, resolveItemQuantityPillProps, } from "../../../item-scan-history/ui/ItemQuantityPill";
function formatPrice(price) {
    if (!price)
        return null;
    const n = parseFloat(price);
    return isNaN(n) ? null : formatKr(n);
}
const CHANNEL_LABELS = {
    physical: "Physical",
    webshop: "Webshop",
    imported: "Imported",
    unknown: "Unknown",
};
const CHANNEL_COLORS = {
    physical: "border-emerald-200 bg-emerald-50 text-emerald-700",
    webshop: "border-indigo-200 bg-indigo-50 text-indigo-700",
    imported: "border-amber-200 bg-amber-50 text-amber-700",
    unknown: "border-slate-200 bg-slate-100 text-slate-600",
};
function formatSeconds(seconds) {
    if (seconds === null)
        return "—";
    const days = Math.floor(seconds / 86400);
    if (days > 0)
        return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0)
        return `${hours}h`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}
function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
function formatDimension(value, unit = "cm") {
    if (value === null)
        return "—";
    return `${value} ${unit}`;
}
function formatTimeInStock(createdAt) {
    const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days >= 365)
        return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
    if (days >= 30)
        return `${Math.floor(days / 30)}mo ${days % 30}d`;
    if (days > 0)
        return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0)
        return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
}
export function StatsItemCard({ item, cardMode, focusDimension = null, }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const quantityPillProps = resolveItemQuantityPillProps({
        quantity: item.quantity,
        itemCategory: item.itemCategory,
        properties: item.properties,
    });
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]", children: [_jsxs("div", { className: "flex w-full items-start gap-3 p-3 text-left", children: [_jsx(ItemImagePreviewButton, { imageUrls: item.itemImageUrl, title: item.itemTitle, buttonClassName: "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition-opacity hover:opacity-80 active:opacity-70", placeholderClassName: "flex items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500", placeholderLabel: "No image", overlay: _jsx(ItemQuantityPill, { ...quantityPillProps, className: "absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/80 px-2 py-1 text-white shadow-sm backdrop-blur" }) }), _jsxs("button", { type: "button", className: "flex min-w-0 flex-1 items-start gap-3 text-left", onClick: () => setIsExpanded((v) => !v), "aria-expanded": isExpanded, children: [_jsx("div", { className: "min-w-0 flex-1", children: _jsx(CompactContent, { item: item, cardMode: cardMode, focusDimension: focusDimension }) }), _jsx("svg", { className: `mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M4 6l4 4 4-4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }) })] })] }), isExpanded ? (_jsx("div", { className: "border-t border-slate-900/8 bg-slate-50/60 px-3 py-3", children: _jsx(ExpandedContent, { item: item, cardMode: cardMode }) })) : null] }));
}
function CompactContent({ item, cardMode, focusDimension, }) {
    const titleLine = (_jsx("div", { className: "flex min-w-0 items-center gap-2", children: _jsx("p", { className: "m-0 truncate text-sm font-semibold text-slate-900", children: item.itemTitle }) }));
    switch (cardMode) {
        case "sold-default":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [item.lastKnownPrice ? (_jsx("span", { className: "text-xs font-medium text-slate-700", children: formatPrice(item.lastKnownPrice) ?? "" })) : null, item.intention ? (_jsx("span", { className: "truncate text-xs text-slate-500", children: item.intention })) : null] }), item.lastSoldChannel || item.timeToSellSeconds !== null ? (_jsxs("div", { className: "mt-0.5 flex flex-wrap items-center gap-2", children: [item.lastSoldChannel ? (_jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[item.lastSoldChannel] ??
                                    CHANNEL_COLORS.unknown}`, children: CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel })) : null, item.timeToSellSeconds !== null ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["Sold in ", formatSeconds(item.timeToSellSeconds)] })) : null] })) : null] }));
        case "avg-sell-time":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [item.lastKnownPrice ? (_jsx("span", { className: "text-xs font-medium text-slate-700", children: formatPrice(item.lastKnownPrice) ?? "" })) : null, item.intention ? (_jsx("span", { className: "truncate text-xs text-slate-400", children: item.intention })) : null] }), item.lastSoldChannel || item.timeToSellSeconds !== null ? (_jsxs("div", { className: "mt-0.5 flex flex-wrap items-center gap-2", children: [item.lastSoldChannel ? (_jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[item.lastSoldChannel] ??
                                    CHANNEL_COLORS.unknown}`, children: CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel })) : null, item.timeToSellSeconds !== null ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["Sold in ", formatSeconds(item.timeToSellSeconds)] })) : null] })) : null] }));
        case "received":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("p", { className: "m-0 mt-1 text-xs text-slate-500", children: ["Received ", formatDate(item.createdAt)] })] }));
        case "with-channel":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [item.lastKnownPrice ? (_jsx("span", { className: "text-xs font-medium text-slate-700", children: formatPrice(item.lastKnownPrice) ?? "" })) : null, item.lastSoldChannel ? (_jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown}`, children: CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel })) : null, item.intention ? (_jsx("span", { className: "truncate text-xs text-slate-400", children: item.intention })) : null] }), item.timeToSellSeconds !== null ? (_jsxs("p", { className: "m-0 mt-0.5 text-xs text-slate-500", children: ["Sold in ", formatSeconds(item.timeToSellSeconds)] })) : null] }));
        case "dimensions":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "text-xs text-slate-600", children: [_jsx("span", { className: focusDimension === "height" ? "font-bold text-slate-900" : "", children: formatDimension(item.itemHeight) }), " ", "\u00D7", " ", _jsx("span", { className: focusDimension === "width" ? "font-bold text-slate-900" : "", children: formatDimension(item.itemWidth) }), " ", "\u00D7", " ", _jsx("span", { className: focusDimension === "depth" ? "font-bold text-slate-900" : "", children: formatDimension(item.itemDepth) })] }), item.volume !== null ? (_jsxs("span", { className: `text-xs ${focusDimension === "volume"
                                    ? "font-bold text-slate-900"
                                    : "text-slate-600"}`, children: ["Vol ", item.volume] })) : null, item.lastKnownPrice ? (_jsx("span", { className: "text-xs font-medium text-slate-700", children: formatPrice(item.lastKnownPrice) ?? "" })) : null] }), _jsxs("div", { className: "mt-0.5 flex flex-wrap items-center gap-2", children: [item.isSold && item.lastSoldChannel ? (_jsx("span", { className: `rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown}`, children: CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel })) : null, item.isSold && item.timeToSellSeconds !== null ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["Sold in ", formatSeconds(item.timeToSellSeconds)] })) : null, !item.isSold ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["In stock ", formatTimeInStock(item.createdAt)] })) : null] })] }));
        case "zone-standard":
            return (_jsxs(_Fragment, { children: [titleLine, _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [item.lastKnownPrice ? (_jsx("span", { className: "text-xs font-medium text-slate-700", children: formatPrice(item.lastKnownPrice) ?? "" })) : null, item.isSold && item.timeToSellSeconds !== null ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["Sold in ", formatSeconds(item.timeToSellSeconds)] })) : null, !item.isSold ? (_jsxs("span", { className: "text-xs text-slate-500", children: ["In stock ", formatTimeInStock(item.createdAt)] })) : null] })] }));
    }
}
function ExpandedContent({ item, cardMode, }) {
    const rows = [];
    // Fields always shown in expanded unless already in compact
    if (cardMode !== "received") {
        rows.push({
            label: "Received",
            value: formatDate(item.createdAt),
            className: "col-start-1",
        });
        if (item.itemSku) {
            rows.push({
                label: "SKU",
                value: item.itemSku,
                className: "col-start-1",
            });
        }
    }
    if (cardMode !== "avg-sell-time" &&
        cardMode !== "zone-standard" &&
        item.timeToSellSeconds !== null) {
        rows.push({
            label: "Sell time",
            value: formatSeconds(item.timeToSellSeconds),
        });
    }
    if (cardMode === "received" || cardMode === "avg-sell-time") {
        if (item.lastKnownPrice) {
            rows.push({
                label: "Price",
                value: formatPrice(item.lastKnownPrice) ?? "",
            });
        }
    }
    if (cardMode !== "dimensions") {
        if (item.itemHeight !== null ||
            item.itemWidth !== null ||
            item.itemDepth !== null) {
            rows.push({
                label: "H × W × D",
                value: `${formatDimension(item.itemHeight)} × ${formatDimension(item.itemWidth)} × ${formatDimension(item.itemDepth)}`,
            });
        }
    }
    else {
        // dimensions mode: show remaining fields
        if (item.timeToSellSeconds !== null) {
            rows.push({
                label: "Sell time",
                value: formatSeconds(item.timeToSellSeconds),
            });
        }
        rows.push({
            label: "Received",
            value: formatDate(item.createdAt),
            className: "col-start-1",
        });
        if (item.itemSku) {
            rows.push({
                label: "SKU",
                value: item.itemSku,
                className: "col-start-1",
            });
        }
    }
    if (item.itemCategory) {
        rows.push({ label: "Category", value: item.itemCategory });
    }
    if (item.fixItem !== null) {
        rows.push({ label: "Needs fixing", value: item.fixItem ? "Yes" : "No" });
    }
    if (cardMode === "received" && item.intention) {
        rows.push({ label: "Intention", value: item.intention });
    }
    if (item.latestLocation) {
        rows.push({ label: "Location", value: item.latestLocation });
    }
    if (item.username) {
        rows.push({ label: "Scanned by", value: item.username });
    }
    if (rows.length === 0)
        return null;
    return (_jsx("dl", { className: "m-0 grid grid-cols-2 gap-x-4 gap-y-2", children: rows.map(({ label, value, className }) => (_jsxs("div", { className: className, children: [_jsx("dt", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400", children: label }), _jsx("dd", { className: "m-0 text-xs font-medium text-slate-700", children: value })] }, label))) }));
}
