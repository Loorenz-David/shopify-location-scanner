import { useRef, useState } from "react";

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
import {
  CategoryOverviewChart,
  type CategoryOverviewChartMode,
} from "../components/charts/CategoryOverviewChart";
import { DimensionBucketChart } from "../components/charts/DimensionBucketChart";
import { InsightList } from "../components/insights/InsightList";
import { DateRangePicker } from "../components/shared/DateRangePicker";
import categoriesOverviewMarkdown from "../docs/categories-overview.md?raw";
import dimensionInsightsMarkdown from "../docs/dimension-insights.md?raw";
import salesOverTimeChannelsMarkdown from "../docs/sales-over-time-channels.md?raw";
import zoneRankingMarkdown from "../docs/zone-ranking.md?raw";
import { useAnalyticsPageFlow } from "../flows/use-analytics-page.flow";
import { useFloorMapFlow } from "../flows/use-floor-map.flow";
import {
  selectAnalyticsCategories,
  selectAnalyticsChannelOverview,
  selectAnalyticsDateRange,
  selectAnalyticsDimensions,
  selectAnalyticsInsights,
  selectAnalyticsSelectedZone,
  selectAnalyticsVelocity,
  selectAnalyticsVelocityChannel,
  selectAnalyticsZoneComparisonMetric,
  selectAnalyticsZonesOverview,
  useAnalyticsStore,
} from "../stores/analytics.store";
import type { ZoneComparisonChartMode } from "../components/charts/ZoneComparisonChart";
import type { VelocityChannel } from "../stores/analytics.store";

export function AnalyticsPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [categoryChartMode, setCategoryChartMode] =
    useState<CategoryOverviewChartMode>("pie");
  const [categoryRankingTab, setCategoryRankingTab] = useState<
    "itemsSold" | "totalRevenue" | "compare"
  >("itemsSold");
  const [zoneComparisonChartMode, setZoneComparisonChartMode] =
    useState<ZoneComparisonChartMode>("pie");
  const [zoneRankingTab, setZoneRankingTab] = useState<
    "itemsSold" | "revenue" | "compare"
  >("itemsSold");
  const [activeCategoryOverview, setActiveCategoryOverview] = useState<
    string | null
  >(null);
  const [channelMetric, setChannelMetric] = useState<
    "itemsSold" | "totalRevenue"
  >("itemsSold");
  const [isSalesChannelsInfoOpen, setIsSalesChannelsInfoOpen] = useState(false);
  const [isZoneRankingInfoOpen, setIsZoneRankingInfoOpen] = useState(false);
  const [isCategoriesInfoOpen, setIsCategoriesInfoOpen] = useState(false);
  const [isDimensionInsightsInfoOpen, setIsDimensionInsightsInfoOpen] =
    useState(false);
  useAnalyticsPageFlow();
  const floorMap = useFloorMapFlow(containerRef);

  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
  const insights = useAnalyticsStore(selectAnalyticsInsights);
  const zonesOverview = useAnalyticsStore(selectAnalyticsZonesOverview);
  const channelOverview = useAnalyticsStore(selectAnalyticsChannelOverview);
  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const zoneComparisonMetric = useAnalyticsStore(
    selectAnalyticsZoneComparisonMetric,
  );
  const velocity = useAnalyticsStore(selectAnalyticsVelocity);
  const velocityChannel = useAnalyticsStore(selectAnalyticsVelocityChannel);
  const velocityCompareSeries = useAnalyticsStore(
    (state) => state.velocityCompareSeries,
  );
  const categories = useAnalyticsStore(selectAnalyticsCategories);
  const dimensions = useAnalyticsStore(selectAnalyticsDimensions);
  const setDateRange = useAnalyticsStore((state) => state.setDateRange);
  const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
  const setSelectedCategory = useAnalyticsStore(
    (state) => state.setSelectedCategory,
  );
  const setVelocityChannel = useAnalyticsStore(
    (state) => state.setVelocityChannel,
  );
  const setZoneComparisonMetric = useAnalyticsStore(
    (state) => state.setZoneComparisonMetric,
  );

  return (
    <section className="mx-auto flex h-full min-h-full w-full max-w-[1040px] flex-col overflow-y-auto bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)] px-4 pb-10 pt-6 text-slate-900">
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
        <div className="pb-4">
          <InsightList insights={insights} />
        </div>
      ) : null}

      <div ref={containerRef} className="pb-2" style={{ minHeight: "70svh" }}>
        <FloorMapCanvas
          zones={floorMap.zones}
          zonesOverview={zonesOverview}
          stageWidth={floorMap.stageWidth}
          stageHeight={floorMap.stageHeight}
          selectedZone={selectedZone}
          onZoneTap={setSelectedZone}
        />
      </div>

      <div className="pb-4">
        <FloorMapLegend />
      </div>

      <div className="pb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Zone ranking
            </p>
            <InfoButton
              onClick={() => setIsZoneRankingInfoOpen(true)}
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
      </div>

      <InfoSheet
        isOpen={isZoneRankingInfoOpen}
        title="Understanding zone ranking"
        markdown={zoneRankingMarkdown}
        onClose={() => setIsZoneRankingInfoOpen(false)}
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

      {channelOverview.length > 0 ? (
        <div className="pb-4">
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
            <SalesChannelChart data={channelOverview} metric={channelMetric} />
          </div>
        </div>
      ) : null}

      <div className="pb-4">
        <div className="mb-2 flex  flex-col items-start  justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Sales over time
            </p>
            <InfoButton
              onClick={() => setIsSalesChannelsInfoOpen(true)}
              label="Learn more about sales channels"
              className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["compare", "physical", "webshop"] as const).map(
              (channel) => (
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
              ),
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <SalesTimelineChart
            data={velocity}
            metric="itemsSold"
            compareSeries={
              velocityChannel === "compare" ? velocityCompareSeries : null
            }
          />
        </div>
      </div>

      <InfoSheet
        isOpen={isSalesChannelsInfoOpen}
        title="Understanding sales channels"
        markdown={salesOverTimeChannelsMarkdown}
        onClose={() => setIsSalesChannelsInfoOpen(false)}
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

      <div className="pb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Categories
            </p>
            <InfoButton
              onClick={() => setIsCategoriesInfoOpen(true)}
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
                className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
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
                onSelectCategory={(category) => {
                  setActiveCategoryOverview(category);
                  setSelectedCategory(category);
                }}
              />
            </>
          )}
        </div>
      </div>

      <InfoSheet
        isOpen={isCategoriesInfoOpen}
        title="Understanding categories"
        markdown={categoriesOverviewMarkdown}
        onClose={() => setIsCategoriesInfoOpen(false)}
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

      {dimensions ? (
        <div className="pb-6">
          <div className="mb-2 flex items-center gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Dimension insights
            </p>
            <InfoButton
              onClick={() => setIsDimensionInsightsInfoOpen(true)}
              label="Learn more about dimension insights"
              className="h-6 w-6 bg-white/80 text-[10px] text-slate-500"
            />
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <DimensionBucketChart data={dimensions.height} title="Height" />
            <DimensionBucketChart data={dimensions.width} title="Width" />
            <DimensionBucketChart data={dimensions.depth} title="Depth" />
            <DimensionBucketChart data={dimensions.volume} title="Volume" />
          </div>
        </div>
      ) : null}

      <InfoSheet
        isOpen={isDimensionInsightsInfoOpen}
        title="Understanding dimension insights"
        markdown={dimensionInsightsMarkdown}
        onClose={() => setIsDimensionInsightsInfoOpen(false)}
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

      <ZoneStatsPanel />
      <CategoryStatsPanel />
    </section>
  );
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
