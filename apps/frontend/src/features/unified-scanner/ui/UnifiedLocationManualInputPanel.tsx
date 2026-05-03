import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";

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

const LETTER_NUMBER_RE = /^([A-Za-z]+)(\d+)$/;

function parseLetterNumber(name: string): { letter: string; number: string } | null {
  const m = name.match(LETTER_NUMBER_RE);
  return m ? { letter: m[1].toUpperCase(), number: m[2] } : null;
}

interface LocationItem {
  key: string;
  value: string;
  label: string;
  kind: "shop" | "logistic";
}

interface LetterGroup {
  letter: string;
  items: LocationItem[];
}

function buildLetterGroups(items: LocationItem[]): {
  groups: LetterGroup[];
  unstructured: LocationItem[];
} {
  const map = new Map<string, LocationItem[]>();
  const unstructured: LocationItem[] = [];

  for (const item of items) {
    const parsed = parseLetterNumber(item.label);
    if (parsed) {
      const bucket = map.get(parsed.letter) ?? [];
      bucket.push(item);
      map.set(parsed.letter, bucket);
    } else {
      unstructured.push(item);
    }
  }

  const groups = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, its]) => ({
      letter,
      items: its.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true }),
      ),
    }));

  return { groups, unstructured };
}

export function UnifiedLocationManualInputPanel({
  onClose,
  onSelectValue,
}: UnifiedLocationManualInputPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const { locationMode } = useUnifiedScannerPageContext();
  const shopOptions = useLocationOptionsStore((state) => state.options);
  const logisticLocations = useLogisticLocationsStore((state) => state.locations);

  const shopItems = useMemo<LocationItem[]>(
    () =>
      shopOptions.map((opt) => ({
        key: opt.value,
        value: opt.value,
        label: opt.label,
        kind: "shop",
      })),
    [shopOptions],
  );

  const logisticItems = useMemo<LocationItem[]>(
    () =>
      logisticLocations.map((loc) => ({
        key: `${loc.id}-${loc.location}`,
        value: loc.location,
        label: loc.location,
        kind: "logistic",
      })),
    [logisticLocations],
  );

  const browseItems = useMemo<LocationItem[]>(() => {
    if (locationMode === "shop") return shopItems;
    if (locationMode === "logistic") return logisticItems;
    return [...shopItems, ...logisticItems];
  }, [locationMode, shopItems, logisticItems]);

  const { groups, unstructured } = useMemo(
    () => buildLetterGroups(browseItems),
    [browseItems],
  );

  const searchResults = useMemo<LocationItem[]>(() => {
    if (!query.trim()) return [];

    const logistic =
      locationMode !== "shop"
        ? filterLogisticLocations(logisticLocations, query).map((loc) => ({
            key: `${loc.id}-${loc.location}`,
            value: loc.location,
            label: loc.location,
            kind: "logistic" as const,
          }))
        : [];

    const q = query.trim().toLowerCase();
    const shop =
      locationMode !== "logistic"
        ? shopOptions
            .filter(
              (opt) =>
                opt.label.toLowerCase().includes(q) ||
                opt.value.toLowerCase().includes(q),
            )
            .map((opt) => ({
              key: opt.value,
              value: opt.value,
              label: opt.label,
              kind: "shop" as const,
            }))
        : [];

    return [...shop, ...logistic];
  }, [locationMode, logisticLocations, query, shopOptions]);

  const isSearching = query.trim().length > 0;
  const activeGroup = selectedLetter
    ? (groups.find((g) => g.letter === selectedLetter) ?? null)
    : null;

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
        {selectedLetter && !isSearching && (
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-800/20 bg-white px-3 text-sm font-bold text-sky-900"
            onClick={() => setSelectedLetter(null)}
            aria-label="Back to letter selection"
          >
            <span>←</span>
            <span>{selectedLetter}</span>
          </button>
        )}
        <SearchBar
          ref={inputRef}
          id="unified-location-search-input"
          wrapperClassName="h-11 flex-1 rounded-xl border border-slate-800/20 bg-white px-3"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedLetter(null);
          }}
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
        {isSearching ? (
          searchResults.length === 0 ? (
            <p className="m-0 text-sm text-slate-500">No locations found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {searchResults.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900"
                  onClick={() => onSelectValue(item.value)}
                >
                  <span className="text-sm font-semibold leading-tight">{item.label}</span>
                  {locationMode === null && (
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      {item.kind === "shop" ? "Shop" : "Logistic"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )
        ) : activeGroup ? (
          <div className="grid grid-cols-4 gap-2">
            {activeGroup.items.map((item) => {
              const parsed = parseLetterNumber(item.label);
              return (
                <button
                  key={item.key}
                  type="button"
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900"
                  onClick={() => onSelectValue(item.value)}
                >
                  <span className="text-xl font-bold">
                    {parsed ? parsed.number : item.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : groups.length === 0 && unstructured.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">No locations found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {groups.map((group) => (
                  <button
                    key={`letter-${group.letter}`}
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900"
                    onClick={() => setSelectedLetter(group.letter)}
                  >
                    <span className="text-xl font-bold">{group.letter}</span>
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      {group.items.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {unstructured.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {unstructured.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-slate-800/20 bg-white p-2 text-center text-sky-900"
                    onClick={() => onSelectValue(item.value)}
                  >
                    <span className="text-sm font-semibold leading-tight">{item.label}</span>
                    {locationMode === null && (
                      <span className="mt-0.5 text-[10px] text-slate-500">
                        {item.kind === "shop" ? "Shop" : "Logistic"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
