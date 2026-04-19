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

import type { CategoryOverviewItem } from "../../types/analytics.types";

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
const BAR_MIN_HEIGHT = 220;
const BAR_MAX_VISIBLE_HEIGHT = 320;
const ACTIVE_SLICE_FILTER = "drop-shadow(0 0 10px rgba(59,130,246,0.28))";
const ACTIVE_BAR_FILTER = "drop-shadow(0 0 6px rgba(147,197,253,0.85))";

const formatValue = (value: number, metric: "itemsSold" | "totalRevenue"): string => {
  if (metric === "totalRevenue") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return String(value);
  }
  return `${value} sold`;
};

export type CategoryOverviewChartMode = "pie" | "bar";

interface CategoryOverviewChartProps {
  data: CategoryOverviewItem[];
  mode: CategoryOverviewChartMode;
  metric?: "itemsSold" | "totalRevenue";
  activeCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export function CategoryOverviewChart({
  data,
  mode,
  metric = "itemsSold",
  activeCategory = null,
  onSelectCategory,
}: CategoryOverviewChartProps) {
  const [hoveredBarCategory, setHoveredBarCategory] = useState<string | null>(
    null,
  );

  // Assign colors once by itemsSold rank so the same category always gets the
  // same color regardless of which metric is currently selected.
  const colorMap = useMemo(() => {
    const stable = [...data]
      .filter((item) => item.itemsSold > 0 || item.totalRevenue > 0)
      .sort((a, b) => b.itemsSold - a.itemsSold);
    return new Map(stable.map((item, i) => [item.category, COLORS[i % COLORS.length]]));
  }, [data]);

  // Stable order for pie animation — Recharts tweens arcs when only `value`
  // changes, rather than jumping when dataKey or sort order changes.
  const stablePieData = useMemo(() => {
    const stable = [...data]
      .filter((item) => item.itemsSold > 0 || item.totalRevenue > 0)
      .sort((a, b) => b.itemsSold - a.itemsSold);
    return stable.map((item) => ({
      category: item.category,
      value: item[metric],
      fill: colorMap.get(item.category) ?? COLORS[0],
    }));
  }, [data, metric, colorMap]);

  // Sorted by active metric for legend list and bar chart
  const chartData = useMemo(
    () =>
      [...data]
        .filter((item) => item.itemsSold > 0 || item.totalRevenue > 0)
        .sort((left, right) => right[metric] - left[metric])
        .map((item) => ({
          category: item.category,
          itemsSold: item.itemsSold,
          totalRevenue: item.totalRevenue,
          bestLocationByVolume: item.bestLocationByVolume,
          bestLocationByRevenue: item.bestLocationByRevenue,
          fill: colorMap.get(item.category) ?? COLORS[0],
        })),
    [data, metric, colorMap],
  );

  const total = useMemo(
    () => chartData.reduce((sum, item) => sum + item[metric], 0),
    [chartData, metric],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No category sales data yet.
      </div>
    );
  }

  if (mode === "pie") {
    return (
      <div className="analytics-chart-shell">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart accessibilityLayer={false}>
            <Pie
              data={stablePieData}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={82}
              paddingAngle={3}
              isAnimationActive
              animationBegin={0}
              animationDuration={500}
              animationEasing="ease-out"
              onClick={(entry) => {
                const category = (
                  entry as { payload?: { category?: string } } | undefined
                )?.payload?.category;
                if (category && onSelectCategory) {
                  onSelectCategory(category);
                }
              }}
            >
              {stablePieData.map((entry) => {
                const isActive =
                  activeCategory === null || activeCategory === entry.category;

                return (
                  <Cell
                    key={entry.category}
                    fill={entry.fill}
                    fillOpacity={isActive ? 1 : 0.28}
                    stroke={activeCategory === entry.category ? "#dbeafe" : "none"}
                    strokeWidth={activeCategory === entry.category ? 3 : 0}
                    style={{
                      filter:
                        activeCategory === entry.category
                          ? ACTIVE_SLICE_FILTER
                          : "none",
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              cursor={false}
              formatter={(value) => [formatValue(Number(value ?? 0), metric), metric === "itemsSold" ? "Items" : "Revenue"]}
            />
          </PieChart>
        </ResponsiveContainer>

        {activeCategory ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onSelectCategory?.(null)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition-colors hover:border-sky-200 hover:text-sky-700"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="mt-3 max-h-40 overflow-y-auto">
          <div className="flex flex-col divide-y divide-slate-100">
            {chartData.map((entry) => {
              const isActive =
                activeCategory === null || activeCategory === entry.category;
              const percentage =
                total > 0
                  ? Math.round((entry[metric] / total) * 100)
                  : 0;

              return (
                <button
                  key={entry.category}
                  type="button"
                  onClick={() => onSelectCategory?.(entry.category)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    activeCategory === entry.category
                      ? "bg-sky-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.6)]"
                      : isActive
                        ? "bg-transparent text-slate-900"
                        : "bg-slate-50/70 text-slate-400"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {entry.category}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatValue(entry[metric], metric)} · {percentage}%
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
      style={{ maxHeight: BAR_MAX_VISIBLE_HEIGHT }}
    >
      <div
        style={{
          height: Math.max(BAR_MIN_HEIGHT, chartData.length * BAR_ROW_HEIGHT),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            layout="vertical"
            data={chartData}
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            onMouseMove={(event) => {
              const category = (
                event as
                  | {
                      activePayload?: Array<{
                        payload?: { category?: string };
                      }>;
                    }
                  | undefined
              )?.activePayload?.[0]?.payload?.category;
              setHoveredBarCategory(category ?? null);
            }}
            onMouseLeave={() => setHoveredBarCategory(null)}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 11 }}
              width={96}
            />
            <Tooltip
              cursor={false}
              formatter={(value) => [formatValue(Number(value ?? 0), metric), metric === "itemsSold" ? "Items" : "Revenue"]}
            />
            <Bar
              dataKey={metric}
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationBegin={0}
              animationDuration={400}
              animationEasing="ease-out"
              cursor="pointer"
              onMouseDown={(entry) => {
                const category = (entry as { payload?: { category?: string } }).payload?.category;
                if (category) onSelectCategory?.(category);
              }}
              onTouchStart={(entry) => {
                const category = (entry as { payload?: { category?: string } }).payload?.category;
                if (category) onSelectCategory?.(category);
              }}
              onClick={(entry) => {
                const category = (entry as { payload?: { category?: string } }).payload?.category;
                if (category) onSelectCategory?.(category);
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={
                    hoveredBarCategory === entry.category
                      ? "#3b82f6"
                      : entry.fill
                  }
                  stroke={
                    hoveredBarCategory === entry.category ? "#bfdbfe" : "none"
                  }
                  strokeWidth={hoveredBarCategory === entry.category ? 1 : 0}
                  style={{
                    filter:
                      hoveredBarCategory === entry.category
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
