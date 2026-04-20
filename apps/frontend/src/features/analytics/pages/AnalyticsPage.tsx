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
import {
  CategoryOverviewChart,
  type CategoryOverviewChartMode,
} from "../components/charts/CategoryOverviewChart";
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
import {
  selectAnalyticsCategories,
  selectAnalyticsChannelOverview,
  selectAnalyticsDateRange,
  selectAnalyticsDimensions,
  selectAnalyticsInsights,
  selectAnalyticsSelectedZone,
  selectAnalyticsTimePatterns,
  selectAnalyticsTimePatternsCompare,
  selectAnalyticsVelocity,
  selectAnalyticsVelocityChannel,
  selectAnalyticsZoneComparisonMetric,
  selectAnalyticsZonesOverview,
  useAnalyticsStore,
} from "../stores/analytics.store";
import {
  selectActiveFloorPlan,
  useFloorPlanStore,
} from "../stores/floor-plan.store";
import type { ZoneComparisonChartMode } from "../components/charts/ZoneComparisonChart";
import type { VelocityChannel } from "../stores/analytics.store";
import type { DimensionBucket } from "../types/analytics.types";
import type { FloorMapMetric } from "../components/floor-map/FloorMapHeatOverlay";

// ---------------------------------------------------------------------------
// Lazy mount hook — mounts once the sentinel div scrolls into view
// ---------------------------------------------------------------------------
function useLazyMount() {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

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
  const [metric, setMetric] = useState<FloorMapMetric>("itemsSold");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floorMap = useFloorMapFlow(containerRef);
  const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
  const zonesOverview = useAnalyticsStore(selectAnalyticsZonesOverview);
  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Floor map
        </p>
        <div className="flex gap-1">
          {(
            [
              { key: "itemsSold", label: "Items sold" },
              { key: "revenue", label: "Revenue" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                metric === key
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="pb-2" style={{ minHeight: "70svh" }}>
        <FloorMapCanvas
          zones={floorMap.zones}
          zonesOverview={zonesOverview}
          stageWidth={floorMap.stageWidth}
          stageHeight={floorMap.stageHeight}
          selectedZone={selectedZone}
          onZoneTap={setSelectedZone}
          activeFloorPlan={activeFloorPlan}
          metric={metric}
        />
      </div>
      <div className="pb-8">
        <FloorMapLegend metric={metric} />
      </div>
    </>
  );
});

// ---------------------------------------------------------------------------
// ZoneRankingSection
// ---------------------------------------------------------------------------
const ZoneRankingSection = memo(function ZoneRankingSection() {
  const [zoneRankingTab, setZoneRankingTab] = useState<
    "itemsSold" | "revenue" | "compare"
  >("itemsSold");
  const [zoneComparisonChartMode, setZoneComparisonChartMode] =
    useState<ZoneComparisonChartMode>("pie");
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const zonesOverview = useAnalyticsStore(selectAnalyticsZonesOverview);
  const zoneComparisonMetric = useAnalyticsStore(
    selectAnalyticsZoneComparisonMetric,
  );
  const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
  const setZoneComparisonMetric = useAnalyticsStore(
    (state) => state.setZoneComparisonMetric,
  );

  return (
    <div className="pb-8">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Zone ranking
          </p>
          <InfoButton
            onClick={() => setIsInfoOpen(true)}
            label="Learn more about zone ranking"
            className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              { key: "itemsSold", label: "Items" },
              { key: "revenue", label: "Revenue" },
              { key: "compare", label: "Compare" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setZoneRankingTab(key);
                if (key !== "compare") setZoneComparisonMetric(key);
              }}
              className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                zoneRankingTab === key
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        {zoneRankingTab === "compare" ? (
          <ZoneRankingComparison
            data={zonesOverview}
            onZoneClick={setSelectedZone}
          />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                {(["pie", "bar"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setZoneComparisonChartMode(mode)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      zoneComparisonChartMode === mode
                        ? "bg-sky-600 text-white"
                        : "text-slate-500 hover:bg-white hover:text-sky-700"
                    }`}
                  >
                    {mode === "pie" ? "Pie" : "Bar"}
                  </button>
                ))}
              </div>
            </div>
            <ZoneComparisonChart
              data={zonesOverview}
              metric={zoneComparisonMetric}
              mode={zoneComparisonChartMode}
              onBarClick={setSelectedZone}
            />
          </>
        )}
      </div>

      <InfoSheet
        isOpen={isInfoOpen}
        title="Understanding zone ranking"
        markdown={zoneRankingMarkdown}
        onClose={() => setIsInfoOpen(false)}
        pinnedContent={
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600">
              Current view
            </p>
            <p className="m-0 mt-1 font-semibold">
              {zoneComparisonMetric === "itemsSold" ? "Items" : "Revenue"} in{" "}
              {zoneComparisonChartMode === "pie" ? "Pie" : "Bar"} mode
            </p>
            <p className="m-0 mt-1 text-sm leading-6 text-sky-800">
              Zones are ranked from highest to lowest for the selected metric in
              the current date range.
            </p>
          </div>
        }
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// CategoriesSection
// ---------------------------------------------------------------------------
const CategoriesSection = memo(function CategoriesSection() {
  const [categoryChartMode, setCategoryChartMode] =
    useState<CategoryOverviewChartMode>("pie");
  const [categoryRankingTab, setCategoryRankingTab] = useState<
    "itemsSold" | "totalRevenue" | "compare"
  >("itemsSold");
  const [activeCategoryOverview, setActiveCategoryOverview] = useState<
    string | null
  >(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const categories = useAnalyticsStore(selectAnalyticsCategories);
  const setSelectedCategory = useAnalyticsStore(
    (state) => state.setSelectedCategory,
  );

  const handleSelectCategory = useCallback(
    (category: string | null) => {
      setActiveCategoryOverview(category);
      setSelectedCategory(category);
    },
    [setSelectedCategory],
  );

  return (
    <div className="pb-8">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Categories
          </p>
          <InfoButton
            onClick={() => setIsInfoOpen(true)}
            label="Learn more about categories overview"
            className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              { key: "itemsSold", label: "Items" },
              { key: "totalRevenue", label: "Revenue" },
              { key: "compare", label: "Compare" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryRankingTab(key)}
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
                categoryRankingTab === key
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        {categoryRankingTab === "compare" ? (
          <CategoryRankingComparison
            data={categories}
            onCategoryClick={(category) => {
              setActiveCategoryOverview(category);
              setSelectedCategory(category);
            }}
          />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-end gap-2">
              <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                {(["pie", "bar"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCategoryChartMode(mode)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      categoryChartMode === mode
                        ? "bg-sky-600 text-white"
                        : "text-slate-500 hover:bg-white hover:text-sky-700"
                    }`}
                  >
                    {mode === "pie" ? "Pie" : "Bar"}
                  </button>
                ))}
              </div>
            </div>
            <CategoryOverviewChart
              data={categories}
              mode={categoryChartMode}
              metric={categoryRankingTab}
              activeCategory={activeCategoryOverview}
              onSelectCategory={handleSelectCategory}
            />
          </>
        )}
      </div>

      <InfoSheet
        isOpen={isInfoOpen}
        title="Understanding categories"
        markdown={categoriesOverviewMarkdown}
        onClose={() => setIsInfoOpen(false)}
        pinnedContent={
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600">
              Current view
            </p>
            <p className="m-0 mt-1 font-semibold">
              {categoryChartMode === "pie" ? "Pie" : "Bar"} mode
            </p>
            <p className="m-0 mt-1 text-sm leading-6 text-sky-800">
              Categories are compared using sold activity and average sell time
              in the selected date range.
            </p>
          </div>
        }
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// SalesChannelSection
// ---------------------------------------------------------------------------
const SalesChannelSection = memo(function SalesChannelSection() {
  const [channelMetric, setChannelMetric] = useState<
    "itemsSold" | "totalRevenue"
  >("itemsSold");

  const channelOverview = useAnalyticsStore(selectAnalyticsChannelOverview);
  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);

  if (channelOverview.length === 0) return null;

  return (
    <div className="pb-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Sales by channel
        </p>
        <div className="flex gap-1">
          {(["itemsSold", "totalRevenue"] as const).map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => setChannelMetric(metric)}
              className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                channelMetric === metric
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {metric === "itemsSold" ? "Items" : "Revenue"}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <SalesChannelChart
          data={channelOverview}
          metric={channelMetric}
          onShowItemsClick={(channel) =>
            statsItemsOverlayActions.open({
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
            })
          }
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// SalesOverTimeSection
// ---------------------------------------------------------------------------
const SalesOverTimeSection = memo(function SalesOverTimeSection() {
  const [velocityMetric, setVelocityMetric] = useState<"itemsSold" | "revenue">(
    "itemsSold",
  );
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const velocity = useAnalyticsStore(selectAnalyticsVelocity);
  const velocityChannel = useAnalyticsStore(selectAnalyticsVelocityChannel);
  const velocityCompareSeries = useAnalyticsStore(
    (state) => state.velocityCompareSeries,
  );
  const setVelocityChannel = useAnalyticsStore(
    (state) => state.setVelocityChannel,
  );

  return (
    <div className="pb-8">
      <div className="mb-2 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Sales over time
            </p>
            <InfoButton
              onClick={() => setIsInfoOpen(true)}
              label="Learn more about sales channels"
              className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["itemsSold", "revenue"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setVelocityMetric(m)}
                className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                  velocityMetric === m
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {m === "itemsSold" ? "Items" : "Revenue"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["compare", "physical", "webshop"] as const).map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => setVelocityChannel(channel)}
              className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                velocityChannel === channel
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {toVelocityChannelLabel(channel)}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <SalesTimelineChart
          data={velocity}
          metric={velocityMetric}
          compareSeries={
            velocityChannel === "compare" ? velocityCompareSeries : null
          }
          onShowItemsClick={(date) =>
            statsItemsOverlayActions.open({
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
            })
          }
        />
      </div>

      <InfoSheet
        isOpen={isInfoOpen}
        title="Understanding sales channels"
        markdown={salesOverTimeChannelsMarkdown}
        onClose={() => setIsInfoOpen(false)}
        pinnedContent={
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-500">
              Current view
            </p>
            <p className="m-0 mt-1 font-semibold">
              {toVelocityChannelLabel(velocityChannel)}
            </p>
            <p className="m-0 mt-1 text-sm leading-6 text-indigo-800">
              {toVelocityChannelDescription(velocityChannel)}
            </p>
          </div>
        }
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// TimePatternsSection
// ---------------------------------------------------------------------------
const TimePatternsSection = memo(function TimePatternsSection() {
  const [timePatternsMetric, setTimePatternsMetric] = useState<
    "itemsSold" | "revenue"
  >("itemsSold");
  const [timePatternsChannel, setTimePatternsChannel] = useState<
    "all" | "physical" | "webshop" | "compare"
  >("all");

  const timePatterns = useAnalyticsStore(selectAnalyticsTimePatterns);
  const timePatternsCompare = useAnalyticsStore(
    selectAnalyticsTimePatternsCompare,
  );
  const setTimePatterns = useAnalyticsStore((state) => state.setTimePatterns);
  const setTimePatternsCompare = useAnalyticsStore(
    (state) => state.setTimePatternsCompare,
  );
  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);

  const loadTimePatternsForChannel = useCallback(
    async (channel: "all" | "physical" | "webshop" | "compare") => {
      const { from, to } = dateRange;
      if (channel === "compare") {
        const [physical, webshop] = await Promise.all([
          getTimePatternsApi({ from, to, salesChannel: "physical" }),
          getTimePatternsApi({ from, to, salesChannel: "webshop" }),
        ]);
        setTimePatternsCompare({ physical, webshop });
      } else {
        setTimePatternsCompare(null);
        const data = await getTimePatternsApi({
          from,
          to,
          salesChannel: channel === "all" ? undefined : channel,
        });
        setTimePatterns(data);
      }
    },
    [dateRange, setTimePatterns, setTimePatternsCompare],
  );

  if (!timePatterns) return null;

  return (
    <div className="pb-8">
      <div className="mb-2 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Sales time patterns
          </p>
          <div className="flex gap-1">
            {(["itemsSold", "revenue"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTimePatternsMetric(m)}
                className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                  timePatternsMetric === m
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {m === "itemsSold" ? "Items" : "Revenue"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "physical", label: "Physical" },
              { key: "webshop", label: "Webshop" },
              { key: "compare", label: "Compare" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTimePatternsChannel(key);
                void loadTimePatternsForChannel(key);
              }}
              className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                timePatternsChannel === key
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <SalesTimePatternsChart
          data={timePatterns}
          metric={timePatternsMetric}
          compareData={
            timePatternsChannel === "compare" ? timePatternsCompare : null
          }
          onHourClick={(hour, label) =>
            statsItemsOverlayActions.open({
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
            })
          }
          onWeekdayClick={(weekday, label) =>
            statsItemsOverlayActions.open({
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
            })
          }
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DimensionInsightsSection
// ---------------------------------------------------------------------------
const DimensionInsightsSection = memo(function DimensionInsightsSection() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedHeightBucket, setSelectedHeightBucket] =
    useState<DimensionBucket | null>(null);
  const [selectedWidthBucket, setSelectedWidthBucket] =
    useState<DimensionBucket | null>(null);
  const [selectedDepthBucket, setSelectedDepthBucket] =
    useState<DimensionBucket | null>(null);
  const [selectedVolumeBucket, setSelectedVolumeBucket] =
    useState<DimensionBucket | null>(null);

  const dimensions = useAnalyticsStore(selectAnalyticsDimensions);
  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);

  if (!dimensions) return null;

  return (
    <div className="pb-6">
      <div className="mb-2 flex items-center gap-2">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Dimension insights
        </p>
        <InfoButton
          onClick={() => setIsInfoOpen(true)}
          label="Learn more about dimension insights"
          className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
        />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <DimensionBucketChart
          data={dimensions.height}
          title="Height"
          selectedBucket={selectedHeightBucket}
          onBucketClick={setSelectedHeightBucket}
          onShowItemsClick={(bucket) => {
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
          }}
          onCloseSelection={() => setSelectedHeightBucket(null)}
        />
        <DimensionBucketChart
          data={dimensions.width}
          title="Width"
          selectedBucket={selectedWidthBucket}
          onBucketClick={setSelectedWidthBucket}
          onShowItemsClick={(bucket) => {
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
          }}
          onCloseSelection={() => setSelectedWidthBucket(null)}
        />
        <DimensionBucketChart
          data={dimensions.depth}
          title="Depth"
          selectedBucket={selectedDepthBucket}
          onBucketClick={setSelectedDepthBucket}
          onShowItemsClick={(bucket) => {
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
          }}
          onCloseSelection={() => setSelectedDepthBucket(null)}
        />
        <DimensionBucketChart
          data={dimensions.volume}
          title="Volume"
          selectedBucket={selectedVolumeBucket}
          onBucketClick={setSelectedVolumeBucket}
          onShowItemsClick={(bucket) =>
            statsItemsOverlayActions.open({
              query: {
                isSold: true,
                from: dateRange.from,
                to: dateRange.to,
                volumeLabel: bucket.bucket as
                  | "small"
                  | "tiny"
                  | "medium"
                  | "large"
                  | "extra_large",
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
            })
          }
          onCloseSelection={() => setSelectedVolumeBucket(null)}
        />
      </div>

      <InfoSheet
        isOpen={isInfoOpen}
        title="Understanding dimension insights"
        markdown={dimensionInsightsMarkdown}
        onClose={() => setIsInfoOpen(false)}
        pinnedContent={
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600">
              Current view
            </p>
            <p className="m-0 mt-1 font-semibold">
              Height, width, depth, and volume buckets
            </p>
            <p className="m-0 mt-1 text-sm leading-6 text-sky-800">
              Each chart compares how many items existed in a size range versus
              how many sold during the selected period.
            </p>
          </div>
        }
      />
    </div>
  );
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

  return (
    <section className="mx-auto flex h-full min-h-full w-full max-w-[1040px] flex-col overflow-y-auto bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)] px-4 pb-10 pt-6 text-slate-900">
      {/* Side-effect only — triggers data loading without subscribing page to store */}
      <AnalyticsDataLoader />

      <header className="flex flex-col gap-3 pb-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-900/10 bg-white/90 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
            onClick={homeShellActions.closeFullFeaturePage}
            aria-label="Back to home"
          >
            <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">
              Analytics
            </h1>
          </div>
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </header>

      {insights.length > 0 ? (
        <div className="pb-8">
          <InsightList insights={insights} />
        </div>
      ) : null}

      {/* Floor map — above fold, always mounted */}
      <FloorMapSection />

      {/* Zone ranking — above fold, always mounted */}
      <ZoneRankingSection />

      {/* Below-fold sections — lazy mounted via IntersectionObserver */}
      <div ref={categoriesLazy.ref}>
        {categoriesLazy.mounted ? <CategoriesSection /> : null}
      </div>

      <div ref={channelLazy.ref}>
        {channelLazy.mounted ? <SalesChannelSection /> : null}
      </div>

      <div ref={overTimeLazy.ref}>
        {overTimeLazy.mounted ? <SalesOverTimeSection /> : null}
      </div>

      <div ref={timePatternsLazy.ref}>
        {timePatternsLazy.mounted ? <TimePatternsSection /> : null}
      </div>

      <div ref={dimensionsLazy.ref}>
        {dimensionsLazy.mounted ? <DimensionInsightsSection /> : null}
      </div>

      <ZoneStatsPanel />
      <CategoryStatsPanel />
      <StatsItemsOverlay />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDimensionRange(
  bucket: string,
): { min?: number; max?: number } | null {
  const plusMatch = /^(\d+)\+$/.exec(bucket.trim());
  if (plusMatch) {
    const min = Number(plusMatch[1]);
    if (Number.isNaN(min)) return null;
    return { min };
  }

  const parts = bucket.split("-");
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (isNaN(min) || isNaN(max)) return null;
  return { min, max };
}

function toVelocityChannelLabel(channel: VelocityChannel): string {
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

function toVelocityChannelDescription(channel: VelocityChannel): string {
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
