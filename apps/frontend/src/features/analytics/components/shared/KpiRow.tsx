import { formatKr } from "../../domain/format-currency.domain";
import { KpiCard } from "./KpiCard";

interface KpiRowProps {
  itemsSold: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
  itemsReceived?: number;
}

function formatAvgTimeToSell(value: number | null): string {
  if (value === null) {
    return "—";
  }

  const days = Math.floor(value / 86_400);
  if (days > 0) {
    return `${days}d`;
  }

  const hours = Math.floor(value / 3_600);
  if (hours > 0) {
    return `${hours}h`;
  }

  const minutes = Math.floor(value / 60);
  return `${Math.max(minutes, 1)}m`;
}

export function KpiRow({
  itemsSold,
  revenue,
  avgTimeToSellSeconds,
  itemsReceived,
}: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2 py-1">
      <KpiCard label="Sold" value={itemsSold} />
      <KpiCard label="Revenue" value={formatKr(revenue)} />
      <KpiCard
        label="Avg sell time"
        value={formatAvgTimeToSell(avgTimeToSellSeconds)}
      />
      {typeof itemsReceived === "number" ? (
        <KpiCard label="Received" value={itemsReceived} />
      ) : null}
    </div>
  );
}
