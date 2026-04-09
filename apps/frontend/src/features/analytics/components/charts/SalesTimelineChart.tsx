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

interface SalesTimelineChartProps {
  data: VelocityPoint[];
  metric: "itemsSold" | "revenue";
  compareSeries?: VelocityCompareSeries | null;
}

export function SalesTimelineChart({
  data,
  metric,
  compareSeries = null,
}: SalesTimelineChartProps) {
  const chartData: Array<Record<string, string | number>> = compareSeries
    ? mergeVelocitySeries(compareSeries.physical, compareSeries.webshop)
    : data;

  return (
    <div className="analytics-chart-shell">
      <ResponsiveContainer width="100%" height={190}>
        <LineChart
          accessibilityLayer={false}
          data={chartData}
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {compareSeries ? (
            <>
              <Line
                type="monotone"
                dataKey="physical"
                stroke="#22c55e"
                strokeWidth={2}
                name="Physical"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="webshop"
                stroke="#6366f1"
                strokeWidth={2}
                name="Webshop"
                dot={false}
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function mergeVelocitySeries(
  physical: VelocityPoint[],
  webshop: VelocityPoint[],
): Array<{ date: string; physical: number; webshop: number }> {
  const seriesMap = new Map<string, { physical: number; webshop: number }>();

  for (const point of physical) {
    seriesMap.set(point.date, {
      physical: point.itemsSold ?? 0,
      webshop: 0,
    });
  }

  for (const point of webshop) {
    const current = seriesMap.get(point.date) ?? {
      physical: 0,
      webshop: 0,
    };

    current.webshop = point.itemsSold ?? 0;
    seriesMap.set(point.date, current);
  }

  return Array.from(seriesMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      ...values,
    }));
}
