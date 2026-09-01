import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";
import type { ItemProperties } from "./item-properties.js";

/**
 * Client for the Beyo Vintage purchase API's item lookup, used to enrich
 * `ScanHistory.properties` with attributes the Shopify product does not carry.
 *
 * Port of the Python reference
 * (`app/beyo_manager/services/queries/items/lookup/purchase_api.py`), scoped to
 * `data.attributes` — category, price, images and quantity are deliberately out
 * of scope here.
 */

export type PurchaseApiLookupResult =
  /** The API answered. `attributes` is the complete set — `{}` means the API
   * knows the article number has no attributes, or does not know it at all. */
  | { status: "resolved"; attributes: ItemProperties }
  /** The API could not be reached or refused. The caller must NOT treat this as
   * "no attributes" — it knows nothing. */
  | { status: "unknown"; reason: string };

type PurchaseApiEnvelope = {
  success?: boolean;
  data?: { attributes?: unknown } | null;
  error?: unknown;
};

export const isPurchaseApiConfigured = (): boolean =>
  Boolean(env.BEYO_VINTAGE_API_KEY);

const hasAttributesPayload = (raw: unknown): boolean => {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed !== "" && trimmed !== "[]";
  }

  if (Array.isArray(raw)) {
    return raw.length > 0;
  }

  return raw !== null && raw !== undefined;
};

/** The column is string-only, so scalars are stringified and structured values
 * keep their JSON form — the same convention list metafields use. */
const toPropertyValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

/**
 * `data.attributes` arrives as a JSON-encoded array of
 * `{ key, label, value }`. `label` is display text owned by the purchase app
 * and is deliberately dropped — folding it in would let a cosmetic rename
 * upstream change what we store.
 *
 * A malformed blob costs its attributes, never the whole lookup.
 */
export const parsePurchaseApiAttributes = (raw: unknown): ItemProperties => {
  if (!hasAttributesPayload(raw)) {
    return {};
  }

  let decoded: unknown = raw;
  if (typeof raw === "string") {
    try {
      decoded = JSON.parse(raw);
    } catch {
      logger.warn("Purchase API sent attributes that are not valid JSON", {
        rawValue: raw.slice(0, 200),
      });
      return {};
    }
  }

  if (!Array.isArray(decoded)) {
    logger.warn("Purchase API sent attributes that are not a list", {
      decodedType: typeof decoded,
    });
    return {};
  }

  const attributes: ItemProperties = {};
  for (const entry of decoded) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      logger.warn("Skipping a non-object purchase API attributes entry");
      continue;
    }

    const record = entry as Record<string, unknown>;
    const key = String(record.key ?? "").trim();
    if (!key) {
      logger.warn("Skipping a purchase API attributes entry with no key");
      continue;
    }

    if (key in attributes) {
      logger.warn(
        "Skipping a duplicate purchase API attributes key; keeping the first value",
        { key },
      );
      continue;
    }

    const value = toPropertyValue(record.value);
    if (value === null) {
      continue;
    }

    attributes[key] = value;
  }

  return attributes;
};

export const fetchPurchaseApiItemAttributes = async (
  articleNumber: string,
): Promise<PurchaseApiLookupResult> => {
  const apiKey = env.BEYO_VINTAGE_API_KEY;
  if (!apiKey) {
    return { status: "resolved", attributes: {} };
  }

  const url = new URL(
    `/api/partner/items/${encodeURIComponent(articleNumber)}`,
    env.BEYO_VINTAGE_API_URL,
  ).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Partner-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(env.BEYO_VINTAGE_API_TIMEOUT_MS),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    logger.warn("Purchase API item lookup network error", {
      articleNumber,
      timeoutMs: env.BEYO_VINTAGE_API_TIMEOUT_MS,
      error: message,
    });
    return { status: "unknown", reason: `network: ${message}` };
  }

  // 404/400 are answers, not failures: the article number is unknown to the
  // purchase app, which means "no attributes".
  if (response.status === 404 || response.status === 400) {
    return { status: "resolved", attributes: {} };
  }

  if (response.status === 401 || response.status === 403) {
    logger.error("Purchase API rejected the partner key", {
      articleNumber,
      status: response.status,
    });
    return { status: "unknown", reason: `auth: ${response.status}` };
  }

  if (!response.ok) {
    logger.warn("Purchase API item lookup failed", {
      articleNumber,
      status: response.status,
    });
    return { status: "unknown", reason: `http: ${response.status}` };
  }

  let body: PurchaseApiEnvelope;
  try {
    body = (await response.json()) as PurchaseApiEnvelope;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    logger.warn("Purchase API sent a body that is not JSON", {
      articleNumber,
      error: message,
    });
    return { status: "unknown", reason: `body: ${message}` };
  }

  if (body.success !== true || !body.data) {
    logger.info("Purchase API reported no usable item data", {
      articleNumber,
      error: typeof body.error === "string" ? body.error : null,
    });
    return { status: "resolved", attributes: {} };
  }

  return {
    status: "resolved",
    attributes: parsePurchaseApiAttributes(body.data.attributes),
  };
};
