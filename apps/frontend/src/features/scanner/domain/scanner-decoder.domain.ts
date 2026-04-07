import type {
  ScannerItem,
  ScannerItemIdType,
  ScannerLocation,
  ScannerStep,
} from "../types/scanner.types";

function normalizeScannedValue(value: string): string {
  return value.trim();
}

interface ItemIdentifier {
  idType: ScannerItemIdType;
  itemId: string;
}

type ItemIdentifierExtractor = (value: string) => ItemIdentifier | null;

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

const extractShopifyHandleIdentifier: ItemIdentifierExtractor = (value) => {
  const handleFromUrl = extractHandleFromProductUrl(value);
  if (!handleFromUrl) {
    return null;
  }

  return {
    idType: "handle",
    itemId: handleFromUrl,
  };
};

const extractArticleNumberIdentifier: ItemIdentifierExtractor = (value) => {
  const articleNumberMatch = value.match(/^ART\s*:\s*(.+)$/i);
  const articleNumber = articleNumberMatch?.[1]?.trim();

  if (!articleNumber) {
    return null;
  }

  return {
    idType: "barcode",
    itemId: articleNumber,
  };
};

const itemIdentifierExtractors: ItemIdentifierExtractor[] = [
  extractShopifyHandleIdentifier,
  extractArticleNumberIdentifier,
];

function inferSupportedItemIdentifier(value: string): ItemIdentifier | null {
  for (const extractor of itemIdentifierExtractors) {
    const result = extractor(value);
    if (result) {
      return result;
    }
  }

  return null;
}

export function buildItemFromScannedValue(value: string): ScannerItem {
  const normalizedValue = normalizeScannedValue(value);
  const identifier = inferSupportedItemIdentifier(normalizedValue);

  if (!identifier) {
    return {
      id: normalizedValue,
      idType: "sku",
      itemId: normalizedValue,
      sku: normalizedValue,
      title: normalizedValue,
    };
  }

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

  if (step === "location") {
    return true;
  }

  return inferSupportedItemIdentifier(normalizedValue) !== null;
}
