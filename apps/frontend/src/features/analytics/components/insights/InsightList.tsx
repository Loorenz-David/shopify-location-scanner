import { useMemo, useState } from "react";

import { BackArrowIcon } from "../../../../assets/icons";
import { InfoSheet } from "../../../../share/info";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
import type { SmartInsight } from "../../types/analytics.types";
import { InsightCard } from "./InsightCard";
import smartInsightsMarkdown from "../../docs/smart-insights.md?raw";

const MAX_VISIBLE = 4;

interface InsightListProps {
  insights: SmartInsight[];
}

export function InsightList({ insights }: InsightListProps) {
  const [activeInsight, setActiveInsight] = useState<SmartInsight | null>(null);
  const [showAll, setShowAll] = useState(false);

  const markdownContent = useMemo(
    () => smartInsightsMarkdown?.trim() ?? "",
    [],
  );

  if (insights.length === 0) {
    return null;
  }

  const visible = insights.slice(0, MAX_VISIBLE);
  const hiddenCount = insights.length - MAX_VISIBLE;

  return (
    <>
      <div className="flex flex-col gap-2">
        {visible.map((insight, index) => (
          <InsightCard
            key={`${insight.type}-${index}`}
            insight={insight}
            onOpenInfo={setActiveInsight}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            className="self-start text-xs text-slate-500 underline underline-offset-2"
            onClick={() => setShowAll(true)}
          >
            Show {hiddenCount} more insight{hiddenCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* All insights bottom sheet */}
      <SlidingOverlayContainer isOpen={showAll} title="All insights">
        <div className="flex h-full flex-col">
          <button
            type="button"
            aria-label="Close all insights"
            className="flex-1 cursor-default"
            onClick={() => setShowAll(false)}
          />

          <section className="max-h-[85svh] overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
            <header className="flex items-center gap-3 border-b border-slate-900/10 px-4 py-3">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-600"
                onClick={() => setShowAll(false)}
                aria-label="Close all insights"
              >
                <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
              </button>

              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Insights
                </p>
                <h2 className="m-0 mt-1 text-base font-bold text-slate-900">
                  All insights
                </h2>
              </div>
            </header>

            <div className="flex flex-col gap-2 px-4 py-4">
              {insights.map((insight, index) => (
                <InsightCard
                  key={`all-${insight.type}-${index}`}
                  insight={insight}
                  onOpenInfo={(i) => {
                    setShowAll(false);
                    setActiveInsight(i);
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </SlidingOverlayContainer>

      {/* Individual insight info sheet */}
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
