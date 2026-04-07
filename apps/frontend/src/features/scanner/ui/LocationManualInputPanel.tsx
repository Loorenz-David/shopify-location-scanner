import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import type { ScannerLocation } from "../types/scanner.types";

interface LocationManualInputPanelProps {
  query: string;
  locations: ScannerLocation[];
  isLoading: boolean;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelectLocation: (location: ScannerLocation) => void;
}

export function LocationManualInputPanel({
  query,
  locations,
  isLoading,
  onClose,
  onQueryChange,
  onSelectLocation,
}: LocationManualInputPanelProps) {
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-slate-50"
      aria-label="Manual location input"
    >
      <header className="flex items-center gap-2 border-b border-slate-900/15 px-4 py-4">
        <SearchBar
          id="location-search-input"
          wrapperClassName="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3"
          value={query}
          autoFocus
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search location"
          aria-label="Search location"
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center  text-sm font-bold text-slate-800"
          onClick={onClose}
          aria-label="Close manual location input"
        >
          <CloseIcon className="h-5 w-5 text-green-700" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        {isLoading ? (
          <p className="m-0 pb-3 text-slate-500">Searching locations...</p>
        ) : null}

        <ul
          className="m-0 flex list-none flex-col gap-2 p-0"
          data-scrollable="true"
        >
          {locations.map((location) => (
            <li key={location.code}>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-800/20 bg-white p-3 text-left text-sky-900"
                onClick={() => onSelectLocation(location)}
              >
                {location.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
