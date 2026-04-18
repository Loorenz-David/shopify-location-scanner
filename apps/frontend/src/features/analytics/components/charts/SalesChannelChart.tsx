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
  SalesChannel,
  SalesChannelOverviewItem,
} from "../../types/analytics.types";

const CHANNEL_COLORS: Record<SalesChannel, string> = {
  physical: "#22c55e",
  webshop: "#6366f1",
  imported: "#f59e0b",
  unknown: "#94a3b8",
};

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  physical: "Physical / POS",
  webshop: "Webshop",
  imported: "Imported",
  unknown: "Unknown",
};

type ChannelChartRow = SalesChannelOverviewItem & {
  label: string;
};

interface SalesChannelChartProps {
  data: SalesChannelOverviewItem[];
  metric: "itemsSold" | "totalRevenue";
  onBarClick?: (channel: SalesChannel) => void;
  onShowItemsClick?: (channel: SalesChannel) => void;
}

export function SalesChannelChart({
  data,
  metric,
  onBarClick,
  onShowItemsClick,
}: SalesChannelChartProps) {
  const chartData: ChannelChartRow[] = data.map((entry) => ({
    ...entry,
    label: CHANNEL_LABELS[entry.salesChannel] ?? entry.salesChannel,
  }));

  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | null>(
    null,
  );

  useEffect(() => {
    setSelectedChannel((current) => {
      if (!current) return null;
      return chartData.some((entry) => entry.salesChannel === current)
        ? current
        : null;
    });
  }, [data]);

  const activeEntry =
    chartData.find((entry) => entry.salesChannel === selectedChannel) ?? null;

  function selectChannel(channel: SalesChannel) {
    setSelectedChannel(channel);
    onBarClick?.(channel);
  }

  return (
    <div className="analytics-chart-shell">
      <ResponsiveContainer
        width="100%"
        height={Math.max(100, chartData.length * 40)}
      >
        <BarChart
          accessibilityLayer={false}
          layout="vertical"
          data={chartData}
          margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) =>
              metric === "totalRevenue" ? formatKr(value) : String(value)
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11 }}
            width={84}
          />
          <Tooltip content={() => null} cursor={false} />
          <Bar
            dataKey={metric}
            radius={[0, 4, 4, 0]}
            onMouseDown={(entry) => {
              const channel = getChannelFromBarEntry(entry);
              if (channel) selectChannel(channel);
            }}
            onTouchStart={(entry) => {
              const channel = getChannelFromBarEntry(entry);
              if (channel) selectChannel(channel);
            }}
            onClick={(entry) => {
              const channel = getChannelFromBarEntry(entry);
              if (channel) selectChannel(channel);
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.salesChannel}
                fill={CHANNEL_COLORS[entry.salesChannel] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <AnimatePresence initial={false}>
        {activeEntry ? (
          <motion.div
            key={activeEntry.salesChannel}
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Selected channel
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                      {activeEntry.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onShowItemsClick ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                        onClick={() =>
                          onShowItemsClick(activeEntry.salesChannel)
                        }
                      >
                        show items
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Close selection details"
                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500"
                      onClick={() => setSelectedChannel(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p
                    className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: CHANNEL_COLORS[activeEntry.salesChannel] }}
                  >
                    {metric === "totalRevenue" ? "Revenue" : "Items sold"}
                  </p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
                    {metric === "totalRevenue"
                      ? formatKr(activeEntry.totalRevenue)
                      : `${activeEntry.itemsSold} items`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function getChannelFromBarEntry(entry: unknown): SalesChannel | undefined {
  return (entry as { payload?: ChannelChartRow }).payload?.salesChannel;
}
