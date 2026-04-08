import { useEffect, useRef, useState, type RefObject } from "react";

import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";

const SEARCH_DEBOUNCE_MS = 250;
const LOADING_VISIBILITY_DELAY_MS = 180;
const PULL_REFRESH_MAX_PULL_PX = 110;
const PULL_REFRESH_TRIGGER_PX = 72;
const PULL_REFRESH_RESISTANCE = 0.5;

export function useItemScanHistoryFlow(): void {
  const hasLoaded = useItemScanHistoryStore((state) => state.hasLoaded);
  const query = useItemScanHistoryStore((state) => state.query);
  const lastFetchedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasLoaded) {
      void itemScanHistoryActions.loadHistory();
    }
  }, [hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    if (lastFetchedQueryRef.current === null) {
      lastFetchedQueryRef.current = query;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastFetchedQueryRef.current = query;
      void itemScanHistoryActions.loadHistory();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasLoaded, query]);
}

export function useItemScanHistoryLoadingVisibilityFlow(
  isLoading: boolean,
): boolean {
  const [isLoadingVisible, setIsLoadingVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsLoadingVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoadingVisible(true);
    }, LOADING_VISIBILITY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoading]);

  return isLoadingVisible;
}

interface UseItemScanHistoryPullRefreshFlowParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

interface PullRefreshFlowState {
  pullDistance: number;
  isArmed: boolean;
  isRefreshing: boolean;
}

export function useItemScanHistoryPullRefreshFlow({
  scrollContainerRef,
}: UseItemScanHistoryPullRefreshFlowParams): PullRefreshFlowState {
  const isLoading = useItemScanHistoryStore((state) => state.isLoading);
  const [pullDistance, setPullDistance] = useState(0);
  const [isArmed, setIsArmed] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const resetPullState = () => {
      startYRef.current = null;
      isDraggingRef.current = false;
      hasTriggeredRef.current = false;
      setPullDistance(0);
      setIsArmed(false);
    };

    const triggerRefresh = () => {
      hasTriggeredRef.current = true;
      setIsArmed(false);

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(20);
      }

      void itemScanHistoryActions.loadHistory();
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
      hasTriggeredRef.current = false;
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

      const nextArmed = nextDistance >= PULL_REFRESH_TRIGGER_PX;
      setIsArmed(nextArmed);

      event.preventDefault();

      if (nextArmed && !hasTriggeredRef.current) {
        triggerRefresh();
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) {
        return;
      }

      resetPullState();
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isLoading, scrollContainerRef]);

  return {
    pullDistance,
    isArmed,
    isRefreshing: isLoading,
  };
}
