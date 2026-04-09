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

const COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b"];
const BAR_ROW_HEIGHT = 38;
const BAR_MIN_HEIGHT = 220;
const BAR_MAX_VISIBLE_HEIGHT = 320;
const ACTIVE_SLICE_FILTER = "drop-shadow(0 0 10px rgba(20,184,166,0.24))";
const ACTIVE_BAR_FILTER = "drop-shadow(0 0 6px rgba(153,246,228,0.8))";

export type CategoryPerformanceChartMode = "bar" | "pie";

interface CategoryBarChartProps {
  data: Array<{
    category: string;
    itemsSold: number;
  }>;
  mode?: CategoryPerformanceChartMode;
}

export function CategoryBarChart({
  data,
  mode = "bar",
}: CategoryBarChartProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredBarCategory, setHoveredBarCategory] = useState<string | null>(
    null,
  );
  const totalItems = useMemo(
    () => data.reduce((sum, entry) => sum + entry.itemsSold, 0),
    [data],
  );

  if (mode === "pie") {
    return (
      <div className="analytics-chart-shell">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart accessibilityLayer={false}>
            <Pie
              data={data}
              dataKey="itemsSold"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={84}
              paddingAngle={3}
              onClick={(entry) => {
                const category = (
                  entry as { payload?: { category?: string } } | undefined
                )?.payload?.category;
                if (category) {
                  setActiveCategory(category);
                }
              }}
            >
              {data.map((entry) => {
                const isActive =
                  activeCategory === null || activeCategory === entry.category;

                return (
                  <Cell
                    key={entry.category}
                    fill={COLORS[Math.abs(entry.category.length) % COLORS.length]}
                    fillOpacity={isActive ? 1 : 0.28}
                    stroke={activeCategory === entry.category ? "#ccfbf1" : "none"}
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
              formatter={(value) => [`${Number(value ?? 0)} items`, "Sold"]}
            />
          </PieChart>
        </ResponsiveContainer>

        {activeCategory ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition-colors hover:border-teal-200 hover:text-teal-700"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="mt-3 max-h-40 overflow-y-auto">
          <div className="flex flex-col divide-y divide-slate-100">
            {data.map((entry) => {
              const isActive =
                activeCategory === null || activeCategory === entry.category;
              const percentage =
                totalItems > 0
                  ? Math.round((entry.itemsSold / totalItems) * 100)
                  : 0;

              return (
                <button
                  key={entry.category}
                  type="button"
                  onClick={() => setActiveCategory(entry.category)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    activeCategory === entry.category
                      ? "bg-teal-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(94,234,212,0.7)]"
                      : isActive
                        ? "bg-transparent text-slate-900"
                        : "bg-slate-50/70 text-slate-400"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[Math.abs(entry.category.length) % COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {entry.category}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {entry.itemsSold} sold · {percentage}%
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
          height: Math.max(BAR_MIN_HEIGHT, data.length * BAR_ROW_HEIGHT),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            layout="vertical"
            data={data}
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
              formatter={(value) => [`${Number(value ?? 0)} items`, "Sold"]}
            />
            <Bar
              dataKey="itemsSold"
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={
                    hoveredBarCategory === entry.category
                      ? "#14b8a6"
                      : COLORS[Math.abs(entry.category.length) % COLORS.length]
                  }
                  stroke={
                    hoveredBarCategory === entry.category ? "#99f6e4" : "none"
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
