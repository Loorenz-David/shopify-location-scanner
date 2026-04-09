import { itemScanHistorySearchFieldOptions } from "../domain/item-scan-history-filters.domain";
import {
  resolveItemScanHistoryDateRangePreset,
  toDateRangeForPreset,
  type ItemScanHistoryDateRangePreset,
} from "../domain/item-scan-history-date-range.domain";
import type {
  ItemScanHistoryFilters,
  ItemScanHistorySearchField,
} from "../types/item-scan-history-filters.types";

interface ItemScanHistoryFiltersPanelProps {
  filters: ItemScanHistoryFilters;
  activeFilterCount: number;
  onChangeFilters: (filters: Partial<ItemScanHistoryFilters>) => void;
  onResetFilters: () => void;
  onClose: () => void;
}

export function ItemScanHistoryFiltersPanel({
  filters,
  activeFilterCount,
  onChangeFilters,
  onResetFilters,
  onClose,
}: ItemScanHistoryFiltersPanelProps) {
  const isLocationFieldActive =
    filters.selectedFields.length === 0 ||
    filters.selectedFields.includes("location");
  const selectedDatePreset = resolveItemScanHistoryDateRangePreset(
    filters.from,
    filters.to,
  );

  const handleDatePresetChange = (preset: ItemScanHistoryDateRangePreset) => {
    if (preset === "none") {
      onChangeFilters({
        from: "",
        to: "",
      });
      return;
    }

    if (preset === "custom") {
      return;
    }

    const range = toDateRangeForPreset(preset);
    onChangeFilters(range);
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-slate-50"
      aria-label="Scan history filters"
    >
      <header className="flex items-center justify-between border-b border-slate-900/15 px-4 py-3">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-900">Filters</p>
          <p className="m-0 mt-1 text-xs text-slate-600">
            {activeFilterCount > 0
              ? `${activeFilterCount} active`
              : "No active filters"}
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg border border-slate-900/15 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-slate-900/10 bg-white p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Search fields
            </p>
            <p className="m-0 mt-1 text-xs text-slate-500">
              Leave all unselected to search in all fields.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {itemScanHistorySearchFieldOptions.map((field) => {
                const selected = filters.selectedFields.includes(field);

                return (
                  <ToggleChip
                    key={field}
                    label={toFieldLabel(field)}
                    checked={selected}
                    onToggle={() =>
                      onChangeFilters({
                        selectedFields: selected
                          ? filters.selectedFields.filter(
                              (value) => value !== field,
                            )
                          : [...filters.selectedFields, field],
                      })
                    }
                  />
                );
              })}
            </div>

            <label
              className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 ${
                isLocationFieldActive
                  ? "border-slate-900/10 bg-slate-50"
                  : "border-slate-900/5 bg-slate-50/60 opacity-60"
              }`}
            >
              <div>
                <p className="m-0 text-sm font-semibold text-slate-900">
                  Include previous locations
                </p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  Off means location search matches only the latest location.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={filters.includeLocationHistory}
                aria-label="Include previous locations in search"
                disabled={!isLocationFieldActive}
                onClick={() =>
                  onChangeFilters({
                    includeLocationHistory: !filters.includeLocationHistory,
                  })
                }
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
                  filters.includeLocationHistory
                    ? "bg-sky-500"
                    : "bg-slate-300"
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    filters.includeLocationHistory ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ToggleChip
                label="Active"
                checked={filters.status === "active"}
                onToggle={() => onChangeFilters({ status: "active" })}
              />
              <ToggleChip
                label="Sold"
                checked={filters.status === "sold"}
                onToggle={() => onChangeFilters({ status: "sold" })}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Date range
            </p>
            <label className="mt-2 block">
              <span className="sr-only">Date range preset</span>
              <select
                value={selectedDatePreset}
                onChange={(event) =>
                  handleDatePresetChange(
                    event.target.value as ItemScanHistoryDateRangePreset,
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-900/15 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
              >
                <option value="none">No date filter</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 days</option>
                <option value="last_1_month">1 month</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            {selectedDatePreset === "custom" ? (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField
                  label="From"
                  value={filters.from}
                  onChange={(value) => onChangeFilters({ from: value })}
                />
                <DateField
                  label="To"
                  value={filters.to}
                  onChange={(value) => onChangeFilters({ to: value })}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-900/10 px-4 py-3">
        <button
          type="button"
          className="w-full rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onResetFilters}
        >
          Reset filters
        </button>
      </footer>
    </section>
  );
}

interface ToggleChipProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleChip({ label, checked, onToggle }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
        checked
          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
          : "border-slate-900/15 bg-white text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function toFieldLabel(field: ItemScanHistorySearchField): string {
  switch (field) {
    case "sku":
      return "SKU";
    case "barcode":
      return "Barcode";
    case "location":
      return "Location";
    case "itemTitle":
      return "Item title";
    case "itemCategory":
      return "Item category";
    default:
      return field;
  }
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <label className="rounded-xl border border-slate-900/10 bg-slate-50 px-3 py-2">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
      />
    </label>
  );
}
