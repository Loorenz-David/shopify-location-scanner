import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import { searchUnifiedItemsApi } from "../api/search-unified-items.api";
import type { UnifiedScannerItem } from "../types/unified-scanner.types";

interface UnifiedItemManualInputPanelProps {
  onClose: () => void;
  onSelect: (item: UnifiedScannerItem) => void;
}

const ITEM_SEARCH_DEBOUNCE_MS = 250;

export function UnifiedItemManualInputPanel({
  onClose,
  onSelect,
}: UnifiedItemManualInputPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedScannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadingPlaceholders = useMemo(
    () => Array.from({ length: 4 }, (_, index) => index),
    [],
  );

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timeoutId = window.setTimeout(() => {
      void searchUnifiedItemsApi(normalizedQuery).then((items) => {
        setResults(items);
        setIsLoading(false);
      });
    }, ITEM_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <motion.section
      className="absolute inset-0 z-40 flex h-full min-h-0 flex-col bg-slate-50"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label="Manual unified item input"
    >
      <header className="flex items-center gap-2 border-b border-slate-900/15 px-4 py-4">
        <SearchBar
          ref={inputRef}
          id="unified-item-search-input"
          wrapperClassName="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by SKU or barcode"
          aria-label="Search by SKU or barcode"
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center text-sm font-bold text-slate-800"
          onClick={onClose}
          aria-label="Close manual item input"
        >
          <CloseIcon className="h-5 w-5 text-green-700" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        {isLoading ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
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
        ) : results.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">
            {query.trim() ? "No items found." : "Search by SKU or barcode."}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {results.map((item) => (
              <li key={`${item.id || item.itemId}-${item.sku}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800/20 bg-white p-2 text-left"
                  onClick={() => onSelect(item)}
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sky-900">
                    <strong className="truncate">{item.title ?? item.sku}</strong>
                    <span className="truncate text-sm text-slate-600">
                      {item.sku}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
