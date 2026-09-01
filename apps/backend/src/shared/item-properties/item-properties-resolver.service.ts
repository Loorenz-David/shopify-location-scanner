import { logger } from "../logging/logger.js";
import { capProperties, type ItemProperties } from "./item-properties.js";
import {
  fetchPurchaseApiItemAttributes,
  isPurchaseApiConfigured,
} from "./purchase-api.integration.js";

/**
 * The single producer of a write-ready `ScanHistory.properties` value.
 *
 * Every path that writes properties resolves through here so the merge rules
 * live in one place: Shopify metafields are authoritative, purchase-API
 * attributes fill in around them, and a purchase-API outage never blocks the
 * Shopify half from being stored.
 */

type CacheEntry = {
  attributes: ItemProperties;
  expiresAt: number;
};

const POSITIVE_TTL_MS = 15 * 60 * 1000;
/** Short, so an item the purchase app has only just published shows up soon. */
const EMPTY_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

// Per-process: the API server and each worker keep their own. This is a
// latency/quota optimisation, never a correctness mechanism.
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ItemProperties | null>>();

const readCache = (
  articleNumber: string,
): { attributes: ItemProperties; stale: boolean } | null => {
  const entry = cache.get(articleNumber);
  if (!entry) {
    return null;
  }

  return { attributes: entry.attributes, stale: entry.expiresAt <= Date.now() };
};

const writeCache = (articleNumber: string, attributes: ItemProperties): void => {
  // Expired entries are kept, not deleted: they are the fallback when a later
  // lookup fails. Eviction is by size only, oldest first.
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  const ttl =
    Object.keys(attributes).length > 0 ? POSITIVE_TTL_MS : EMPTY_TTL_MS;
  cache.delete(articleNumber);
  cache.set(articleNumber, { attributes, expiresAt: Date.now() + ttl });
};

/** Returns the attributes, or `null` when the purchase API could not answer. */
const lookupAttributes = async (
  articleNumber: string,
): Promise<ItemProperties | null> => {
  const cached = readCache(articleNumber);
  if (cached && !cached.stale) {
    return cached.attributes;
  }

  const pending = inFlight.get(articleNumber);
  if (pending) {
    return pending;
  }

  const request = (async (): Promise<ItemProperties | null> => {
    const result = await fetchPurchaseApiItemAttributes(articleNumber);

    if (result.status === "resolved") {
      writeCache(articleNumber, result.attributes);
      return result.attributes;
    }

    // Failures are never cached. A stale entry for the same article number is
    // better than dropping the attributes entirely.
    if (cached) {
      logger.info("Purchase API lookup failed; using stale cached attributes", {
        articleNumber,
        reason: result.reason,
      });
      return cached.attributes;
    }

    return null;
  })().finally(() => {
    inFlight.delete(articleNumber);
  });

  inFlight.set(articleNumber, request);
  return request;
};

export const itemPropertiesResolver = {
  /**
   * Builds the complete properties bag for a resolved Shopify product.
   *
   * @returns `null` when the snapshot never fetched metafields — the caller
   * must leave the stored properties untouched. Otherwise the authoritative
   * set to write (possibly `{}`, which clears the column).
   */
  async resolve(input: {
    metafieldProperties: ItemProperties | null;
    articleNumber: string | null;
  }): Promise<ItemProperties | null> {
    if (input.metafieldProperties === null) {
      return null;
    }

    const articleNumber = input.articleNumber?.trim() || null;
    if (!articleNumber || !isPurchaseApiConfigured()) {
      return capProperties(input.metafieldProperties);
    }

    const attributes = await lookupAttributes(articleNumber);
    if (attributes === null) {
      // The purchase API is down. Storing the Shopify half alone is the
      // accepted trade: the item's purchase attributes come back on its next
      // successful sync, and a Shopify metafield edit is never held hostage to
      // an outage in another service.
      logger.warn(
        "Storing Shopify properties without purchase API attributes",
        { articleNumber },
      );
      return capProperties(input.metafieldProperties);
    }

    // Shopify wins collisions: the shop's own edit beats the upstream
    // catalogue. Collisions are expected to be vanishingly rare.
    for (const key of Object.keys(attributes)) {
      if (key in input.metafieldProperties) {
        logger.info("Shopify metafield overrides a purchase API attribute", {
          articleNumber,
          key,
        });
      }
    }

    return capProperties({ ...attributes, ...input.metafieldProperties });
  },

  /**
   * Warms the cache for an article number without blocking. Used on the scan
   * path, where the barcode is known from the pre-update product fetch and the
   * lookup can overlap the Shopify mutation.
   */
  prefetch(articleNumber: string | null): void {
    const normalized = articleNumber?.trim();
    if (!normalized || !isPurchaseApiConfigured()) {
      return;
    }

    void lookupAttributes(normalized).catch((error: unknown) => {
      logger.warn("Purchase API prefetch failed", {
        articleNumber: normalized,
        error: error instanceof Error ? error.message : "unknown",
      });
    });
  },
};
