/**
 * Report stored ScanHistory property values that are outside the configured
 * item-property vocabulary.
 *
 * Usage:
 *   SHOP_ID=<shop_id> npx tsx scripts/report-stock-property-drift.ts
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { tokenizePropertyValue } from "../src/modules/stock/domain/property-criteria.js";
import { ITEM_PROPERTY_OPTIONS } from "../src/shared/item-properties/item-property-options.js";

const SHOP_ID = process.env.SHOP_ID?.trim() || null;

const log = (event: string, data: Record<string, unknown>): void => {
  console.log(JSON.stringify({ event, ...data }));
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const main = async (): Promise<void> => {
  if (!SHOP_ID) {
    throw new Error("SHOP_ID must be set for property drift reporting");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true },
  });
  if (!shop) {
    throw new Error(`Shop not found: ${SHOP_ID}`);
  }

  const rows = await prisma.scanHistory.findMany({
    where: { shopId: SHOP_ID },
    select: { properties: true },
  });

  const allowedTokens = new Map<string, Set<string>>(
    ITEM_PROPERTY_OPTIONS.map((option) => [
      option.key,
      new Set(option.values.flatMap((value) => [...tokenizePropertyValue(value)])),
    ]),
  );
  const observedCounts = new Map<string, number>();
  const driftCounts = new Map<string, number>();

  for (const row of rows) {
    if (!isObject(row.properties)) {
      continue;
    }

    for (const [key, allowed] of allowedTokens) {
      const storedValue = row.properties[key];
      if (typeof storedValue !== "string") {
        continue;
      }

      const tokens = tokenizePropertyValue(storedValue);
      if (tokens.size > 0) {
        observedCounts.set(key, (observedCounts.get(key) ?? 0) + 1);
      }

      for (const token of tokens) {
        if (!allowed.has(token)) {
          const driftKey = `${key}\u0000${token}`;
          driftCounts.set(driftKey, (driftCounts.get(driftKey) ?? 0) + 1);
        }
      }
    }
  }

  log("property-drift-report", {
    shopId: SHOP_ID,
    scanHistoryRows: rows.length,
    configuredKeys: ITEM_PROPERTY_OPTIONS.length,
  });

  for (const [driftKey, count] of [...driftCounts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const separator = driftKey.indexOf("\u0000");
    log("property-value-drift", {
      key: driftKey.slice(0, separator),
      token: driftKey.slice(separator + 1),
      count,
    });
  }

  let unobservedKeys = 0;
  for (const option of ITEM_PROPERTY_OPTIONS) {
    const observedCount = observedCounts.get(option.key) ?? 0;
    if (observedCount > 0) {
      continue;
    }

    unobservedKeys += 1;
    log("property-key-unobserved", {
      key: option.key,
      observedCount,
    });
  }

  log("property-drift-summary", {
    shopId: SHOP_ID,
    scanHistoryRows: rows.length,
    driftEntries: driftCounts.size,
    unobservedKeys,
  });
};

void main()
  .catch((error: unknown) => {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
