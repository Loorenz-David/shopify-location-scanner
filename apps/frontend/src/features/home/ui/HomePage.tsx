export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] rounded-2xl border border-slate-800/15 bg-white/70 p-6 backdrop-blur-md max-[640px]:p-4">
      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
        Item Position Scanner
      </p>
      <h1 className="my-2 text-[clamp(1.7rem,2.8vw,2.2rem)] leading-[1.1] text-slate-900">
        Home
      </h1>
      <p className="m-0 text-base leading-6 text-slate-600">
        Use the scanner button below to start updating item positions quickly.
      </p>
    </div>
  );
}
