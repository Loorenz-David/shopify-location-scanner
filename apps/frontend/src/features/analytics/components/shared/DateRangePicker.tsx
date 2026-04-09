import { useEffect, useMemo, useState } from "react";

import { BackArrowIcon } from "../../../../assets/icons";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
import type { DateRange } from "../../types/analytics.types";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildPresetRange(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(value);

  useEffect(() => {
    setDraftRange(value);
  }, [value]);

  const applyPreset = (days: number) => {
    onChange(buildPresetRange(days));
  };

  const resolvePresetActiveState = (days: number): boolean => {
    const expectedRange = buildPresetRange(days);

    return (
      value.from === expectedRange.from && value.to === expectedRange.to
    );
  };

  const isCustomActive = useMemo(
    () => PRESETS.every((preset) => !resolvePresetActiveState(preset.days)),
    [value.from, value.to],
  );

  const handleSaveCustomRange = () => {
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
      return;
    }

    onChange(draftRange);
    setIsCustomOpen(false);
  };

  const handleClearCustomRange = () => {
    onChange(buildPresetRange(30));
    setIsCustomOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-2 text-xs text-slate-500 sm:flex">
          <span>{value.from}</span>
          <span>to</span>
          <span>{value.to}</span>
        </div>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              resolvePresetActiveState(preset.days)
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsCustomOpen(true)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isCustomActive
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          }`}
        >
          Custom
        </button>
      </div>

      <SlidingOverlayContainer isOpen={isCustomOpen} title="Custom Date Range">
        <div className="flex h-full flex-col">
          <button
            type="button"
            aria-label="Close custom date range"
            className="flex-1 cursor-default"
            onClick={() => setIsCustomOpen(false)}
          />

          <section className="max-h-[82svh] overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
            <header className="flex items-center gap-3 border-b border-slate-900/10 px-4 py-3">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-600"
                onClick={() => setIsCustomOpen(false)}
                aria-label="Close custom date range"
              >
                <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
              </button>

              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Analytics
                </p>
                <h2 className="m-0 mt-1 text-base font-bold text-slate-900">
                  Custom Date Range
                </h2>
              </div>
            </header>

            <div className="flex flex-col gap-4 px-4 py-4">
              <label className="rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  From
                </p>
                <input
                  type="date"
                  value={draftRange.from}
                  max={draftRange.to || undefined}
                  onChange={(event) =>
                    setDraftRange((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  To
                </p>
                <input
                  type="date"
                  value={draftRange.to}
                  min={draftRange.from || undefined}
                  onChange={(event) =>
                    setDraftRange((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  className="mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
                />
              </label>
            </div>

            <footer className="border-t border-slate-900/10 px-4 py-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={handleClearCustomRange}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSaveCustomRange}
                  disabled={
                    !draftRange.from ||
                    !draftRange.to ||
                    draftRange.from > draftRange.to
                  }
                >
                  Save
                </button>
              </div>
            </footer>
          </section>
        </div>
      </SlidingOverlayContainer>
    </>
  );
}
