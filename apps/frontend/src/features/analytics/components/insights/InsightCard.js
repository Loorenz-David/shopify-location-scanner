import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { InfoButton } from "../../../../share/info";
export const insightCardStyleMap = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
};
export const insightCardIconMap = {
    positive: "UP",
    warning: "!",
    neutral: "i",
};
export function InsightCard({ insight, onOpenInfo }) {
    return (_jsx("article", { className: `rounded-2xl border px-3 py-2 text-xs font-medium ${insightCardStyleMap[insight.type]}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex min-w-0 items-start gap-2", children: [_jsx("span", { className: "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 text-[11px] font-bold", children: insightCardIconMap[insight.type] }), _jsx("span", { className: "min-w-0", children: insight.message })] }), onOpenInfo ? (_jsx(InfoButton, { onClick: () => onOpenInfo(insight), label: "Learn more about this insight", className: "mt-[-2px]" })) : null] }) }));
}
