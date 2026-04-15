import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
import { countActiveLogisticTaskFilters } from "../domain/logistic-tasks-filters.domain";
import {
  LOGISTIC_INTENTION_LABELS,
  LOGISTIC_INTENTION_ORDER,
} from "../domain/logistic-tasks.domain";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import type {
  LogisticEventType,
  LogisticIntention,
  LogisticTaskFilters,
  LogisticZoneType,
} from "../types/logistic-tasks.types";
import { CloseIcon } from "../../../assets/icons";

interface LogisticTasksFiltersPanelProps {
  onClose: () => void;
}

const EVENT_TYPE_OPTIONS: { value: LogisticEventType; label: string }[] = [
  { value: "marked_intention", label: "Marked Intention" },
  { value: "placed", label: "Placed" },
  { value: "fulfilled", label: "Fulfilled" },
];

const ZONE_TYPE_OPTIONS: { value: LogisticZoneType; label: string }[] = [
  { value: "for_delivery", label: "For Delivery" },
  { value: "for_pickup", label: "For Pickup" },
  { value: "for_fixing", label: "For Fixing" },
];

export function LogisticTasksFiltersPanel({
  onClose,
}: LogisticTasksFiltersPanelProps) {
  const { task_page_allowed_filters } = useRoleCapabilities();
  const filters = useLogisticTasksStore((state) => state.filters);
  const activeCount = countActiveLogisticTaskFilters(filters);

  const update = (partial: Partial<LogisticTaskFilters>) => {
    const activatesFilter = Object.entries(partial).some(
      ([key, value]) => key !== "noIntention" && value !== undefined,
    );
    logisticTasksActions.setFilters({
      ...(activatesFilter && filters.noIntention === true
        ? { noIntention: undefined }
        : {}),
      ...partial,
    });
  };

  const toggleFilter = <K extends keyof LogisticTaskFilters>(
    key: K,
    value: LogisticTaskFilters[K],
  ) => {
    update({ [key]: filters[key] === value ? undefined : value });
  };

  const toggleNoIntentionFilter = () => {
    if (filters.noIntention === true) {
      update({ noIntention: undefined });
    } else {
      // Selecting "No Intention" — clear all conflicting filters
      update({
        noIntention: true,
        intention: undefined,
        fixItem: undefined,
        isItemFixed: undefined,
        lastLogisticEventType: undefined,
        zoneType: undefined,
        orderId: undefined,
      });
    }
  };

  const toggleIntentionFilter = (intention: LogisticIntention) => {
    if (filters.intention === intention) {
      update({ intention: undefined });
    } else {
      // Selecting an intention — clear noIntention
      update({ intention, noIntention: undefined });
    }
  };

  const showIntentionSection =
    task_page_allowed_filters.includes("intention") ||
    task_page_allowed_filters.includes("noIntention");

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Filter Tasks</h2>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-600"
          onClick={onClose}
          aria-label="Close filters"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {task_page_allowed_filters.includes("fixItem") && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fix Required
            </p>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                filters.fixItem === true
                  ? "border-rose-400 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => toggleFilter("fixItem", true)}
            >
              Fix required
            </button>
          </div>
        )}

        {task_page_allowed_filters.includes("isItemFixed") && (
          <div className="mb-6">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
              <label
                htmlFor="is-item-fixed-switch"
                className="text-sm font-medium text-slate-900"
              >
                Is Fixed
              </label>
              <button
                id="is-item-fixed-switch"
                type="button"
                role="switch"
                aria-checked={filters.isItemFixed === true}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                  filters.isItemFixed === true ? "bg-green-600" : "bg-slate-200"
                }`}
                onClick={() =>
                  update({
                    isItemFixed:
                      filters.isItemFixed === true ? false : true,
                  })
                }
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    filters.isItemFixed === true
                      ? "translate-x-5"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {task_page_allowed_filters.includes("lastLogisticEventType") && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last Event
            </p>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    filters.lastLogisticEventType === value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => toggleFilter("lastLogisticEventType", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {task_page_allowed_filters.includes("zoneType") && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Zone Type
            </p>
            <div className="flex flex-wrap gap-2">
              {ZONE_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    filters.zoneType === value
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => toggleFilter("zoneType", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showIntentionSection && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Intention
            </p>
            <div className="flex flex-wrap gap-2">
              {task_page_allowed_filters.includes("noIntention") && (
                <button
                  key="no-intention"
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    filters.noIntention === true
                      ? "border-slate-600 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={toggleNoIntentionFilter}
                >
                  No Intention
                </button>
              )}
              {task_page_allowed_filters.includes("intention") &&
                LOGISTIC_INTENTION_ORDER.map((intention: LogisticIntention) => (
                  <button
                    key={intention}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      filters.intention === intention
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    onClick={() => toggleIntentionFilter(intention)}
                  >
                    {LOGISTIC_INTENTION_LABELS[intention]}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-900/10 px-5 py-4">
        <button
          type="button"
          className="w-full rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          disabled={activeCount === 0}
          onClick={() => logisticTasksActions.resetFilters()}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
