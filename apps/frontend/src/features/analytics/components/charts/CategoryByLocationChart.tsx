import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

import type { CategoryLocationRow } from "../../stores/analytics.store";
import { formatKr } from "../../domain/format-currency.domain";

const COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#8b5cf6",
];

const ACTIVE_SLICE_FILTER = "drop-shadow(0 0 10px rgba(59,130,246,0.28))";

export type CategoryByLocationChartMode = "bar" | "pie";

interface CategoryByLocationChartProps {
  data: CategoryLocationRow[];
  metric: "itemsSold" | "revenue";
  mode?: CategoryByLocationChartMode;
  onLocationClick?: (location: string) => void;
}

export function CategoryByLocationChart({
  data,
  metric,
  mode = "bar",
  onLocationClick,
}: CategoryByLocationChartProps) {
  const [selectedRow, setSelectedRow] = useState<CategoryLocationRow | null>(null);

  // Stable color assignment by itemsSold rank, independent of selected metric
  const colorMap = useMemo(() => {
    const stable = [...data].sort((a, b) => b.itemsSold - a.itemsSold);
    return new Map(stable.map((row, i) => [row.location, COLORS[i % COLORS.length]]));
  }, [data]);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b[metric] - a[metric]),
    [data, metric],
  );

  const total = useMemo(
    () => sortedData.reduce((sum, row) => sum + row[metric], 0),
    [sortedData, metric],
  );

  const pieData = useMemo(
    () =>
      sortedData.map((row) => ({
        ...row,
        value: row[metric],
        fill: colorMap.get(row.location) ?? COLORS[0],
      })),
    [sortedData, metric, colorMap],
  );

  return (
    <section>
      {mode === "pie" ? (
        <div className="analytics-chart-shell">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="location"
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
                  const row = (entry as { payload?: CategoryLocationRow }).payload;
                  if (row) setSelectedRow(row);
                }}
              >
                {pieData.map((entry) => {
                  const isActive =
                    selectedRow === null || selectedRow.location === entry.location;
                  return (
                    <Cell
                      key={entry.location}
                      fill={entry.fill}
                      fillOpacity={isActive ? 1 : 0.28}
                      stroke={
                        selectedRow?.location === entry.location ? "#dbeafe" : "none"
                      }
                      strokeWidth={
                        selectedRow?.location === entry.location ? 3 : 0
                      }
                      style={{
                        filter:
                          selectedRow?.location === entry.location
                            ? ACTIVE_SLICE_FILTER
                            : "none",
                      }}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={() => null} cursor={false} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 flex flex-col divide-y divide-slate-100">
            {pieData.map((entry) => {
              const isActive =
                selectedRow === null || selectedRow.location === entry.location;
              const percentage =
                total > 0 ? Math.round((entry[metric] / total) * 100) : 0;
              return (
                <button
                  key={entry.location}
                  type="button"
                  onClick={() => setSelectedRow(entry)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    selectedRow?.location === entry.location
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
                    {entry.location}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {metric === "itemsSold"
                      ? `${entry.itemsSold} sold`
                      : formatKr(entry.revenue)}{" "}
                    · {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="analytics-chart-shell">
          <ResponsiveContainer
            width="100%"
            height={Math.max(140, sortedData.length * 36)}
          >
            <BarChart
              accessibilityLayer={false}
              tabIndex={-1}
              layout="vertical"
              data={sortedData}
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="location"
                tick={{ fontSize: 11 }}
                width={72}
              />
              <Tooltip content={() => null} cursor={false} />
              <Bar
                dataKey={metric}
                radius={[0, 4, 4, 0]}
                activeBar={false}
                onMouseDown={(entry) => {
                  const row = (entry as { payload?: CategoryLocationRow }).payload;
                  if (row) setSelectedRow(row);
                }}
                onTouchStart={(entry) => {
                  const row = (entry as { payload?: CategoryLocationRow }).payload;
                  if (row) setSelectedRow(row);
                }}
                onClick={(entry) => {
                  const row = (entry as { payload?: CategoryLocationRow }).payload;
                  if (row) setSelectedRow(row);
                }}
              >
                {sortedData.map((row) => (
                  <Cell
                    key={row.location}
                    fill={colorMap.get(row.location) ?? COLORS[0]}
                    stroke={
                      selectedRow?.location === row.location
                        ? "#0ea5e9"
                        : "transparent"
                    }
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <AnimatePresence initial={false}>
        {selectedRow ? (
          <motion.div
            key={selectedRow.location}
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
                    Selected location
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {selectedRow.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onLocationClick ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                      onClick={() => onLocationClick(selectedRow.location)}
                    >
                      show items
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Close selection"
                    className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                    onClick={() => setSelectedRow(null)}
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
                    {selectedRow.itemsSold}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                    Revenue
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {formatKr(selectedRow.revenue)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
