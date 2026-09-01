import { useCallback, useEffect } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import {
  hydrateStockLocationDetailController,
  hydrateStockLocationsController,
} from "../controllers/stock-settings.controller";

export function useStockSettingsFlow(
  location?: string | null,
): { reload: () => Promise<void> } {
  const load = useCallback(async () => {
    await hydrateStockLocationsController();
    if (location !== undefined && location !== null) {
      await hydrateStockLocationDetailController(location);
    }
  }, [location]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScanHistoryUpdated = useCallback(() => {
    void load();
  }, [load]);

  useWsEvent("scan_history_updated", handleScanHistoryUpdated);

  return { reload: load };
}
