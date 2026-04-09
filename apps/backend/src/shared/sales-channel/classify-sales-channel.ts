export type SalesChannel = "webshop" | "physical" | "imported" | "unknown";

export const classifyShopifyChannel = (
  sourceName: string | null | undefined,
): SalesChannel => {
  if (!sourceName) {
    return "unknown";
  }

  const normalized = sourceName.trim().toLowerCase();

  if (normalized === "web") {
    return "webshop";
  }

  if (
    normalized === "pos" ||
    normalized === "zettle" ||
    normalized === "android" ||
    normalized === "iphone"
  ) {
    return "physical";
  }

  return "unknown";
};

export const classifyImportedChannel = (): SalesChannel => "imported";
