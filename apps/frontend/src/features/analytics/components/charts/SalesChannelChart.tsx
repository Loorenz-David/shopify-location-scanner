import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface SalesChannelChartProps {
  data: SalesChannelOverviewItem[];
  metric: "itemsSold" | "totalRevenue";
}

export function SalesChannelChart({
  data,
  metric,
}: SalesChannelChartProps) {
  const chartData = data.map((entry) => ({
    ...entry,
    label: CHANNEL_LABELS[entry.salesChannel] ?? entry.salesChannel,
  }));

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
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        >
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11 }}
            width={100}
          />
          <Tooltip
            cursor={false}
            formatter={(value) =>
              metric === "totalRevenue"
                ? [`${Math.round(Number(value ?? 0))} kr`, "Revenue"]
                : [`${Number(value ?? 0)}`, "Items sold"]
            }
          />
          <Bar dataKey={metric} radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.salesChannel}
                fill={CHANNEL_COLORS[entry.salesChannel] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
