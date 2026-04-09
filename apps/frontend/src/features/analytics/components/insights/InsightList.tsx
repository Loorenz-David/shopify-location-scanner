import { useMemo, useState } from "react";

import { InfoSheet } from "../../../../share/info";
import type { SmartInsight } from "../../types/analytics.types";
import { InsightCard } from "./InsightCard";
import smartInsightsMarkdown from "../../docs/smart-insights.md?raw";

interface InsightListProps {
  insights: SmartInsight[];
}

export function InsightList({ insights }: InsightListProps) {
  const [activeInsight, setActiveInsight] = useState<SmartInsight | null>(null);

  const markdownContent = useMemo(
    () => smartInsightsMarkdown?.trim() ?? "",
    [],
  );

  if (insights.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {insights.map((insight, index) => (
          <InsightCard
            key={`${insight.type}-${index}`}
            insight={insight}
            onOpenInfo={setActiveInsight}
          />
        ))}
      </div>

      <InfoSheet
        isOpen={activeInsight !== null}
        title="Understanding this insight"
        markdown={markdownContent}
        onClose={() => setActiveInsight(null)}
        pinnedContent={
          activeInsight ? <InsightCard insight={activeInsight} /> : undefined
        }
      />
    </>
  );
}
