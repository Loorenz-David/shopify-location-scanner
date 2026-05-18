import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { formatKr } from "../../domain/format-currency.domain";
export function SalesTimePatternsChart({ data, metric, compareData = null, onHourClick, onWeekdayClick, }) {
    const formatY = (value) => metric === "revenue" ? formatKr(value) : String(value);
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedWeekday, setSelectedWeekday] = useState(null);
    // Compute peak based on the active metric so it stays correct when switching between Items/Revenue
    const peakHourValue = Math.max(...data.byHour.map((p) => p[metric]));
    const peakHour = peakHourValue > 0
        ? data.byHour.find((p) => p[metric] === peakHourValue)
        : undefined;
    const peakWeekdayValue = Math.max(...data.byWeekday.map((p) => p[metric]));
    const peakWeekday = peakWeekdayValue > 0
        ? data.byWeekday.find((p) => p[metric] === peakWeekdayValue)
        : undefined;
    // Keep selection in sync when data changes (e.g. channel switch)
    useEffect(() => {
        if (selectedHour !== null) {
            const updated = data.byHour.find((p) => p.hour === selectedHour.hour);
            setSelectedHour(updated ?? null);
        }
    }, [data.byHour]);
    useEffect(() => {
        if (selectedWeekday !== null) {
            const updated = data.byWeekday.find((p) => p.weekday === selectedWeekday.weekday);
            setSelectedWeekday(updated ?? null);
        }
    }, [data.byWeekday]);
    // Merged datasets for grouped compare bars
    const hourCompareData = compareData
        ? data.byHour.map((pt, i) => ({
            label: pt.label,
            hour: pt.hour,
            itemsSold: pt.itemsSold,
            revenue: pt.revenue,
            isPeak: pt.isPeak,
            physical: compareData.physical.byHour[i]?.[metric] ?? 0,
            webshop: compareData.webshop.byHour[i]?.[metric] ?? 0,
        }))
        : null;
    const weekdayCompareData = compareData
        ? data.byWeekday.map((pt, i) => ({
            label: pt.label,
            weekday: pt.weekday,
            itemsSold: pt.itemsSold,
            revenue: pt.revenue,
            isPeak: pt.isPeak,
            physical: compareData.physical.byWeekday[i]?.[metric] ?? 0,
            webshop: compareData.webshop.byWeekday[i]?.[metric] ?? 0,
        }))
        : null;
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("section", { children: [_jsx("p", { className: "mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Hour of day" }), _jsx("div", { className: `analytics-chart-shell${onHourClick && !compareData ? " cursor-pointer" : ""}`, children: _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(BarChart, { accessibilityLayer: false, data: hourCompareData ?? data.byHour, margin: { left: 0, right: 8, top: 4, bottom: 4 }, children: [_jsx(XAxis, { dataKey: "label", tick: { fontSize: 9 }, interval: 2 }), _jsx(YAxis, { tick: { fontSize: 10 }, tickFormatter: formatY, width: 40 }), _jsx(Tooltip, { content: () => null, cursor: false }), hourCompareData ? (_jsxs(_Fragment, { children: [_jsx(Bar, { dataKey: "physical", name: "Physical", fill: "#22c55e", radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out" }), _jsx(Bar, { dataKey: "webshop", name: "Webshop", fill: "#6366f1", radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out" })] })) : (_jsx(Bar, { dataKey: metric, radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out", activeBar: false, onMouseDown: (entry) => {
                                            const point = entry
                                                .payload;
                                            if (point)
                                                setSelectedHour(point);
                                        }, onTouchStart: (entry) => {
                                            const point = entry
                                                .payload;
                                            if (point)
                                                setSelectedHour(point);
                                        }, onClick: (entry) => {
                                            const point = entry
                                                .payload;
                                            if (point)
                                                setSelectedHour(point);
                                        }, children: data.byHour.map((point) => (_jsx(Cell, { fill: point.hour === peakHour?.hour ? "#f59e0b" : "#6366f1", stroke: selectedHour?.hour === point.hour
                                                ? "#0ea5e9"
                                                : "transparent", strokeWidth: 2 }, point.hour))) }))] }) }) }), !compareData && peakHour && peakHour.itemsSold > 0 ? (_jsxs("p", { className: "m-0 mt-1 text-xs font-semibold text-amber-600", children: ["Peak: ", peakHour.label] })) : null, compareData ? (_jsxs("div", { className: "mt-1 flex gap-3", children: [_jsxs("span", { className: "flex items-center gap-1 text-xs font-semibold text-slate-600", children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full bg-emerald-500" }), "Physical"] }), _jsxs("span", { className: "flex items-center gap-1 text-xs font-semibold text-slate-600", children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full bg-indigo-500" }), "Webshop"] })] })) : null, _jsx(AnimatePresence, { initial: false, children: selectedHour ? (_jsx(motion.div, { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: "auto", opacity: 1, y: 0 }, exit: { height: 0, opacity: 0, y: -8 }, transition: { duration: 0.2, ease: "easeOut" }, className: "overflow-hidden", children: _jsxs("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Selected hour" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedHour.label })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onHourClick ? (_jsx("button", { type: "button", className: "shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700", onClick: () => onHourClick(selectedHour.hour, selectedHour.label), children: "show items" })) : null, _jsx("button", { type: "button", "aria-label": "Close selection", className: "grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500", onClick: () => setSelectedHour(null), children: "\u00D7" })] })] }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600", children: "Items sold" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedHour.itemsSold })] }), _jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600", children: "Revenue" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: formatKr(selectedHour.revenue) })] })] })] }) }, selectedHour.hour)) : null })] }), _jsxs("section", { children: [_jsx("p", { className: "mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Day of week" }), _jsx("div", { className: `analytics-chart-shell${onWeekdayClick && !compareData ? " cursor-pointer" : ""}`, children: _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(BarChart, { accessibilityLayer: false, data: weekdayCompareData ?? data.byWeekday, margin: { left: 0, right: 8, top: 4, bottom: 4 }, children: [_jsx(XAxis, { dataKey: "label", tick: { fontSize: 10 } }), _jsx(YAxis, { tick: { fontSize: 10 }, tickFormatter: formatY, width: 40 }), _jsx(Tooltip, { content: () => null, cursor: false }), weekdayCompareData ? (_jsxs(_Fragment, { children: [_jsx(Bar, { dataKey: "physical", name: "Physical", fill: "#22c55e", radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out" }), _jsx(Bar, { dataKey: "webshop", name: "Webshop", fill: "#6366f1", radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out" })] })) : (_jsx(Bar, { dataKey: metric, radius: [3, 3, 0, 0], isAnimationActive: true, animationBegin: 0, animationDuration: 400, animationEasing: "ease-out", activeBar: false, onMouseDown: (entry) => {
                                            const point = entry.payload;
                                            if (point)
                                                setSelectedWeekday(point);
                                        }, onTouchStart: (entry) => {
                                            const point = entry.payload;
                                            if (point)
                                                setSelectedWeekday(point);
                                        }, onClick: (entry) => {
                                            const point = entry.payload;
                                            if (point)
                                                setSelectedWeekday(point);
                                        }, children: data.byWeekday.map((point) => (_jsx(Cell, { fill: point.weekday === peakWeekday?.weekday
                                                ? "#f59e0b"
                                                : "#6366f1", stroke: selectedWeekday?.weekday === point.weekday
                                                ? "#0ea5e9"
                                                : "transparent", strokeWidth: 2 }, point.weekday))) }))] }) }) }), !compareData && peakWeekday && peakWeekday.itemsSold > 0 ? (_jsxs("p", { className: "m-0 mt-1 text-xs font-semibold text-amber-600", children: ["Peak: ", peakWeekday.label] })) : null, compareData ? (_jsxs("div", { className: "mt-1 flex gap-3", children: [_jsxs("span", { className: "flex items-center gap-1 text-xs font-semibold text-slate-600", children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full bg-emerald-500" }), "Physical"] }), _jsxs("span", { className: "flex items-center gap-1 text-xs font-semibold text-slate-600", children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full bg-indigo-500" }), "Webshop"] })] })) : null, _jsx(AnimatePresence, { initial: false, children: selectedWeekday ? (_jsx(motion.div, { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: "auto", opacity: 1, y: 0 }, exit: { height: 0, opacity: 0, y: -8 }, transition: { duration: 0.2, ease: "easeOut" }, className: "overflow-hidden", children: _jsxs("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Selected day" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedWeekday.label })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onWeekdayClick ? (_jsx("button", { type: "button", className: "shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700", onClick: () => onWeekdayClick(selectedWeekday.weekday, selectedWeekday.label), children: "show items" })) : null, _jsx("button", { type: "button", "aria-label": "Close selection", className: "grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500", onClick: () => setSelectedWeekday(null), children: "\u00D7" })] })] }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600", children: "Items sold" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedWeekday.itemsSold })] }), _jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600", children: "Revenue" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: formatKr(selectedWeekday.revenue) })] })] })] }) }, selectedWeekday.weekday)) : null })] })] }));
}
