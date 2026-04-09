import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import type { WsInboundEvent } from "../../../core/ws-client/ws-events";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import {
  selectItemScanHistoryFiltersRequestKey,
  useItemScanHistoryStore,
} from "../stores/item-scan-history.store";

const SEARCH_DEBOUNCE_MS = 300;
const INITIAL_LOADING_VISIBILITY_DELAY_MS = 180;
const REFRESH_LOADING_VISIBILITY_DELAY_MS = 400;
const WS_REFRESH_DEDUPE_MS = 750;
const PULL_REFRESH_MAX_PULL_PX = 110;
const PULL_REFRESH_TRIGGER_PX = 72;
const PULL_REFRESH_RESISTANCE = 0.5;

export function useItemScanHistoryRealtimeFlow(): void {
  const lastRefreshByProductIdRef = useRef(new Map<string, number>());
  const refreshHistoryItem = useCallback((productId: string) => {
    void itemScanHistoryActions.refreshHistoryItem(productId);
  }, []);

  useWsEvent("scan_history_updated", (event: Extract<
    WsInboundEvent,
    { type: "scan_history_updated" }
  >) => {
    const normalizedProductId = event.productId.trim();
    if (!normalizedProductId) {
      return;
    }

    const now = Date.now();
    const lastRefreshAt =
      lastRefreshByProductIdRef.current.get(normalizedProductId) ?? 0;

    if (now - lastRefreshAt < WS_REFRESH_DEDUPE_MS) {
      return;
    }

    lastRefreshByProductIdRef.current.set(normalizedProductId, now);
    refreshHistoryItem(normalizedProductId);
  });
}

export function useItemScanHistoryFlow(): void {
  const hasLoaded = useItemScanHistoryStore((state) => state.hasLoaded);
  const query = useItemScanHistoryStore((state) => state.query);
  const filtersRequestKey = useItemScanHistoryStore(
    selectItemScanHistoryFiltersRequestKey,
  );
  const lastFetchedRequestKeyRef = useRef<string | null>(null);
  const reloadHistory = useCallback(() => {
    void itemScanHistoryActions.loadHistory();
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      reloadHistory();
    }
  }, [hasLoaded, reloadHistory]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const nextRequestKey = `${query}::${filtersRequestKey}`;

    if (lastFetchedRequestKeyRef.current === null) {
      lastFetchedRequestKeyRef.current = nextRequestKey;
      return;
    }

    useItemScanHistoryStore.getState().setLoading(true);

    const timeoutId = window.setTimeout(() => {
      lastFetchedRequestKeyRef.current = nextRequestKey;
      reloadHistory();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filtersRequestKey, hasLoaded, query, reloadHistory]);
}

export function useItemScanHistoryLoadingVisibilityFlow(
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

interface UseItemScanHistoryPullRefreshFlowParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

const PULL_REFRESH_MIN_LOADING_MS = 3000;

interface PullRefreshFlowState {
  pullDistance: number;
  isArmed: boolean;
  isRefreshing: boolean;
  isPullLoadingVisible: boolean;
}

export function useItemScanHistoryPullRefreshFlow({
  scrollContainerRef,
}: UseItemScanHistoryPullRefreshFlowParams): PullRefreshFlowState {
  const isLoading = useItemScanHistoryStore((state) => state.isLoading);
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
