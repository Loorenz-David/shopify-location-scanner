import { useCallback, useEffect } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import { hydrateStockReportController } from "../controllers/stock-report.controller";

export function useStockReportFlow(): { reload: () => Promise<void> } {
  const load = useCallback(async () => {
    await hydrateStockReportController();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScanHistoryUpdated = useCallback(() => {
    void load();
  }, [load]);

  useWsEvent("scan_history_updated", handleScanHistoryUpdated);

  return { reload: load };
}
