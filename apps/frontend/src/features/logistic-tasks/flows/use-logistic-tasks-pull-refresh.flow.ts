import { useEffect, useRef, useState, type RefObject } from "react";

import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { getActiveTaskIdsApi } from "../api/get-active-task-ids.api";
import {
  selectLogisticTasksIsLoading,
  useLogisticTasksStore,
} from "../stores/logistic-tasks.store";
import { useTaskCountStore } from "../stores/task-count.store";

const PULL_REFRESH_MAX_PULL_PX = 110;
const PULL_REFRESH_TRIGGER_PX = 72;
const PULL_REFRESH_RESISTANCE = 0.5;
const PULL_REFRESH_MIN_LOADING_MS = 3000;

interface UseLogisticTasksPullRefreshFlowParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

interface PullRefreshFlowState {
  pullDistance: number;
  isArmed: boolean;
  isRefreshing: boolean;
  isPullLoadingVisible: boolean;
}

// Mirrors useItemScanHistoryPullRefreshFlow; reloads tasks with the current filters.
export function useLogisticTasksPullRefreshFlow({
  scrollContainerRef,
}: UseLogisticTasksPullRefreshFlowParams): PullRefreshFlowState {
  const isLoading = useLogisticTasksStore(selectLogisticTasksIsLoading);
  const [pullDistance, setPullDistance] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isPullLoadingVisible, setIsPullLoadingVisible] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const fetchDoneRef = useRef(false);
  const timerElapsedRef = useRef(false);

  const finishPullLoading = () => {
    if (fetchDoneRef.current && timerElapsedRef.current) {
      setIsPullLoadingVisible(false);
      setIsPullRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isPullRefreshing) {
      fetchDoneRef.current = true;
      finishPullLoading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isPullRefreshing]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const resetPullState = () => {
      startYRef.current = null;
      isDraggingRef.current = false;
      setPullDistance(0);
      setIsArmed(false);
    };

    const triggerRefresh = () => {
      setIsArmed(false);
      setIsPullRefreshing(true);
      setIsPullLoadingVisible(true);
      fetchDoneRef.current = false;
      timerElapsedRef.current = false;

      window.setTimeout(() => {
        timerElapsedRef.current = true;
        finishPullLoading();
      }, PULL_REFRESH_MIN_LOADING_MS);

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(20);
      }

      const { filters } = useLogisticTasksStore.getState();
      void logisticTasksActions.loadTasks(filters);

      getActiveTaskIdsApi()
        .then(({ ids }) => useTaskCountStore.getState().setIds(ids))
        .catch(() => {
          // non-critical: badge keeps its previous count
        });
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (isLoading || event.touches.length !== 1) {
        return;
      }

      if (container.scrollTop > 0) {
        return;
      }

      startYRef.current = event.touches[0]?.clientY ?? null;
      isDraggingRef.current = true;
      setPullDistance(0);
      setIsArmed(false);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingRef.current || startYRef.current === null || isLoading) {
        return;
      }

      if (container.scrollTop > 0) {
        resetPullState();
        return;
      }

      const touchY = event.touches[0]?.clientY;
      if (typeof touchY !== "number") {
        return;
      }

      const deltaY = touchY - startYRef.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        setIsArmed(false);
        return;
      }

      const nextDistance = Math.min(
        deltaY * PULL_REFRESH_RESISTANCE,
        PULL_REFRESH_MAX_PULL_PX,
      );

      setPullDistance(nextDistance);
      setIsArmed(nextDistance >= PULL_REFRESH_TRIGGER_PX);

      event.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) {
        return;
      }

      const shouldRefresh = isArmed;
      resetPullState();

      if (shouldRefresh) {
        triggerRefresh();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isArmed, isLoading, scrollContainerRef]);

  return {
    pullDistance,
    isArmed,
    isRefreshing: isPullRefreshing,
    isPullLoadingVisible,
  };
}
