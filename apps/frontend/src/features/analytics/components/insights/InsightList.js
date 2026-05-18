import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { BackArrowIcon } from "../../../../assets/icons";
import { InfoSheet } from "../../../../share/info";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
import { InsightCard } from "./InsightCard";
import smartInsightsMarkdown from "../../docs/smart-insights.md?raw";
const MAX_VISIBLE = 4;
export function InsightList({ insights }) {
    const [activeInsight, setActiveInsight] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const markdownContent = useMemo(() => smartInsightsMarkdown?.trim() ?? "", []);
    if (insights.length === 0) {
        return null;
    }
    const visible = insights.slice(0, MAX_VISIBLE);
    const hiddenCount = insights.length - MAX_VISIBLE;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-2", children: [visible.map((insight, index) => (_jsx(InsightCard, { insight: insight, onOpenInfo: setActiveInsight }, `${insight.type}-${index}`))), hiddenCount > 0 && (_jsxs("button", { type: "button", className: "self-start text-xs text-slate-500 underline underline-offset-2", onClick: () => setShowAll(true), children: ["Show ", hiddenCount, " more insight", hiddenCount !== 1 ? "s" : ""] }))] }), _jsx(SlidingOverlayContainer, { isOpen: showAll, title: "All insights", children: _jsxs("div", { className: "flex h-full flex-col", children: [_jsx("button", { type: "button", "aria-label": "Close all insights", className: "flex-1 cursor-default", onClick: () => setShowAll(false) }), _jsxs("section", { className: "max-h-[85svh] overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]", children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-slate-900/10 px-4 py-3", children: [_jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-600", onClick: () => setShowAll(false), "aria-label": "Close all insights", children: _jsx(BackArrowIcon, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsxs("div", { children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Insights" }), _jsx("h2", { className: "m-0 mt-1 text-base font-bold text-slate-900", children: "All insights" })] })] }), _jsx("div", { className: "flex flex-col gap-2 px-4 py-4", children: insights.map((insight, index) => (_jsx(InsightCard, { insight: insight, onOpenInfo: (i) => {
                                            setShowAll(false);
                                            setActiveInsight(i);
                                        } }, `all-${insight.type}-${index}`))) })] })] }) }), _jsx(InfoSheet, { isOpen: activeInsight !== null, title: "Understanding this insight", markdown: markdownContent, onClose: () => setActiveInsight(null), pinnedContent: activeInsight ? _jsx(InsightCard, { insight: activeInsight }) : undefined })] }));
}
