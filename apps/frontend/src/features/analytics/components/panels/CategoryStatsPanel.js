import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "../../../../assets/icons";
import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { formatKr } from "../../domain/format-currency.domain";
import { useCategoryDetailFlow } from "../../flows/use-category-detail.flow";
import { selectAnalyticsCategories, selectAnalyticsCategoryDateRange, selectAnalyticsCategoryDetail, selectAnalyticsCategoryTimePatterns, selectAnalyticsIsLoadingCategoryDetail, selectAnalyticsSelectedCategory, useAnalyticsStore, } from "../../stores/analytics.store";
import { CategoryByLocationChart } from "../charts/CategoryByLocationChart";
import { SalesTimePatternsChart } from "../charts/SalesTimePatternsChart";
import { DateRangePicker } from "../shared/DateRangePicker";
export function CategoryStatsPanel() {
    useCategoryDetailFlow();
    const [chartsReady, setChartsReady] = useState(false);
    const [categoryPatternsMetric, setCategoryPatternsMetric] = useState("itemsSold");
    const [categoryLocationMetric, setCategoryLocationMetric] = useState("itemsSold");
    const [categoryLocationMode, setCategoryLocationMode] = useState("bar");
    const selectedCategory = useAnalyticsStore(selectAnalyticsSelectedCategory);
    const categoryDetail = useAnalyticsStore(selectAnalyticsCategoryDetail);
    const categoryDateRange = useAnalyticsStore(selectAnalyticsCategoryDateRange);
    const categoryTimePatterns = useAnalyticsStore(selectAnalyticsCategoryTimePatterns);
    const isLoadingCategoryDetail = useAnalyticsStore(selectAnalyticsIsLoadingCategoryDetail);
    const categories = useAnalyticsStore(selectAnalyticsCategories);
    const setSelectedCategory = useAnalyticsStore((state) => state.setSelectedCategory);
    const setCategoryDateRange = useAnalyticsStore((state) => state.setCategoryDateRange);
    // Delay chart mounting until after the 240ms slide animation completes
    useEffect(() => {
        if (!selectedCategory) {
            setChartsReady(false);
            return;
        }
        const id = setTimeout(() => setChartsReady(true), 260);
        return () => clearTimeout(id);
    }, [selectedCategory]);
    const overview = categories.find((category) => category.category === selectedCategory);
    return (_jsx(AnimatePresence, { children: selectedCategory ? (_jsxs(motion.aside, { className: "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-slate-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]", initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.24, ease: "easeOut" }, children: [_jsxs("header", { className: "flex items-center justify-between border-b border-slate-900/10 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Category" }), _jsx("h2", { className: "m-0 mt-1 text-base font-bold text-slate-900", children: selectedCategory })] }), _jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500", onClick: () => setSelectedCategory(null), "aria-label": "Close category stats", children: _jsx(CloseIcon, { className: "h-4 w-4", "aria-hidden": "true" }) })] }), _jsx("div", { className: "border-b border-slate-900/10 px-4 py-3", children: _jsx(DateRangePicker, { value: categoryDateRange, onChange: setCategoryDateRange }) }), isLoadingCategoryDetail ? (_jsx("div", { className: "flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500", children: "Loading category stats..." })) : (_jsxs("div", { className: "flex flex-col gap-5 px-4 py-4", children: [overview ? (_jsx(CategoryKpiRow, { category: selectedCategory, overview: overview, categoryDateRange: categoryDateRange })) : null, overview?.bestLocationByVolume || overview?.bestLocationByRevenue ? (_jsx("div", { className: "rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800", children: overview.bestLocationByVolume === overview.bestLocationByRevenue ? (_jsxs("p", { className: "m-0", children: ["Best location: ", _jsx("strong", { children: overview.bestLocationByVolume })] })) : (_jsxs("div", { className: "flex flex-col gap-1", children: [overview.bestLocationByVolume ? (_jsxs("p", { className: "m-0", children: ["Best for volume: ", _jsx("strong", { children: overview.bestLocationByVolume })] })) : null, overview.bestLocationByRevenue ? (_jsxs("p", { className: "m-0", children: ["Best for value: ", _jsx("strong", { children: overview.bestLocationByRevenue })] })) : null] })) })) : null, chartsReady ? (_jsxs(_Fragment, { children: [categoryDetail && categoryDetail.length > 0 ? (_jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-start justify-between gap-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Performance by location" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setCategoryLocationMetric(m), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${categoryLocationMetric === m
                                                            ? "border-sky-500 bg-sky-500 text-white"
                                                            : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: [_jsx("div", { className: "mb-3 flex justify-end", children: _jsx("div", { className: "flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1", children: ["pie", "bar"].map((m) => (_jsx("button", { type: "button", onClick: () => setCategoryLocationMode(m), className: `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${categoryLocationMode === m
                                                                ? "bg-sky-600 text-white"
                                                                : "text-slate-500 hover:bg-white hover:text-sky-700"}`, children: m === "pie" ? "Pie" : "Bar" }, m))) }) }), _jsx(CategoryByLocationChart, { data: categoryDetail, metric: categoryLocationMetric, mode: categoryLocationMode, onLocationClick: (location) => statsItemsOverlayActions.open({
                                                        query: {
                                                            isSold: true,
                                                            itemCategory: selectedCategory ?? undefined,
                                                            latestLocation: location,
                                                            from: categoryDateRange.from,
                                                            to: categoryDateRange.to,
                                                            sortBy: "lastModifiedAt",
                                                            sortDir: "desc",
                                                        },
                                                        cardMode: "sold-default",
                                                        title: `${selectedCategory} — ${location}`,
                                                    }) })] })] })) : (_jsx("p", { className: "text-sm text-slate-500", children: "No per-location data is available for this category yet." })), categoryTimePatterns ? (_jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Time patterns" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setCategoryPatternsMetric(m), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${categoryPatternsMetric === m
                                                            ? "border-sky-500 bg-sky-500 text-white"
                                                            : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesTimePatternsChart, { data: categoryTimePatterns, metric: categoryPatternsMetric, onHourClick: (hour, label) => statsItemsOverlayActions.open({
                                                    query: {
                                                        isSold: true,
                                                        itemCategory: selectedCategory,
                                                        from: categoryDateRange.from,
                                                        to: categoryDateRange.to,
                                                        hourOfDay: hour,
                                                        sortBy: "lastModifiedAt",
                                                        sortDir: "desc",
                                                    },
                                                    cardMode: "sold-default",
                                                    title: `${selectedCategory} — Sales at ${label}`,
                                                }), onWeekdayClick: (weekday, label) => statsItemsOverlayActions.open({
                                                    query: {
                                                        isSold: true,
                                                        itemCategory: selectedCategory,
                                                        from: categoryDateRange.from,
                                                        to: categoryDateRange.to,
                                                        weekday,
                                                        sortBy: "lastModifiedAt",
                                                        sortDir: "desc",
                                                    },
                                                    cardMode: "sold-default",
                                                    title: `${selectedCategory} — Sales on ${label}s`,
                                                }) }) })] })) : null] })) : null] }))] })) : null }));
}
function CategoryKpiRow({ category, overview, categoryDateRange, }) {
    return (_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `${category} — Sold`,
                        cardMode: "sold-default",
                        query: {
                            isSold: true,
                            itemCategory: category,
                            from: categoryDateRange.from,
                            to: categoryDateRange.to,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: false,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sold" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: overview.itemsSold })] }), _jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `${category} — Revenue`,
                        cardMode: "sold-default",
                        query: {
                            isSold: true,
                            itemCategory: category,
                            from: categoryDateRange.from,
                            to: categoryDateRange.to,
                            sortBy: "lastKnownPrice",
                            sortDir: "desc",
                            groupByOrder: false,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Revenue" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: formatKr(overview.totalRevenue) })] }), _jsxs("button", { type: "button", className: "col-span-2 flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `${category} — Avg sell time`,
                        cardMode: "avg-sell-time",
                        query: {
                            isSold: true,
                            itemCategory: category,
                            from: categoryDateRange.from,
                            to: categoryDateRange.to,
                            sortBy: "timeToSell",
                            sortDir: "asc",
                            groupByOrder: false,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Avg sell time" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: overview.avgTimeToSellSeconds !== null
                            ? formatSeconds(overview.avgTimeToSellSeconds)
                            : "—" })] })] }));
}
function formatSeconds(seconds) {
    const days = Math.floor(seconds / 86400);
    if (days > 0)
        return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0)
        return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
}
