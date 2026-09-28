import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { clearPendingTasksApi, getTaskClearPreviewApi, type TaskClearPreview } from "../api/task-clear.api";
import { LOGISTIC_INTENTION_LABELS, LOGISTIC_INTENTION_ORDER } from "../domain/logistic-tasks.domain";
import { refreshTaskQueue } from "../flows/refresh-task-queue";

export function LogisticTasksClearOverlay({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<TaskClearPreview | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clearedCount, setClearedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    let active = true;
    getTaskClearPreviewApi()
      .then((result) => { if (active) setPreview(result); })
      .catch(() => { if (active) setError("Could not load the pending task count."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refreshPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      setPreview(await getTaskClearPreviewApi());
    } catch {
      setError("Could not load the pending task count.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!preview || preview.count === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await clearPendingTasksApi({
        asOf: preview.asOf,
        expectedCount: preview.count,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setClearedCount(result.clearedCount);
      try {
        await refreshTaskQueue();
      } catch {
        setRefreshError(true);
      }
    } catch {
      setError("Tasks changed or the preview expired. Refresh the count and confirm again.");
      setPreview(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-900"
          onClick={onClose}
          aria-label="Back to tasks"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-bold text-slate-900">Clear pending tasks</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {clearedCount !== null ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-bold text-emerald-900">{clearedCount} pending tasks cleared</h2>
            <p className="mt-2 text-sm text-emerald-800">They remain in history and can be restored.</p>
            {refreshError ? <p role="alert" className="mt-3 text-sm text-amber-900">The task list did not refresh. Reopen it to see the latest tasks.</p> : null}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">This includes every pending task in this shop, even those outside the current search, filters, tab, or loaded page. It does not record a placement or complete logistics.</p>
            {loading ? <p className="mt-6 text-sm text-slate-500">Checking pending tasks…</p> : null}
            {preview && !loading ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-3xl font-bold text-amber-900">{preview.count}</p>
                <p className="text-sm font-semibold text-amber-900">tasks will be cleared</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-800">
                  {LOGISTIC_INTENTION_ORDER.map((intention) =>
                    preview.byIntention[intention] ? <span key={intention}>{LOGISTIC_INTENTION_LABELS[intention]}: {preview.byIntention[intention]}</span> : null,
                  )}
                </div>
              </div>
            ) : null}
            <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="task-clear-note">Note (optional)</label>
            <textarea id="task-clear-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Why are these tasks being cleared?" />
            {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-slate-200 p-5">
        {clearedCount !== null ? (
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold" onClick={onClose}>Done</button>
            <button type="button" className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white" onClick={() => homeShellActions.openOverlayPage("logistic-tasks-clear-history", "Cleared tasks")}>View history</button>
          </div>
        ) : preview ? (
          <button type="button" disabled={loading || submitting || preview.count === 0} onClick={() => void confirm()} className="w-full rounded-xl bg-amber-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{submitting ? "Clearing…" : `Confirm clear ${preview.count} tasks`}</button>
        ) : (
          <button type="button" disabled={loading} onClick={() => void refreshPreview()} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-40">Refresh count</button>
        )}
      </div>
    </div>
  );
}
