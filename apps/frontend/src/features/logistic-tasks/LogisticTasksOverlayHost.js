import { jsx as _jsx } from "react/jsx-runtime";
import { useHomeShellStore } from "../home/stores/home-shell.store";
import { homeShellActions } from "../home/actions/home-shell.actions";
import { FixItemDetailOverlay } from "./ui/FixItemDetailOverlay";
import { LogisticTasksFiltersPanel } from "./ui/LogisticTasksFiltersPanel";
import { MarkIntentionOverlay } from "./ui/MarkIntentionOverlay";
export function LogisticTasksOverlayHost({ onClose, }) {
    const overlayPageId = useHomeShellStore((state) => state.overlayPageId);
    if (overlayPageId === "logistic-tasks-filters") {
        return _jsx(LogisticTasksFiltersPanel, { onClose: onClose });
    }
    if (overlayPageId?.startsWith("logistic-tasks-options:")) {
        const scanHistoryId = overlayPageId.slice("logistic-tasks-options:".length);
        return (_jsx(MarkIntentionOverlay, { scanHistoryId: scanHistoryId, onClose: homeShellActions.closeOverlayPage }));
    }
    if (overlayPageId?.startsWith("logistic-tasks-mark-intention:")) {
        const scanHistoryId = overlayPageId.slice("logistic-tasks-mark-intention:".length);
        return (_jsx(MarkIntentionOverlay, { scanHistoryId: scanHistoryId, onClose: homeShellActions.closeOverlayPage }));
    }
    if (overlayPageId?.startsWith("logistic-tasks-fix-item-detail:")) {
        const scanHistoryId = overlayPageId.slice("logistic-tasks-fix-item-detail:".length);
        return (_jsx(FixItemDetailOverlay, { scanHistoryId: scanHistoryId, onClose: homeShellActions.closeOverlayPage }));
    }
    return null;
}
