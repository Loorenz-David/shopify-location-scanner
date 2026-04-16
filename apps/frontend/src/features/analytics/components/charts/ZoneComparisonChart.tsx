import { useMemo, useState } from "react";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ZoneOverviewItem } from "../../types/analytics.types";

const COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#8b5cf6",
];
const BAR_ROW_HEIGHT = 38;
const BAR_MIN_HEIGHT = 180;
const BAR_MAX_VISIBLE_HEIGHT = 320;
const ACTIVE_SLICE_FILTER = "drop-shadow(0 0 10px rgba(59,130,246,0.28))";
const ACTIVE_BAR_FILTER = "drop-shadow(0 0 6px rgba(147,197,253,0.85))";

export type ZoneComparisonChartMode = "bar" | "pie";

interface ZoneComparisonChartProps {
  data: ZoneOverviewItem[];
  metric: "itemsSold" | "revenue";
  mode?: ZoneComparisonChartMode;
  onBarClick?: (location: string) => void;
}

export function ZoneComparisonChart({
  data,
  metric,
  mode = "bar",
  onBarClick,
}: ZoneComparisonChartProps) {
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [hoveredBarLocation, setHoveredBarLocation] = useState<string | null>(
    null,
  );

  // Stable color assignment by itemsSold rank so zone colors never shift when
  // switching between the Items and Revenue metrics.
  const colorMap = useMemo(() => {
    const stable = [...data].sort((a, b) => b.itemsSold - a.itemsSold);
    return new Map(stable.map((item, i) => [item.location, COLORS[i % COLORS.length]]));
  }, [data]);

  // Stable order for the pie — Recharts tweens arcs smoothly when only `value`
  // changes, rather than jumping when dataKey or sort order changes.
  const stablePieData = useMemo(() => {
    const stable = [...data]
      .filter((item) => item.itemsSold > 0 || item.revenue > 0)
      .sort((a, b) => b.itemsSold - a.itemsSold);
    return stable.map((item) => ({
      location: item.location,
      value: item[metric],
      fill: colorMap.get(item.location) ?? COLORS[0],
    }));
  }, [data, metric, colorMap]);

  const sortedData = useMemo(
    () => [...data].sort((left, right) => right[metric] - left[metric]),
    [data, metric],
  );
  const totalValue = useMemo(
    () => sortedData.reduce((sum, item) => sum + item[metric], 0),
    [metric, sortedData],
  );

  if (mode === "pie") {
    return (
      <div className="analytics-chart-shell">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart accessibilityLayer={false}>
            <Pie
              data={stablePieData}
              dataKey="value"
              nameKey="location"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={84}
              paddingAngle={3}
              isAnimationActive
              animationBegin={0}
              animationDuration={500}
              animationEasing="ease-out"
              onClick={(entry) => {
                const location = (
                  entry as { payload?: { location?: string } } | undefined
                )?.payload?.location;
                if (!location) {
                  return;
                }

                setActiveLocation(location);

                if (onBarClick) {
                  onBarClick(location);
                }
              }}
              cursor="pointer"
            >
              {stablePieData.map((entry) => {
                const isActive =
                  activeLocation === null || activeLocation === entry.location;

                return (
                  <Cell
                    key={entry.location}
                    fill={entry.fill}
                    fillOpacity={isActive ? 1 : 0.28}
                    stroke={activeLocation === entry.location ? "#dbeafe" : "none"}
                    strokeWidth={activeLocation === entry.location ? 3 : 0}
                    style={{
                      filter:
                        activeLocation === entry.location
                          ? ACTIVE_SLICE_FILTER
                          : "none",
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              cursor={false}
              formatter={(value) => [
                metric === "revenue"
                  ? `$${Math.round(Number(value ?? 0))}`
                  : `${Number(value ?? 0)} sold`,
                metric === "revenue" ? "Revenue" : "Items",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {activeLocation ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveLocation(null)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition-colors hover:border-sky-200 hover:text-sky-700"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="mt-3 max-h-40 overflow-y-auto">
          <div className="flex flex-col divide-y divide-slate-100">
            {sortedData.map((entry) => {
              const isActive =
                activeLocation === null || activeLocation === entry.location;
              const percentage =
                totalValue > 0 ? Math.round((entry[metric] / totalValue) * 100) : 0;
              const valueLabel =
                metric === "revenue"
                  ? `$${Math.round(entry.revenue)}`
                  : `${entry.itemsSold} sold`;

              return (
                <button
                  key={entry.location}
                  type="button"
                  onClick={() => {
                    setActiveLocation(entry.location);
                    if (onBarClick) {
                      onBarClick(entry.location);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    activeLocation === entry.location
                      ? "bg-sky-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.6)]"
                      : isActive
                        ? "bg-transparent text-slate-900"
                        : "bg-slate-50/70 text-slate-400"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: colorMap.get(entry.location) ?? COLORS[0] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {entry.location}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {valueLabel} · {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="analytics-chart-shell overflow-y-auto pr-1"
      style={{
        maxHeight: BAR_MAX_VISIBLE_HEIGHT,
      }}
    >
      <div
        style={{
          height: Math.max(BAR_MIN_HEIGHT, sortedData.length * BAR_ROW_HEIGHT),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            layout="vertical"
            data={sortedData}
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            onMouseMove={(event) => {
              const location = (
                event as
                  | {
                      activePayload?: Array<{
                        payload?: { location?: string };
                      }>;
                    }
                  | undefined
              )?.activePayload?.[0]?.payload?.location;
              setHoveredBarLocation(location ?? null);
            }}
            onMouseLeave={() => setHoveredBarLocation(null)}
            onClick={(event) => {
              const location = (
                event as
                  | {
                      activePayload?: Array<{
                        payload?: { location?: string };
                      }>;
                    }
                  | undefined
              )?.activePayload?.[0]?.payload?.location;
              if (location && onBarClick) {
                onBarClick(location);
              }
            }}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="location"
              tick={{ fontSize: 11 }}
              width={84}
            />
            <Tooltip cursor={false} />
            <Bar
              dataKey={metric}
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationBegin={0}
              animationDuration={400}
              animationEasing="ease-out"
              cursor="pointer"
            >
              {sortedData.map((entry) => (
                <Cell
                  key={entry.location}
                  fill={
                    hoveredBarLocation === entry.location ? "#3b82f6" : "#2563eb"
                  }
                  stroke={
                    hoveredBarLocation === entry.location ? "#bfdbfe" : "none"
                  }
                  strokeWidth={hoveredBarLocation === entry.location ? 1 : 0}
                  style={{
                    filter:
                      hoveredBarLocation === entry.location
                        ? ACTIVE_BAR_FILTER
                        : "none",
                    transition:
                      "fill 160ms ease, stroke 160ms ease, filter 160ms ease",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
