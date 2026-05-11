import { useMemo } from "react";

import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  useLogisticTasksFlow,
  useLogisticTasksLoadingVisibilityFlow,
} from "../flows/use-logistic-tasks.flow";
import { countActiveLogisticTaskFilters } from "../domain/logistic-tasks-filters.domain";
import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
import { LogisticTasksPageProvider } from "../context/logistic-tasks-page.context";
import {
  selectLogisticTasksErrorMessage,
  selectLogisticTasksHasLoaded,
  selectLogisticTasksIsLoading,
  selectLogisticTasksItems,
  useLogisticTasksStore,
} from "../stores/logistic-tasks.store";
import {
  buildOrderGroups,
  countByIntention,
} from "../domain/logistic-tasks.domain";
import { LogisticTasksBatchNotificationBanner } from "./LogisticTasksBatchNotificationBanner";
import { LogisticTasksHeader } from "./LogisticTasksHeader";
import { LogisticTasksList } from "./LogisticTasksList";
import { LogisticTasksLoadingCards } from "./LogisticTasksLoadingCards";
import { LogisticTasksTabMenu } from "./LogisticTasksTabMenu";
import type { LogisticIntention } from "../types/logistic-tasks.types";

export function LogisticTasksPage() {
  useLogisticTasksFlow();

  const { task_intention_tab_menu, task_intention_card_action } =
    useRoleCapabilities();

  const isLoading = useLogisticTasksStore(selectLogisticTasksIsLoading);
  const hasLoaded = useLogisticTasksStore(selectLogisticTasksHasLoaded);
  const errorMessage = useLogisticTasksStore(selectLogisticTasksErrorMessage);
  const items = useLogisticTasksStore(selectLogisticTasksItems);
  const allGroups = useMemo(() => buildOrderGroups(items), [items]);
  const intentionCounts = useMemo(() => countByIntention(items), [items]);
  const batchNotification = useLogisticTasksStore(
    (state) => state.batchNotification,
  );
  const activeIntentionTab = useLogisticTasksStore(
    (state) => state.activeIntentionTab,
  );
  const query = useLogisticTasksStore((state) => state.query);
  const filters = useLogisticTasksStore((state) => state.filters);

  const isLoadingVisible = useLogisticTasksLoadingVisibilityFlow(
    isLoading,
    hasLoaded,
  );
  const activeFilterCount = countActiveLogisticTaskFilters(filters);

  const visibleGroups = useMemo(
    () =>
      task_intention_tab_menu && activeIntentionTab
        ? allGroups
            .map((group) => ({
              ...group,
              items: group.items.filter(
                (item) => item.intention === activeIntentionTab,
              ),
            }))
            .filter((group) => group.items.length > 0)
        : allGroups,
    [allGroups, activeIntentionTab, task_intention_tab_menu],
  );

  const isEmpty = hasLoaded && !isLoading && allGroups.length === 0;

  return (
    <LogisticTasksPageProvider>
      <section className="relative mx-auto -mb-36 flex h-[calc(100svh-2.25rem)] min-h-0 w-full max-w-[720px] flex-col max-[640px]:-mb-32 max-[640px]:h-[calc(100svh-1.5rem)]">
        {batchNotification && (
          <div className="pointer-events-auto absolute inset-x-0 top-0 z-40">
            <LogisticTasksBatchNotificationBanner
              message={batchNotification.message}
            />
          </div>
        )}

        <div
          className={`pointer-events-auto absolute inset-x-0 z-30 px-5 max-[640px]:px-4 ${
            batchNotification ? "top-12" : "top-0"
          }`}
        >
          <LogisticTasksHeader
            query={query}
            activeFilterCount={activeFilterCount}
            onChangeQuery={logisticTasksActions.setQuery}
            onOpenFilters={logisticTasksActions.openFilters}
          />
        </div>

        <div
          className={`pointer-events-auto absolute inset-x-0 z-30 ${
            batchNotification ? "top-32" : "top-20"
          }`}
        >
          {task_intention_tab_menu && (
            <LogisticTasksTabMenu
              intentionCounts={intentionCounts}
              activeTab={activeIntentionTab}
              onSelectTab={(tab: LogisticIntention | null) =>
                logisticTasksActions.setActiveIntentionTab(tab)
              }
            />
          )}
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto overscroll-contain pt-36">
            {isLoadingVisible && <LogisticTasksLoadingCards />}

            {!isLoadingVisible && errorMessage && (
              <div className="mx-5 mt-12 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
                {errorMessage}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => {
                    const { filters: currentFilters } =
                      useLogisticTasksStore.getState();
                    void logisticTasksActions.loadTasks(currentFilters);
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoadingVisible && isEmpty && !errorMessage && (
              <div className="mx-5 mt-20 flex flex-col items-center gap-2 text-center text-slate-500">
                <p className="text-base font-semibold">No tasks found</p>
                <p className="text-sm">
                  {activeFilterCount > 0
                    ? "Try clearing some filters."
                    : "All caught up!"}
                </p>
              </div>
            )}

            {!isLoadingVisible && !errorMessage && (
              <LogisticTasksList
                groups={visibleGroups}
                cardAction={task_intention_card_action}
              />
            )}
          </div>

          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-20 h-52 bg-[linear-gradient(180deg,rgba(245,251,248,0.98)_0%,rgba(242,248,248,0.94)_34%,rgba(239,246,252,0.62)_70%,rgba(239,246,252,0)_100%)] backdrop-blur-[1px]"
            style={{
              WebkitMaskImage:
                "linear-gradient(180deg, #000 0%, #000 56%, rgba(0,0,0,0.72) 78%, transparent 100%)",
              maskImage:
                "linear-gradient(180deg, #000 0%, #000 56%, rgba(0,0,0,0.72) 78%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-36 bg-[linear-gradient(0deg,rgba(238,242,245,0.98)_0%,rgba(238,243,249,0.9)_30%,rgba(238,244,252,0.56)_66%,rgba(238,244,252,0)_100%)] backdrop-blur-[1px]"
            style={{
              WebkitMaskImage:
                "linear-gradient(0deg, #000 0%, #000 48%, rgba(0,0,0,0.68) 70%, transparent 100%)",
              maskImage:
                "linear-gradient(0deg, #000 0%, #000 48%, rgba(0,0,0,0.68) 70%, transparent 100%)",
            }}
            aria-hidden="true"
          />
        </div>
      </section>
    </LogisticTasksPageProvider>
  );
}
