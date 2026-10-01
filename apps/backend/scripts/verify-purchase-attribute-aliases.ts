/** Run with: npx tsx scripts/verify-purchase-attribute-aliases.ts */
import "../src/config/load-env.js";

import { env } from "../src/config/env.js";
import { itemPropertiesResolver } from "../src/shared/item-properties/item-properties-resolver.service.js";
import { resolveBestMatch } from "../src/modules/stock/domain/best-match.js";

if (!env.BEYO_VINTAGE_API_KEY) {
  // The resolver intentionally skips purchase lookups when no key is set.
  env.BEYO_VINTAGE_API_KEY = "verification-only";
}

const originalFetch = globalThis.fetch;
let attributes: Record<string, string> = {};
globalThis.fetch = async () =>
  new Response(JSON.stringify({
    success: true,
    data: {
      attributes: Object.entries(attributes).map(([key, value]) => ({ key, label: key, value })),
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });

let nextArticle = 0;
const resolve = async (
  purchase: Record<string, string>,
  shopify: Record<string, string> = {},
): Promise<Record<string, string>> => {
  attributes = purchase;
  const result = await itemPropertiesResolver.resolve({
    articleNumber: `alias-verification-${++nextArticle}`,
    metafieldProperties: shopify,
  });
  if (result === null) {
    throw new Error("resolver returned null");
  }
  return result;
};

const equal = (actual: unknown, expected: unknown, label: string): void => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`PASS ${label}`);
};

try {
  const teak = await resolve({ material_type: "Teak" });
  equal(teak, { material_type: "Teak", wood_type: "Teak" }, "purchase material_type fills wood_type");

  equal(
    await resolve({ material_type: "Teak" }, { wood_type: "Oak" }),
    { material_type: "Teak", wood_type: "Oak" },
    "Shopify wood_type wins",
  );
  equal(
    await resolve({ wood_type: "Walnut", material_type: "Teak" }),
    { wood_type: "Walnut", material_type: "Teak" },
    "purchase wood_type wins over purchase material_type",
  );
  const metal = await resolve({ material_type: "Metal" });
  equal(metal, { material_type: "Metal", wood_type: "Metal" }, "nonwood value is preserved");
  equal(
    resolveBestMatch([{ id: "teak", location: "LC10", createdAt: new Date(0), criteria: { wood_group: ["teak"] } }],
      { location: "LC10", properties: metal })?.id ?? null,
    null,
    "nonwood value derives no wood group",
  );
  equal(
    resolveBestMatch([{ id: "teak", location: "LC10", createdAt: new Date(0), criteria: { wood_group: ["teak"] } }],
      { location: "LC10", properties: teak })?.id ?? null,
    "teak",
    "purchase material_type matches a teak wood_group rule",
  );
  equal(
    await resolve({}, { material_type: "Teak" }),
    { material_type: "Teak" },
    "Shopify material_type alone is not aliased",
  );
  equal(
    await resolve({ material_type: "Teak, Metal" }),
    { material_type: "Teak, Metal", wood_type: "Teak, Metal" },
    "multi-value material_type is copied unchanged",
  );
} finally {
  globalThis.fetch = originalFetch;
}
