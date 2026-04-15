import { useHomeShellStore } from "../home/stores/home-shell.store";
import { homeShellActions } from "../home/actions/home-shell.actions";
import { FixItemDetailOverlay } from "./ui/FixItemDetailOverlay";
import { LogisticTasksFiltersPanel } from "./ui/LogisticTasksFiltersPanel";
import { MarkIntentionOverlay } from "./ui/MarkIntentionOverlay";

interface LogisticTasksOverlayHostProps {
  onClose: () => void;
}

export function LogisticTasksOverlayHost({
  onClose,
}: LogisticTasksOverlayHostProps) {
  const overlayPageId = useHomeShellStore((state) => state.overlayPageId);

  if (overlayPageId === "logistic-tasks-filters") {
    return <LogisticTasksFiltersPanel onClose={onClose} />;
  }

  if (overlayPageId?.startsWith("logistic-tasks-mark-intention:")) {
    const scanHistoryId = overlayPageId.slice(
      "logistic-tasks-mark-intention:".length,
    );
    return (
      <MarkIntentionOverlay
        scanHistoryId={scanHistoryId}
        onClose={homeShellActions.closeOverlayPage}
      />
    );
  }

  if (overlayPageId?.startsWith("logistic-tasks-fix-item-detail:")) {
    const scanHistoryId = overlayPageId.slice(
      "logistic-tasks-fix-item-detail:".length,
    );
    return (
      <FixItemDetailOverlay
        scanHistoryId={scanHistoryId}
        onClose={homeShellActions.closeOverlayPage}
      />
    );
  }

  return null;
}
