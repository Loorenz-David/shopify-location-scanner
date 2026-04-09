import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CategoryLocationRow } from "../../stores/analytics.store";

interface CategoryByLocationChartProps {
  data: CategoryLocationRow[];
  metric: "itemsSold" | "revenue";
}

export function CategoryByLocationChart({
  data,
  metric,
}: CategoryByLocationChartProps) {
  const sortedData = [...data].sort((left, right) => right[metric] - left[metric]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, sortedData.length * 36)}>
      <BarChart
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
        <Tooltip />
        <Bar dataKey={metric} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
