import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
export function DimensionBucketChart({ data, title, selectedBucket = null, onBucketClick, onShowItemsClick, onCloseSelection, }) {
    return (_jsxs("section", { children: [_jsx("p", { className: "mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: title }), _jsx("div", { className: "analytics-chart-shell", children: _jsx(ResponsiveContainer, { width: "100%", height: 170, children: _jsxs(BarChart, { accessibilityLayer: false, tabIndex: -1, data: data, margin: { left: 0, right: 8, top: 4, bottom: 4 }, children: [_jsx(XAxis, { dataKey: "label", tick: { fontSize: 10 } }), _jsx(YAxis, { tick: { fontSize: 10 } }), _jsx(Tooltip, { content: () => null, cursor: false }), _jsx(Legend, { iconSize: 10, wrapperStyle: { fontSize: 10 } }), _jsx(Bar, { dataKey: "soldCount", name: "Sold", fill: "#22c55e", radius: [4, 4, 0, 0], activeBar: false, onMouseDown: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, onTouchStart: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, onClick: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, children: data.map((bucket) => (_jsx(Cell, { fill: "#22c55e", stroke: selectedBucket?.bucket === bucket.bucket ? "#0ea5e9" : "transparent", strokeWidth: 2 }, bucket.bucket))) }), _jsx(Bar, { dataKey: "totalCount", name: "Total", fill: "#cbd5e1", radius: [4, 4, 0, 0], activeBar: false, onMouseDown: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, onTouchStart: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, onClick: (entry) => {
                                    const bucket = getBucketFromBarEntry(entry);
                                    if (bucket)
                                        onBucketClick?.(bucket);
                                }, children: data.map((bucket) => (_jsx(Cell, { fill: "#cbd5e1", stroke: selectedBucket?.bucket === bucket.bucket ? "#0ea5e9" : "transparent", strokeWidth: 2 }, bucket.bucket))) })] }) }) }), _jsx(AnimatePresence, { initial: false, children: selectedBucket ? (_jsx(motion.div, { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: "auto", opacity: 1, y: 0 }, exit: { height: 0, opacity: 0, y: -8 }, transition: { duration: 0.2, ease: "easeOut" }, className: "overflow-hidden", children: _jsxs("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Selected range" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedBucket.label })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onShowItemsClick ? (_jsx("button", { type: "button", className: "shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700", onClick: () => onShowItemsClick(selectedBucket), children: "show items" })) : null, onCloseSelection ? (_jsx("button", { type: "button", "aria-label": "Close selection details", className: "grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500", onClick: onCloseSelection, children: "\u00D7" })) : null] })] }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600", children: "Sold" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedBucket.soldCount })] }), _jsxs("div", { className: "rounded-xl bg-white px-3 py-2 shadow-sm", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Total" }), _jsx("p", { className: "m-0 mt-1 text-sm font-semibold text-slate-900", children: selectedBucket.totalCount })] })] })] }) }, selectedBucket.bucket)) : null })] }));
}
function getBucketFromBarEntry(entry) {
    return entry.payload;
}
