import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext } from "react";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  LOGISTIC_INTENTION_LABELS,
  formatScheduledDate,
} from "../domain/logistic-tasks.domain";
import { LogisticTasksPageContext } from "../context/logistic-tasks-page-context";
import { ItemImagePreviewButton } from "../../item-scan-history/ui/ItemImagePreviewButton";
import {
  ItemQuantityPill,
  resolveItemQuantityPillProps,
} from "../../item-scan-history/ui/ItemQuantityPill";
function resolveFixStatusBadge(item) {
  if (!item.fixItem) return null;
  if (item.isItemFixed) {
    return {
      label: "Is fixed",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    label: "Needs fix",
    className: "bg-amber-100 text-amber-700",
  };
}
export function LogisticTasksCard({ item, cardAction }) {
  void cardAction;
  const ctx = useContext(LogisticTasksPageContext);
  const latestLocationLabel =
    item.logisticLocation ?? item.location ?? "No scans yet";
  const fixStatusBadge = resolveFixStatusBadge(item);
  const quantityPillProps = resolveItemQuantityPillProps({
    quantity: item.quantity,
    itemCategory: item.itemCategory,
    properties: item.properties,
  });
  const handleAction = () => {
    if (item.fixItem === true && item.isItemFixed === false) {
      ctx?.openFixItemDetail(item.id);
    } else {
      logisticTasksActions.openPlacementScanner(item);
    }
  };
  return _jsx("article", {
    className:
      "relative cursor-pointer overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md active:bg-slate-50",
    onClick: handleAction,
    children: _jsxs("div", {
      className:
        "grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left",
      children: [
        _jsx(ItemImagePreviewButton, {
          imageUrls: item.imageUrls ?? item.imageUrl,
          title: item.itemTitle,
          imageAlt: item.itemTitle,
          buttonClassName:
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition-opacity hover:opacity-80 active:opacity-70",
          placeholderClassName:
            "flex items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500",
          placeholderLabel: "No image",
          overlay: _jsx(ItemQuantityPill, {
            ...quantityPillProps,
            className:
              "absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/80 px-2 py-1 text-white shadow-sm backdrop-blur",
          }),
        }),
        _jsxs("div", {
          className:
            "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1",
          children: [
            _jsxs("div", {
              className: "min-w-0 self-center",
              children: [
                _jsx("div", {
                  className: "flex min-w-0 items-center gap-2",
                  children: _jsx("p", {
                    className: "m-0 truncate text-sm font-bold text-slate-900",
                    children: item.sku ?? item.itemTitle,
                  }),
                }),
                _jsx("p", {
                  className: "m-0 mt-1 min-h-4 truncate text-xs text-slate-600",
                  children: item.scheduledDate
                    ? formatScheduledDate(item.scheduledDate)
                    : " ",
                }),
              ],
            }),
            _jsxs("div", {
              className: "mt-1 flex items-center gap-1.5",
              children: [
                item.intention
                  ? _jsx("span", {
                      className:
                        "inline-flex w-fit shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600",
                      children: LOGISTIC_INTENTION_LABELS[item.intention],
                    })
                  : null,
                _jsx("button", {
                  type: "button",
                  className:
                    "inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 active:bg-emerald-100",
                  "aria-label": "Open task settings",
                  onClick: (e) => {
                    e.stopPropagation();
                    ctx?.openItemOptions(item.id);
                  },
                  children: _jsxs("span", {
                    className: "flex flex-col items-center gap-0.5",
                    "aria-hidden": "true",
                    children: [
                      _jsx("span", {
                        className: "h-1 w-1 rounded-full bg-current",
                      }),
                      _jsx("span", {
                        className: "h-1 w-1 rounded-full bg-current",
                      }),
                      _jsx("span", {
                        className: "h-1 w-1 rounded-full bg-current",
                      }),
                    ],
                  }),
                }),
              ],
            }),
            _jsxs("div", {
              className:
                "col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2",
              children: [
                _jsx("p", {
                  className:
                    "m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700",
                  children: "Latest",
                }),
                _jsxs("div", {
                  className: "flex min-w-0 flex-wrap items-center gap-2",
                  children: [
                    _jsx("p", {
                      className:
                        "m-0 truncate text-sm font-semibold text-slate-900",
                      children: latestLocationLabel,
                    }),
                    fixStatusBadge
                      ? _jsx("span", {
                          className: `inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${fixStatusBadge.className}`,
                          children: fixStatusBadge.label,
                        })
                      : null,
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
