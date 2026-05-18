import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function KpiCard({ label, value, sub }) {
    return (_jsxs("article", { className: "flex min-w-0 flex-col rounded-2xl border border-slate-900/10 bg-white/90 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: [_jsx("span", { className: "text-lg font-bold text-slate-900", children: value }), _jsx("span", { className: "mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: label }), sub ? (_jsx("span", { className: "mt-1 text-xs text-slate-400", children: sub })) : null] }));
}
