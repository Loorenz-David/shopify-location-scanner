import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
export function TimeToSellChart({ data }) {
    const chartData = data
        .filter((item) => item.avgTimeToSellSeconds !== null)
        .map((item) => ({
        category: item.category,
        days: Math.round(((item.avgTimeToSellSeconds ?? 0) / 86_400) * 10) / 10,
    }))
        .sort((left, right) => left.days - right.days);
    return (_jsx(ResponsiveContainer, { width: "100%", height: 190, children: _jsxs(BarChart, { layout: "vertical", data: chartData, margin: { left: 8, right: 16, top: 4, bottom: 4 }, children: [_jsx(XAxis, { type: "number", tick: { fontSize: 11 }, unit: " d" }), _jsx(YAxis, { type: "category", dataKey: "category", tick: { fontSize: 11 }, width: 96 }), _jsx(Tooltip, { formatter: (value) => [`${Number(value ?? 0)} days`, "Avg time to sell"] }), _jsx(Bar, { dataKey: "days", fill: "#f59e0b", radius: [0, 4, 4, 0] })] }) }));
}
