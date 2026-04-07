import { pwaActions } from "../actions/pwa.actions";

interface PwaUpdatePromptProps {
  isVisible: boolean;
  isApplyingUpdate: boolean;
}

export function PwaUpdatePrompt({
  isVisible,
  isApplyingUpdate,
}: PwaUpdatePromptProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <aside className="fixed inset-x-0 bottom-4 z-[120] mx-auto w-[min(92vw,480px)] rounded-2xl border border-slate-900/15 bg-white/95 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.18)] backdrop-blur-md">
      <p className="m-0 text-sm font-semibold text-slate-900">
        A new app version is available.
      </p>
      <p className="m-0 mt-1 text-sm text-slate-600">
        Keep working, then refresh when you are ready.
      </p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-lg border border-slate-900/20 px-3 text-sm font-semibold text-slate-700"
          onClick={pwaActions.dismissUpdatePrompt}
          disabled={isApplyingUpdate}
        >
          Later
        </button>
        <button
          type="button"
          className="h-9 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => void pwaActions.applyUpdate()}
          disabled={isApplyingUpdate}
        >
          {isApplyingUpdate ? "Updating..." : "Refresh App"}
        </button>
      </div>
    </aside>
  );
}
