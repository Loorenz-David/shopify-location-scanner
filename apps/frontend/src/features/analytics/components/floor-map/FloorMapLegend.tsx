import type { FloorMapMetric } from "./FloorMapHeatOverlay";

const LEGEND = [
  { color: "#22c55e", label: "High" },
  { color: "#84cc16", label: "Good" },
  { color: "#f59e0b", label: "Low" },
  { color: "#ef4444", label: "Minimal" },
  { color: "#94a3b8", label: "No data" },
];

interface FloorMapLegendProps {
  metric?: FloorMapMetric;
}

export function FloorMapLegend({
  metric = "itemsSold",
}: FloorMapLegendProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {metric === "revenue" ? "Revenue heat" : "Items heat"}
      </span>
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
