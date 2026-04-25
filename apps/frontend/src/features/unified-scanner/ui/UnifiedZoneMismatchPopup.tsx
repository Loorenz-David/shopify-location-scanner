import { LOGISTIC_ZONE_TYPE_LABELS } from "../../logistic-locations/domain/logistic-locations.domain";
import { LOGISTIC_INTENTION_LABELS } from "../../logistic-tasks/domain/logistic-tasks.domain";
import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";

export function UnifiedZoneMismatchPopup() {
  const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
  const pendingLocation = useUnifiedScannerStore((state) => state.pendingLocation);

  if (!selectedItem || !pendingLocation || pendingLocation.mode !== "logistic") {
    return null;
  }

  const intentionLabel = selectedItem.intention
    ? LOGISTIC_INTENTION_LABELS[selectedItem.intention]
    : "Unknown intention";
  const zoneLabel = LOGISTIC_ZONE_TYPE_LABELS[pendingLocation.zoneType];

  const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    unifiedScannerActions.confirmZoneMismatch();
  };

  const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    unifiedScannerActions.cancelPlacement();
  };

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
          className="w-full touch-manipulation rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:bg-slate-800"
          onClick={handleConfirm}
        >
          Confirm — Place Here
        </button>
        <button
          type="button"
          className="w-full touch-manipulation rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
