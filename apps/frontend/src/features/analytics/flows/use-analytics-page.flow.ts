import { useCallback, useEffect } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import { getCategoriesOverviewApi } from "../apis/get-categories-overview.api";
import { getDimensionsStatsApi } from "../apis/get-dimensions-stats.api";
import { getSalesChannelOverviewApi } from "../apis/get-sales-channel-overview.api";
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
import { getSalesVelocityApi } from "../apis/get-sales-velocity.api";
import { getSmartInsightsApi } from "../apis/get-smart-insights.api";
import { getZonesOverviewApi } from "../apis/get-zones-overview.api";
import {
  selectAnalyticsDateRange,
  selectAnalyticsVelocityChannel,
  useAnalyticsStore,
} from "../stores/analytics.store";

export function useAnalyticsPageFlow() {
  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
  const velocityChannel = useAnalyticsStore(selectAnalyticsVelocityChannel);
  const setLoadingOverview = useAnalyticsStore(
    (state) => state.setLoadingOverview,
  );
  const setZonesOverview = useAnalyticsStore((state) => state.setZonesOverview);
  const setInsights = useAnalyticsStore((state) => state.setInsights);
  const setChannelOverview = useAnalyticsStore(
    (state) => state.setChannelOverview,
  );
  const setVelocity = useAnalyticsStore((state) => state.setVelocity);
  const setVelocityCompareSeries = useAnalyticsStore(
    (state) => state.setVelocityCompareSeries,
  );
  const setTimePatterns = useAnalyticsStore((state) => state.setTimePatterns);
  const setTimePatternsCompare = useAnalyticsStore((state) => state.setTimePatternsCompare);
  const setCategories = useAnalyticsStore((state) => state.setCategories);
  const setDimensions = useAnalyticsStore((state) => state.setDimensions);

  const load = useCallback(async () => {
    const { from, to } = dateRange;

    setLoadingOverview(true);

    try {
      const [
        zonesOverview,
        insights,
        categories,
        dimensions,
        channelOverview,
        timePatterns,
      ] = await Promise.all([
        getZonesOverviewApi(from, to),
        getSmartInsightsApi(from, to),
        getCategoriesOverviewApi(from, to),
        getDimensionsStatsApi(from, to),
        getSalesChannelOverviewApi(from, to),
        getTimePatternsApi({ from, to }),
      ]);

      setZonesOverview(zonesOverview);
      setInsights(insights);
      setCategories(categories);
      setDimensions(dimensions);
      setChannelOverview(channelOverview);
      setTimePatterns(timePatterns);
    } finally {
      setLoadingOverview(false);
    }
  }, [
    setChannelOverview,
    dateRange,
    setCategories,
    setDimensions,
    setInsights,
    setLoadingOverview,
    setTimePatterns,
    setZonesOverview,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let isDisposed = false;

    const loadVelocity = async () => {
      if (velocityChannel === "compare") {
        const [physical, webshop] = await Promise.all([
          getSalesVelocityApi(dateRange.from, dateRange.to, "physical"),
          getSalesVelocityApi(dateRange.from, dateRange.to, "webshop"),
        ]);

        if (!isDisposed) {
          setVelocityCompareSeries({ physical, webshop });
        }

        return;
      }

      const { from, to } = dateRange;
      const velocity = await getSalesVelocityApi(from, to, velocityChannel);

      if (!isDisposed) {
        setVelocityCompareSeries(null);
        setVelocity(velocity);
      }
    };

    void loadVelocity();

    return () => {
      isDisposed = true;
    };
  }, [dateRange, setVelocity, setVelocityCompareSeries, velocityChannel]);

  const loadTimePatternsForChannel = useCallback(
    async (channel: "all" | "physical" | "webshop" | "compare") => {
      const { from, to } = dateRange;
      if (channel === "compare") {
        const [physical, webshop] = await Promise.all([
          getTimePatternsApi({ from, to, salesChannel: "physical" }),
          getTimePatternsApi({ from, to, salesChannel: "webshop" }),
        ]);
        setTimePatternsCompare({ physical, webshop });
      } else {
        setTimePatternsCompare(null);
        const data = await getTimePatternsApi({
          from,
          to,
          salesChannel: channel === "all" ? undefined : channel,
        });
        setTimePatterns(data);
      }
    },
    [dateRange, setTimePatterns, setTimePatternsCompare],
  );

  const handleScanHistoryUpdated = useCallback(() => {
    void load();
  }, [load]);

  useWsEvent("scan_history_updated", handleScanHistoryUpdated);

  return {
    reload: load,
    loadTimePatternsForChannel,
  };
}
