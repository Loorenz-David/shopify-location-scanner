const PLACEHOLDER_CARD_COUNT = 4;

export function ItemScanHistoryLoadingCards() {
  return (
    <ul
      className="m-0 flex list-none flex-col gap-4 p-0 "
      aria-label="Loading item scan history"
    >
      {Array.from({ length: PLACEHOLDER_CARD_COUNT }, (_, index) => (
        <li key={index}>
          <div className="rounded-[28px] border border-slate-900/10 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3">
              <div className="scanner-skeleton-surface h-16 w-16 rounded-2xl bg-slate-200/85" />
              <div className="min-w-0">
                <div className="scanner-skeleton-surface h-4 w-32 rounded bg-slate-200/90" />
                <div className="scanner-skeleton-surface mt-2 h-3 w-40 rounded bg-slate-200/80" />
                <div className="scanner-skeleton-surface mt-3 h-10 w-full rounded-2xl bg-emerald-100/70" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
