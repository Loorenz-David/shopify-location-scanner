/**
 * Parse comma-separated image URLs from a single string field.
 * Handles whitespace and filters out empty strings.
 */
export function parseImageUrls(commaSeparatedString) {
    if (!commaSeparatedString) {
        return [];
    }
    return commaSeparatedString
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
}
export function normalizeImageUrls(value) {
    if (Array.isArray(value)) {
        return value.map((url) => url.trim()).filter((url) => url.length > 0);
    }
    return parseImageUrls(value);
}
/**
 * Get the first image URL from a comma-separated string.
 */
export function getFirstImageUrl(commaSeparatedString) {
    const urls = parseImageUrls(commaSeparatedString);
    return urls[0] ?? null;
}
/**
 * Check if a comma-separated string contains multiple images.
 */
export function hasMultipleImages(commaSeparatedString) {
    return parseImageUrls(commaSeparatedString).length > 1;
}
