import type {
  ScannerItem,
  ScannerItemIdType,
  ScannerLocation,
  ScannerStep,
} from "../types/scanner.types";

function normalizeScannedValue(value: string): string {
  return value.trim();
}

function extractHandleFromProductUrl(value: string): string | null {
  const fallbackMatch = value.match(/\/products\/([^/?#]+)/i);
  if (fallbackMatch?.[1]) {
    return decodeURIComponent(fallbackMatch[1]);
  }

  try {
    const url = new URL(value);
    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const productsIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "products",
    );

    if (productsIndex >= 0 && segments[productsIndex + 1]) {
      return decodeURIComponent(segments[productsIndex + 1]);
    }
  } catch {
    // Ignore URL parsing errors for non-URL scan values.
  }

  return null;
}

function inferItemIdentifier(value: string): {
  idType: ScannerItemIdType;
  itemId: string;
} {
  const handleFromUrl = extractHandleFromProductUrl(value);
  if (handleFromUrl) {
    return {
      idType: "handle",
      itemId: handleFromUrl,
    };
  }

  if (/^\d+$/.test(value) || value.startsWith("gid://shopify/Product/")) {
    return {
      idType: "product_id",
      itemId: value,
    };
  }

  return {
    idType: "sku",
    itemId: value,
  };
}

export function buildItemFromScannedValue(value: string): ScannerItem {
  const normalizedValue = normalizeScannedValue(value);
  const identifier = inferItemIdentifier(normalizedValue);

  return {
    id: normalizedValue,
    idType: identifier.idType,
    itemId: identifier.itemId,
    sku: identifier.itemId,
    title: identifier.itemId,
  };
}

export function buildLocationFromScannedValue(value: string): ScannerLocation {
  const normalizedValue = normalizeScannedValue(value);

  return {
    code: normalizedValue,
    label: normalizedValue,
  };
}

export function canApplyScannedValue(
  value: string,
  step: ScannerStep,
): boolean {
  const normalizedValue = normalizeScannedValue(value);

  if (!normalizedValue) {
    return false;
  }

  return step === "item" || step === "location";
}
