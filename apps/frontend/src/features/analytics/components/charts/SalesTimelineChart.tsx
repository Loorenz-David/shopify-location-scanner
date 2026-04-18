import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VelocityPoint } from "../../types/analytics.types";
import type { VelocityCompareSeries } from "../../stores/analytics.store";
import { formatKr, formatKrCompact } from "../../domain/format-currency.domain";

interface SalesTimelineChartProps {
  data: VelocityPoint[];
  metric: "itemsSold" | "revenue";
  compareSeries?: VelocityCompareSeries | null;
  onBarClick?: (date: string) => void;
  onShowItemsClick?: (date: string) => void;
}

type ChartPointRecord = Record<string, string | number>;

type PointDetails = {
  date: string;
  value: number;
  physical?: number;
  webshop?: number;
};

export function SalesTimelineChart({
  data,
  metric,
  compareSeries = null,
  onBarClick,
  onShowItemsClick,
}: SalesTimelineChartProps) {
  const chartData: ChartPointRecord[] = useMemo(
    () =>
      compareSeries
        ? mergeVelocitySeries(
            compareSeries.physical,
            compareSeries.webshop,
            metric,
          )
        : data,
    [compareSeries, data, metric],
  );
  const yAxisWidth = metric === "revenue" ? 48 : 28;

  const [selectedPoint, setSelectedPoint] = useState<PointDetails | null>(null);

  useEffect(() => {
    if (!selectedPoint) return;
    if (chartData.length === 0) return;

    const nextPoint = chartData.find(
      (entry) => String(entry.date ?? "") === selectedPoint.date,
    );

    if (!nextPoint) {
      setSelectedPoint(null);
      return;
    }

    const nextDetails = toPointDetails(nextPoint, metric, compareSeries);
    if (!arePointDetailsEqual(selectedPoint, nextDetails)) {
      setSelectedPoint(nextDetails);
    }
  }, [chartData, compareSeries, metric, selectedPoint]);

  const selectPoint = (point: ChartPointRecord) => {
    const details = toPointDetails(point, metric, compareSeries);
    setSelectedPoint(details);
    onBarClick?.(details.date);
  };

  return (
    <div className="analytics-chart-shell">
      <ResponsiveContainer width="100%" height={190}>
        <LineChart
          accessibilityLayer={false}
          data={chartData}
          margin={{ left: 2, right: 4, top: 4, bottom: 4 }}
          onClick={(payload) => {
            const point = getPayloadPoint(payload);
            if (point) {
              selectPoint(point);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            width={yAxisWidth}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) =>
              metric === "revenue" ? formatKrCompact(v) : String(v)
            }
          />
          <Tooltip content={() => null} />
          {compareSeries ? (
            <>
              <Line
                type="linear"
                dataKey="physical"
                stroke="#22c55e"
                strokeWidth={2}
                name="Physical"
                connectNulls
                dot={renderPointDot({
                  lineColor: "#22c55e",
                  onSelect: selectPoint,
                })}
                activeDot={renderActivePointDot({
                  lineColor: "#22c55e",
                  onSelect: selectPoint,
                })}
              />
              <Line
                type="linear"
                dataKey="webshop"
                stroke="#6366f1"
                strokeWidth={2}
                name="Webshop"
                connectNulls
                dot={renderPointDot({
                  lineColor: "#6366f1",
                  onSelect: selectPoint,
                })}
                activeDot={renderActivePointDot({
                  lineColor: "#6366f1",
                  onSelect: selectPoint,
                })}
              />
            </>
          ) : (
            <Line
              type="linear"
              dataKey={metric}
              stroke="#2563eb"
              strokeWidth={2}
              connectNulls
              dot={renderPointDot({
                lineColor: "#2563eb",
                onSelect: selectPoint,
              })}
              activeDot={renderActivePointDot({
                lineColor: "#2563eb",
                onSelect: selectPoint,
              })}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <AnimatePresence initial={false}>
        {selectedPoint ? (
          <motion.div
            key={selectedPoint.date}
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Selected point
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {selectedPoint.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onShowItemsClick ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                        onClick={() => onShowItemsClick(selectedPoint.date)}
                      >
                        show items
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close selection details"
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                      onClick={() => setSelectedPoint(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {compareSeries ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-green-600">
                        Physical
                      </p>
                      <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                        {formatMetricValue(metric, selectedPoint.physical ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
                        Webshop
                      </p>
                      <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                        {formatMetricValue(metric, selectedPoint.webshop ?? 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                      {metric === "revenue" ? "Revenue" : "Items sold"}
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {formatMetricValue(metric, selectedPoint.value)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function mergeVelocitySeries(
  physical: VelocityPoint[],
  webshop: VelocityPoint[],
  metric: "itemsSold" | "revenue",
): Array<{ date: string; physical: number; webshop: number }> {
  const seriesMap = new Map<string, { physical: number; webshop: number }>();

  for (const point of physical) {
    seriesMap.set(point.date, {
      physical: point[metric] ?? 0,
      webshop: 0,
    });
  }

  for (const point of webshop) {
    const current = seriesMap.get(point.date) ?? {
      physical: 0,
      webshop: 0,
    };

    current.webshop = point[metric] ?? 0;
    seriesMap.set(point.date, current);
  }

  return Array.from(seriesMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      ...values,
    }));
}

function getPayloadPoint(payload: unknown): ChartPointRecord | undefined {
  return (
    (payload as { activePayload?: Array<{ payload: ChartPointRecord }> })
      ?.activePayload?.[0]?.payload ?? undefined
  );
}

function toPointDetails(
  point: ChartPointRecord,
  metric: "itemsSold" | "revenue",
  compareSeries: VelocityCompareSeries | null,
): PointDetails {
  return {
    date: String(point.date ?? ""),
    value: Number(point[metric] ?? 0),
    physical: compareSeries ? Number(point.physical ?? 0) : undefined,
    webshop: compareSeries ? Number(point.webshop ?? 0) : undefined,
  };
}

function formatMetricValue(metric: "itemsSold" | "revenue", value: number) {
  return metric === "revenue" ? formatKr(value) : `${value} items`;
}

function arePointDetailsEqual(left: PointDetails, right: PointDetails) {
  return (
    left.date === right.date &&
    left.value === right.value &&
    left.physical === right.physical &&
    left.webshop === right.webshop
  );
}

type DotRendererInput = {
  lineColor: string;
  onSelect: (point: ChartPointRecord) => void;
};

type ActiveDotRendererInput = {
  lineColor: string;
  onSelect: (point: ChartPointRecord) => void;
};

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartPointRecord;
};

function renderPointDot({ lineColor, onSelect }: DotRendererInput) {
  return function PointDot({ cx, cy, payload }: DotProps) {
    if (cx == null || cy == null || !payload) return null;

    return (
      <g onClick={() => onSelect(payload)} onTouchStart={() => onSelect(payload)}>
        <circle cx={cx} cy={cy} r={24} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={3.5}
          fill={lineColor}
          stroke="white"
          strokeWidth={1.5}
        />
      </g>
    );
  };
}

function renderActivePointDot({ lineColor, onSelect }: ActiveDotRendererInput) {
  return function ActivePointDot({ cx, cy, payload }: DotProps) {
    if (cx == null || cy == null || !payload) return null;

    return (
      <g
        onClick={() => onSelect(payload)}
        onTouchStart={() => onSelect(payload)}
      >
        <circle cx={cx} cy={cy} r={26} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={6.5}
          fill={lineColor}
          stroke="white"
          strokeWidth={3}
        />
      </g>
    );
  };
}
