import { apiClient } from "../../../core/api-client";
import type {
  LinkItemLocationInput,
  LinkItemPositionsApiResponse,
  LinkItemPositionsRequest,
  LinkItemPositionsResponse,
} from "../types/unified-scanner.types";

function shouldMuteLinkApiCall(): boolean {
  const rawFlag = import.meta.env["VITE_SCANNER_MUTE_LINK_API"];
  return String(rawFlag ?? "").toLowerCase() === "true";
}

function buildMutedLinkResponse(
  payload: LinkItemPositionsRequest,
): LinkItemPositionsResponse {
  const firstItem = (
    "items" in payload ? payload.items[0] : payload
  ) as LinkItemLocationInput;

  return {
    product: {
      id: firstItem.itemId,
      title: firstItem.itemId,
      location: firstItem.location,
      previousLocation: undefined,
      updatedAt: new Date().toISOString(),
      sku: firstItem.idType === "sku" ? firstItem.itemId : undefined,
      imageUrl: null,
      itemType: firstItem.idType,
    },
  };
}

function normalizeLinkItemPositionsResponse(
  payload: LinkItemPositionsRequest,
  response: LinkItemPositionsApiResponse,
): LinkItemPositionsResponse {
  if (!("results" in response)) {
    return response;
  }

  const firstRequestedItem = "items" in payload ? payload.items[0] : payload;
  const matchingSuccess = response.results.find(
    (result) =>
      result.ok &&
      result.idType === firstRequestedItem.idType &&
      result.itemId === firstRequestedItem.itemId,
  );

  const firstSuccess =
    matchingSuccess ?? response.results.find((result) => result.ok);
  if (firstSuccess?.product) {
    return {
      product: firstSuccess.product,
      historyItem: firstSuccess.historyItem,
    };
  }

  const failureResult = response.results.find(
    (result) =>
      result.idType === firstRequestedItem.idType &&
      result.itemId === firstRequestedItem.itemId,
  );
  if (failureResult?.error?.message) {
    throw new Error(failureResult.error.message);
  }

  throw new Error("No successful location update result was returned.");
}

export async function linkItemPositionsApi(
  payload: LinkItemPositionsRequest,
): Promise<LinkItemPositionsResponse> {
  if (shouldMuteLinkApiCall()) {
    return buildMutedLinkResponse(payload);
  }

  const response = await apiClient.patch<
    LinkItemPositionsApiResponse,
    LinkItemPositionsRequest
  >("/shopify/items/location", payload, { requiresAuth: true });

  return normalizeLinkItemPositionsResponse(payload, response);
}
