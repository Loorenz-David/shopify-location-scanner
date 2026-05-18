import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { formatKr } from "../../domain/format-currency.domain";
const CHANNEL_COLORS = {
    physical: "#22c55e",
    webshop: "#6366f1",
    imported: "#f59e0b",
    unknown: "#94a3b8",
};
const CHANNEL_LABELS = {
    physical: "Physical / POS",
    webshop: "Webshop",
    imported: "Imported",
    unknown: "Unknown",
};
export function SalesChannelChart({ data, metric, onBarClick, onShowItemsClick, }) {
    const chartData = data.map((entry) => ({
        ...entry,
        label: CHANNEL_LABELS[entry.salesChannel] ?? entry.salesChannel,
    }));
    const [selectedChannel, setSelectedChannel] = useState(null);
    useEffect(() => {
        setSelectedChannel((current) => {
            if (!current)
                return null;
            return chartData.some((entry) => entry.salesChannel === current)
                ? current
                : null;
        });
    }, [data]);
    const activeEntry = chartData.find((entry) => entry.salesChannel === selectedChannel) ?? null;
    function selectChannel(channel) {
        setSelectedChannel(channel);
        onBarClick?.(channel);
    }
    return (_jsxs("div", { className: "analytics-chart-shell", children: [_jsx(ResponsiveContainer, { width: "100%", height: Math.max(100, chartData.length * 40), children: _jsxs(BarChart, { accessibilityLayer: false, layout: "vertical", data: chartData, margin: { left: 4, right: 8, top: 4, bottom: 4 }, children: [_jsx(XAxis, { type: "number", tick: { fontSize: 11 }, tickFormatter: (value) => metric === "totalRevenue" ? formatKr(value) : String(value) }), _jsx(YAxis, { type: "category", dataKey: "label", tick: { fontSize: 11 }, width: 84 }), _jsx(Tooltip, { content: () => null, cursor: false }), _jsx(Bar, { dataKey: metric, radius: [0, 4, 4, 0], onMouseDown: (entry) => {
                                const channel = getChannelFromBarEntry(entry);
                                if (channel)
                                    selectChannel(channel);
                            }, onTouchStart: (entry) => {
                                const channel = getChannelFromBarEntry(entry);
                                if (channel)
                                    selectChannel(channel);
                            }, onClick: (entry) => {
                                const channel = getChannelFromBarEntry(entry);
                                if (channel)
                                    selectChannel(channel);
                            }, children: chartData.map((entry) => (_jsx(Cell, { fill: CHANNEL_COLORS[entry.salesChannel] ?? "#94a3b8" }, entry.salesChannel))) })] }) }), _jsx(AnimatePresence, { initial: false, children: activeEntry ? (_jsx(motion.div, { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: "auto", opacity: 1, y: 0 }, exit: { height: 0, opacity: 0, y: -8 }, transition: { duration: 0.2, ease: "easeOut" }, className: "overflow-hidden", children: _jsx("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3", children: _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Selected channel" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: activeEntry.label })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onShowItemsClick ? (_jsx("button", { type: "button", className: "shrink-0 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700", onClick: () => onShowItemsClick(activeEntry.salesChannel), children: "show items" })) : null, _jsx("button", { type: "button", "aria-label": "Close selection details", className: "grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500", onClick: () => setSelectedChannel(null), children: "\u00D7" })] })] }), _jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em]", style: { color: CHANNEL_COLORS[activeEntry.salesChannel] }, children: metric === "totalRevenue" ? "Revenue" : "Items sold" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: metric === "totalRevenue"
                                                ? formatKr(activeEntry.totalRevenue)
                                                : `${activeEntry.itemsSold} items` })] })] }) }) }, activeEntry.salesChannel)) : null })] }));
}
function getChannelFromBarEntry(entry) {
    return entry.payload?.salesChannel;
}
