import { AnalyticsIcon } from "../../../assets/icons";
import { homeShellActions } from "../actions/home-shell.actions";

export function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] rounded-2xl border border-slate-800/15 bg-white/70 p-6 backdrop-blur-md max-[640px]:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
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

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-900/10 bg-white/90 px-3 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
          onClick={() => homeShellActions.openFullFeaturePage("analytics")}
          aria-label="Open analytics"
        >
          <AnalyticsIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
