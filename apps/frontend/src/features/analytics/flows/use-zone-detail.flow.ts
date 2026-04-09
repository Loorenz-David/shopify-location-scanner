import { useEffect } from "react";

import { getZoneDetailApi } from "../apis/get-zone-detail.api";
import {
  selectAnalyticsSelectedZone,
  selectAnalyticsZoneDateRange,
  useAnalyticsStore,
} from "../stores/analytics.store";

export function useZoneDetailFlow(): void {
  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const zoneDateRange = useAnalyticsStore(selectAnalyticsZoneDateRange);
  const setLoadingZoneDetail = useAnalyticsStore(
    (state) => state.setLoadingZoneDetail,
  );
  const setZoneDetail = useAnalyticsStore((state) => state.setZoneDetail);

  useEffect(() => {
    if (!selectedZone) {
      return;
    }

    let isDisposed = false;

    const load = async () => {
      setLoadingZoneDetail(true);

      try {
        const zoneDetail = await getZoneDetailApi(
          selectedZone,
          zoneDateRange.from,
          zoneDateRange.to,
        );

        if (!isDisposed) {
          setZoneDetail(zoneDetail);
        }
      } finally {
        if (!isDisposed) {
          setLoadingZoneDetail(false);
        }
      }
    };

    void load();

    return () => {
      isDisposed = true;
    };
  }, [
    selectedZone,
    zoneDateRange.from,
    zoneDateRange.to,
    setLoadingZoneDetail,
    setZoneDetail,
  ]);
}
