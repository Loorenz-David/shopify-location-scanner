import type { Prisma } from "@prisma/client";

import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  StatsItem,
  StatsItemsFilters,
  StatsItemsPage,
  StatsItemsSort,
} from "../domain/stats-items.domain.js";

const PAGE_SIZE = 50;

/**
 * When sorting by a derived column (lastKnownPrice, timeToSell) we cannot
 * push the sort into SQL without a raw query. Instead we fetch up to this many
 * records from the filtered set, sort in application memory, then paginate.
 *
 * This is correct for filtered datasets. If a global sort across the full
 * unfiltered table is ever needed, denormalise lastKnownPrice (Float?) and
 * timeToSellSeconds (Int?) onto ScanHistory and switch back to SQL ORDER BY.
 */
const APP_SORT_MAX = 2_000;

// ---------------------------------------------------------------------------
// WHERE builder
// ---------------------------------------------------------------------------

function buildWhere(
  shopId: string,
  filters: StatsItemsFilters,
): Prisma.ScanHistoryWhereInput {
  const and: Prisma.ScanHistoryWhereInput[] = [{ shopId }];

  if (filters.from ?? filters.to) {
    and.push({
      lastModifiedAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }

  if (typeof filters.isSold === "boolean") {
    and.push({ isSold: filters.isSold });
  }

  if (filters.latestLocation) {
    const loc = filters.latestLocation;
    const levelMatch = /^(.+):(\d+)$/.exec(loc);

    if (!levelMatch) {
      // Zone-level query ("H1"): match bare "H1" AND any "H1:N" levels.
      and.push({
        OR: [
          { latestLocation: loc },
          { latestLocation: { startsWith: `${loc}:` } },
        ],
      });
    } else if (levelMatch[2] === "1") {
      // Level-1 query ("H1:1"): match exact "H1:1" OR bare "H1" (implicit level 1).
      and.push({
        OR: [
          { latestLocation: loc },
          { latestLocation: levelMatch[1] as string },
        ],
      });
    } else {
      // Specific level query ("H1:2"): exact match only.
      and.push({ latestLocation: loc });
    }
  }

  if (filters.itemCategory) {
    and.push({ itemCategory: filters.itemCategory });
  }

  if (filters.lastSoldChannel) {
    and.push({
      lastSoldChannel: filters.lastSoldChannel as Prisma.EnumSalesChannelFilter,
    });
  }

  if (filters.heightMin !== undefined || filters.heightMax !== undefined) {
    and.push({
      itemHeight: {
        ...(filters.heightMin !== undefined ? { gte: filters.heightMin } : {}),
        ...(filters.heightMax !== undefined ? { lte: filters.heightMax } : {}),
      },
    });
  }

  if (filters.widthMin !== undefined || filters.widthMax !== undefined) {
    and.push({
      itemWidth: {
        ...(filters.widthMin !== undefined ? { gte: filters.widthMin } : {}),
        ...(filters.widthMax !== undefined ? { lte: filters.widthMax } : {}),
      },
    });
  }

  if (filters.depthMin !== undefined || filters.depthMax !== undefined) {
    and.push({
      itemDepth: {
        ...(filters.depthMin !== undefined ? { gte: filters.depthMin } : {}),
        ...(filters.depthMax !== undefined ? { lte: filters.depthMax } : {}),
      },
    });
  }

  if (filters.volumeMin !== undefined || filters.volumeMax !== undefined) {
    and.push({
      volume: {
        ...(filters.volumeMin !== undefined ? { gte: filters.volumeMin } : {}),
        ...(filters.volumeMax !== undefined
          ? { lt: filters.volumeMax }
          : {}),
      },
    });
  }

  return { AND: and };
}

// ---------------------------------------------------------------------------
// Include: only what the serializer needs
// ---------------------------------------------------------------------------

const PRICE_INCLUDE = {
  priceHistory: {
    orderBy: { happenedAt: "desc" as const },
    take: 1,
    select: { price: true },
  },
} satisfies Prisma.ScanHistoryInclude;

// ---------------------------------------------------------------------------
// Domain mapping
// ---------------------------------------------------------------------------

function toDomain(record: any): StatsItem {
  const lastKnownPrice: string | null =
    record.priceHistory?.[0]?.price ?? null;

  // For correction/backfill records, lastModifiedAt (= Shopify order processed_at)
  // can predate createdAt (= when the DB row was inserted). A negative duration
  // is meaningless, so return null — the item was never scanned before the sale.
  const rawTimeToSell = record.isSold
    ? Math.round((record.lastModifiedAt.getTime() - record.createdAt.getTime()) / 1000)
    : null;
  const timeToSellSeconds = rawTimeToSell !== null && rawTimeToSell > 0 ? rawTimeToSell : null;

  return {
    id: record.id,
    username: record.username,
    itemImageUrl: record.itemImageUrl ?? null,
    itemCategory: record.itemCategory ?? null,
    itemSku: record.itemSku ?? null,
    itemTitle: record.itemTitle,
    itemHeight: record.itemHeight ?? null,
    itemWidth: record.itemWidth ?? null,
    itemDepth: record.itemDepth ?? null,
    volume: record.volume ?? null,
    quantity: record.quantity ?? 1,
    latestLocation: record.latestLocation ?? null,
    isSold: record.isSold,
    lastSoldChannel: record.lastSoldChannel ?? null,
    orderId: record.orderId ?? null,
    orderNumber: record.orderNumber ?? null,
    intention: record.intention ?? null,
    fixItem: record.fixItem ?? null,
    lastKnownPrice,
    timeToSellSeconds,
    lastModifiedAt: record.lastModifiedAt,
    createdAt: record.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Time-of-day / day-of-week post-filter
// ---------------------------------------------------------------------------

function matchesTimeFilter(item: StatsItem, filters: StatsItemsFilters): boolean {
  // SQLite strftime operates in UTC, so we match against UTC hour/weekday here.
  if (filters.hourOfDay !== undefined) {
    if (new Date(item.lastModifiedAt).getUTCHours() !== filters.hourOfDay) return false;
  }
  if (filters.weekday !== undefined) {
    if (new Date(item.lastModifiedAt).getUTCDay() !== filters.weekday) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// App-level sort comparators
// ---------------------------------------------------------------------------

function compareByPrice(a: StatsItem, b: StatsItem, dir: "asc" | "desc"): number {
  const parse = (p: string | null) =>
    p ? parseFloat(p.replace(/,/g, "")) : -1;
  const diff = parse(a.lastKnownPrice) - parse(b.lastKnownPrice);
  return dir === "asc" ? diff : -diff;
}

function compareByTimeToSell(a: StatsItem, b: StatsItem, dir: "asc" | "desc"): number {
  const diff = (a.timeToSellSeconds ?? -1) - (b.timeToSellSeconds ?? -1);
  return dir === "asc" ? diff : -diff;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const statsItemsRepository = {
  async findItems(input: {
    shopId: string;
    filters: StatsItemsFilters;
    sort: StatsItemsSort;
    groupByOrder: boolean;
    page: number;
  }): Promise<StatsItemsPage> {
    const where = buildWhere(input.shopId, input.filters);
    const skip = (input.page - 1) * PAGE_SIZE;
    const hasTimeFilter =
      input.filters.hourOfDay !== undefined || input.filters.weekday !== undefined;

    // ------------------------------------------------------------------
    // Fast path: timeInStock — unsold items first (isSold ASC), then oldest
    // createdAt first within each group (longest in stock at the top).
    // Sold items naturally fall to the bottom. Pure SQL, no app-level sort.
    // Time filters (hourOfDay/weekday) force the app-level path below.
    // ------------------------------------------------------------------
    if (input.sort.sortBy === "timeInStock" && !hasTimeFilter) {
      const orderBy: Prisma.ScanHistoryOrderByWithRelationInput[] = [
        { isSold: "asc" },          // unsold (false=0) before sold (true=1)
        { createdAt: input.sort.sortDir }, // asc = longest in stock first
      ];

      const [total, records] = await Promise.all([
        prisma.scanHistory.count({ where }),
        prisma.scanHistory.findMany({
          where,
          orderBy,
          skip,
          take: PAGE_SIZE,
          include: PRICE_INCLUDE,
        }),
      ]);

      return { items: records.map(toDomain), total, page: input.page, pageSize: PAGE_SIZE };
    }

    // ------------------------------------------------------------------
    // Fast path: lastModifiedAt is a real column → full SQL sort + pagination
    // Time filters (hourOfDay/weekday) force the app-level path below.
    // ------------------------------------------------------------------
    if (input.sort.sortBy === "lastModifiedAt" && !hasTimeFilter) {
      const orderBy: Prisma.ScanHistoryOrderByWithRelationInput[] = [];

      if (input.groupByOrder) {
        // DESC puts non-null orderId values first (SQLite treats NULL < everything),
        // naturally clustering items from the same order before orphan items.
        orderBy.push({ orderId: "desc" });
      }

      orderBy.push({ lastModifiedAt: input.sort.sortDir });

      const [total, records] = await Promise.all([
        prisma.scanHistory.count({ where }),
        prisma.scanHistory.findMany({
          where,
          orderBy,
          skip,
          take: PAGE_SIZE,
          include: PRICE_INCLUDE,
        }),
      ]);

      return { items: records.map(toDomain), total, page: input.page, pageSize: PAGE_SIZE };
    }

    // ------------------------------------------------------------------
    // Derived-column sort: fetch up to APP_SORT_MAX, sort in memory, paginate.
    // ------------------------------------------------------------------
    const [total, allRecords] = await Promise.all([
      prisma.scanHistory.count({ where }),
      prisma.scanHistory.findMany({
        where,
        orderBy: { lastModifiedAt: "desc" }, // stable tiebreaker
        take: APP_SORT_MAX,
        include: PRICE_INCLUDE,
      }),
    ]);

    const allItemsRaw = allRecords.map(toDomain);
    const allItems = hasTimeFilter
      ? allItemsRaw.filter((item) => matchesTimeFilter(item, input.filters))
      : allItemsRaw;

    const comparator =
      input.sort.sortBy === "lastKnownPrice"
        ? (a: StatsItem, b: StatsItem) => compareByPrice(a, b, input.sort.sortDir)
        : (a: StatsItem, b: StatsItem) => compareByTimeToSell(a, b, input.sort.sortDir);

    allItems.sort(comparator);

    if (input.groupByOrder) {
      // Stable secondary group: keep same-order items together after the
      // primary sort by placing them in orderId-grouped order within each page.
      allItems.sort((a, b) => {
        if (a.orderId === b.orderId) return 0;
        if (a.orderId === null) return 1;
        if (b.orderId === null) return -1;
        return b.orderId.localeCompare(a.orderId);
      });
    }

    const paginated = allItems.slice(skip, skip + PAGE_SIZE);
    // Report the real total count; note that only APP_SORT_MAX records are sortable.
    const reportedTotal = Math.min(total, APP_SORT_MAX);

    return { items: paginated, total: reportedTotal, page: input.page, pageSize: PAGE_SIZE };
  },
};
