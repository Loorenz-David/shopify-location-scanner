import { apiClient } from "../../../core/api-client";
import type { ItemScanHistoryEntryDto } from "../types/item-scan-history.dto";

interface ItemScanHistoryItemResponseDto {
  historyItem?: ItemScanHistoryEntryDto | null;
  item?: ItemScanHistoryEntryDto | null;
  history?: ItemScanHistoryEntryDto | null;
}

function normalizeItemResponse(
  response: ItemScanHistoryEntryDto | ItemScanHistoryItemResponseDto | null,
): ItemScanHistoryEntryDto | null {
  if (!response) {
    return null;
  }

  if ("productId" in response) {
    return response;
  }

  return response.historyItem ?? response.item ?? response.history ?? null;
}

export async function getItemScanHistoryItemApi(
  productId: string,
): Promise<ItemScanHistoryEntryDto | null> {
  const response = await apiClient.get<
    ItemScanHistoryEntryDto | ItemScanHistoryItemResponseDto | null
  >(`/scanner/history/item?productId=${encodeURIComponent(productId)}`, {
    requiresAuth: true,
  });

  return normalizeItemResponse(response);
}
