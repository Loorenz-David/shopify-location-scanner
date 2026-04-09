import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DimensionBucket } from "../../types/analytics.types";

interface DimensionBucketChartProps {
  data: DimensionBucket[];
  title: string;
}

export function DimensionBucketChart({
  data,
  title,
}: DimensionBucketChartProps) {
  return (
    <section>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
          <Bar
            dataKey="soldCount"
            name="Sold"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="totalCount"
            name="Total"
            fill="#cbd5e1"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
