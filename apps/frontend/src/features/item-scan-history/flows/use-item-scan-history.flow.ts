import { useEffect, useRef, useState } from "react";

import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";

const SEARCH_DEBOUNCE_MS = 250;
const LOADING_VISIBILITY_DELAY_MS = 180;

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
