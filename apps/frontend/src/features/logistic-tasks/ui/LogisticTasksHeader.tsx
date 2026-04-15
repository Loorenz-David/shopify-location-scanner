import { useEffect, useState } from "react";

import { FilterIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";

const SEARCH_COMMIT_DELAY_MS = 350;

interface LogisticTasksHeaderProps {
  query: string;
  activeFilterCount: number;
  onChangeQuery: (q: string) => void;
  onOpenFilters: () => void;
}

export function LogisticTasksHeader({
  query,
  activeFilterCount,
  onChangeQuery,
  onOpenFilters,
}: LogisticTasksHeaderProps) {
  const [draftValue, setDraftValue] = useState(query);

  useEffect(() => {
    setDraftValue(query);
  }, [query]);

  useEffect(() => {
    if (draftValue === query) return;
    const id = window.setTimeout(() => {
      onChangeQuery(draftValue);
    }, SEARCH_COMMIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [draftValue, onChangeQuery, query]);

  return (
    <div className="pt-4 pb-2">
      <SearchBar
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        placeholder="Search tasks..."
        aria-label="Search logistic tasks"
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
      />
    </div>
  );
}
