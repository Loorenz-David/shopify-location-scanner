import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { CloseIcon } from "../../../assets/icons";
import { SearchBar } from "../../../share/searchbar";
import {
  filterLogisticLocations,
} from "../../logistic-locations/domain/logistic-locations.domain";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { useLocationOptionsStore } from "../stores/location-options.store";
interface UnifiedLocationManualInputPanelProps {
  onClose: () => void;
  onSelectValue: (value: string) => void;
}

export function UnifiedLocationManualInputPanel({
  onClose,
  onSelectValue,
}: UnifiedLocationManualInputPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const { locationMode } = useUnifiedScannerPageContext();
  const shopOptions = useLocationOptionsStore((state) => state.options);
  const logisticLocations = useLogisticLocationsStore((state) => state.locations);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const results = useMemo<
    Array<{
      key: string;
      value: string;
      label: string;
      kind: "shop" | "logistic";
    }>
  >(() => {
    if (locationMode === "logistic") {
      return filterLogisticLocations(logisticLocations, query).map(
        (location) => ({
          key: `${location.id}-${location.location}`,
          value: location.location,
          label: location.location,
          kind: "logistic",
        }),
      );
    }

    const normalizedQuery = query.trim().toLowerCase();

    const shopResults = shopOptions
      .filter((option) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          option.label.toLowerCase().includes(normalizedQuery) ||
          option.value.toLowerCase().includes(normalizedQuery)
        );
      })
      .map((option) => ({
        key: option.value,
        value: option.value,
        label: option.label,
        kind: "shop" as const,
      }));

    if (locationMode === "shop") {
      return shopResults;
    }

    const logisticResults = filterLogisticLocations(logisticLocations, query).map(
      (location) => ({
        key: `${location.id}-${location.location}`,
        value: location.location,
        label: location.location,
        kind: "logistic" as const,
      }),
    );

    return [...shopResults, ...logisticResults];
  }, [locationMode, logisticLocations, query, shopOptions]);

  return (
    <motion.section
      className="absolute inset-0 z-40 flex h-full min-h-0 flex-col bg-slate-50"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label="Manual unified location input"
    >
      <header className="flex items-center gap-2 border-b border-slate-900/15 px-4 py-4">
        <SearchBar
          ref={inputRef}
          id="unified-location-search-input"
          wrapperClassName="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search location"
          aria-label="Search location"
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center text-sm font-bold text-slate-800"
          onClick={onClose}
          aria-label="Close manual location input"
        >
          <CloseIcon className="h-5 w-5 text-green-700" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        {results.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">No locations found.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {results.map((location) => (
              <li key={location.key}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-800/20 bg-white p-3 text-left text-sky-900"
                  onClick={() => onSelectValue(location.value)}
                >
                  <span className="block">{location.label}</span>
                  {locationMode === null ? (
                    <span className="mt-1 block text-xs font-medium text-slate-500">
                      {location.kind === "shop" ? "Shop" : "Logistic"}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
