/**
 * One-off migration: rewrite every stock definition of one shop so that
 *
 *   1. its location becomes the block pattern for its code  ("LC10" -> "LC%")
 *   2. its `wood_type` criterion becomes the equivalent `wood_group` one
 *      ("teak" -> "Teak", "walnut" -> "Dark")
 *
 * Both rewrites collapse definitions together, and the unique index
 * (shopId, location, itemCategory, propertiesCanonical) allows only one of
 * each. Definitions that land on the same identity are MERGED: the oldest
 * survives with its thresholds, the rest are deleted (their thresholds cascade).
 *
 * A merge whose members carry DIFFERENT thresholds would silently discard one
 * of them, so the script refuses instead: it reports every such group and
 * writes nothing. Resolve those by hand and re-run. `FORCE_THRESHOLDS=1`
 * overrides, keeping the oldest member's thresholds.
 *
 * Counts are NOT recomputed here. Run the reallocation afterwards:
 *   SHOP_ID=<shop_id> npx tsx scripts/rebuild-location-stock.ts
 *
 * Usage (dry run is the DEFAULT — nothing is written without APPLY=1):
 *   SHOP_ID=<shop_id> npx tsx scripts/convert-location-stock-definitions.ts
 *   APPLY=1 SHOP_ID=<shop_id> npx tsx scripts/convert-location-stock-definitions.ts
 *
 * Refuses the configured development database unless
 * ALLOW_CONFIGURED_DATABASE=1 is set, exactly as the rebuild script does.
 */

import { isAbsolute, resolve } from "node:path";

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { validateStockCriteria } from "../src/modules/stock/contracts/stock.contract.js";
import { locationBlock, LOCATION_PATTERN_SUFFIX } from "../src/modules/stock/domain/location-pattern.js";
import {
  canonicalCriteriaString,
  normalizeCriteria,
  type StockCriteria,
} from "../src/modules/stock/domain/property-criteria.js";
import {
  WOOD_GROUP_KEY,
  WOOD_TYPE_KEY,
  woodGroupOfToken,
} from "../src/shared/item-properties/wood-groups.js";

const APPLY = process.env.APPLY === "1" || process.env.APPLY === "true";
const FORCE_THRESHOLDS = process.env.FORCE_THRESHOLDS === "1";
const ALLOW_CONFIGURED_DATABASE = process.env.ALLOW_CONFIGURED_DATABASE === "1";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const MIGRATION_USERNAME = "definition-migration";

const configuredDevelopmentDatabasePath = resolve(process.cwd(), "prisma/dev.db");

const databasePathFromUrl = (databaseUrl: string): string => {
  const rawPath = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length).split("?")[0] ?? ""
    : databaseUrl;
  return isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(process.cwd(), "prisma", rawPath);
};

const log = (event: string, data: Record<string, unknown>): void => {
  console.log(JSON.stringify({ event, ...data }));
};

const refuse = (reason: string, code: number): never => {
  console.log(`REFUSED ${reason}`);
  process.exitCode = code;
  throw new Error("conversion refused");
};

type Threshold = { state: string; thresholdQuantity: number };

type Definition = {
  id: string;
  location: string;
  itemCategory: string;
  properties: unknown;
  instanceCount: number;
  createdAt: Date;
  thresholds: Threshold[];
};

/** Stable across runs: the oldest wins, and the id breaks an exact tie. */
const isOlder = (candidate: Definition, incumbent: Definition): boolean =>
  candidate.createdAt.getTime() !== incumbent.createdAt.getTime()
    ? candidate.createdAt.getTime() < incumbent.createdAt.getTime()
    : candidate.id < incumbent.id;

const thresholdKey = (definition: Definition): string =>
  JSON.stringify(
    definition.thresholds
      .map((threshold) => [threshold.state, threshold.thresholdQuantity])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
  );

type WoodConversion =
  | { kind: "unchanged"; reason: string }
  | { kind: "converted"; groups: string[] }
  | { kind: "ungrouped"; values: string[] };

/**
 * A criterion converts only when EVERY wood it names has a group. Converting a
 * partial one would quietly drop the woods that have none, narrowing what the
 * definition catches with nothing on screen to say so.
 */
const convertWood = (properties: Record<string, unknown>): WoodConversion => {
  const wood = properties[WOOD_TYPE_KEY];
  if (wood === undefined) {
    return { kind: "unchanged", reason: "no wood_type criterion" };
  }
  if (wood === null) {
    // "Any wood type" names no wood, so there is nothing to group.
    return { kind: "unchanged", reason: "wood_type is the Any wildcard" };
  }

  const values = (Array.isArray(wood) ? wood : [wood]).map(String);
  const groups = new Set<string>();
  const ungrouped: string[] = [];
  for (const value of values) {
    const group = woodGroupOfToken(value);
    if (group === null) {
      ungrouped.push(value);
    } else {
      groups.add(group);
    }
  }

  if (ungrouped.length > 0) {
    return { kind: "ungrouped", values: ungrouped };
  }
  return { kind: "converted", groups: [...groups].sort() };
};

type Planned = {
  definition: Definition;
  nextLocation: string;
  nextProperties: StockCriteria;
  nextCanonical: string;
  locationNote: string;
  woodNote: string;
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    refuse("DATABASE_URL is unset or empty", 3);
    return;
  }
  if (
    databasePathFromUrl(databaseUrl) === configuredDevelopmentDatabasePath &&
    !ALLOW_CONFIGURED_DATABASE
  ) {
    refuse(
      `DATABASE_URL resolves to the configured development database (${configuredDevelopmentDatabasePath}); set ALLOW_CONFIGURED_DATABASE=1 to proceed`,
      3,
    );
    return;
  }
  if (!SHOP_ID) {
    throw new Error("SHOP_ID must be set for definition conversion");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true },
  });
  if (!shop) {
    throw new Error(`Shop not found: ${SHOP_ID}`);
  }

  const definitions: Definition[] = await prisma.locationStock.findMany({
    where: { shopId: SHOP_ID },
    select: {
      id: true,
      location: true,
      itemCategory: true,
      properties: true,
      instanceCount: true,
      createdAt: true,
      thresholds: { select: { state: true, thresholdQuantity: true } },
    },
  });

  log("definition-conversion-start", {
    shopId: SHOP_ID,
    apply: APPLY,
    definitions: definitions.length,
  });

  const planned: Planned[] = [];
  const skipped: Record<string, unknown>[] = [];

  for (const definition of definitions) {
    const properties =
      typeof definition.properties === "object" &&
      definition.properties !== null &&
      !Array.isArray(definition.properties)
        ? (definition.properties as Record<string, unknown>)
        : {};

    const block = locationBlock(definition.location);
    const nextLocation =
      block === null ? definition.location : `${block}${LOCATION_PATTERN_SUFFIX}`;
    const locationNote =
      block === null
        ? `location kept (${definition.location} has no block/number split, or is already a pattern)`
        : `${definition.location} -> ${nextLocation}`;

    const wood = convertWood(properties);
    if (wood.kind === "ungrouped") {
      // Reported, never converted: see convertWood.
      skipped.push({
        id: definition.id,
        location: definition.location,
        itemCategory: definition.itemCategory,
        reason: `wood_type values belong to no group: ${wood.values.join(", ")}`,
      });
      continue;
    }

    const rawNext =
      wood.kind === "converted"
        ? (() => {
            const { [WOOD_TYPE_KEY]: _removed, ...rest } = properties;
            return { ...rest, [WOOD_GROUP_KEY]: wood.groups };
          })()
        : properties;

    let nextProperties: StockCriteria;
    try {
      // The same validation the API applies, so the migration can never write a
      // criteria set the wizard would refuse to save or edit.
      nextProperties = validateStockCriteria(
        definition.itemCategory,
        rawNext as never,
      );
    } catch (error) {
      skipped.push({
        id: definition.id,
        location: definition.location,
        itemCategory: definition.itemCategory,
        reason: `converted criteria failed validation: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    planned.push({
      definition,
      nextLocation,
      nextProperties: normalizeCriteria(nextProperties as never),
      nextCanonical: canonicalCriteriaString(nextProperties),
      locationNote,
      woodNote:
        wood.kind === "converted"
          ? `wood_type -> wood_group: ${wood.groups.join(", ")}`
          : `wood unchanged (${wood.reason})`,
    });
  }

  // Bucket by the identity the unique index enforces.
  const buckets = new Map<string, Planned[]>();
  for (const entry of planned) {
    const key = JSON.stringify([
      entry.nextLocation,
      entry.definition.itemCategory,
      entry.nextCanonical,
    ]);
    buckets.set(key, [...(buckets.get(key) ?? []), entry]);
  }

  const merges = [...buckets.values()].filter((group) => group.length > 1);
  const conflicts = merges.filter(
    (group) => new Set(group.map((entry) => thresholdKey(entry.definition))).size > 1,
  );

  for (const group of merges) {
    const survivor = group.reduce((best, entry) =>
      isOlder(entry.definition, best.definition) ? entry : best,
    );
    log("definition-merge", {
      into: {
        location: survivor.nextLocation,
        itemCategory: survivor.definition.itemCategory,
        properties: survivor.nextCanonical,
      },
      keeping: { id: survivor.definition.id, from: survivor.definition.location },
      deleting: group
        .filter((entry) => entry !== survivor)
        .map((entry) => ({
          id: entry.definition.id,
          from: entry.definition.location,
          instanceCount: entry.definition.instanceCount,
        })),
      distinctThresholdSets: new Set(
        group.map((entry) => thresholdKey(entry.definition)),
      ).size,
    });
  }

  for (const entry of skipped) {
    log("definition-skipped", entry);
  }

  log("definition-conversion-plan", {
    shopId: SHOP_ID,
    definitions: definitions.length,
    planned: planned.length,
    skipped: skipped.length,
    definitionsAfter: buckets.size,
    mergeGroups: merges.length,
    rowsDeleted: planned.length - buckets.size,
    mergeGroupsWithConflictingThresholds: conflicts.length,
  });

  if (conflicts.length > 0 && !FORCE_THRESHOLDS) {
    for (const group of conflicts) {
      log("definition-threshold-conflict", {
        location: group[0]?.nextLocation,
        itemCategory: group[0]?.definition.itemCategory,
        properties: group[0]?.nextCanonical,
        members: group.map((entry) => ({
          id: entry.definition.id,
          from: entry.definition.location,
          thresholds: entry.definition.thresholds,
        })),
      });
    }
    refuse(
      `${conflicts.length} merge group(s) hold definitions with different thresholds; nothing was written. Resolve them, or set FORCE_THRESHOLDS=1 to keep the oldest member's thresholds`,
      4,
    );
    return;
  }

  if (!APPLY) {
    log("definition-conversion-complete", {
      shopId: SHOP_ID,
      apply: false,
      writes: 0,
      note: "dry run; re-run with APPLY=1 to write, then run rebuild-location-stock.ts",
    });
    return;
  }

  let updated = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    // Losers first: a survivor moving onto the identity a loser still holds
    // would otherwise trip the unique index mid-transaction.
    for (const group of buckets.values()) {
      const survivor = group.reduce((best, entry) =>
        isOlder(entry.definition, best.definition) ? entry : best,
      );
      for (const entry of group) {
        if (entry === survivor) {
          continue;
        }
        await tx.locationStock.delete({ where: { id: entry.definition.id } });
        deleted += 1;
      }
    }

    for (const group of buckets.values()) {
      const survivor = group.reduce((best, entry) =>
        isOlder(entry.definition, best.definition) ? entry : best,
      );
      await tx.locationStock.update({
        where: { id: survivor.definition.id },
        data: {
          location: survivor.nextLocation,
          properties: survivor.nextProperties,
          propertiesCanonical: survivor.nextCanonical,
          updatedByUsername: MIGRATION_USERNAME,
        },
      });
      updated += 1;
    }
  });

  log("definition-conversion-complete", {
    shopId: SHOP_ID,
    apply: true,
    updated,
    deleted,
    definitionsAfter: buckets.size,
    next: `SHOP_ID=${SHOP_ID} npx tsx scripts/rebuild-location-stock.ts`,
  });
};

void main()
  .catch((error: unknown) => {
    if (process.exitCode === 3 || process.exitCode === 4) {
      return;
    }
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
