import { createContext } from "react";

export interface LogisticTasksPageContextValue {
  activeScanHistoryId: string | null;
  openMarkIntention: (scanHistoryId: string) => void;
  openFixItemDetail: (scanHistoryId: string) => void;
}

export const LogisticTasksPageContext =
  createContext<LogisticTasksPageContextValue | null>(null);
