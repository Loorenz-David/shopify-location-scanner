import { useVirtualizer } from "@tanstack/react-virtual";

import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import {
  selectStatsItemsCardMode,
  selectStatsItemsError,
  selectStatsItemsHasMore,
  selectStatsItemsIsLoading,
  selectStatsItemsList,
  selectStatsItemsQuery,
  useStatsItemsStore,
} from "../../stores/stats-items.store";
import type { StatsItem } from "../../types/stats-items.types";
import { StatsItemCard } from "./StatsItemCard";

type FocusDimension = "height" | "width" | "depth" | "volume" | null;

type FlatRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "item"; key: string; item: StatsItem };

function buildRows(items: StatsItem[], grouped: boolean): FlatRow[] {
  if (!grouped) {
    return items.map((item) => ({ kind: "item", key: item.id, item }));
  }

  const rows: FlatRow[] = [];
  const seen = new Map<string, boolean>();

  for (const item of items) {
    const groupKey = item.orderId ?? "__ungrouped__";
    if (!seen.has(groupKey)) {
      seen.set(groupKey, true);
      if (item.orderId) {
        rows.push({
          kind: "header",
          key: `header-${groupKey}`,
          label:
            item.orderNumber !== null
              ? `Order #${item.orderNumber}`
              : `Order ${item.orderId}`,
        });
      }
    }
    rows.push({ kind: "item", key: item.id, item });
  }

  return rows;
}

interface StatsItemsListProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function StatsItemsList({ scrollRef }: StatsItemsListProps) {
  const items = useStatsItemsStore(selectStatsItemsList);
  const isLoading = useStatsItemsStore(selectStatsItemsIsLoading);
  const hasMore = useStatsItemsStore(selectStatsItemsHasMore);
  const error = useStatsItemsStore(selectStatsItemsError);
  const cardMode = useStatsItemsStore(selectStatsItemsCardMode);
  const query = useStatsItemsStore(selectStatsItemsQuery);
  const focusDimension = getFocusDimension(query);

  const shouldGroup = query?.groupByOrder === true;
  const rows = buildRows(items, shouldGroup);

  // Append sentinel rows for load-more/error/loading indicator
  const totalRows = rows.length + (hasMore || error || isLoading ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      if (index >= rows.length) return 56;
      const row = rows[index];
      return row.kind === "header" ? 28 : 88;
    },
    overscan: 5,
  });

  if (items.length === 0 && !isLoading && !error) {
    return (
      <p className="py-12 text-center text-sm font-medium text-slate-500">
        No items found for this selection.
      </p>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualItems.map((vItem) => {
        const isFooter = vItem.index >= rows.length;

        return (
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${vItem.start}px)`,
            }}
          >
            {isFooter ? (
              <div className="flex flex-col items-center gap-2 py-4">
                {error ? (
                  <>
                    <p className="text-sm font-medium text-rose-600">{error}</p>
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700"
                      onClick={statsItemsOverlayActions.retry}
                    >
                      Retry
                    </button>
                  </>
                ) : isLoading ? (
                  <p className="text-xs font-medium text-slate-400">Loading…</p>
                ) : hasMore ? (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                    onClick={statsItemsOverlayActions.loadMore}
                  >
                    Show more
                  </button>
                ) : null}
              </div>
            ) : (
              (() => {
                const row = rows[vItem.index];
                if (row.kind === "header") {
                  return (
                    <p className="m-0 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {row.label}
                    </p>
                  );
                }
                return (
                  <div className="pb-3">
                    <StatsItemCard
                      item={row.item}
                      cardMode={cardMode}
                      focusDimension={focusDimension}
                    />
                  </div>
                );
              })()
            )}
          </div>
        );
      })}
    </div>
  );
}

function getFocusDimension(
  query: ReturnType<typeof selectStatsItemsQuery>,
): FocusDimension {
  if (!query) return null;
  if (query.heightMin !== undefined || query.heightMax !== undefined) {
    return "height";
  }
  if (query.widthMin !== undefined || query.widthMax !== undefined) {
    return "width";
  }
  if (query.depthMin !== undefined || query.depthMax !== undefined) {
    return "depth";
  }
  if (query.volumeLabel !== undefined) {
    return "volume";
  }
  return null;
}
