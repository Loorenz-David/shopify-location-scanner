/**
 * Image resolution optimization
 *
 * Serves different image sizes based on context:
 * - Card thumbnails: 128px (minimal bandwidth, good enough for small viewport)
 * - Full-screen carousel: 1200px (preserve aspect ratio for inspection)
 *
 * Currently supports:
 * - Shopify CDN: Uses square crop for thumbnails, width-only for fullscreen
 * - Plain URLs: Returns as-is (no transformation)
 *
 * To add support for another CDN:
 * 1. Add detection logic in `getImageTransformUrl()`
 * 2. Add URL building logic in respective branch
 */

export type ImageResolution = "thumbnail" | "fullscreen";

const RESOLUTION_CONFIG: Record<ImageResolution, number> = {
  thumbnail: 128, // Small card thumbnails
  fullscreen: 1200, // Full-screen carousel, uncropped
};

/**
 * Detects the image CDN and transforms URL for the target resolution
 */
export function getImageTransformUrl(
  imageUrl: string,
  resolution: ImageResolution,
): string {
  if (!imageUrl) return imageUrl;

  const targetWidth = RESOLUTION_CONFIG[resolution];

  // Shopify CDN detection (cdn.shopify.com)
  if (imageUrl.includes("cdn.shopify.com")) {
    return applyShopifyTransform(imageUrl, targetWidth, resolution);
  }

  // For other CDNs or plain URLs, return as-is
  // Add more CDN detection branches here as needed
  return imageUrl;
}

/**
 * Applies Shopify CDN image transformation
 * Shopify supports width/height/crop query params for responsive images.
 */
function applyShopifyTransform(
  imageUrl: string,
  width: number,
  resolution: ImageResolution,
): string {
  const url = new URL(imageUrl);

  url.searchParams.set("width", String(width));

  if (resolution === "thumbnail") {
    url.searchParams.set("height", String(width));
    url.searchParams.set("crop", "center");
  } else {
    url.searchParams.delete("height");
    url.searchParams.delete("crop");
  }

  return url.toString();
}

/**
 * Get thumbnail version of image URL (small, optimized for cards)
 */
export function getThumbnailImageUrl(imageUrl: string): string {
  return getImageTransformUrl(imageUrl, "thumbnail");
}

/**
 * Get high-resolution version of image URL (full-screen carousel)
 */
export function getFullscreenImageUrl(imageUrl: string): string {
  return getImageTransformUrl(imageUrl, "fullscreen");
}
