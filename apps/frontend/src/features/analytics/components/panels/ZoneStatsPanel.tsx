import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { CloseIcon } from "../../../../assets/icons";
import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { formatKr } from "../../domain/format-currency.domain";
import {
  selectAnalyticsIsLoadingZoneDetail,
  selectAnalyticsSelectedZone,
  selectAnalyticsSelectedZoneLevel,
  selectAnalyticsZoneDetail,
  selectAnalyticsZoneDateRange,
  selectAnalyticsZoneLevels,
  selectAnalyticsZoneTimePatterns,
  useAnalyticsStore,
} from "../../stores/analytics.store";
import { useZoneDetailFlow } from "../../flows/use-zone-detail.flow";
import {
  CategoryBarChart,
  type CategoryPerformanceChartMode,
} from "../charts/CategoryBarChart";
import { SalesTimePatternsChart } from "../charts/SalesTimePatternsChart";
import { SalesTimelineChart } from "../charts/SalesTimelineChart";
import { DateRangePicker } from "../shared/DateRangePicker";

export function ZoneStatsPanel() {
  useZoneDetailFlow();
  const [categoryChartMode, setCategoryChartMode] =
    useState<CategoryPerformanceChartMode>("pie");
  const [categoryMetric, setCategoryMetric] = useState<"itemsSold" | "revenue">(
    "itemsSold",
  );
  const [velocityMetric, setVelocityMetric] = useState<"itemsSold" | "revenue">(
    "itemsSold",
  );
  const [zonePatternsMetric, setZonePatternsMetric] = useState<
    "itemsSold" | "revenue"
  >("itemsSold");

  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const selectedZoneLevel = useAnalyticsStore(selectAnalyticsSelectedZoneLevel);
  const zoneLevels = useAnalyticsStore(selectAnalyticsZoneLevels);
  const zoneDetail = useAnalyticsStore(selectAnalyticsZoneDetail);
  const zoneDateRange = useAnalyticsStore(selectAnalyticsZoneDateRange);
  const zoneTimePatterns = useAnalyticsStore(selectAnalyticsZoneTimePatterns);
  const isLoadingZoneDetail = useAnalyticsStore(
    selectAnalyticsIsLoadingZoneDetail,
  );
  const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
  const setSelectedZoneLevel = useAnalyticsStore(
    (state) => state.setSelectedZoneLevel,
  );
  const setZoneDateRange = useAnalyticsStore((state) => state.setZoneDateRange);

  function handleZoneDateChange(range: typeof zoneDateRange) {
    setZoneDateRange(range);
  }

  return (
    <AnimatePresence>
      {selectedZone ? (
        <motion.aside
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-slate-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <header className="flex items-center justify-between border-b border-slate-900/10 px-4 py-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Zone
              </p>
              <h2 className="m-0 mt-1 text-base font-bold text-slate-900">
                {selectedZone}
              </h2>
            </div>

            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500"
              onClick={() => setSelectedZone(null)}
              aria-label="Close zone stats"
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {zoneLevels && zoneLevels.length > 0 ? (
            <div className="border-b border-slate-900/10 px-4 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Floor
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedZoneLevel(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedZoneLevel === null
                      ? "border-teal-500 bg-teal-500 text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  All
                </button>
                {zoneLevels.map((l) => (
                  <button
                    key={l.level}
                    type="button"
                    onClick={() => setSelectedZoneLevel(l.level)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      selectedZoneLevel === l.level
                        ? "border-teal-500 bg-teal-500 text-white"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {l.level}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-b border-slate-900/10 px-4 py-3">
            <DateRangePicker
              value={zoneDateRange}
              onChange={handleZoneDateChange}
            />
          </div>

          <p className="m-0 px-4 pb-2 pt-2 text-xs text-slate-400">
            Physical sales only. Webshop orders excluded.
          </p>

          {isLoadingZoneDetail ? (
            <div className="flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500">
              Loading zone stats...
            </div>
          ) : zoneDetail ? (
            <div className="flex flex-col gap-5 px-4 py-4">
              <ZoneKpiRow
                zone={selectedZone}
                kpis={zoneDetail.kpis}
                zoneDateRange={zoneDateRange}
              />

              <div className="pb-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Category performance
                  </p>
                  <div className="flex gap-1">
                    {(["itemsSold", "revenue"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCategoryMetric(m)}
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
                          categoryMetric === m
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        {m === "itemsSold" ? "Items" : "Revenue"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <div className="mb-2 flex justify-end">
                    <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                      {(["pie", "bar"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCategoryChartMode(mode)}
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                            categoryChartMode === mode
                              ? "bg-teal-500 text-white"
                              : "text-slate-500 hover:bg-white hover:text-teal-700"
                          }`}
                        >
                          {mode === "pie" ? "Pie" : "Bar"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <CategoryBarChart
                    data={zoneDetail.categories}
                    mode={categoryChartMode}
                    metric={categoryMetric}
                    onBarClick={(category) => {
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
                    }}
                  />
                </div>
              </div>

              <div className="pb-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Sales over time
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(["itemsSold", "revenue"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setVelocityMetric(m)}
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
                            velocityMetric === m
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-200 text-slate-500"
                          }`}
                        >
                          {m === "itemsSold" ? "Items" : "Revenue"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <SalesTimelineChart
                    data={zoneDetail.dailySeries}
                    metric={velocityMetric}
                    onShowItemsClick={(date) => {
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
                    }}
                  />
                </div>
              </div>

              {zoneTimePatterns ? (
                <div className="pb-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Time patterns
                    </p>
                    <div className="flex gap-1">
                      {(["itemsSold", "revenue"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setZonePatternsMetric(m)}
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
                            zonePatternsMetric === m
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-200 text-slate-500"
                          }`}
                        >
                          {m === "itemsSold" ? "Items" : "Revenue"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                    <SalesTimePatternsChart
                      data={zoneTimePatterns}
                      metric={zonePatternsMetric}
                      onHourClick={(hour, label) =>
                        statsItemsOverlayActions.open({
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
                        })
                      }
                      onWeekdayClick={(weekday, label) =>
                        statsItemsOverlayActions.open({
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
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500">
              No stats are available for this zone yet.
            </div>
          )}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

interface ZoneKpiRowProps {
  zone: string;
  kpis: {
    itemsSold: number;
    revenue: number;
    avgTimeToSellSeconds: number | null;
    itemsReceived: number;
  };
  zoneDateRange: { from: string; to: string };
}

function ZoneKpiRow({ zone, kpis, zoneDateRange }: ZoneKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50"
        onClick={() => {
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
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Sold
        </span>
        <span className="mt-1 text-lg font-bold text-slate-900">
          {kpis.itemsSold}
        </span>
      </button>

      <button
        type="button"
        className="flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50"
        onClick={() => {
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
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Revenue
        </span>
        <span className="mt-1 text-lg font-bold text-slate-900">
          {formatKr(kpis.revenue)}
        </span>
      </button>

      <button
        type="button"
        className="flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50"
        onClick={() => {
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
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Avg sell time
        </span>
        <span className="mt-1 text-lg font-bold text-slate-900">
          {kpis.avgTimeToSellSeconds !== null
            ? formatSeconds(kpis.avgTimeToSellSeconds)
            : "—"}
        </span>
      </button>

      <button
        type="button"
        className="flex flex-col items-start rounded-2xl border border-slate-900/10 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50"
        onClick={() => {
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
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Received
        </span>
        <span className="mt-1 text-lg font-bold text-slate-900">
          {kpis.itemsReceived}
        </span>
      </button>
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}
