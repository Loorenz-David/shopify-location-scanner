/**
 * Rebuild all configured location-stock quantities for one shop.
 *
 * Usage:
 *   SHOP_ID=<shop_id> npx tsx scripts/rebuild-location-stock.ts
 *   DRY_RUN=1 SHOP_ID=<shop_id> npx tsx scripts/rebuild-location-stock.ts
 *
 * The script refuses the configured development database (prisma/dev.db) unless
 * ALLOW_CONFIGURED_DATABASE=1 is set explicitly — the local-only backfill path:
 *   ALLOW_CONFIGURED_DATABASE=1 SHOP_ID=<shop_id> npx tsx scripts/rebuild-location-stock.ts
 */

import { isAbsolute, resolve } from "node:path";

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { allocateGroup } from "../src/modules/stock/domain/allocation.js";
import { calculateStockState } from "../src/modules/stock/domain/stock-state.js";
import {
  locationStockRepository,
  type EligibleItem,
} from "../src/modules/stock/repositories/location-stock.repository.js";
import type { LocationStock } from "../src/modules/stock/contracts/stock.contract.js";
import { reconcileAllGroups } from "../src/modules/stock/services/stock-reconciliation.service.js";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const ALLOW_CONFIGURED_DATABASE = process.env.ALLOW_CONFIGURED_DATABASE === "1";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const configuredDevelopmentDatabasePath = resolve(process.cwd(), "prisma/dev.db");

const databasePathFromUrl = (databaseUrl: string): string => {
  const rawPath = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length).split("?")[0] ?? ""
    : databaseUrl;
  return isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(process.cwd(), "prisma", rawPath);
};

const refuseDatabase = (reason: string): never => {
  console.log(
    `REFUSED ${reason}; DATABASE_URL path is ${process.env.DATABASE_URL ?? "<unset>"}; configured development database is ${configuredDevelopmentDatabasePath}`,
  );
  process.exitCode = 3;
  throw new Error("rebuild refused");
};

const log = (event: string, data: Record<string, unknown>): void => {
  console.log(JSON.stringify({ event, ...data }));
};

type Group = {
  location: string;
  itemCategory: string;
};

type ComputedValue = {
  quantity: number;
  instanceCount: number;
  stockState: LocationStock["stockState"];
};

const groupKey = (group: Group): string =>
  JSON.stringify([group.location, group.itemCategory]);

const groupsFor = (configurations: readonly LocationStock[]): Group[] => {
  const groups = new Map<string, Group>();
  for (const configuration of configurations) {
    const group = {
      location: configuration.location,
      itemCategory: configuration.itemCategory,
    };
    groups.set(groupKey(group), group);
  }
  return [...groups.values()];
};

const computeGroup = async (
  shopId: string,
  group: Group,
  configurations: readonly LocationStock[],
): Promise<Map<string, ComputedValue>> => {
  const eligibleItems: EligibleItem[] = await locationStockRepository.listEligibleItems(
    shopId,
    group.location,
    group.itemCategory,
  );
  // Same allocation loop the reconciliation service runs (domain/allocation.ts),
  // so the dry-run preview can never disagree with what the live run writes.
  const totals = allocateGroup(
    configurations.map((configuration) => ({
      id: configuration.id,
      createdAt: configuration.createdAt,
      criteria: configuration.properties,
    })),
    eligibleItems,
  );

  return new Map(
    configurations.map((configuration) => {
      const { quantity, instanceCount } = totals.get(configuration.id) ?? {
        quantity: 0,
        instanceCount: 0,
      };
      return [
        configuration.id,
        {
          quantity,
          instanceCount,
          stockState: calculateStockState(instanceCount, configuration.thresholds),
        },
      ];
    }),
  );
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    refuseDatabase("DATABASE_URL is unset or empty");
    return;
  }

  if (databasePathFromUrl(databaseUrl) === configuredDevelopmentDatabasePath) {
    if (!ALLOW_CONFIGURED_DATABASE) {
      refuseDatabase("DATABASE_URL resolves to the configured development database");
    }
    log("location-stock-rebuild-configured-database-override", {
      databasePath: configuredDevelopmentDatabasePath,
    });
  }

  if (!SHOP_ID) {
    throw new Error("SHOP_ID must be set for location-stock rebuilding");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: SHOP_ID },
    select: { id: true },
  });
  if (!shop) {
    throw new Error(`Shop not found: ${SHOP_ID}`);
  }

  const configurations = await locationStockRepository.listByShop(SHOP_ID);
  const groups = groupsFor(configurations);
  log("location-stock-rebuild-start", {
    shopId: SHOP_ID,
    dryRun: DRY_RUN,
    configurations: configurations.length,
    groups: groups.length,
  });

  if (DRY_RUN) {
    for (const group of groups) {
      const groupConfigurations = configurations.filter(
        (configuration) =>
          configuration.location === group.location &&
          configuration.itemCategory === group.itemCategory,
      );
      const computed = await computeGroup(SHOP_ID, group, groupConfigurations);
      const deltas = groupConfigurations.map((configuration) => {
        const next = computed.get(configuration.id);
        if (!next) {
          throw new Error(`No computed value for ${configuration.id}`);
        }
        return {
          id: configuration.id,
          current: {
            quantity: configuration.quantity,
            instanceCount: configuration.instanceCount,
            stockState: configuration.stockState,
          },
          computed: next,
        };
      });
      log("location-stock-group-preview", {
        location: group.location,
        itemCategory: group.itemCategory,
        deltas,
      });
    }
    log("location-stock-rebuild-complete", {
      shopId: SHOP_ID,
      dryRun: true,
      groupsTouched: groups.length,
      writes: 0,
    });
    return;
  }

  let groupsTouched = 0;
  await reconcileAllGroups(SHOP_ID, {
    onGroupReconciled: (group) => {
      groupsTouched += 1;
      log("location-stock-group-reconciled", group);
    },
  });
  log("location-stock-rebuild-complete", {
    shopId: SHOP_ID,
    dryRun: false,
    groupsTouched,
  });
};

void main()
  .catch((error: unknown) => {
    if (process.exitCode === 3) {
      return;
    }
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
