import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { BackArrowIcon } from "../../../assets/icons";
import { InfoButton, InfoSheet } from "../../../share/info";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { FloorMapCanvas } from "../components/floor-map/FloorMapCanvas";
import { FloorMapLegend } from "../components/floor-map/FloorMapLegend";
import { CategoryStatsPanel } from "../components/panels/CategoryStatsPanel";
import { ZoneStatsPanel } from "../components/panels/ZoneStatsPanel";
import { ZoneComparisonChart } from "../components/charts/ZoneComparisonChart";
import { ZoneRankingComparison } from "../components/charts/ZoneRankingComparison";
import { CategoryRankingComparison } from "../components/charts/CategoryRankingComparison";
import { SalesTimelineChart } from "../components/charts/SalesTimelineChart";
import { SalesChannelChart } from "../components/charts/SalesChannelChart";
import { SalesTimePatternsChart } from "../components/charts/SalesTimePatternsChart";
import { CategoryOverviewChart, } from "../components/charts/CategoryOverviewChart";
import { DimensionBucketChart } from "../components/charts/DimensionBucketChart";
import { InsightList } from "../components/insights/InsightList";
import { DateRangePicker } from "../components/shared/DateRangePicker";
import { StatsItemsOverlay } from "../components/items/StatsItemsOverlay";
import { statsItemsOverlayActions } from "../actions/stats-items-overlay.actions";
import categoriesOverviewMarkdown from "../docs/categories-overview.md?raw";
import dimensionInsightsMarkdown from "../docs/dimension-insights.md?raw";
import salesOverTimeChannelsMarkdown from "../docs/sales-over-time-channels.md?raw";
import zoneRankingMarkdown from "../docs/zone-ranking.md?raw";
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
import { useAnalyticsPageFlow } from "../flows/use-analytics-page.flow";
import { useFloorMapFlow } from "../flows/use-floor-map.flow";
import { useFloorPlansFlow } from "../flows/use-floor-plans.flow";
import { selectAnalyticsCategories, selectAnalyticsChannelOverview, selectAnalyticsDateRange, selectAnalyticsDimensions, selectAnalyticsInsights, selectAnalyticsSelectedZone, selectAnalyticsTimePatterns, selectAnalyticsTimePatternsCompare, selectAnalyticsVelocity, selectAnalyticsVelocityChannel, selectAnalyticsZoneComparisonMetric, selectAnalyticsZonesOverview, useAnalyticsStore, } from "../stores/analytics.store";
import { selectActiveFloorPlan, useFloorPlanStore, } from "../stores/floor-plan.store";
// ---------------------------------------------------------------------------
// Lazy mount hook — mounts once the sentinel div scrolls into view
// ---------------------------------------------------------------------------
function useLazyMount() {
    const [mounted, setMounted] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (mounted)
            return;
        const el = ref.current;
        if (!el)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setMounted(true);
                observer.disconnect();
            }
        }, { rootMargin: "200px" });
        observer.observe(el);
        return () => observer.disconnect();
    }, [mounted]);
    return { ref, mounted };
}
// ---------------------------------------------------------------------------
// AnalyticsDataLoader — side-effect only, renders nothing
// ---------------------------------------------------------------------------
function AnalyticsDataLoader() {
    useAnalyticsPageFlow();
    useFloorPlansFlow();
    return null;
}
// ---------------------------------------------------------------------------
// FloorMapSection
// ---------------------------------------------------------------------------
const FloorMapSection = memo(function FloorMapSection() {
    const [metric, setMetric] = useState("itemsSold");
    const containerRef = useRef(null);
    const floorMap = useFloorMapFlow(containerRef);
    const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
    const zonesOverview = useAnalyticsStore(selectAnalyticsZonesOverview);
    const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
    const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Floor map" }), _jsx("div", { className: "flex gap-1", children: [
                            { key: "itemsSold", label: "Items sold" },
                            { key: "revenue", label: "Revenue" },
                        ].map(({ key, label }) => (_jsx("button", { type: "button", onClick: () => setMetric(key), className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${metric === key
                                ? "border-sky-600 bg-sky-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: label }, key))) })] }), _jsx("div", { ref: containerRef, className: "pb-2", style: { minHeight: "70svh" }, children: _jsx(FloorMapCanvas, { zones: floorMap.zones, zonesOverview: zonesOverview, stageWidth: floorMap.stageWidth, stageHeight: floorMap.stageHeight, selectedZone: selectedZone, onZoneTap: setSelectedZone, activeFloorPlan: activeFloorPlan, metric: metric }) }), _jsx("div", { className: "pb-8", children: _jsx(FloorMapLegend, { metric: metric }) })] }));
});
// ---------------------------------------------------------------------------
// ZoneRankingSection
// ---------------------------------------------------------------------------
const ZoneRankingSection = memo(function ZoneRankingSection() {
    const [zoneRankingTab, setZoneRankingTab] = useState("itemsSold");
    const [zoneComparisonChartMode, setZoneComparisonChartMode] = useState("pie");
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const zonesOverview = useAnalyticsStore(selectAnalyticsZonesOverview);
    const zoneComparisonMetric = useAnalyticsStore(selectAnalyticsZoneComparisonMetric);
    const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
    const setZoneComparisonMetric = useAnalyticsStore((state) => state.setZoneComparisonMetric);
    return (_jsxs("div", { className: "pb-8", children: [_jsxs("div", { className: "mb-2 flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Zone ranking" }), _jsx(InfoButton, { onClick: () => setIsInfoOpen(true), label: "Learn more about zone ranking", className: "h-6 w-6 bg-white/80 text-[10px] text-slate-500" })] }), _jsx("div", { className: "flex gap-1", children: [
                            { key: "itemsSold", label: "Items" },
                            { key: "revenue", label: "Revenue" },
                            { key: "compare", label: "Compare" },
                        ].map(({ key, label }) => (_jsx("button", { type: "button", onClick: () => {
                                setZoneRankingTab(key);
                                if (key !== "compare")
                                    setZoneComparisonMetric(key);
                            }, className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${zoneRankingTab === key
                                ? "border-sky-600 bg-sky-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: label }, key))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: zoneRankingTab === "compare" ? (_jsx(ZoneRankingComparison, { data: zonesOverview, onZoneClick: setSelectedZone })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-3 flex justify-end", children: _jsx("div", { className: "flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1", children: ["pie", "bar"].map((mode) => (_jsx("button", { type: "button", onClick: () => setZoneComparisonChartMode(mode), className: `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${zoneComparisonChartMode === mode
                                        ? "bg-sky-600 text-white"
                                        : "text-slate-500 hover:bg-white hover:text-sky-700"}`, children: mode === "pie" ? "Pie" : "Bar" }, mode))) }) }), _jsx(ZoneComparisonChart, { data: zonesOverview, metric: zoneComparisonMetric, mode: zoneComparisonChartMode, onBarClick: setSelectedZone })] })) }), _jsx(InfoSheet, { isOpen: isInfoOpen, title: "Understanding zone ranking", markdown: zoneRankingMarkdown, onClose: () => setIsInfoOpen(false), pinnedContent: _jsxs("div", { className: "rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600", children: "Current view" }), _jsxs("p", { className: "m-0 mt-1 font-semibold", children: [zoneComparisonMetric === "itemsSold" ? "Items" : "Revenue", " in", " ", zoneComparisonChartMode === "pie" ? "Pie" : "Bar", " mode"] }), _jsx("p", { className: "m-0 mt-1 text-sm leading-6 text-sky-800", children: "Zones are ranked from highest to lowest for the selected metric in the current date range." })] }) })] }));
});
// ---------------------------------------------------------------------------
// CategoriesSection
// ---------------------------------------------------------------------------
const CategoriesSection = memo(function CategoriesSection() {
    const [categoryChartMode, setCategoryChartMode] = useState("pie");
    const [categoryRankingTab, setCategoryRankingTab] = useState("itemsSold");
    const [activeCategoryOverview, setActiveCategoryOverview] = useState(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const categories = useAnalyticsStore(selectAnalyticsCategories);
    const setSelectedCategory = useAnalyticsStore((state) => state.setSelectedCategory);
    const handleSelectCategory = useCallback((category) => {
        setActiveCategoryOverview(category);
        setSelectedCategory(category);
    }, [setSelectedCategory]);
    return (_jsxs("div", { className: "pb-8", children: [_jsxs("div", { className: "mb-2 flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Categories" }), _jsx(InfoButton, { onClick: () => setIsInfoOpen(true), label: "Learn more about categories overview", className: "h-6 w-6 bg-white/80 text-[10px] text-slate-500" })] }), _jsx("div", { className: "flex gap-1", children: [
                            { key: "itemsSold", label: "Items" },
                            { key: "totalRevenue", label: "Revenue" },
                            { key: "compare", label: "Compare" },
                        ].map(({ key, label }) => (_jsx("button", { type: "button", onClick: () => setCategoryRankingTab(key), className: `rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${categoryRankingTab === key
                                ? "border-sky-600 bg-sky-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: label }, key))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: categoryRankingTab === "compare" ? (_jsx(CategoryRankingComparison, { data: categories, onCategoryClick: (category) => {
                        setActiveCategoryOverview(category);
                        setSelectedCategory(category);
                    } })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-3 flex items-center justify-end gap-2", children: _jsx("div", { className: "flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1", children: ["pie", "bar"].map((mode) => (_jsx("button", { type: "button", onClick: () => setCategoryChartMode(mode), className: `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${categoryChartMode === mode
                                        ? "bg-sky-600 text-white"
                                        : "text-slate-500 hover:bg-white hover:text-sky-700"}`, children: mode === "pie" ? "Pie" : "Bar" }, mode))) }) }), _jsx(CategoryOverviewChart, { data: categories, mode: categoryChartMode, metric: categoryRankingTab, activeCategory: activeCategoryOverview, onSelectCategory: handleSelectCategory })] })) }), _jsx(InfoSheet, { isOpen: isInfoOpen, title: "Understanding categories", markdown: categoriesOverviewMarkdown, onClose: () => setIsInfoOpen(false), pinnedContent: _jsxs("div", { className: "rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600", children: "Current view" }), _jsxs("p", { className: "m-0 mt-1 font-semibold", children: [categoryChartMode === "pie" ? "Pie" : "Bar", " mode"] }), _jsx("p", { className: "m-0 mt-1 text-sm leading-6 text-sky-800", children: "Categories are compared using sold activity and average sell time in the selected date range." })] }) })] }));
});
// ---------------------------------------------------------------------------
// SalesChannelSection
// ---------------------------------------------------------------------------
const SalesChannelSection = memo(function SalesChannelSection() {
    const [channelMetric, setChannelMetric] = useState("itemsSold");
    const channelOverview = useAnalyticsStore(selectAnalyticsChannelOverview);
    const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
    if (channelOverview.length === 0)
        return null;
    return (_jsxs("div", { className: "pb-8", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sales by channel" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "totalRevenue"].map((metric) => (_jsx("button", { type: "button", onClick: () => setChannelMetric(metric), className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${channelMetric === metric
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: metric === "itemsSold" ? "Items" : "Revenue" }, metric))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesChannelChart, { data: channelOverview, metric: channelMetric, onShowItemsClick: (channel) => statsItemsOverlayActions.open({
                        query: {
                            isSold: true,
                            lastSoldChannel: channel,
                            from: dateRange.from,
                            to: dateRange.to,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: true,
                        },
                        cardMode: "with-channel",
                        title: `${channel} — Sales`,
                        controls: {
                            showSortToggle: true,
                        },
                    }) }) })] }));
});
// ---------------------------------------------------------------------------
// SalesOverTimeSection
// ---------------------------------------------------------------------------
const SalesOverTimeSection = memo(function SalesOverTimeSection() {
    const [velocityMetric, setVelocityMetric] = useState("itemsSold");
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const velocity = useAnalyticsStore(selectAnalyticsVelocity);
    const velocityChannel = useAnalyticsStore(selectAnalyticsVelocityChannel);
    const velocityCompareSeries = useAnalyticsStore((state) => state.velocityCompareSeries);
    const setVelocityChannel = useAnalyticsStore((state) => state.setVelocityChannel);
    return (_jsxs("div", { className: "pb-8", children: [_jsxs("div", { className: "mb-2 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sales over time" }), _jsx(InfoButton, { onClick: () => setIsInfoOpen(true), label: "Learn more about sales channels", className: "h-6 w-6 bg-white/80 text-[10px] text-slate-500" })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setVelocityMetric(m), className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${velocityMetric === m
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: ["compare", "physical", "webshop"].map((channel) => (_jsx("button", { type: "button", onClick: () => setVelocityChannel(channel), className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${velocityChannel === channel
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: toVelocityChannelLabel(channel) }, channel))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesTimelineChart, { data: velocity, metric: velocityMetric, compareSeries: velocityChannel === "compare" ? velocityCompareSeries : null, onShowItemsClick: (date) => statsItemsOverlayActions.open({
                        query: {
                            isSold: true,
                            from: date,
                            to: date,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                            groupByOrder: true,
                        },
                        cardMode: "with-channel",
                        title: `Sales on ${date}`,
                        controls: {
                            salesChannelOptions: ["physical", "webshop"],
                        },
                    }) }) }), _jsx(InfoSheet, { isOpen: isInfoOpen, title: "Understanding sales channels", markdown: salesOverTimeChannelsMarkdown, onClose: () => setIsInfoOpen(false), pinnedContent: _jsxs("div", { className: "rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-900", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-500", children: "Current view" }), _jsx("p", { className: "m-0 mt-1 font-semibold", children: toVelocityChannelLabel(velocityChannel) }), _jsx("p", { className: "m-0 mt-1 text-sm leading-6 text-indigo-800", children: toVelocityChannelDescription(velocityChannel) })] }) })] }));
});
// ---------------------------------------------------------------------------
// TimePatternsSection
// ---------------------------------------------------------------------------
const TimePatternsSection = memo(function TimePatternsSection() {
    const [timePatternsMetric, setTimePatternsMetric] = useState("itemsSold");
    const [timePatternsChannel, setTimePatternsChannel] = useState("all");
    const timePatterns = useAnalyticsStore(selectAnalyticsTimePatterns);
    const timePatternsCompare = useAnalyticsStore(selectAnalyticsTimePatternsCompare);
    const setTimePatterns = useAnalyticsStore((state) => state.setTimePatterns);
    const setTimePatternsCompare = useAnalyticsStore((state) => state.setTimePatternsCompare);
    const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
    const loadTimePatternsForChannel = useCallback(async (channel) => {
        const { from, to } = dateRange;
        if (channel === "compare") {
            const [physical, webshop] = await Promise.all([
                getTimePatternsApi({ from, to, salesChannel: "physical" }),
                getTimePatternsApi({ from, to, salesChannel: "webshop" }),
            ]);
            setTimePatternsCompare({ physical, webshop });
        }
        else {
            setTimePatternsCompare(null);
            const data = await getTimePatternsApi({
                from,
                to,
                salesChannel: channel === "all" ? undefined : channel,
            });
            setTimePatterns(data);
        }
    }, [dateRange, setTimePatterns, setTimePatternsCompare]);
    if (!timePatterns)
        return null;
    return (_jsxs("div", { className: "pb-8", children: [_jsxs("div", { className: "mb-2 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Sales time patterns" }), _jsx("div", { className: "flex gap-1", children: ["itemsSold", "revenue"].map((m) => (_jsx("button", { type: "button", onClick: () => setTimePatternsMetric(m), className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${timePatternsMetric === m
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-slate-200 text-slate-500"}`, children: m === "itemsSold" ? "Items" : "Revenue" }, m))) })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: [
                            { key: "all", label: "All" },
                            { key: "physical", label: "Physical" },
                            { key: "webshop", label: "Webshop" },
                            { key: "compare", label: "Compare" },
                        ].map(({ key, label }) => (_jsx("button", { type: "button", onClick: () => {
                                setTimePatternsChannel(key);
                                void loadTimePatternsForChannel(key);
                            }, className: `rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${timePatternsChannel === key
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 text-slate-500"}`, children: label }, key))) })] }), _jsx("div", { className: "rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: _jsx(SalesTimePatternsChart, { data: timePatterns, metric: timePatternsMetric, compareData: timePatternsChannel === "compare" ? timePatternsCompare : null, onHourClick: (hour, label) => statsItemsOverlayActions.open({
                        query: {
                            isSold: true,
                            from: dateRange.from,
                            to: dateRange.to,
                            hourOfDay: hour,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                        },
                        cardMode: "with-channel",
                        title: `Sales at ${label}`,
                        controls: {
                            salesChannelOptions: ["physical", "webshop"],
                        },
                    }), onWeekdayClick: (weekday, label) => statsItemsOverlayActions.open({
                        query: {
                            isSold: true,
                            from: dateRange.from,
                            to: dateRange.to,
                            weekday,
                            sortBy: "lastModifiedAt",
                            sortDir: "desc",
                        },
                        cardMode: "with-channel",
                        title: `Sales on ${label}s`,
                        controls: {
                            salesChannelOptions: ["physical", "webshop"],
                        },
                    }) }) })] }));
});
// ---------------------------------------------------------------------------
// DimensionInsightsSection
// ---------------------------------------------------------------------------
const DimensionInsightsSection = memo(function DimensionInsightsSection() {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [selectedHeightBucket, setSelectedHeightBucket] = useState(null);
    const [selectedWidthBucket, setSelectedWidthBucket] = useState(null);
    const [selectedDepthBucket, setSelectedDepthBucket] = useState(null);
    const [selectedVolumeBucket, setSelectedVolumeBucket] = useState(null);
    const dimensions = useAnalyticsStore(selectAnalyticsDimensions);
    const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
    if (!dimensions)
        return null;
    return (_jsxs("div", { className: "pb-6", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx("p", { className: "m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500", children: "Dimension insights" }), _jsx(InfoButton, { onClick: () => setIsInfoOpen(true), label: "Learn more about dimension insights", className: "h-6 w-6 bg-white/80 text-[10px] text-slate-500" })] }), _jsxs("div", { className: "flex flex-col gap-4 rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]", children: [_jsx(DimensionBucketChart, { data: dimensions.height, title: "Height", selectedBucket: selectedHeightBucket, onBucketClick: setSelectedHeightBucket, onShowItemsClick: (bucket) => {
                            const r = parseDimensionRange(bucket.bucket);
                            statsItemsOverlayActions.open({
                                query: {
                                    isSold: true,
                                    from: dateRange.from,
                                    to: dateRange.to,
                                    ...(r?.min !== undefined ? { heightMin: r.min } : {}),
                                    ...(r?.max !== undefined ? { heightMax: r.max } : {}),
                                    sortBy: "lastModifiedAt",
                                    sortDir: "desc",
                                    groupByOrder: true,
                                },
                                cardMode: "dimensions",
                                title: `Height — ${bucket.label}`,
                                controls: {
                                    showStatusFilter: true,
                                    showSortToggle: true,
                                    salesChannelOptions: ["physical", "webshop"],
                                },
                            });
                        }, onCloseSelection: () => setSelectedHeightBucket(null) }), _jsx(DimensionBucketChart, { data: dimensions.width, title: "Width", selectedBucket: selectedWidthBucket, onBucketClick: setSelectedWidthBucket, onShowItemsClick: (bucket) => {
                            const r = parseDimensionRange(bucket.bucket);
                            statsItemsOverlayActions.open({
                                query: {
                                    isSold: true,
                                    from: dateRange.from,
                                    to: dateRange.to,
                                    ...(r?.min !== undefined ? { widthMin: r.min } : {}),
                                    ...(r?.max !== undefined ? { widthMax: r.max } : {}),
                                    sortBy: "lastModifiedAt",
                                    sortDir: "desc",
                                    groupByOrder: true,
                                },
                                cardMode: "dimensions",
                                title: `Width — ${bucket.label}`,
                                controls: {
                                    showStatusFilter: true,
                                    showSortToggle: true,
                                    salesChannelOptions: ["physical", "webshop"],
                                },
                            });
                        }, onCloseSelection: () => setSelectedWidthBucket(null) }), _jsx(DimensionBucketChart, { data: dimensions.depth, title: "Depth", selectedBucket: selectedDepthBucket, onBucketClick: setSelectedDepthBucket, onShowItemsClick: (bucket) => {
                            const r = parseDimensionRange(bucket.bucket);
                            statsItemsOverlayActions.open({
                                query: {
                                    isSold: true,
                                    from: dateRange.from,
                                    to: dateRange.to,
                                    ...(r?.min !== undefined ? { depthMin: r.min } : {}),
                                    ...(r?.max !== undefined ? { depthMax: r.max } : {}),
                                    sortBy: "lastModifiedAt",
                                    sortDir: "desc",
                                    groupByOrder: true,
                                },
                                cardMode: "dimensions",
                                title: `Depth — ${bucket.label}`,
                                controls: {
                                    showStatusFilter: true,
                                    showSortToggle: true,
                                    salesChannelOptions: ["physical", "webshop"],
                                },
                            });
                        }, onCloseSelection: () => setSelectedDepthBucket(null) }), _jsx(DimensionBucketChart, { data: dimensions.volume, title: "Volume", selectedBucket: selectedVolumeBucket, onBucketClick: setSelectedVolumeBucket, onShowItemsClick: (bucket) => statsItemsOverlayActions.open({
                            query: {
                                isSold: true,
                                from: dateRange.from,
                                to: dateRange.to,
                                volumeLabel: bucket.bucket,
                                sortBy: "lastModifiedAt",
                                sortDir: "desc",
                                groupByOrder: true,
                            },
                            cardMode: "dimensions",
                            title: `Volume — ${bucket.label}`,
                            controls: {
                                showStatusFilter: true,
                                showSortToggle: true,
                                salesChannelOptions: ["physical", "webshop"],
                            },
                        }), onCloseSelection: () => setSelectedVolumeBucket(null) })] }), _jsx(InfoSheet, { isOpen: isInfoOpen, title: "Understanding dimension insights", markdown: dimensionInsightsMarkdown, onClose: () => setIsInfoOpen(false), pinnedContent: _jsxs("div", { className: "rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900", children: [_jsx("p", { className: "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600", children: "Current view" }), _jsx("p", { className: "m-0 mt-1 font-semibold", children: "Height, width, depth, and volume buckets" }), _jsx("p", { className: "m-0 mt-1 text-sm leading-6 text-sky-800", children: "Each chart compares how many items existed in a size range versus how many sold during the selected period." })] }) })] }));
});
// ---------------------------------------------------------------------------
// AnalyticsPage — thin shell, minimal store subscriptions
// ---------------------------------------------------------------------------
export function AnalyticsPage() {
    const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
    const insights = useAnalyticsStore(selectAnalyticsInsights);
    const setDateRange = useAnalyticsStore((state) => state.setDateRange);
    // Lazy mount sentinels for below-fold sections
    const categoriesLazy = useLazyMount();
    const channelLazy = useLazyMount();
    const overTimeLazy = useLazyMount();
    const timePatternsLazy = useLazyMount();
    const dimensionsLazy = useLazyMount();
    return (_jsxs("section", { className: "mx-auto flex h-full min-h-full w-full max-w-[1040px] flex-col overflow-y-auto bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)] px-4 pb-10 pt-6 text-slate-900", children: [_jsx(AnalyticsDataLoader, {}), _jsxs("header", { className: "flex flex-col gap-3 pb-3", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { type: "button", className: "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-900/10 bg-white/90 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.08)]", onClick: homeShellActions.closeFullFeaturePage, "aria-label": "Back to home", children: _jsx(BackArrowIcon, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsx("div", { className: "min-w-0 flex-1", children: _jsx("h1", { className: "m-0 text-xl font-extrabold tracking-tight text-slate-900", children: "Analytics" }) })] }), _jsx(DateRangePicker, { value: dateRange, onChange: setDateRange })] }), insights.length > 0 ? (_jsx("div", { className: "pb-8", children: _jsx(InsightList, { insights: insights }) })) : null, _jsx(FloorMapSection, {}), _jsx(ZoneRankingSection, {}), _jsx("div", { ref: categoriesLazy.ref, children: categoriesLazy.mounted ? _jsx(CategoriesSection, {}) : null }), _jsx("div", { ref: channelLazy.ref, children: channelLazy.mounted ? _jsx(SalesChannelSection, {}) : null }), _jsx("div", { ref: overTimeLazy.ref, children: overTimeLazy.mounted ? _jsx(SalesOverTimeSection, {}) : null }), _jsx("div", { ref: timePatternsLazy.ref, children: timePatternsLazy.mounted ? _jsx(TimePatternsSection, {}) : null }), _jsx("div", { ref: dimensionsLazy.ref, children: dimensionsLazy.mounted ? _jsx(DimensionInsightsSection, {}) : null }), _jsx(ZoneStatsPanel, {}), _jsx(CategoryStatsPanel, {}), _jsx(StatsItemsOverlay, {})] }));
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDimensionRange(bucket) {
    const plusMatch = /^(\d+)\+$/.exec(bucket.trim());
    if (plusMatch) {
        const min = Number(plusMatch[1]);
        if (Number.isNaN(min))
            return null;
        return { min };
    }
    const parts = bucket.split("-");
    if (parts.length !== 2)
        return null;
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (isNaN(min) || isNaN(max))
        return null;
    return { min, max };
}
function toVelocityChannelLabel(channel) {
    switch (channel) {
        case "compare":
            return "Compare";
        case "physical":
            return "Physical";
        case "webshop":
            return "Webshop";
        case "imported":
            return "Imported";
        case "unknown":
            return "Unknown";
        default:
            return channel;
    }
}
function toVelocityChannelDescription(channel) {
    switch (channel) {
        case "compare":
            return "Shows physical / POS and webshop sales together as separate lines.";
        case "physical":
            return "Shows only in-store physical / POS sales.";
        case "webshop":
            return "Shows only webshop sales.";
        case "imported":
            return "Shows only imported sales.";
        case "unknown":
            return "Shows sales with an unknown channel.";
        default:
            return "Shows sales for the selected channel.";
    }
}
