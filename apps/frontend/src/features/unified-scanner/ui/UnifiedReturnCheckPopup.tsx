import { useEffect, useState } from "react";

import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";

const RETURN_CONFIRM_TIMEOUT_MS = 2500;

export function UnifiedReturnCheckPopup() {
  const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
  const pendingLocation = useUnifiedScannerStore((state) => state.pendingLocation);
  const [isReturnArmed, setIsReturnArmed] = useState(false);

  useEffect(() => {
    if (!isReturnArmed) return;

    const timeoutId = window.setTimeout(() => {
      setIsReturnArmed(false);
    }, RETURN_CONFIRM_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isReturnArmed]);

  if (!selectedItem || !pendingLocation || pendingLocation.mode !== "shop") {
    return null;
  }

  const handleJustPlace = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    unifiedScannerActions.confirmPlaceWithoutReturn();
  };

  const handleReturnToStore = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isReturnArmed) {
      setIsReturnArmed(true);
      return;
    }

    unifiedScannerActions.confirmReturnToStore();
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">Returning to shop?</p>
        <p className="text-sm text-slate-600">
          This item is marked as{" "}
          <span className="font-semibold text-slate-800">sold</span> but{" "}
          <span className="font-semibold text-slate-800">
            {pendingLocation.label}
          </span>{" "}
          is a shop location.
        </p>
        <p className="text-sm text-slate-500">
          Was it returned by the customer and is back on sale, or do you just
          want to place it here?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full touch-manipulation rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:bg-slate-800"
          onClick={handleJustPlace}
        >
          Just place it here
        </button>
        <button
          type="button"
          className={`w-full touch-manipulation rounded-xl py-3 text-sm font-semibold transition-colors ${
            isReturnArmed
              ? "bg-amber-500 text-white active:bg-amber-600"
              : "bg-slate-100 text-slate-700 active:bg-slate-200"
          }`}
          onClick={handleReturnToStore}
        >
          {isReturnArmed
            ? "Tap again to confirm return"
            : "Customer return — back on sale"}
        </button>
        {isReturnArmed ? (
          <p className="m-0 text-center text-xs text-amber-700">
            This puts the item back on sale and updates sales analytics.
          </p>
        ) : null}
      </div>
    </div>
  );
}
