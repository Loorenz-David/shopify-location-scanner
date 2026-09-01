import { useCallback, useEffect } from "react";

import { useWsEvent } from "../../../core/ws-client/use-ws-event";
import {
  hydrateStockLocationDetailController,
  hydrateStockLocationsController,
} from "../controllers/stock-settings.controller";
import { ensureWizardOptions } from "../controllers/stock-wizard.controller";

export function useStockSettingsFlow(
  location?: string | null,
): { reload: () => Promise<void> } {
  const load = useCallback(async () => {
    await hydrateStockLocationsController();
    if (location !== undefined && location !== null) {
      // The detail screen renders property chips through renderCriteriaChips, which
      // needs the GET 4.1 vocabulary to turn wire values into display casing. Nothing
      // on the settings path fetched it, so a cold visit rendered "teak" where the
      // wizard and report screens render "Teak". The call is cached; a failure must
      // not take the screen down, so the chips simply fall back to the wire value.
      void ensureWizardOptions().catch(() => undefined);
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
