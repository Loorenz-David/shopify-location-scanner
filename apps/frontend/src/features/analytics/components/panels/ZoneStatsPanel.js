import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "../../../../assets/icons";
import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { formatKr } from "../../domain/format-currency.domain";
import { selectAnalyticsIsLoadingZoneDetail, selectAnalyticsSelectedZone, selectAnalyticsSelectedZoneLevel, selectAnalyticsZoneDetail, selectAnalyticsZoneDateRange, selectAnalyticsZoneLevels, selectAnalyticsZoneTimePatterns, useAnalyticsStore, } from "../../stores/analytics.store";
import { useZoneDetailFlow } from "../../flows/use-zone-detail.flow";
import { CategoryBarChart, } from "../charts/CategoryBarChart";
import { SalesTimePatternsChart } from "../charts/SalesTimePatternsChart";
import { SalesTimelineChart } from "../charts/SalesTimelineChart";
import { DateRangePicker } from "../shared/DateRangePicker";
export function ZoneStatsPanel() {
    useZoneDetailFlow();
    const [chartsReady, setChartsReady] = useState(false);
    const [categoryChartMode, setCategoryChartMode] = useState("pie");
    const [categoryMetric, setCategoryMetric] = useState("itemsSold");
    const [velocityMetric, setVelocityMetric] = useState("itemsSold");
    const [zonePatternsMetric, setZonePatternsMetric] = useState("itemsSold");
    const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
    const selectedZoneLevel = useAnalyticsStore(selectAnalyticsSelectedZoneLevel);
    const zoneLevels = useAnalyticsStore(selectAnalyticsZoneLevels);
    const zoneDetail = useAnalyticsStore(selectAnalyticsZoneDetail);
    const zoneDateRange = useAnalyticsStore(selectAnalyticsZoneDateRange);
    const zoneTimePatterns = useAnalyticsStore(selectAnalyticsZoneTimePatterns);
    const isLoadingZoneDetail = useAnalyticsStore(selectAnalyticsIsLoadingZoneDetail);
    const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
    const setSelectedZoneLevel = useAnalyticsStore((state) => state.setSelectedZoneLevel);
    const setZoneDateRange = useAnalyticsStore((state) => state.setZoneDateRange);
    // Delay chart mounting until after the 240ms slide animation completes
    useEffect(() => {
        if (!selectedZone) {
            setChartsReady(false);
            return;
        }
        const id = setTimeout(() => setChartsReady(true), 260);
        return () => clearTimeout(id);
    }, [selectedZone]);
    function handleZoneDateChange(range) {
        setZoneDateRange(range);
    }
    return (_jsx(AnimatePresence, { children: selectedZone ? (_jsxs(motion.aside, { className: "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-slate-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]", initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { duration: 0.24, ease: "easeOut" }, children: [_jsxs("header", { className: "flex items-center justify-between border-b border-slate-900/10 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Zone" }), _jsx("h2", { className: "m-0 mt-1 text-base font-bold text-slate-900", children: selectedZone })] }), _jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500", onClick: () => setSelectedZone(null), "aria-label": "Close zone stats", children: _jsx(CloseIcon, { className: "h-4 w-4", "aria-hidden": "true" }) })] }), zoneLevels && zoneLevels.length > 0 ? (_jsxs("div", { className: "border-b border-slate-900/10 px-4 py-2", children: [_jsx("p", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400", children: "Floor" }), _jsxs("div", { className: "flex flex-wrap gap-1.5", children: [_jsx("button", { type: "button", onClick: () => setSelectedZoneLevel(null), className: `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${selectedZoneLevel === null
                                        ? "border-teal-500 bg-teal-500 text-white"
                                        : "border-slate-200 text-slate-500 hover:border-slate-300"}`, children: "All" }), zoneLevels.map((l) => (_jsx("button", { type: "button", onClick: () => setSelectedZoneLevel(l.level), className: `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${selectedZoneLevel === l.level
                                        ? "border-teal-500 bg-teal-500 text-white"
                                        : "border-slate-200 text-slate-500 hover:border-slate-300"}`, children: l.level }, l.level)))] })] })) : null, _jsx("div", { className: "border-b border-slate-900/10 px-4 py-3", children: _jsx(DateRangePicker, { value: zoneDateRange, onChange: handleZoneDateChange }) }), _jsx("p", { className: "m-0 px-4 pb-2 pt-2 text-xs text-slate-400", children: "Physical sales only. Webshop orders excluded." }), isLoadingZoneDetail ? (_jsx("div", { className: "flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500", children: "Loading zone stats..." })) : zoneDetail ? (_jsxs("div", { className: "flex flex-col gap-5 px-4 py-4", children: [_jsx(ZoneKpiRow, { zone: selectedZone, kpis: zoneDetail.kpis, zoneDateRange: zoneDateRange }), chartsReady ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "pb-2", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Category performance" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setCategoryMetric(m), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${categoryMetric === m
                                                            ? "border-teal-500 bg-teal-500 text-white"
                                                            : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: [_jsx("div", { className: "mb-2 flex justify-end", children: _jsx("div", { className: "flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1", children: ["pie", "bar"].map((mode) => (_jsx("button", { type: "button", onClick: () => setCategoryChartMode(mode), className: `rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${categoryChartMode === mode
                                                                ? "bg-teal-500 text-white"
                                                                : "text-slate-500 hover:bg-white hover:text-teal-700"}`, children: mode === "pie" ? "Pie" : "Bar" }, mode))) }) }), _jsx(CategoryBarChart, { data: zoneDetail.categories, mode: categoryChartMode, metric: categoryMetric, onBarClick: (category) => {
                                                        statsItemsOverlayActions.open({
                                                            title: `${category} in ${selectedZone}`,
                                                            cardMode: "zone-standard",
                                                            query: {
                                                                isSold: true,
                                                                latestLocation: selectedZone,
                                                                from: zoneDateRange.from,
                                                                to: zoneDateRange.to,
                                                                itemCategory: category,
                                                                sortBy: "lastKnownPrice",
                                                                sortDir: "desc",
                                                                groupByOrder: false,
                                                            },
                                                        });
                                                    } })] })] }), _jsxs("div", { className: "pb-2", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sales over time" }), _jsx("div", { className: "flex items-center gap-2", children: _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setVelocityMetric(m), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${velocityMetric === m
                                                                ? "border-indigo-500 bg-indigo-500 text-white"
                                                                : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) }) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesTimelineChart, { data: zoneDetail.dailySeries, metric: velocityMetric, onShowItemsClick: (date) => {
                                                    statsItemsOverlayActions.open({
                                                        title: `Zone ${selectedZone} — ${date}`,
                                                        cardMode: "zone-standard",
                                                        query: {
                                                            isSold: true,
                                                            latestLocation: selectedZone,
                                                            from: date,
                                                            to: date,
                                                            sortBy: "lastModifiedAt",
                                                            sortDir: "desc",
                                                            groupByOrder: true,
                                                        },
                                                    });
                                                } }) })] }), zoneTimePatterns ? (_jsxs("div", { className: "pb-2", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Time patterns" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setZonePatternsMetric(m), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${zonePatternsMetric === m
                                                            ? "border-indigo-500 bg-indigo-500 text-white"
                                                            : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesTimePatternsChart, { data: zoneTimePatterns, metric: zonePatternsMetric, onHourClick: (hour, label) => statsItemsOverlayActions.open({
                                                    query: {
                                                        isSold: true,
                                                        latestLocation: selectedZone,
                                                        from: zoneDateRange.from,
                                                        to: zoneDateRange.to,
                                                        hourOfDay: hour,
                                                        sortBy: "timeToSell",
                                                        sortDir: "asc",
                                                    },
                                                    cardMode: "zone-standard",
                                                    title: `${selectedZone} — Sales at ${label}`,
                                                    controls: {
                                                        showTimeToSellSort: true,
                                                    },
                                                }), onWeekdayClick: (weekday, label) => statsItemsOverlayActions.open({
                                                    query: {
                                                        isSold: true,
                                                        latestLocation: selectedZone,
                                                        from: zoneDateRange.from,
                                                        to: zoneDateRange.to,
                                                        weekday,
                                                        sortBy: "timeToSell",
                                                        sortDir: "asc",
                                                    },
                                                    cardMode: "zone-standard",
                                                    title: `${selectedZone} — Sales on ${label}s`,
                                                    controls: {
                                                        showTimeToSellSort: true,
                                                    },
                                                }) }) })] })) : null] })) : null] })) : (_jsx("div", { className: "flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500", children: "No stats are available for this zone yet." }))] })) : null }));
}
function ZoneKpiRow({ zone, kpis, zoneDateRange }) {
    return (_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `Zone ${zone} — Sold`,
                        cardMode: "zone-standard",
                        query: {
                            isSold: true,
                            latestLocation: zone,
                            from: zoneDateRange.from,
                            to: zoneDateRange.to,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: true,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sold" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: kpis.itemsSold })] }), _jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `Zone ${zone} — Revenue`,
                        cardMode: "zone-standard",
                        query: {
                            isSold: true,
                            latestLocation: zone,
                            from: zoneDateRange.from,
                            to: zoneDateRange.to,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: true,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Revenue" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: formatKr(kpis.revenue) })] }), _jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `Zone ${zone} — Avg sell time`,
                        cardMode: "zone-standard",
                        query: {
                            isSold: true,
                            latestLocation: zone,
                            from: zoneDateRange.from,
                            to: zoneDateRange.to,
                            sortBy: "timeToSell",
                            sortDir: "asc",
                            groupByOrder: true,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Avg sell time" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: kpis.avgTimeToSellSeconds !== null
                            ? formatSeconds(kpis.avgTimeToSellSeconds)
                            : "—" })] }), _jsxs("button", { type: "button", className: "flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50", onClick: () => {
                    statsItemsOverlayActions.open({
                        title: `Zone ${zone} — Received`,
                        cardMode: "zone-standard",
                        query: {
                            latestLocation: zone,
                            from: zoneDateRange.from,
                            to: zoneDateRange.to,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: false,
                        },
                        controls: {
                            showStatusFilter: true,
                            showSortToggle: true,
                        },
                    });
                }, children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Received" }), _jsx("span", { className: "mt-1 text-lg font-bold text-slate-900", children: kpis.itemsReceived })] })] }));
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
