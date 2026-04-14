export type SalesChannel = "webshop" | "physical" | "imported" | "unknown";

export type OrderChannelSignals = {
  sourceName: string | null | undefined;
  appId: number | null | undefined;
  noteAttributes:
    | Array<{
        name: string;
        value?: string | null | undefined;
      }>
    | undefined;
};

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

export const classifyShopifyOrderChannel = (
  signals: OrderChannelSignals,
): SalesChannel => {
  const normalized = signals.sourceName?.trim().toLowerCase();

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

  const marketplace = signals.noteAttributes
    ?.find((attribute) => attribute.name.trim().toLowerCase() === "marketplace")
    ?.value?.trim()
    .toLowerCase();

  if (marketplace?.includes("zettle")) {
    return "physical";
  }

  if (signals.appId === 2627233) {
    return "physical";
  }

  return "unknown";
};

export const classifyImportedChannel = (): SalesChannel => "imported";
