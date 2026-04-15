import { useEffect, useRef, useState } from "react";

import type { LogisticTaskCardAction } from "../../role-context/types/role-context.types";
import { LogisticTasksCard } from "./LogisticTasksCard";
import type { LogisticOrderGroup } from "../types/logistic-tasks.types";

const INITIAL_BATCH = 12;
const BATCH_SIZE = 10;

interface LogisticTasksListProps {
  groups: LogisticOrderGroup[];
  cardAction: LogisticTaskCardAction;
}

export function LogisticTasksList({
  groups,
  cardAction,
}: LogisticTasksListProps) {
  const allItems = groups.flatMap((g) => g.items);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [groups]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, allItems.length),
          );
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [allItems.length]);

  if (groups.length === 0) return null;

  // Build flattened visible list with group headers
  let seenCount = 0;
  const visibleGroups: {
    orderId: string | null;
    orderNumber: number | null;
    items: typeof allItems;
  }[] = [];

  for (const group of groups) {
    if (seenCount >= visibleCount) break;
    const remaining = visibleCount - seenCount;
    const sliced = group.items.slice(0, remaining);
    if (sliced.length > 0) {
      visibleGroups.push({
        orderId: group.orderId,
        orderNumber: group.items[0]?.orderNumber ?? null,
        items: sliced,
      });
      seenCount += sliced.length;
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 pt-4 pb-8">
      {visibleGroups.map((group, index) => (
        <div key={group.orderId ?? `no-order-${index}`}>
          {index > 0 && <div className="h-4" />}

          {group.orderId && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order #{group.orderNumber ?? group.orderId}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {group.items.map((item) => (
              <LogisticTasksCard
                key={item.id}
                item={item}
                cardAction={cardAction}
              />
            ))}
          </div>
        </div>
      ))}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
