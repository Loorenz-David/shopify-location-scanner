import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { formatKr } from "../../domain/format-currency.domain";
const COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b"];
const BAR_ROW_HEIGHT = 38;
const BAR_MIN_HEIGHT = 220;
const BAR_MAX_VISIBLE_HEIGHT = 320;
const ACTIVE_SLICE_FILTER = "drop-shadow(0 0 10px rgba(20,184,166,0.24))";
export function CategoryBarChart({ data, metric = "itemsSold", mode = "bar", onBarClick, }) {
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedBarCategory, setSelectedBarCategory] = useState(null);
    const totalItems = useMemo(() => data.reduce((sum, entry) => sum + (metric === "revenue" ? (entry.revenue ?? 0) : entry.itemsSold), 0), [data, metric]);
    if (mode === "pie") {
        return (_jsxs("div", { className: "analytics-chart-shell", children: [_jsx(ResponsiveContainer, { width: "100%", height: 240, children: _jsxs(PieChart, { accessibilityLayer: false, children: [_jsx(Pie, { data: data, dataKey: metric === "revenue" ? "revenue" : "itemsSold", nameKey: "category", cx: "50%", cy: "50%", innerRadius: 42, outerRadius: 84, paddingAngle: 3, onClick: (entry) => {
                                    const category = entry?.payload?.category;
                                    if (category) {
                                        setActiveCategory(category);
                                        onBarClick?.(category);
                                    }
                                }, children: data.map((entry) => {
                                    const isActive = activeCategory === null || activeCategory === entry.category;
                                    return (_jsx(Cell, { fill: COLORS[Math.abs(entry.category.length) % COLORS.length], fillOpacity: isActive ? 1 : 0.28, stroke: activeCategory === entry.category ? "#ccfbf1" : "none", strokeWidth: activeCategory === entry.category ? 3 : 0, style: {
                                            filter: activeCategory === entry.category
                                                ? ACTIVE_SLICE_FILTER
                                                : "none",
                                        } }, entry.category));
                                }) }), _jsx(Tooltip, { cursor: false, formatter: (value) => [`${Number(value ?? 0)} items`, "Sold"] })] }) }), activeCategory ? (_jsx("div", { className: "mt-2 flex justify-end", children: _jsx("button", { type: "button", onClick: () => setActiveCategory(null), className: "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition-colors hover:border-teal-200 hover:text-teal-700", children: "Clear selection" }) })) : null, _jsx("div", { className: "mt-3 max-h-40 overflow-y-auto", children: _jsx("div", { className: "flex flex-col divide-y divide-slate-100", children: data.map((entry) => {
                            const isActive = activeCategory === null || activeCategory === entry.category;
                            const val = metric === "revenue" ? (entry.revenue ?? 0) : entry.itemsSold;
                            const pct = totalItems > 0 ? Math.round((val / totalItems) * 100) : 0;
                            const valLabel = metric === "revenue" ? formatKr(val) : `${val} sold`;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    setActiveCategory(entry.category);
                                    onBarClick?.(entry.category);
                                }, className: `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${activeCategory === entry.category
                                    ? "bg-teal-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(94,234,212,0.7)]"
                                    : isActive
                                        ? "bg-transparent text-slate-900"
                                        : "bg-slate-50/70 text-slate-400"}`, children: [_jsx("span", { className: "h-3 w-3 shrink-0 rounded-full", style: {
                                            backgroundColor: COLORS[Math.abs(entry.category.length) % COLORS.length],
                                        }, "aria-hidden": "true" }), _jsx("span", { className: "min-w-0 flex-1 truncate text-sm font-medium", children: entry.category }), _jsxs("span", { className: "shrink-0 text-xs text-slate-400", children: [valLabel, " \u00B7 ", pct, "%"] })] }, entry.category));
                        }) }) })] }));
    }
    return (_jsxs("div", { children: [_jsx(AnimatePresence, { initial: false, children: selectedBarCategory ? (() => {
                    const row = data.find((d) => d.category === selectedBarCategory);
                    if (!row)
                        return null;
                    return (_jsx(motion.div, { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: "auto", opacity: 1, y: 0 }, exit: { height: 0, opacity: 0, y: -8 }, transition: { duration: 0.2, ease: "easeOut" }, className: "overflow-hidden", children: _jsxs("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Selected category" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: row.category })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onBarClick ? (_jsx("button", { type: "button", className: "shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700", onClick: () => onBarClick(row.category), children: "show items" })) : null, _jsx("button", { type: "button", "aria-label": "Close selection", className: "grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500", onClick: () => setSelectedBarCategory(null), children: "\u00D7" })] })] }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600", children: "Items sold" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: row.itemsSold })] }), row.revenue !== undefined ? (_jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600", children: "Revenue" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: formatKr(row.revenue) })] })) : null] })] }) }, selectedBarCategory));
                })() : null }), _jsx("div", { className: "analytics-chart-shell overflow-y-auto pr-1", style: { maxHeight: BAR_MAX_VISIBLE_HEIGHT }, children: _jsx("div", { style: {
                        height: Math.max(BAR_MIN_HEIGHT, data.length * BAR_ROW_HEIGHT),
                    }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { accessibilityLayer: false, layout: "vertical", data: data, margin: { left: 8, right: 16, top: 4, bottom: 4 }, children: [_jsx(XAxis, { type: "number", tick: { fontSize: 11 } }), _jsx(YAxis, { type: "category", dataKey: "category", tick: { fontSize: 11 }, width: 96 }), _jsx(Tooltip, { content: () => null, cursor: false }), _jsx(Bar, { dataKey: metric === "revenue" ? "revenue" : "itemsSold", radius: [0, 4, 4, 0], activeBar: false, cursor: "pointer", onMouseDown: (entry) => {
                                        const category = entry.payload?.category;
                                        if (category)
                                            setSelectedBarCategory(category);
                                    }, onTouchStart: (entry) => {
                                        const category = entry.payload?.category;
                                        if (category)
                                            setSelectedBarCategory(category);
                                    }, onClick: (entry) => {
                                        const category = entry.payload?.category;
                                        if (category)
                                            setSelectedBarCategory(category);
                                    }, children: data.map((entry) => (_jsx(Cell, { fill: COLORS[Math.abs(entry.category.length) % COLORS.length], stroke: selectedBarCategory === entry.category ? "#0ea5e9" : "transparent", strokeWidth: 2 }, entry.category))) })] }) }) }) })] }));
}
