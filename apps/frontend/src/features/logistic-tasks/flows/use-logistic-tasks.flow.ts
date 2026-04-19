import { useCallback, useEffect, useRef, useState } from "react";

import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
import { useCameraPrewarm } from "../../scanner/flows/use-camera-prewarm";
import {
  selectHomeShellCurrentPageId,
  selectHomeShellIsFullFeatureOpen,
  useHomeShellStore,
} from "../../home/stores/home-shell.store";
import { buildFiltersFromRoleDefaults } from "../domain/logistic-tasks.domain";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  selectLogisticTasksFiltersRequestKey,
  selectLogisticTasksHasLoaded,
  useLogisticTasksStore,
} from "../stores/logistic-tasks.store";

const SEARCH_DEBOUNCE_MS = 300;
const INITIAL_LOADING_VISIBILITY_DELAY_MS = 180;
const REFRESH_LOADING_VISIBILITY_DELAY_MS = 400;

export function useLogisticTasksFlow(): void {
  const currentPageId = useHomeShellStore(selectHomeShellCurrentPageId);
  const isFullFeatureOpen = useHomeShellStore(selectHomeShellIsFullFeatureOpen);

  // Prewarm the logistic placement camera so it's ready when the user taps place.
  useCameraPrewarm(
    "logistic-placement",
    0,
    currentPageId === "logistic-tasks" && !isFullFeatureOpen,
  );

  const { task_page_default_filters } = useRoleCapabilities();
  const hasLoaded = useLogisticTasksStore(selectLogisticTasksHasLoaded);
  const query = useLogisticTasksStore((state) => state.query);
  const filtersRequestKey = useLogisticTasksStore(
    selectLogisticTasksFiltersRequestKey,
  );
  const lastFetchedRequestKeyRef = useRef<string | null>(null);
  const roleDefaultsAppliedRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded && !roleDefaultsAppliedRef.current) {
      roleDefaultsAppliedRef.current = true;
      const roleFilters = buildFiltersFromRoleDefaults(
        task_page_default_filters,
      );
      void logisticTasksActions.loadTasks(roleFilters);
    }
  }, [hasLoaded, task_page_default_filters]);

  useEffect(() => {
    if (!hasLoaded) return;

    const nextRequestKey = `${query}::${filtersRequestKey}`;

    if (lastFetchedRequestKeyRef.current === null) {
      lastFetchedRequestKeyRef.current = nextRequestKey;
      return;
    }

    useLogisticTasksStore.setState({ isLoading: true });

    const timeoutId = window.setTimeout(() => {
      lastFetchedRequestKeyRef.current = nextRequestKey;
      const { filters } = useLogisticTasksStore.getState();
      void logisticTasksActions.loadTasks(filters);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filtersRequestKey, hasLoaded, query]);
}

export function useLogisticTasksLoadingVisibilityFlow(
  isLoading: boolean,
  hasLoaded: boolean,
): boolean {
  const [isLoadingVisible, setIsLoadingVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsLoadingVisible(false);
      return;
    }

    const delayMs = hasLoaded
      ? REFRESH_LOADING_VISIBILITY_DELAY_MS
      : INITIAL_LOADING_VISIBILITY_DELAY_MS;

    const timeoutId = window.setTimeout(() => {
      setIsLoadingVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasLoaded, isLoading]);

  return isLoadingVisible;
}

export function useLogisticTasksReloadCallback(): () => void {
  return useCallback(() => {
    const { filters } = useLogisticTasksStore.getState();
    void logisticTasksActions.loadTasks(filters);
  }, []);
}
