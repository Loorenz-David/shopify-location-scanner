import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatKr } from "../../domain/format-currency.domain";
import type {
  TimePatternHourPoint,
  TimePatternWeekdayPoint,
  TimePatterns,
} from "../../types/analytics.types";

interface SalesTimePatternsChartProps {
  data: TimePatterns;
  metric: "itemsSold" | "revenue";
  compareData?: { physical: TimePatterns; webshop: TimePatterns } | null;
  onHourClick?: (hour: number, label: string) => void;
  onWeekdayClick?: (weekday: number, label: string) => void;
}

export function SalesTimePatternsChart({
  data,
  metric,
  compareData = null,
  onHourClick,
  onWeekdayClick,
}: SalesTimePatternsChartProps) {
  const formatY = (value: number) =>
    metric === "revenue" ? formatKr(value) : String(value);

  const [selectedHour, setSelectedHour] = useState<TimePatternHourPoint | null>(
    null,
  );
  const [selectedWeekday, setSelectedWeekday] =
    useState<TimePatternWeekdayPoint | null>(null);

  // Compute peak based on the active metric so it stays correct when switching between Items/Revenue
  const peakHourValue = Math.max(...data.byHour.map((p) => p[metric]));
  const peakHour =
    peakHourValue > 0
      ? data.byHour.find((p) => p[metric] === peakHourValue)
      : undefined;
  const peakWeekdayValue = Math.max(...data.byWeekday.map((p) => p[metric]));
  const peakWeekday =
    peakWeekdayValue > 0
      ? data.byWeekday.find((p) => p[metric] === peakWeekdayValue)
      : undefined;

  // Keep selection in sync when data changes (e.g. channel switch)
  useEffect(() => {
    if (selectedHour !== null) {
      const updated = data.byHour.find((p) => p.hour === selectedHour.hour);
      setSelectedHour(updated ?? null);
    }
  }, [data.byHour]);

  useEffect(() => {
    if (selectedWeekday !== null) {
      const updated = data.byWeekday.find(
        (p) => p.weekday === selectedWeekday.weekday,
      );
      setSelectedWeekday(updated ?? null);
    }
  }, [data.byWeekday]);

  // Merged datasets for grouped compare bars
  const hourCompareData = compareData
    ? data.byHour.map((pt, i) => ({
        label: pt.label,
        hour: pt.hour,
        itemsSold: pt.itemsSold,
        revenue: pt.revenue,
        isPeak: pt.isPeak,
        physical: compareData.physical.byHour[i]?.[metric] ?? 0,
        webshop: compareData.webshop.byHour[i]?.[metric] ?? 0,
      }))
    : null;

  const weekdayCompareData = compareData
    ? data.byWeekday.map((pt, i) => ({
        label: pt.label,
        weekday: pt.weekday,
        itemsSold: pt.itemsSold,
        revenue: pt.revenue,
        isPeak: pt.isPeak,
        physical: compareData.physical.byWeekday[i]?.[metric] ?? 0,
        webshop: compareData.webshop.byWeekday[i]?.[metric] ?? 0,
      }))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Hour of day
        </p>
        <div className={onHourClick && !compareData ? "cursor-pointer" : ""}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              accessibilityLayer={false}
              data={hourCompareData ?? data.byHour}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={formatY}
                width={40}
              />
              <Tooltip content={() => null} cursor={false} />
              {hourCompareData ? (
                <>
                  <Bar
                    dataKey="physical"
                    name="Physical"
                    fill="#22c55e"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="webshop"
                    name="Webshop"
                    fill="#6366f1"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                </>
              ) : (
                <Bar
                  dataKey={metric}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={400}
                  animationEasing="ease-out"
                  activeBar={false}
                  onMouseDown={(entry) => {
                    const point = (entry as { payload?: TimePatternHourPoint })
                      .payload;
                    if (point) setSelectedHour(point);
                  }}
                  onTouchStart={(entry) => {
                    const point = (entry as { payload?: TimePatternHourPoint })
                      .payload;
                    if (point) setSelectedHour(point);
                  }}
                  onClick={(entry) => {
                    const point = (entry as { payload?: TimePatternHourPoint })
                      .payload;
                    if (point) setSelectedHour(point);
                  }}
                >
                  {data.byHour.map((point) => (
                    <Cell
                      key={point.hour}
                      fill={
                        point.hour === peakHour?.hour ? "#f59e0b" : "#6366f1"
                      }
                      stroke={
                        selectedHour?.hour === point.hour
                          ? "#0ea5e9"
                          : "transparent"
                      }
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!compareData && peakHour && peakHour.itemsSold > 0 ? (
          <p className="m-0 mt-1 text-xs font-semibold text-amber-600">
            Peak: {peakHour.label}
          </p>
        ) : null}
        {compareData ? (
          <div className="mt-1 flex gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Physical
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              Webshop
            </span>
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {selectedHour ? (
            <motion.div
              key={selectedHour.hour}
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Selected hour
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {selectedHour.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onHourClick ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                        onClick={() =>
                          onHourClick(selectedHour.hour, selectedHour.label)
                        }
                      >
                        show items
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close selection"
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                      onClick={() => setSelectedHour(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
                      Items sold
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {selectedHour.itemsSold}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                      Revenue
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {formatKr(selectedHour.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Day of week
        </p>
        <div className={onWeekdayClick && !compareData ? "cursor-pointer" : ""}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              accessibilityLayer={false}
              data={weekdayCompareData ?? data.byWeekday}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={formatY}
                width={40}
              />
              <Tooltip content={() => null} cursor={false} />
              {weekdayCompareData ? (
                <>
                  <Bar
                    dataKey="physical"
                    name="Physical"
                    fill="#22c55e"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="webshop"
                    name="Webshop"
                    fill="#6366f1"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                </>
              ) : (
                <Bar
                  dataKey={metric}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationBegin={0}
                  animationDuration={400}
                  animationEasing="ease-out"
                  activeBar={false}
                  onMouseDown={(entry) => {
                    const point = (
                      entry as { payload?: TimePatternWeekdayPoint }
                    ).payload;
                    if (point) setSelectedWeekday(point);
                  }}
                  onTouchStart={(entry) => {
                    const point = (
                      entry as { payload?: TimePatternWeekdayPoint }
                    ).payload;
                    if (point) setSelectedWeekday(point);
                  }}
                  onClick={(entry) => {
                    const point = (
                      entry as { payload?: TimePatternWeekdayPoint }
                    ).payload;
                    if (point) setSelectedWeekday(point);
                  }}
                >
                  {data.byWeekday.map((point) => (
                    <Cell
                      key={point.weekday}
                      fill={
                        point.weekday === peakWeekday?.weekday
                          ? "#f59e0b"
                          : "#6366f1"
                      }
                      stroke={
                        selectedWeekday?.weekday === point.weekday
                          ? "#0ea5e9"
                          : "transparent"
                      }
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!compareData && peakWeekday && peakWeekday.itemsSold > 0 ? (
          <p className="m-0 mt-1 text-xs font-semibold text-amber-600">
            Peak: {peakWeekday.label}
          </p>
        ) : null}
        {compareData ? (
          <div className="mt-1 flex gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Physical
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              Webshop
            </span>
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {selectedWeekday ? (
            <motion.div
              key={selectedWeekday.weekday}
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Selected day
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {selectedWeekday.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onWeekdayClick ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                        onClick={() =>
                          onWeekdayClick(
                            selectedWeekday.weekday,
                            selectedWeekday.label,
                          )
                        }
                      >
                        show items
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close selection"
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                      onClick={() => setSelectedWeekday(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
                      Items sold
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {selectedWeekday.itemsSold}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                      Revenue
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {formatKr(selectedWeekday.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}
