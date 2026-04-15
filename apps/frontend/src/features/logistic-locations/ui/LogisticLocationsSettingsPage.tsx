import { useMemo } from "react";

import { logisticLocationsActions } from "../actions/logistic-locations.actions";
import {
  filterLogisticLocations,
  LOGISTIC_ZONE_TYPE_LABELS,
  sortWithRecentFirst,
} from "../domain/logistic-locations.domain";
import { useLogisticLocationsFlow } from "../flows/use-logistic-locations.flow";
import {
  selectLogisticLocationsErrorMessage,
  selectLogisticLocationsIsLoading,
  useLogisticLocationsStore,
} from "../stores/logistic-locations.store";
import type { LogisticZoneType } from "../types/logistic-locations.types";
import { LogisticZoneTypePicker } from "./LogisticZoneTypePicker";
import { BackArrowIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";

const ZONE_PILL_COLORS: Record<LogisticZoneType, string> = {
  for_delivery: "bg-teal-100 text-teal-800",
  for_pickup: "bg-amber-100 text-amber-800",
  for_fixing: "bg-rose-100 text-rose-800",
};

export function LogisticLocationsSettingsPage() {
  useLogisticLocationsFlow();

  const { can_manage_logistic_locations } = useRoleCapabilities();

  const rawLocations = useLogisticLocationsStore((state) => state.locations);
  const recentlyAddedIds = useLogisticLocationsStore(
    (state) => state.recentlyAddedIds,
  );
  const query = useLogisticLocationsStore((state) => state.query);
  const locations = useMemo(
    () =>
      sortWithRecentFirst(
        filterLogisticLocations(rawLocations, query),
        recentlyAddedIds,
      ),
    [rawLocations, query, recentlyAddedIds],
  );
  const expandedId = useLogisticLocationsStore((state) => state.expandedId);
  const selectedZoneType = useLogisticLocationsStore(
    (state) => state.selectedZoneType,
  );
  const isLoading = useLogisticLocationsStore(selectLogisticLocationsIsLoading);
  const isSubmitting = useLogisticLocationsStore((state) => state.isSubmitting);
  const errorMessage = useLogisticLocationsStore(
    selectLogisticLocationsErrorMessage,
  );

  const showPicker = query.trim().length > 0 && locations.length === 0;

  return (
    <section className="mx-auto flex h-full min-h-full w-full max-w-[720px] flex-col gap-4 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center"
          onClick={logisticLocationsActions.backToSettings}
          aria-label="Back to settings"
        >
          <BackArrowIcon
            className="h-4 w-4 text-green-700"
            aria-hidden="true"
          />
        </button>

        <SearchBar
          wrapperClassName="h-11 flex-1 rounded-xl px-3"
          value={query}
          onChange={(event) =>
            logisticLocationsActions.setQuery(event.target.value)
          }
          placeholder="Search locations"
          aria-label="Search logistic locations"
        />
      </header>

      {errorMessage ? (
        <div className="mt-2 rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-slate-900/10 bg-white/70" />
      ) : (
        <div className="flex flex-col gap-2">
          {locations.map((loc) => {
            const isExpanded = expandedId === loc.id;
            return (
              <article
                key={loc.id}
                className="rounded-xl border border-slate-900/10 bg-white/85 shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
              >
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-between px-3 text-left"
                  onClick={() =>
                    logisticLocationsActions.toggleExpanded(loc.id)
                  }
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {loc.location}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ZONE_PILL_COLORS[loc.zoneType]}`}
                  >
                    {LOGISTIC_ZONE_TYPE_LABELS[loc.zoneType]}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="flex items-center justify-between border-t border-slate-900/10 px-3 py-3">
                    <span className="text-sm text-slate-500">
                      {LOGISTIC_ZONE_TYPE_LABELS[loc.zoneType]}
                    </span>
                    {can_manage_logistic_locations ? (
                      <button
                        type="button"
                        className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() =>
                          void logisticLocationsActions.deleteLocation(loc.id)
                        }
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          {showPicker && can_manage_logistic_locations ? (
            <LogisticZoneTypePicker
              selectedZoneType={selectedZoneType}
              onSelect={logisticLocationsActions.setSelectedZoneType}
              onCreate={(zoneType) =>
                void logisticLocationsActions.createLocation(query, zoneType)
              }
              isSubmitting={isSubmitting}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
