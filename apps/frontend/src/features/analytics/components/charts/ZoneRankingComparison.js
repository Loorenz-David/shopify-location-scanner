import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { formatKr } from "../../domain/format-currency.domain";
function SortArrowsIcon({ sortKey }) {
    return (_jsxs("svg", { viewBox: "0 0 14 18", fill: "none", className: "h-3.5 w-3.5 shrink-0", "aria-hidden": "true", children: [_jsx("path", { d: "M7 1L3 6h8L7 1Z", fill: sortKey === "itemsSold" ? "#0284c7" : "#cbd5e1" }), _jsx("path", { d: "M7 17l4-5H3l4 5Z", fill: sortKey === "revenue" ? "#059669" : "#cbd5e1" })] }));
}
export function ZoneRankingComparison({ data, onZoneClick, }) {
    const [sortKey, setSortKey] = useState("itemsSold");
    const soldZones = data
        .filter((z) => z.itemsSold > 0 || z.revenue > 0)
        .sort((a, b) => b[sortKey] - a[sortKey]);
    if (soldZones.length === 0) {
        return (_jsx("p", { className: "py-6 text-center text-sm text-slate-400", children: "No sales data available for this period." }));
    }
    const maxItems = Math.max(...soldZones.map((z) => z.itemsSold));
    const maxRevenue = Math.max(...soldZones.map((z) => z.revenue));
    const byVolume = [...soldZones]
        .sort((a, b) => b.itemsSold - a.itemsSold)
        .map((z, i) => ({ location: z.location, rank: i }));
    const byRevenue = [...soldZones]
        .sort((a, b) => b.revenue - a.revenue)
        .map((z, i) => ({ location: z.location, rank: i }));
    const volumeRankMap = new Map(byVolume.map((z) => [z.location, z.rank]));
    const revenueRankMap = new Map(byRevenue.map((z) => [z.location, z.rank]));
    return (_jsxs("div", { className: "w-full max-h-64 overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center gap-3 bg-white px-1 pb-1.5 border-b border-slate-100", children: [_jsxs("button", { type: "button", onClick: () => setSortKey((prev) => prev === "itemsSold" ? "revenue" : "itemsSold"), className: "flex w-20 shrink-0 items-center gap-1 text-left", "aria-label": `Sort by ${sortKey === "itemsSold" ? "revenue" : "items sold"}`, children: [_jsx(SortArrowsIcon, { sortKey: sortKey }), _jsx("span", { className: "text-[10px] font-semibold text-slate-400", children: "Sort" })] }), _jsx("span", { className: `flex-1 text-[10px] font-semibold uppercase tracking-[0.07em] transition-colors ${sortKey === "itemsSold" ? "text-sky-600" : "text-slate-400"}`, children: "Items sold" }), _jsx("span", { className: `flex-1 text-[10px] font-semibold uppercase tracking-[0.07em] transition-colors ${sortKey === "revenue" ? "text-emerald-600" : "text-slate-400"}`, children: "Revenue" })] }), soldZones.map((zone) => {
                const itemsPct = maxItems > 0 ? (zone.itemsSold / maxItems) * 100 : 0;
                const revPct = maxRevenue > 0 ? (zone.revenue / maxRevenue) * 100 : 0;
                const volumeRank = volumeRankMap.get(zone.location) ?? 0;
                const revenueRank = revenueRankMap.get(zone.location) ?? 0;
                const isHighValue = volumeRank - revenueRank >= 2;
                return (_jsxs("button", { type: "button", onClick: () => onZoneClick?.(zone.location), className: "flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-slate-50 active:bg-slate-100", children: [_jsxs("div", { className: "flex w-20 shrink-0 flex-col gap-0.5", children: [_jsx("span", { className: "truncate text-xs font-semibold text-slate-800", children: zone.location }), isHighValue && (_jsx("span", { className: "w-fit rounded-full bg-emerald-100 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-emerald-700", children: "High value" }))] }), _jsxs("div", { className: "flex flex-1 flex-col gap-1", children: [_jsx("div", { className: "h-2 overflow-hidden rounded-full bg-sky-100", children: _jsx("div", { className: "h-full rounded-full bg-sky-500 transition-all duration-300", style: { width: `${itemsPct}%` } }) }), _jsx("span", { className: "text-[10px] font-medium text-sky-600", children: zone.itemsSold })] }), _jsxs("div", { className: "flex flex-1 flex-col gap-1", children: [_jsx("div", { className: "h-2 overflow-hidden rounded-full bg-emerald-100", children: _jsx("div", { className: "h-full rounded-full bg-emerald-500 transition-all duration-300", style: { width: `${revPct}%` } }) }), _jsx("span", { className: "text-[10px] font-medium text-emerald-600", children: formatKr(zone.revenue) })] })] }, zone.location));
            })] }));
}
