import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LOGISTIC_INTENTION_LABELS, LOGISTIC_INTENTION_ORDER, } from "../domain/logistic-tasks.domain";
export function LogisticTasksTabMenu({ intentionCounts, activeTab, onSelectTab, }) {
    const visibleIntentions = LOGISTIC_INTENTION_ORDER.filter((intention) => (intentionCounts[intention] ?? 0) > 0);
    if (visibleIntentions.length === 0)
        return null;
    return (_jsx("div", { className: "relative z-30 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none", children: visibleIntentions.map((intention) => {
            const count = intentionCounts[intention] ?? 0;
            const isActive = activeTab === intention;
            return (_jsxs("button", { type: "button", className: `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isActive
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-200 bg-white/80 text-slate-700"}`, onClick: () => onSelectTab(isActive ? null : intention), children: [LOGISTIC_INTENTION_LABELS[intention], _jsx("span", { className: `inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${isActive
                            ? "bg-white/30 text-white"
                            : "bg-slate-200 text-slate-700"}`, children: count })] }, intention));
        }) }));
}
