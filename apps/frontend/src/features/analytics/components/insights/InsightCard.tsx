import { InfoButton } from "../../../../share/info";
import type { SmartInsight } from "../../types/analytics.types";

export const insightCardStyleMap: Record<SmartInsight["type"], string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

export const insightCardIconMap: Record<SmartInsight["type"], string> = {
  positive: "UP",
  warning: "!",
  neutral: "i",
};

interface InsightCardProps {
  insight: SmartInsight;
  onOpenInfo?: (insight: SmartInsight) => void;
}

export function InsightCard({ insight, onOpenInfo }: InsightCardProps) {
  return (
    <article
      className={`rounded-2xl border px-3 py-2 text-xs font-medium ${insightCardStyleMap[insight.type]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/20 text-[11px] font-bold">
            {insightCardIconMap[insight.type]}
          </span>
          <span className="min-w-0">{insight.message}</span>
        </div>

        {onOpenInfo ? (
          <InfoButton
            onClick={() => onOpenInfo(insight)}
            label="Learn more about this insight"
            className="mt-[-2px]"
          />
        ) : null}
      </div>
    </article>
  );
}
