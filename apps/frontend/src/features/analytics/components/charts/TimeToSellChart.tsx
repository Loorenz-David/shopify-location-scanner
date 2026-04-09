import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CategoryOverviewItem } from "../../types/analytics.types";

interface TimeToSellChartProps {
  data: CategoryOverviewItem[];
}

export function TimeToSellChart({ data }: TimeToSellChartProps) {
  const chartData = data
    .filter((item) => item.avgTimeToSellSeconds !== null)
    .map((item) => ({
      category: item.category,
      days: Math.round(((item.avgTimeToSellSeconds ?? 0) / 86_400) * 10) / 10,
    }))
    .sort((left, right) => left.days - right.days);

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} unit=" d" />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11 }}
          width={96}
        />
        <Tooltip
          formatter={(value) => [`${Number(value ?? 0)} days`, "Avg time to sell"]}
        />
        <Bar dataKey="days" fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
