import { useEffect, useMemo, useState } from "react";

import { getLocationOptionsApi } from "../../location-options/api/get-location-options.api";
import { listZonesApi } from "../apis/list-zones.api";

let cachedSuggestions: string[] | null = null;

async function loadSuggestions(): Promise<string[]> {
  if (cachedSuggestions) {
    return cachedSuggestions;
  }

  const [metafieldOptions, mapZones] = await Promise.all([
    getLocationOptionsApi(),
    listZonesApi(),
  ]);

  const labels = new Set<string>([
    ...metafieldOptions,
    ...mapZones.map((zone) => zone.label).filter(Boolean),
  ]);

  cachedSuggestions = [...labels].sort((left, right) =>
    left.localeCompare(right),
  );

  return cachedSuggestions;
}

export function useZoneLabelSuggestions(input: string): string[] {
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let isDisposed = false;

    const hydrate = async () => {
      const suggestions = await loadSuggestions();

      if (!isDisposed) {
        setAllSuggestions(suggestions);
      }
    };

    void hydrate();

    return () => {
      isDisposed = true;
    };
  }, []);

  return useMemo(() => {
    const query = input.trim().toLowerCase();

    if (!query) {
      return allSuggestions.slice(0, 8);
    }

    return allSuggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allSuggestions, input]);
}
