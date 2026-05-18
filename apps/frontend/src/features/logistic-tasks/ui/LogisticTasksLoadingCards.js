import { jsx as _jsx } from "react/jsx-runtime";
export function LogisticTasksLoadingCards() {
    return (_jsx("div", { className: "flex flex-col gap-3 px-5 pt-12", children: [1, 2, 3, 4].map((n) => (_jsx("div", { className: "h-20 animate-pulse rounded-xl border border-slate-900/10 bg-white/70" }, n))) }));
}
