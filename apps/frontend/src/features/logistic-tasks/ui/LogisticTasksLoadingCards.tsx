export function LogisticTasksLoadingCards() {
  return (
    <div className="flex flex-col gap-3 px-5 pt-4">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="h-20 animate-pulse rounded-xl border border-slate-900/10 bg-white/70"
        />
      ))}
    </div>
  );
}
