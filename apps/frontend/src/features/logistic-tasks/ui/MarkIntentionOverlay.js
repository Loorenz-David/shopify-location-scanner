import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../../../assets/icons";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  LOGISTIC_INTENTION_LABELS,
  LOGISTIC_INTENTION_ORDER,
} from "../domain/logistic-tasks.domain";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
const todayIso = new Date().toISOString().split("T")[0];
const CONFIRM_TIMEOUT_MS = 1800;
function toDateInputValue(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0] ?? "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0] ?? "";
    }
  }
  return "";
}
export function MarkIntentionOverlay({ scanHistoryId, onClose }) {
  const item = useLogisticTasksStore((state) =>
    state.items.find((candidate) => candidate.id === scanHistoryId),
  );
  const isCompleted = item?.lastEventType === "fulfilled";
  const [selected, setSelected] = useState(null);
  const [fixItem, setFixItem] = useState(false);
  const [fixNotes, setFixNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [pastDateConfirmed, setPastDateConfirmed] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitializedFromItem, setHasInitializedFromItem] = useState(false);
  const fixNotesRef = useRef(null);
  const shouldAutofocusFixNotesRef = useRef(false);
  useEffect(() => {
    if (fixItem && shouldAutofocusFixNotesRef.current) {
      const t = setTimeout(() => fixNotesRef.current?.focus(), 80);
      shouldAutofocusFixNotesRef.current = false;
      return () => clearTimeout(t);
    }
  }, [fixItem]);
  useEffect(() => {
    setSelected(null);
    setFixItem(false);
    setFixNotes("");
    setScheduledDate("");
    setPastDateConfirmed(false);
    setValidationError(null);
    setHasInitializedFromItem(false);
    shouldAutofocusFixNotesRef.current = false;
  }, [scanHistoryId]);
  useEffect(() => {
    if (!item || hasInitializedFromItem) return;
    const nextScheduledDate = toDateInputValue(item.scheduledDate);
    setSelected(item.intention ?? null);
    shouldAutofocusFixNotesRef.current = false;
    setFixItem(item.fixItem);
    setFixNotes(item.fixNotes ?? "");
    setScheduledDate(nextScheduledDate);
    setPastDateConfirmed(
      nextScheduledDate.length > 0 && nextScheduledDate < todayIso,
    );
    setHasInitializedFromItem(true);
  }, [hasInitializedFromItem, item]);
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
  return _jsxs("div", {
    className: "flex h-svh flex-col",
    children: [
      _jsx("button", {
        type: "button",
        className: "flex-1 cursor-default",
        onClick: onClose,
        "aria-label": "Close",
      }),
      _jsx("section", {
        className:
          "flex max-h-[60svh] shrink-0 flex-col overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]",
        children: _jsx("div", {
          className: "flex-1 overflow-y-auto",
          children: _jsxs("div", {
            className: "flex flex-col gap-6 px-5 pb-10 pt-4",
            children: [
              _jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                  _jsx("h2", {
                    className: "text-base font-bold text-slate-900",
                    children: "Set Intention",
                  }),
                  _jsx("button", {
                    type: "button",
                    className:
                      "grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100",
                    onClick: onClose,
                    "aria-label": "Close",
                    children: _jsx(CloseIcon, {
                      className: "h-5 w-5",
                      "aria-hidden": "true",
                    }),
                  }),
                ],
              }),
              _jsx("div", {
                className: "grid grid-cols-2 gap-3",
                children: LOGISTIC_INTENTION_ORDER.map((intention) =>
                  _jsx(
                    "button",
                    {
                      type: "button",
                      className: `rounded-xl border p-4 text-sm font-semibold transition-colors ${
                        selected === intention
                          ? "border-green-500 bg-green-50 text-green-800"
                          : "border-slate-200 bg-white/70 text-slate-900 hover:border-slate-300"
                      }`,
                      onClick: () => setSelected(intention),
                      children: LOGISTIC_INTENTION_LABELS[intention],
                    },
                    intention,
                  ),
                ),
              }),
              _jsxs("div", {
                className:
                  "flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3",
                children: [
                  _jsx("label", {
                    htmlFor: "fix-item-switch",
                    className: "text-sm font-medium text-slate-900",
                    children: "Fix item",
                  }),
                  _jsx("button", {
                    id: "fix-item-switch",
                    type: "button",
                    role: "switch",
                    "aria-checked": fixItem,
                    className: `relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${fixItem ? "bg-green-600" : "bg-slate-200"}`,
                    onClick: () => {
                      const next = !fixItem;
                      shouldAutofocusFixNotesRef.current = next;
                      setFixItem(next);
                      if (!next) setFixNotes("");
                    },
                    children: _jsx("span", {
                      className: `inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${fixItem ? "translate-x-5" : "translate-x-1"}`,
                    }),
                  }),
                ],
              }),
              fixItem &&
                _jsxs("div", {
                  className: "flex flex-col gap-1.5",
                  children: [
                    _jsxs("label", {
                      htmlFor: "fix-notes",
                      className: "text-sm font-medium text-slate-900",
                      children: [
                        "Fix note",
                        " ",
                        _jsx("span", {
                          className: "text-xs font-normal text-slate-500",
                          children: "(optional)",
                        }),
                      ],
                    }),
                    _jsx("textarea", {
                      id: "fix-notes",
                      ref: fixNotesRef,
                      rows: 3,
                      maxLength: 500,
                      className:
                        "resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none",
                      placeholder: "Describe what needs fixing\u2026",
                      value: fixNotes,
                      onChange: (e) => setFixNotes(e.target.value),
                    }),
                    _jsxs("p", {
                      className: "text-right text-[10px] text-slate-400",
                      children: [fixNotes.length, "/500"],
                    }),
                  ],
                }),
              _jsxs("div", {
                className: "flex flex-col gap-1.5",
                children: [
                  _jsxs("label", {
                    htmlFor: "scheduled-date",
                    className: "text-sm font-medium text-slate-900",
                    children: [
                      "Scheduled date",
                      " ",
                      _jsx("span", {
                        className: "text-xs font-normal text-slate-500",
                        children: "(optional)",
                      }),
                    ],
                  }),
                  _jsx("input", {
                    id: "scheduled-date",
                    type: "date",
                    className:
                      "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none",
                    value: scheduledDate,
                    onChange: (e) => {
                      setScheduledDate(e.target.value);
                      setPastDateConfirmed(false);
                    },
                  }),
                  showDateWarning &&
                    _jsxs("div", {
                      className:
                        "rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-700",
                      children: [
                        "This date is in the past. Are you sure?",
                        " ",
                        _jsx("button", {
                          type: "button",
                          className: "font-semibold underline",
                          onClick: () => setPastDateConfirmed(true),
                          children: "Confirm",
                        }),
                      ],
                    }),
                ],
              }),
              _jsx("div", {
                className: "w-full",
                children: _jsx(ConfirmActionButton, {
                  label: isCompleted
                    ? "Mark as uncompleted"
                    : "Mark as completed",
                  confirmLabel: isCompleted
                    ? "Tap again to uncomplete"
                    : "Tap again to complete",
                  tone: isCompleted ? "neutral" : "success",
                  onConfirm: async () => {
                    await logisticTasksActions.markTaskCompletion(
                      scanHistoryId,
                      !isCompleted,
                    );
                    onClose();
                  },
                }),
              }),
              validationError &&
                _jsx("p", {
                  className: "text-sm text-rose-600",
                  children: validationError,
                }),
              _jsx("button", {
                type: "button",
                className:
                  "w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60",
                disabled: isSubmitting || !selected,
                onClick: () => void handleSubmit(),
                children: isSubmitting ? "Saving..." : "Save Intention",
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
function ConfirmActionButton({ label, confirmLabel, tone, onConfirm }) {
  const [isArmed, setIsArmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (!isArmed) return;
    const timeoutId = window.setTimeout(() => {
      setIsArmed(false);
    }, CONFIRM_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isArmed]);
  const toneClasses =
    tone === "success"
      ? {
          idle: "border-emerald-200 bg-white text-emerald-700",
          fill: "bg-emerald-600",
          filledText: "text-white",
        }
      : {
          idle: "border-slate-300 bg-white text-slate-700",
          fill: "bg-slate-700",
          filledText: "text-white",
        };
  const displayLabel = isSubmitting
    ? "Updating..."
    : isArmed
      ? confirmLabel
      : label;
  const fillWidth = isArmed || isSubmitting ? "100%" : "0%";
  const handleClick = () => {
    if (isSubmitting) return;
    if (!isArmed) {
      setIsArmed(true);
      return;
    }
    setIsSubmitting(true);
    setIsArmed(false);
    void onConfirm().finally(() => {
      setIsSubmitting(false);
    });
  };
  return _jsxs("button", {
    type: "button",
    onClick: handleClick,
    disabled: isSubmitting,
    className: `relative h-11 w-full overflow-hidden rounded-full border px-5 text-sm font-semibold transition disabled:opacity-60 ${toneClasses.idle}`,
    children: [
      _jsx("span", {
        className: `absolute inset-y-0 left-0 transition-[width] ease-linear ${toneClasses.fill}`,
        style: {
          width: fillWidth,
          transitionDuration: isArmed ? `${CONFIRM_TIMEOUT_MS}ms` : "180ms",
        },
        "aria-hidden": "true",
      }),
      _jsx("span", { className: "relative z-10", children: displayLabel }),
      _jsx("span", {
        className: `pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden whitespace-nowrap ${toneClasses.filledText}`,
        style: {
          clipPath: `inset(0 calc(100% - ${fillWidth}) 0 0)`,
          transition: isArmed
            ? `clip-path ${CONFIRM_TIMEOUT_MS}ms linear`
            : "clip-path 180ms ease",
        },
        "aria-hidden": "true",
        children: displayLabel,
      }),
    ],
  });
}
