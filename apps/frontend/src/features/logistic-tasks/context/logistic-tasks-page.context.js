import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { LogisticTasksPageContext } from "./logistic-tasks-page-context";
export function LogisticTasksPageProvider({ children, }) {
    const [activeScanHistoryId, setActiveScanHistoryId] = useState(null);
    const openMarkIntention = (scanHistoryId) => {
        openItemOptions(scanHistoryId);
    };
    const openItemOptions = (scanHistoryId) => {
        setActiveScanHistoryId(scanHistoryId);
        logisticTasksActions.openItemOptions(scanHistoryId);
    };
    const openFixItemDetail = (scanHistoryId) => {
        setActiveScanHistoryId(scanHistoryId);
        logisticTasksActions.openFixItemDetail(scanHistoryId);
    };
    return (_jsx(LogisticTasksPageContext.Provider, { value: {
            activeScanHistoryId,
            openMarkIntention,
            openItemOptions,
            openFixItemDetail,
        }, children: children }));
}
