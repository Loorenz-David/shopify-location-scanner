import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import type { ScannerItem } from "../types/scanner.types";

interface ItemManualInputPanelProps {
  query: string;
  items: ScannerItem[];
  isLoading: boolean;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelectItem: (item: ScannerItem) => void;
}

export function ItemManualInputPanel({
  query,
  items,
  isLoading,
  onClose,
  onQueryChange,
  onSelectItem,
}: ItemManualInputPanelProps) {
  const loadingPlaceholders = Array.from({ length: 4 }, (_, index) => index);

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-slate-50"
      aria-label="Manual item input"
    >
      <header className="flex items-center gap-2 border-b border-slate-900/15 px-4 py-4">
        <SearchBar
          id="item-search-input"
          wrapperClassName="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3"
          value={query}
          autoFocus
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by SKU or barcode"
          aria-label="Search by SKU or barcode"
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center  text-sm font-bold text-slate-800"
          onClick={onClose}
          aria-label="Close manual item input"
        >
          <CloseIcon className="h-5 w-5 text-green-700" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        {isLoading ? (
          <ul
            className="m-0 flex list-none flex-col gap-2 p-0"
            data-scrollable="true"
            aria-label="Loading item results"
          >
            {loadingPlaceholders.map((placeholderIndex) => (
              <li key={placeholderIndex}>
                <div className="scanner-skeleton-surface flex w-full items-center gap-3 rounded-xl border border-slate-800/15 bg-white p-2">
                  <div className="scanner-skeleton-surface h-10 w-10 rounded-lg bg-slate-200/90" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="scanner-skeleton-surface h-3 w-32 rounded bg-slate-200/90" />
                    <div className="scanner-skeleton-surface h-3 w-48 rounded bg-slate-200/80" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul
            className="m-0 flex list-none flex-col gap-2 p-0"
            data-scrollable="true"
          >
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800/20 bg-white p-2 text-left"
                  onClick={() => onSelectItem(item)}
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <span className="flex flex-col gap-0.5 text-sky-900">
                    <strong>{item.sku}</strong>
                    <span>{item.title ?? "Untitled Item"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
