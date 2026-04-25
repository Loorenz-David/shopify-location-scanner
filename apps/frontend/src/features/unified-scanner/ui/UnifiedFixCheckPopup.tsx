import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";

export function UnifiedFixCheckPopup() {
  const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);

  if (!selectedItem) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">
          Has this item been fixed?
        </p>
        <p className="text-sm text-slate-500">
          This item was marked as requiring a fix. Let us know before placing
          it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:bg-emerald-700"
          onClick={() => void unifiedScannerActions.confirmMarkFixed()}
        >
          Yes — Mark as Fixed &amp; Place
        </button>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200"
          onClick={unifiedScannerActions.skipFixCheck}
        >
          No — Place Without Fixing
        </button>
      </div>
    </div>
  );
}
