import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { CloseIcon } from "../../../../assets/icons";
import {
  selectAnalyticsIsLoadingZoneDetail,
  selectAnalyticsSelectedZone,
  selectAnalyticsZoneDetail,
  selectAnalyticsZoneDateRange,
  useAnalyticsStore,
} from "../../stores/analytics.store";
import { useZoneDetailFlow } from "../../flows/use-zone-detail.flow";
import {
  CategoryBarChart,
  type CategoryPerformanceChartMode,
} from "../charts/CategoryBarChart";
import { SalesTimelineChart } from "../charts/SalesTimelineChart";
import { DateRangePicker } from "../shared/DateRangePicker";
import { KpiRow } from "../shared/KpiRow";

export function ZoneStatsPanel() {
  useZoneDetailFlow();
  const [categoryChartMode, setCategoryChartMode] =
    useState<CategoryPerformanceChartMode>("pie");

  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const zoneDetail = useAnalyticsStore(selectAnalyticsZoneDetail);
  const zoneDateRange = useAnalyticsStore(selectAnalyticsZoneDateRange);
  const isLoadingZoneDetail = useAnalyticsStore(
    selectAnalyticsIsLoadingZoneDetail,
  );
  const setSelectedZone = useAnalyticsStore((state) => state.setSelectedZone);
  const setZoneDateRange = useAnalyticsStore((state) => state.setZoneDateRange);

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

          <div className="border-b border-slate-900/10 px-4 py-3">
            <DateRangePicker
              value={zoneDateRange}
              onChange={setZoneDateRange}
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
              <KpiRow
                itemsSold={zoneDetail.kpis.itemsSold}
                revenue={zoneDetail.kpis.revenue}
                avgTimeToSellSeconds={zoneDetail.kpis.avgTimeToSellSeconds}
                itemsReceived={zoneDetail.kpis.itemsReceived}
              />

              <section className="rounded-2xl border border-slate-900/10 bg-slate-50/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Category performance
                  </p>
                  <div className="flex gap-1 rounded-full border border-slate-200 bg-white/80 p-1">
                    {(["pie", "bar"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCategoryChartMode(mode)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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
                />
              </section>

              <section className="rounded-2xl border border-slate-900/10 bg-slate-50/70 p-3">
                <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Sales over time
                </p>
                <SalesTimelineChart
                  data={zoneDetail.dailySeries}
                  metric="itemsSold"
                />
              </section>
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
