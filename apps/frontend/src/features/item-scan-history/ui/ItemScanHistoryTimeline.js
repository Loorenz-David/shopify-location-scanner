import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ItemScanHistoryTimeline({ events, }) {
    return (_jsx("ol", { className: "m-0 flex list-none flex-col gap-3 p-0", children: events.map((event, index) => (_jsxs("li", { className: "grid grid-cols-[auto_1fr] gap-3", children: [_jsxs("div", { className: "flex min-h-14 flex-col items-center", children: [_jsx("span", { className: "mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" }), index < events.length - 1 ? (_jsx("span", { className: "mt-1 w-px flex-1 bg-slate-300", "aria-hidden": "true" })) : null] }), _jsxs("div", { className: "rounded-2xl bg-slate-50 px-3 py-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: event.happenedAtLabel }), _jsx("div", { className: "mt-1", children: event.kind === "scan" && event.eventType === "sold_terminal" ? (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700", children: "Sold" }), event.orderId ? (_jsxs("p", { className: "m-0 break-all text-xs text-slate-500", children: ["Order: ", event.orderId] })) : null] })) : event.kind === "logistic" ? (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("p", { className: "m-0 text-sm font-semibold text-slate-900", children: event.location ?? formatLogisticEventLabel(event.eventType) }), event.description ? (_jsx("p", { className: "m-0 text-sm text-slate-600", children: event.description })) : null] })) : (_jsx("p", { className: "m-0 text-sm font-semibold text-slate-900", children: event.eventType === "unknown_position"
                                    ? "Unknown"
                                    : event.location })) }), _jsx("p", { className: "m-0 mt-1 text-sm text-slate-600", children: event.username })] })] }, event.id))) }));
}
function formatLogisticEventLabel(eventType) {
    switch (eventType) {
        case "marked_intention":
            return "Marked intention";
        case "placed":
            return "Placed";
        case "fulfilled":
            return "Fulfilled";
        default:
            return eventType;
    }
}
