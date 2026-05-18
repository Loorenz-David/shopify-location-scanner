import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LEGEND = [
    { color: "#22c55e", label: "High" },
    { color: "#84cc16", label: "Good" },
    { color: "#f59e0b", label: "Low" },
    { color: "#ef4444", label: "Minimal" },
    { color: "#94a3b8", label: "No data" },
];
export function FloorMapLegend({ metric = "itemsSold", }) {
    return (_jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-3", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: metric === "revenue" ? "Revenue heat" : "Items heat" }), LEGEND.map((item) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-3 w-3 rounded-sm", style: { backgroundColor: item.color } }), _jsx("span", { className: "text-xs text-slate-500", children: item.label })] }, item.label)))] }));
}
