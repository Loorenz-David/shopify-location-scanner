import { useEffect, useState } from "react";
import { FilterIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";

const SEARCH_INPUT_COMMIT_DELAY_MS = 350;

interface ItemScanHistorySearchInputProps {
  value: string;
  activeFilterCount: number;
  onChange: (value: string) => void;
  onOpenFilters: () => void;
}

export function ItemScanHistorySearchInput({
  value,
  activeFilterCount,
  onChange,
  onOpenFilters,
}: ItemScanHistorySearchInputProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (draftValue === value) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onChange(draftValue);
    }, SEARCH_INPUT_COMMIT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftValue, onChange, value]);

  return (
    <SearchBar
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      endAdornment={
        <button
          type="button"
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border pl-2.5 text-xs font-semibold transition ${
            activeFilterCount > 0
              ? "border-sky-200 bg-sky-50 text-sky-600 pr-2.5"
              : "border-transparent bg-transparent text-slate-500"
          }`}
          onClick={onOpenFilters}
          aria-label={
            activeFilterCount > 0
              ? `Open filters, ${activeFilterCount} active`
              : "Open filters"
          }
        >
          {activeFilterCount > 0 ? (
            <span className="min-w-3 text-right">{activeFilterCount}</span>
          ) : null}
          <FilterIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      }
      placeholder="Search a scan item"
      aria-label="Search item scan history"
    />
  );
}
