import { RetryIcon } from "../../../assets/icons";

interface DecodedTextPanelProps {
  value: string;
  onClear?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function DecodedTextPanel({
  value,
  onClear,
  secondaryActionLabel,
  onSecondaryAction,
}: DecodedTextPanelProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(50%+min(31svh,31vw)+1rem-100px)] z-30 w-[min(88vw,440px)] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl bg-slate-950/70 p-3 py-4 text-slate-100 ring-1 ring-emerald-200/40">
        <p className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">
          {value}
        </p>
        {onClear ? (
          <button
            type="button"
            className="rounded-lg bg-emerald-500/85 px-4 py-3 text-md font-bold text-emerald-50"
            onClick={onClear}
            aria-label="Retry scan"
            title="Retry scan"
          >
            <RetryIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {secondaryActionLabel && onSecondaryAction ? (
        <div className="mt-7 flex items-center">
          <button
            type="button"
            className="w-full rounded-lg bg-sky-500/85 px-3 py-3 text-md font-bold text-sky-50"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
