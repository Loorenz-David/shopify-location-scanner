/** Read-only inventory before the material_type backfill.
 * Usage: SHOP_ID=<shop_id> npx tsx scripts/report-material-type-aliases.ts
 */
import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { orderedPropertyTokens } from "../src/modules/stock/domain/property-criteria.js";
import { woodGroupOfToken } from "../src/shared/item-properties/wood-groups.js";

const shopId = process.env.SHOP_ID?.trim();

const main = async (): Promise<void> => {
  if (!shopId) {
    throw new Error("SHOP_ID must be set for material_type reporting");
  }

  const rows = await prisma.scanHistory.findMany({
    where: { shopId },
    select: { itemCategory: true, properties: true },
  });
  const counts = new Map<string, { category: string | null; value: string; count: number; woodGroup: string | null }>();

  for (const row of rows) {
    const properties = row.properties;
    if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
      continue;
    }
    if (!("material_type" in properties) || "wood_type" in properties) {
      continue;
    }
    const value = properties.material_type;
    if (typeof value !== "string") {
      continue;
    }
    const category = row.itemCategory;
    const key = JSON.stringify([category, value]);
    const firstToken = orderedPropertyTokens(value)[0];
    const woodGroup = firstToken === undefined ? null : woodGroupOfToken(firstToken);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { category, value, count: 1, woodGroup });
    }
  }

  for (const entry of [...counts.values()].sort((a, b) =>
    (a.category ?? "").localeCompare(b.category ?? "") || a.value.localeCompare(b.value),
  )) {
    console.log(JSON.stringify({ event: "material-type-without-wood-type", ...entry }));
  }
  console.log(JSON.stringify({
    event: "material-type-alias-summary",
    shopId,
    scannedRows: rows.length,
    affectedRows: [...counts.values()].reduce((sum, entry) => sum + entry.count, 0),
    rowsDerivingWoodGroup: [...counts.values()].reduce((sum, entry) => sum + (entry.woodGroup ? entry.count : 0), 0),
    nonWoodValues: [...new Set([...counts.values()].filter((entry) => !entry.woodGroup).map((entry) => entry.value))].sort(),
  }));
};

void main()
  .catch((error: unknown) => {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
