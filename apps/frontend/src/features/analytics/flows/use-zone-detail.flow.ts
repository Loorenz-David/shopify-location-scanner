import { useEffect } from "react";

import { getTimePatternsApi } from "../apis/get-time-patterns.api";
import { getZoneDetailApi } from "../apis/get-zone-detail.api";
import {
  selectAnalyticsSelectedZone,
  selectAnalyticsSelectedZoneLevel,
  selectAnalyticsZoneDateRange,
  useAnalyticsStore,
} from "../stores/analytics.store";

export function useZoneDetailFlow(): void {
  const selectedZone = useAnalyticsStore(selectAnalyticsSelectedZone);
  const selectedZoneLevel = useAnalyticsStore(selectAnalyticsSelectedZoneLevel);
  const zoneDateRange = useAnalyticsStore(selectAnalyticsZoneDateRange);
  const setLoadingZoneDetail = useAnalyticsStore(
    (state) => state.setLoadingZoneDetail,
  );
  const setZoneDetail = useAnalyticsStore((state) => state.setZoneDetail);
  const setZoneLevels = useAnalyticsStore((state) => state.setZoneLevels);
  const setZoneTimePatterns = useAnalyticsStore(
    (state) => state.setZoneTimePatterns,
  );

  useEffect(() => {
    if (!selectedZone) return;

    // Fetch either the specific level ("H1:2") or the whole zone ("H1").
    const effectiveLocation = selectedZoneLevel ?? selectedZone;

    let isDisposed = false;

    const load = async () => {
      setLoadingZoneDetail(true);

      try {
        const [zoneDetail, zoneTimePatterns] = await Promise.all([
          getZoneDetailApi(effectiveLocation, zoneDateRange.from, zoneDateRange.to),
          getTimePatternsApi({
            from: zoneDateRange.from,
            to: zoneDateRange.to,
            latestLocation: effectiveLocation,
          }),
        ]);

        if (!isDisposed) {
          setZoneDetail(zoneDetail);
          setZoneTimePatterns(zoneTimePatterns);
          // Persist the level tab list when viewing the whole zone so it
          // remains available while drilling into a specific level.
          if (!selectedZoneLevel && zoneDetail.levels) {
            setZoneLevels(zoneDetail.levels);
          }
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
    selectedZoneLevel,
    zoneDateRange.from,
    zoneDateRange.to,
    setLoadingZoneDetail,
    setZoneDetail,
    setZoneLevels,
    setZoneTimePatterns,
  ]);
}
