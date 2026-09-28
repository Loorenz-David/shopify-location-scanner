import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "../../../assets/icons";
import {
  getTaskClearBatchItemsApi,
  getTaskClearBatchesApi,
  restoreTaskClearBatchApi,
  restoreTaskClearItemApi,
  type ClearedTaskItem,
  type TaskClearBatch,
} from "../api/task-clear.api";
import { refreshTaskQueue } from "../flows/refresh-task-queue";

function dateLabel(value: string): string {
  return new Date(value).toLocaleString();
}

export function LogisticTasksClearHistoryOverlay({ onClose }: { onClose: () => void }) {
  const [batches, setBatches] = useState<TaskClearBatch[]>([]);
  const [batchCursor, setBatchCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskClearBatch | null>(null);
  const [items, setItems] = useState<ClearedTaskItem[]>([]);
  const [itemCursor, setItemCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBatchRestore, setConfirmBatchRestore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = async (cursor?: string) => {
    const page = await getTaskClearBatchesApi(cursor);
    setBatches((current) => cursor ? [...current, ...page.batches] : page.batches);
    setBatchCursor(page.nextCursor);
    return page.batches;
  };

  const loadItems = async (batchId: string, cursor?: string) => {
    const page = await getTaskClearBatchItemsApi(batchId, cursor);
    if (!cursor) setSelected(page.batch);
    setItems((current) => cursor ? [...current, ...page.items] : page.items);
    setItemCursor(page.nextCursor);
  };

  useEffect(() => {
    let active = true;
    getTaskClearBatchesApi()
      .then((page) => {
        if (!active) return;
        setBatches(page.batches);
        setBatchCursor(page.nextCursor);
      })
      .catch(() => { if (active) setError("Could not load cleared-task history."); });
    return () => { active = false; };
  }, []);

  const openBatch = async (batch: TaskClearBatch) => {
    setSelected(batch);
    setItems([]);
    setItemCursor(null);
    setConfirmBatchRestore(false);
    setMessage(null);
    setError(null);
    try {
      await loadItems(batch.id);
    } catch {
      setError("Could not load tasks from this clear operation.");
    }
  };

  const goBack = () => {
    if (!selected) {
      onClose();
      return;
    }
    setSelected(null);
    setConfirmBatchRestore(false);
    setMessage(null);
    setError(null);
  };

  const restore = async (scanHistoryId?: string) => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = scanHistoryId
        ? await restoreTaskClearItemApi(selected.id, scanHistoryId)
        : await restoreTaskClearBatchApi(selected.id);
      setMessage(`${result.restoredCount} restored${result.skippedCount ? `, ${result.skippedCount} already changed` : ""}.`);
      setConfirmBatchRestore(false);
      try {
        await Promise.all([loadBatches(), loadItems(selected.id), refreshTaskQueue()]);
      } catch {
        setError("Tasks were restored, but this history did not refresh. Reopen it to see the latest status.");
      }
    } catch {
      setError("Could not restore tasks. Refresh the history and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-900"
          onClick={goBack}
          aria-label={selected ? "Back to clear operations" : "Back to tasks"}
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-bold text-slate-900">
          {selected ? "Clear operation" : "Cleared task history"}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {selected ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">Cleared {selected.clearedCount} tasks</h2>
            <p className="mt-1 text-sm text-slate-600">{dateLabel(selected.createdAt)} · {selected.actorName}</p>
            {selected.note ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{selected.note}</p> : null}
            <p className="mt-3 text-sm font-semibold text-slate-700">{selected.remainingCount} still cleared</p>
            {selected.remainingCount > 0 ? (
              <div className="mt-4">
                {confirmBatchRestore ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                    <p>Restore all {selected.remainingCount} tasks still cleared by this operation?</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white disabled:opacity-40" onClick={() => void restore()}>Confirm restore</button>
                      <button type="button" className="rounded-lg border border-slate-300 px-3 py-2" onClick={() => setConfirmBatchRestore(false)}>Cancel</button>
                    </div>
                  </div>
                ) : <button type="button" className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800" onClick={() => setConfirmBatchRestore(true)}>Restore remaining tasks</button>}
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sku ?? item.id}{item.orderNumber ? ` · Order #${item.orderNumber}` : ""}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">{item.canRestore ? "Cleared" : `Now: ${item.currentStatus ?? "not pending"}`}</span>
                    {item.canRestore ? <button type="button" disabled={busy} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-40" onClick={() => void restore(item.id)}>Restore</button> : null}
                  </div>
                </div>
              ))}
            </div>
            {itemCursor ? <button type="button" className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => void loadItems(selected.id, itemCursor).catch(() => setError("Could not load more tasks."))}>Show more tasks</button> : null}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Review and restore pending tasks cleared from this shop.</p>
            <div className="mt-5 flex flex-col gap-3">
              {batches.map((batch) => (
                <button key={batch.id} type="button" className="rounded-xl border border-slate-200 p-4 text-left" onClick={() => void openBatch(batch)}>
                  <span className="block text-sm font-bold text-slate-900">{batch.clearedCount} cleared · {batch.remainingCount} still cleared</span>
                  <span className="mt-1 block text-xs text-slate-600">{dateLabel(batch.createdAt)} · {batch.actorName}</span>
                  {batch.note ? <span className="mt-2 block text-sm text-slate-700">{batch.note}</span> : null}
                </button>
              ))}
              {batches.length === 0 && !error ? <p className="text-sm text-slate-500">No tasks have been cleared yet.</p> : null}
            </div>
            {batchCursor ? <button type="button" className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => void loadBatches(batchCursor).catch(() => setError("Could not load more clear operations."))}>Show more operations</button> : null}
          </>
        )}
        {message ? <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
      </div>
      <div className="shrink-0 border-t border-slate-200 p-5">
        <button type="button" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
