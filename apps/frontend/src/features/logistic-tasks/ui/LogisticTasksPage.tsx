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
      <section className="mx-auto flex h-[calc(100svh-7.5rem)] min-h-0 w-full max-w-[720px] flex-col">
        {batchNotification && (
          <LogisticTasksBatchNotificationBanner
            message={batchNotification.message}
          />
        )}

        <div className="px-5 max-[640px]:px-4">
          <LogisticTasksHeader
            query={query}
            activeFilterCount={activeFilterCount}
            onChangeQuery={logisticTasksActions.setQuery}
            onOpenFilters={logisticTasksActions.openFilters}
          />
        </div>

        {task_intention_tab_menu && (
          <LogisticTasksTabMenu
            intentionCounts={intentionCounts}
            activeTab={activeIntentionTab}
            onSelectTab={(tab: LogisticIntention | null) =>
              logisticTasksActions.setActiveIntentionTab(tab)
            }
          />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isLoadingVisible && <LogisticTasksLoadingCards />}

          {!isLoadingVisible && errorMessage && (
            <div className="mx-5 mt-6 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
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
            <div className="mx-5 mt-12 flex flex-col items-center gap-2 text-center text-slate-500">
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
      </section>
    </LogisticTasksPageProvider>
  );
}
