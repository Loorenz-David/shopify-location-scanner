import { useEffect, useRef } from "react";

import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";

const SEARCH_DEBOUNCE_MS = 250;

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
