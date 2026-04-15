import { logisticTasksActions } from "../actions/logistic-tasks.actions";

interface LogisticTasksBatchNotificationBannerProps {
  message: string;
}

export function LogisticTasksBatchNotificationBanner({
  message,
}: LogisticTasksBatchNotificationBannerProps) {
  return (
    <div className="mx-5 mt-2 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
      <p className="text-sm font-semibold text-amber-800">{message}</p>
      <button
        type="button"
        className="ml-3 shrink-0 text-amber-700"
        onClick={logisticTasksActions.dismissBatchNotification}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
