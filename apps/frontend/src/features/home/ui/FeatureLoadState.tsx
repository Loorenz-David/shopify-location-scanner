import type { ReactNode } from "react";

type FeatureLoadStateVariant = "inline" | "full-overlay";

interface FeatureLoadStateProps {
  title: string;
  description: string;
  variant: FeatureLoadStateVariant;
  action?: ReactNode;
}

export function FeatureLoadState({
  title,
  description,
  variant,
  action,
}: FeatureLoadStateProps) {
  if (variant === "full-overlay") {
    return (
      <div className="grid min-h-svh place-items-center bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.16),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.14),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_55%,#edf2f7_100%)] px-6 text-slate-900">
        <div className="w-full max-w-sm rounded-3xl border border-slate-900/10 bg-white/92 p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mb-0 mt-3 text-sm text-slate-600">{description}</p>
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[55svh] w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full rounded-[28px] border border-slate-900/10 bg-white/90 p-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {title}
        </p>
        <p className="mb-0 mt-3 text-sm text-slate-600">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
