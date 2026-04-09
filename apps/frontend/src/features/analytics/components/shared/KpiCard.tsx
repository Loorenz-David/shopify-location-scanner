interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-900/10 bg-white/90 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <span className="text-lg font-bold text-slate-900">{value}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      {sub ? (
        <span className="mt-1 text-xs text-slate-400">{sub}</span>
      ) : null}
    </article>
  );
}
