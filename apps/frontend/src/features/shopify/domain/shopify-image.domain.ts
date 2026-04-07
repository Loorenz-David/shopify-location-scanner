interface ShopifyImageResizeOptions {
  width: number;
  height?: number;
}

const DEFAULT_SHOPIFY_IMAGE_SIZE = 160;

export function normalizeShopifyImageUrl(
  value: string | null | undefined,
  options: ShopifyImageResizeOptions = {
    width: DEFAULT_SHOPIFY_IMAGE_SIZE,
    height: DEFAULT_SHOPIFY_IMAGE_SIZE,
  },
): string | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const isShopifyCdn = parsedUrl.hostname.includes("cdn.shopify.com");

    if (!isShopifyCdn) {
      return trimmedValue;
    }

    if (!parsedUrl.searchParams.has("width")) {
      parsedUrl.searchParams.set("width", String(options.width));
    }

    if (options.height && !parsedUrl.searchParams.has("height")) {
      parsedUrl.searchParams.set("height", String(options.height));
    }

    return parsedUrl.toString();
  } catch {
    return trimmedValue;
  }
}
