import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";
import { ItemScanHistoryCard } from "./ItemScanHistoryCard";

const INITIAL_RENDER_COUNT = 12;
const BATCH_RENDER_COUNT = 10;

interface ItemScanHistoryListProps {
  items: ItemScanHistoryItem[];
  expandedItemIds: string[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function ItemScanHistoryList({
  items,
  expandedItemIds,
  scrollContainerRef,
}: ItemScanHistoryListProps) {
  const [visibleCount, setVisibleCount] = useState(
    Math.min(items.length, INITIAL_RENDER_COUNT),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(Math.min(items.length, INITIAL_RENDER_COUNT));
  }, [items]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const hasMoreItems = visibleCount < items.length;

  useEffect(() => {
    if (!hasMoreItems || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        setVisibleCount((current) =>
          Math.min(current + BATCH_RENDER_COUNT, items.length),
        );
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "220px 0px",
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreItems, items.length, scrollContainerRef]);

  return (
    <div className="flex flex-col gap-4">
      {visibleItems.map((item) => (
        <ItemScanHistoryCard
          key={item.id}
          item={item}
          isExpanded={expandedItemIds.includes(item.id)}
          onToggle={() => itemScanHistoryActions.toggleExpandedItem(item.id)}
        />
      ))}

      {hasMoreItems ? (
        <>
          <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
          <button
            type="button"
            className="self-center rounded-xl border border-slate-900/15 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600"
            onClick={() =>
              setVisibleCount((current) =>
                Math.min(current + BATCH_RENDER_COUNT, items.length),
              )
            }
          >
            Load more
          </button>
        </>
      ) : null}
    </div>
  );
}
