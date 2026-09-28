// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, createApiClient } from "./api-client.action";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client errors", () => {
  it("uses the backend error message for a structured error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Sold item not found for this shop",
              requestId: "request-1",
            },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const client = createApiClient();
    const request = client.post(
      "/logistic/placements",
      {
        scanHistoryId: "item-1",
        logisticLocationId: "location-1",
      },
      { requiresAuth: false },
    );

    await expect(request).rejects.toMatchObject({
      name: "ApiClientError",
      message: "Sold item not found for this shop",
      status: 404,
      endpoint: "/logistic/placements",
      method: "POST",
    } satisfies Partial<ApiClientError>);
  });

  it("keeps the generic message when the response has no usable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR" } }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const client = createApiClient();
    const request = client.get("/broken", { requiresAuth: false });

    await expect(request).rejects.toMatchObject({
      name: "ApiClientError",
      message: "API request failed",
      status: 500,
    } satisfies Partial<ApiClientError>);
  });
});
