import { useEffect, useRef, useState } from "react";

import { CloseIcon } from "../../../assets/icons";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  LOGISTIC_INTENTION_LABELS,
  LOGISTIC_INTENTION_ORDER,
} from "../domain/logistic-tasks.domain";
import type { LogisticIntention } from "../types/logistic-tasks.types";

interface MarkIntentionOverlayProps {
  scanHistoryId: string;
  onClose: () => void;
}

const todayIso = new Date().toISOString().split("T")[0]!;

export function MarkIntentionOverlay({
  scanHistoryId,
  onClose,
}: MarkIntentionOverlayProps) {
  const [selected, setSelected] = useState<LogisticIntention | null>(null);
  const [fixItem, setFixItem] = useState(false);
  const [fixNotes, setFixNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [pastDateConfirmed, setPastDateConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fixNotesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (fixItem) {
      const t = setTimeout(() => fixNotesRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [fixItem]);

  const isPastDate = scheduledDate.length > 0 && scheduledDate < todayIso;
  const showDateWarning = isPastDate && !pastDateConfirmed;

  const handleSubmit = async () => {
    if (!selected) {
      setValidationError("Please select an intention before saving.");
      return;
    }

    if (showDateWarning) {
      setValidationError("Please confirm the past date before saving.");
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    await logisticTasksActions.markIntention(
      scanHistoryId,
      selected,
      fixItem,
      scheduledDate || undefined,
      fixItem && fixNotes.trim() ? fixNotes.trim() : undefined,
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="flex h-svh flex-col">
      {/* Tap-to-close backdrop area */}
      <button
        type="button"
        className="flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Bottom sheet panel — max 60% height */}
      <section className="flex max-h-[60svh] shrink-0 flex-col overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 px-5 pb-10 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Set Intention
              </h2>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {LOGISTIC_INTENTION_ORDER.map((intention: LogisticIntention) => (
                <button
                  key={intention}
                  type="button"
                  className={`rounded-xl border p-4 text-sm font-semibold transition-colors ${
                    selected === intention
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-slate-200 bg-white/70 text-slate-900 hover:border-slate-300"
                  }`}
                  onClick={() => setSelected(intention)}
                >
                  {LOGISTIC_INTENTION_LABELS[intention]}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
              <label
                htmlFor="fix-item-switch"
                className="text-sm font-medium text-slate-900"
              >
                Fix item
              </label>
              <button
                id="fix-item-switch"
                type="button"
                role="switch"
                aria-checked={fixItem}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                  fixItem ? "bg-green-600" : "bg-slate-200"
                }`}
                onClick={() => {
                  const next = !fixItem;
                  setFixItem(next);
                  if (!next) setFixNotes("");
                }}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    fixItem ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {fixItem && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="fix-notes"
                  className="text-sm font-medium text-slate-900"
                >
                  Fix note{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="fix-notes"
                  ref={fixNotesRef}
                  rows={3}
                  maxLength={500}
                  className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
                  placeholder="Describe what needs fixing…"
                  value={fixNotes}
                  onChange={(e) => setFixNotes(e.target.value)}
                />
                <p className="text-right text-[10px] text-slate-400">
                  {fixNotes.length}/500
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scheduled-date"
                className="text-sm font-medium text-slate-900"
              >
                Scheduled date{" "}
                <span className="text-xs font-normal text-slate-500">
                  (optional)
                </span>
              </label>
              <input
                id="scheduled-date"
                type="date"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setPastDateConfirmed(false);
                }}
              />

              {showDateWarning && (
                <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-700">
                  This date is in the past. Are you sure?{" "}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => setPastDateConfirmed(true)}
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>

            {validationError && (
              <p className="text-sm text-rose-600">{validationError}</p>
            )}

            <button
              type="button"
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !selected}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? "Saving..." : "Save Intention"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
