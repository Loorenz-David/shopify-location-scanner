import type { ItemScanHistoryEvent } from "../types/item-scan-history.types";

interface ItemScanHistoryTimelineProps {
  events: ItemScanHistoryEvent[];
}

export function ItemScanHistoryTimeline({
  events,
}: ItemScanHistoryTimelineProps) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {events.map((event, index) => (
        <li key={event.id} className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex min-h-14 flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" />
            {index < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-slate-300" aria-hidden="true" />
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {event.happenedAtLabel}
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
              {event.location}
            </p>
            <p className="m-0 mt-1 text-sm text-slate-600">{event.username}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
