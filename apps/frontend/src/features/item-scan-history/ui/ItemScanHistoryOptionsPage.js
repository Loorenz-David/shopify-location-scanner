import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, useEffect, useState } from "react";
import { CloseIcon } from "../../../assets/icons";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { RoleContext } from "../../role-context/context/role-context";
export function ItemScanHistoryOptionsPage({ item, onClose }) {
  const roleCapabilities = useContext(RoleContext);
  const canMarkScanHistoryCompletion =
    roleCapabilities?.can_mark_scan_history_completion ?? true;
  const isCompleted = Boolean(item?.logisticsCompletedAt);
  const optionActions =
    item && canMarkScanHistoryCompletion
      ? [
          {
            id: "completion",
            render: () =>
              _jsx(ConfirmActionButton, {
                label: isCompleted
                  ? "Mark as uncompleted"
                  : "Mark as completed",
                confirmLabel: isCompleted
                  ? "Tap again to uncomplete"
                  : "Tap again to complete",
                tone: isCompleted ? "neutral" : "success",
                onConfirm: async () => {
                  await itemScanHistoryActions.markCompletion(
                    item,
                    !isCompleted,
                  );
                  onClose();
                },
              }),
          },
        ]
      : [];
  return _jsxs("div", {
    className: "flex h-svh min-h-0 flex-col",
    "aria-label": "Item options",
    children: [
      _jsx("button", {
        type: "button",
        className: "flex-1 cursor-default",
        onClick: onClose,
        "aria-label": "Close item options",
      }),
      _jsxs("section", {
        className:
          "max-h-[calc(100svh-3rem)] shrink-0 overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-slate-50 shadow-[0_-24px_70px_rgba(15,23,42,0.18)]",
        children: [
          _jsxs("header", {
            className:
              "flex items-center justify-between border-b border-slate-900/15 bg-white/80 px-4 py-3 backdrop-blur",
            children: [
              _jsxs("div", {
                className: "min-w-0",
                children: [
                  _jsx("p", {
                    className: "m-0 text-sm font-semibold text-slate-900",
                    children: "Item options",
                  }),
                  _jsx("p", {
                    className: "m-0 mt-1 truncate text-xs text-slate-600",
                    children: item ? item.skuLabel : "Item unavailable",
                  }),
                ],
              }),
              _jsx("button", {
                type: "button",
                className:
                  "grid h-9 w-9 place-items-center rounded-full text-slate-500 active:bg-slate-100",
                onClick: onClose,
                "aria-label": "Close item options",
                children: _jsx(CloseIcon, {
                  className: "h-5 w-5",
                  "aria-hidden": "true",
                }),
              }),
            ],
          }),
          _jsx("div", {
            className:
              "overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4",
            children:
              optionActions.length > 0
                ? _jsx("div", {
                    className: "flex flex-col items-center gap-3",
                    children: optionActions.map((action) =>
                      _jsx("div", { children: action.render() }, action.id),
                    ),
                  })
                : _jsx("div", {
                    className: "px-4 py-3 text-center",
                    children: _jsx("p", {
                      className: "m-0 text-sm font-semibold text-slate-900",
                      children: "Coming soon",
                    }),
                  }),
          }),
        ],
      }),
    ],
  });
}
const CONFIRM_TIMEOUT_MS = 1800;
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
    className: `relative h-11 min-w-[210px] overflow-hidden rounded-full border px-5 text-sm font-semibold transition disabled:opacity-60 ${toneClasses.idle}`,
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
