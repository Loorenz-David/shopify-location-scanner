import { apiClient } from "../../../core/api-client";
import {
  fallbackLocations,
  filterLocationsByQuery,
} from "../domain/allowed-locations.domain";
import type { ScannerLocation } from "../types/scanner.types";

interface AllowedLocationsResponse {
  locations: ScannerLocation[];
}

export async function getAllowedLocationsApi(
  query: string,
): Promise<ScannerLocation[]> {
  try {
    const response = await apiClient.get<AllowedLocationsResponse>(
      "/v1/locations/allowed",
      { requiresAuth: true },
    );
    return filterLocationsByQuery(response.locations, query);
  } catch {
    return filterLocationsByQuery(fallbackLocations, query);
  }
}
