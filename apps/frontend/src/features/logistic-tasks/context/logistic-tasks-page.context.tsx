import { useState, type ReactNode } from "react";

import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { LogisticTasksPageContext } from "./logistic-tasks-page-context";

interface LogisticTasksPageProviderProps {
  children: ReactNode;
}

export function LogisticTasksPageProvider({
  children,
}: LogisticTasksPageProviderProps) {
  const [activeScanHistoryId, setActiveScanHistoryId] = useState<string | null>(
    null,
  );

  const openMarkIntention = (scanHistoryId: string) => {
    openItemOptions(scanHistoryId);
  };

  const openItemOptions = (scanHistoryId: string) => {
    setActiveScanHistoryId(scanHistoryId);
    logisticTasksActions.openItemOptions(scanHistoryId);
  };

  const openFixItemDetail = (scanHistoryId: string) => {
    setActiveScanHistoryId(scanHistoryId);
    logisticTasksActions.openFixItemDetail(scanHistoryId);
  };

  return (
    <LogisticTasksPageContext.Provider
      value={{
        activeScanHistoryId,
        openMarkIntention,
        openItemOptions,
        openFixItemDetail,
      }}
    >
      {children}
    </LogisticTasksPageContext.Provider>
  );
}
