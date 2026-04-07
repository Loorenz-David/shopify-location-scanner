import type { ScannerLinkError } from "../types/scanner.types";

interface ErrorDetailPanelProps {
  error: ScannerLinkError | null;
  onRescanLocation: () => void;
  onRescanItem: () => void;
}

export function ErrorDetailPanel({
  error,
  onRescanLocation,
  onRescanItem,
}: ErrorDetailPanelProps) {
  if (!error) {
    return <p className="m-0 text-slate-500">No error details available.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 rounded-xl bg-amber-100 px-3 py-2 font-semibold text-amber-900">
        {error.compactMessage}
      </p>
      <pre className="m-0 max-h-[34svh] overflow-auto rounded-xl border border-slate-800/15 bg-slate-50 p-3 text-xs text-slate-700">
        {error.details}
      </pre>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-slate-800/20 bg-white px-3 py-2 font-semibold"
          onClick={onRescanLocation}
        >
          Rescan Location
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-800/20 bg-white px-3 py-2 font-semibold"
          onClick={onRescanItem}
        >
          Rescan Item
        </button>
      </div>
    </div>
  );
}
