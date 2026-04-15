import { LOGISTIC_ZONE_TYPE_LABELS } from "../../logistic-locations/domain/logistic-locations.domain";
import { useScannerLogisticPlacementStore } from "../stores/scanner-logistic-placement.store";
import { LOGISTIC_INTENTION_LABELS } from "../../logistic-tasks/domain/logistic-tasks.domain";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import { logisticTasksActions } from "../../logistic-tasks/actions/logistic-tasks.actions";

export function PlacementZoneMismatchPopup() {
  const scanHistoryId = useScannerLogisticPlacementStore(
    (s) => s.scanHistoryId,
  );
  const pendingMatch = useScannerLogisticPlacementStore(
    (s) => s.pendingPlacementMatch,
  );
  const item = useLogisticTasksStore(
    (s) => s.items.find((i) => i.id === scanHistoryId) ?? null,
  );

  if (!item || !pendingMatch) return null;

  const intentionLabel = item.intention
    ? LOGISTIC_INTENTION_LABELS[item.intention]
    : "Unknown intention";
  const zoneLabel = LOGISTIC_ZONE_TYPE_LABELS[pendingMatch.zoneType];

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">Wrong zone?</p>
        <p className="text-sm text-slate-600">
          This item is marked as{" "}
          <span className="font-semibold text-slate-800">{intentionLabel}</span>{" "}
          but you scanned a{" "}
          <span className="font-semibold text-slate-800">{zoneLabel}</span>{" "}
          location.
        </p>
        <p className="text-sm text-slate-500">
          Do you want to place it here anyway?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:bg-slate-800"
          onClick={() => void logisticTasksActions.confirmPendingPlacement()}
        >
          Confirm — Place Here
        </button>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200"
          onClick={() => logisticTasksActions.cancelPendingPlacement()}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
