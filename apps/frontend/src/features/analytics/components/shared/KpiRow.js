import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatKr } from "../../domain/format-currency.domain";
import { KpiCard } from "./KpiCard";
function formatAvgTimeToSell(value) {
    if (value === null) {
        return "—";
    }
    const days = Math.floor(value / 86_400);
    if (days > 0) {
        return `${days}d`;
    }
    const hours = Math.floor(value / 3_600);
    if (hours > 0) {
        return `${hours}h`;
    }
    const minutes = Math.floor(value / 60);
    return `${Math.max(minutes, 1)}m`;
}
export function KpiRow({ itemsSold, revenue, avgTimeToSellSeconds, itemsReceived, }) {
    return (_jsxs("div", { className: "grid grid-cols-2 gap-2 py-1", children: [_jsx(KpiCard, { label: "Sold", value: itemsSold }), _jsx(KpiCard, { label: "Revenue", value: formatKr(revenue) }), _jsx(KpiCard, { label: "Avg sell time", value: formatAvgTimeToSell(avgTimeToSellSeconds) }), typeof itemsReceived === "number" ? (_jsx(KpiCard, { label: "Received", value: itemsReceived })) : null] }));
}
