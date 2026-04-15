import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import type { SalesChannel } from "../../../shared/sales-channel/classify-sales-channel.js";
import { startOfUtcDay } from "../../../shared/utils/date.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import type {
  AppendScanLocationHistoryInput,
  ScanHistoryStringFilterColumn,
} from "../contracts/scan-history.contract.js";
import type {
  ScanHistoryPage,
  ScanHistoryRecord,
} from "../domain/scan-history.js";
import type { Prisma } from "@prisma/client";
import { ScanHistoryEventType } from "@prisma/client";

const normalizePrice = (price?: string | null): string | null => {
  const trimmed = price?.trim();
  return trimmed ? trimmed : null;
};

const normalizeVolume = (volume?: number | null): number | null => {
  if (typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0) {
    return null;
  }

  return volume;
};

const normalizeDimension = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
};

const normalizeCategory = (category?: string | null): string => {
  const trimmed = category?.trim();
  return trimmed ? trimmed : "unknown";
};

const normalizeLocation = (location?: string | null): string | null => {
  const trimmed = location?.trim();
  return trimmed ? trimmed : null;
};

const parsePriceValue = (price?: string | null): number => {
  if (!price) {
    return 0;
  }

  const normalized = price.replace(/,/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDurationSeconds = (from: Date, to: Date): number => {
  const seconds = (to.getTime() - from.getTime()) / 1000;
  return seconds > 0 ? seconds : 0;
};

const ALL_STRING_FILTER_COLUMNS: ScanHistoryStringFilterColumn[] = [
  "username",
  "productId",
  "itemCategory",
  "itemSku",
  "itemBarcode",
  "itemType",
  "itemTitle",
  "eventUsername",
  "eventLocation",
];

const buildStringFilterConditions = (
  query: string,
  columns?: ScanHistoryStringFilterColumn[],
  options?: {
    includeLocationHistory?: boolean;
  },
): Prisma.ScanHistoryWhereInput[] => {
  const targetColumns = columns?.length ? columns : ALL_STRING_FILTER_COLUMNS;
  const eventLocationCondition: Prisma.ScanHistoryWhereInput =
    options?.includeLocationHistory
      ? {
          events: {
            some: {
              location: { contains: query },
            },
          },
        }
      : {
          latestLocation: { contains: query },
        };

  const conditionsByColumn: Record<
    ScanHistoryStringFilterColumn,
    Prisma.ScanHistoryWhereInput
  > = {
    username: { username: { contains: query } },
    productId: { productId: { contains: query } },
    itemCategory: { itemCategory: { contains: query } },
    itemSku: { itemSku: { contains: query } },
    itemBarcode: { itemBarcode: { contains: query } },
    itemType: { itemType: { contains: query } },
    itemTitle: { itemTitle: { contains: query } },
    eventUsername: {
      events: {
        some: {
          username: { contains: query },
        },
      },
    },
    eventLocation: {
      ...eventLocationCondition,
    },
  };

  return targetColumns.map((column) => conditionsByColumn[column]);
};

const toDomain = (record: any): ScanHistoryRecord => {
  return {
    id: record.id,
    shopId: record.shopId,
    userId: record.userId,
    username: record.username,
    productId: record.productId,
    itemCategory: record.itemCategory,
    itemSku: record.itemSku,
    itemBarcode: record.itemBarcode,
    itemImageUrl: record.itemImageUrl,
    itemType: record.itemType,
    itemTitle: record.itemTitle,
    itemHeight: record.itemHeight,
    itemWidth: record.itemWidth,
    itemDepth: record.itemDepth,
    volume: record.volume,
    latestLocation: record.latestLocation,
    isSold: record.isSold,
    lastSoldChannel: record.lastSoldChannel,
    orderId: record.orderId ?? null,
    lastModifiedAt: record.lastModifiedAt,
    events: record.events.map((entry: any) => ({
      username: entry.username,
      eventType: entry.eventType,
      orderId: entry.orderId,
      orderGroupId: entry.orderGroupId,
      salesChannel: entry.salesChannel ?? null,
      location: entry.location,
      happenedAt: entry.happenedAt,
    })),
    priceHistory: record.priceHistory.map((entry: any) => ({
      price: entry.price,
      terminalType: entry.terminalType,
      orderId: entry.orderId,
      orderGroupId: entry.orderGroupId,
      happenedAt: entry.happenedAt,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const scanHistoryRepository = {
  async findByShopAndProduct(input: {
    shopId: string;
    productId: string;
  }): Promise<ScanHistoryRecord | null> {
    const record = await prisma.scanHistory.findUnique({
      where: {
        shopId_productId: {
          shopId: input.shopId,
          productId: input.productId,
        },
      },
      include: {
        events: {
          orderBy: {
            happenedAt: "desc",
          },
        },
        priceHistory: {
          orderBy: {
            happenedAt: "desc",
          },
        },
      },
    });

    return record ? toDomain(record) : null;
  },

  async appendLocationEvent(
    input: AppendScanLocationHistoryInput,
  ): Promise<ScanHistoryRecord> {
    const happenedAt = input.happenedAt ?? new Date();
    const eventType = input.eventType ?? "location_update";
    const normalizedLocation = normalizeLocation(input.location);
    const currentPrice = normalizePrice(input.currentPrice);
    const itemCategory = normalizeCategory(input.itemCategory);
    const itemHeight = normalizeDimension(input.itemHeight);
    const itemWidth = normalizeDimension(input.itemWidth);
    const itemDepth = normalizeDimension(input.itemDepth);
    const volume = normalizeVolume(input.volume);
    let didAppendLocationEvent = false;

    if (!normalizedLocation) {
      throw new Error("Location is required");
    }

    logger.info("Scan history append started", {
      shopId: input.shopId,
      productId: input.productId,
      username: input.username,
      eventType,
      location: normalizedLocation,
      hasPrice: currentPrice !== null,
      hasVolume: volume !== null,
    });

    const history = await prisma.$transaction(async (tx) => {
      const existing = await tx.scanHistory.findUnique({
        where: {
          shopId_productId: {
            shopId: input.shopId,
            productId: input.productId,
          },
        },
      });

      if (!existing) {
        logger.info("Scan history record not found; creating new record", {
          shopId: input.shopId,
          productId: input.productId,
          eventType,
          location: normalizedLocation,
        });

        const createdHistory = await tx.scanHistory.create({
          data: {
            shopId: input.shopId,
            userId: input.userId ?? null,
            username: input.username,
            productId: input.productId,
            itemCategory,
            itemSku: input.itemSku ?? null,
            itemBarcode: input.itemBarcode ?? null,
            itemImageUrl: input.itemImageUrl ?? null,
            itemType: input.itemType,
            itemTitle: input.itemTitle,
            itemHeight,
            itemWidth,
            itemDepth,
            volume,
            latestLocation: normalizedLocation,
            isSold: eventType === "sold_terminal",
            lastModifiedAt: happenedAt,
            events: {
              create: {
                username: input.username,
                eventType,
                location: normalizedLocation,
                happenedAt,
              },
            },
            ...(currentPrice
              ? {
                  priceHistory: {
                    create: {
                      price: currentPrice,
                      happenedAt,
                    },
                  },
                }
              : {}),
          },
          include: {
            events: {
              orderBy: {
                happenedAt: "desc",
              },
            },
            priceHistory: {
              orderBy: {
                happenedAt: "desc",
              },
            },
          },
        });

        if (eventType === "location_update") {
          const statsDate = startOfUtcDay(happenedAt);

          await tx.locationStatsDaily.upsert({
            where: {
              date_location: {
                date: statsDate,
                location: normalizedLocation,
              },
            },
            create: {
              date: statsDate,
              location: normalizedLocation,
              itemsReceived: 1,
              itemsSold: 0,
              totalTimeToSellSeconds: 0,
              totalValuation: 0,
            },
            update: {
              itemsReceived: { increment: 1 },
            },
          });
        }

        didAppendLocationEvent = true;
        return createdHistory;
      }

      logger.info("Scan history record found; appending event", {
        scanHistoryId: existing.id,
        shopId: input.shopId,
        productId: input.productId,
        eventType,
        location: normalizedLocation,
      });

      if (normalizeLocation(existing.latestLocation) === normalizedLocation) {
        return tx.scanHistory.findUniqueOrThrow({
          where: { id: existing.id },
          include: {
            events: {
              orderBy: {
                happenedAt: "desc",
              },
            },
            priceHistory: {
              orderBy: {
                happenedAt: "desc",
              },
            },
          },
        });
      }

      await tx.scanHistory.update({
        where: { id: existing.id },
        data: {
          userId: input.userId ?? null,
          username: input.username,
          itemCategory,
          itemSku: input.itemSku ?? null,
          itemBarcode: input.itemBarcode ?? null,
          itemImageUrl: input.itemImageUrl ?? null,
          itemType: input.itemType,
          itemTitle: input.itemTitle,
          ...(itemHeight !== null ? { itemHeight } : {}),
          ...(itemWidth !== null ? { itemWidth } : {}),
          ...(itemDepth !== null ? { itemDepth } : {}),
          ...(volume !== null ? { volume } : {}),
          latestLocation: normalizedLocation,
          isSold: eventType === "sold_terminal",
          lastModifiedAt: happenedAt,
        },
      });

      await tx.scanHistoryEvent.create({
        data: {
          scanHistoryId: existing.id,
          username: input.username,
          eventType,
          location: normalizedLocation,
          happenedAt,
        },
      });

      if (eventType === "location_update") {
        const statsDate = startOfUtcDay(happenedAt);

        await tx.locationStatsDaily.upsert({
          where: {
            date_location: {
              date: statsDate,
              location: normalizedLocation,
            },
          },
          create: {
            date: statsDate,
            location: normalizedLocation,
            itemsReceived: 1,
            itemsSold: 0,
            totalTimeToSellSeconds: 0,
            totalValuation: 0,
          },
          update: {
            itemsReceived: { increment: 1 },
          },
        });
      }

      if (currentPrice) {
        const latestPrice = await tx.scanHistoryPrice.findFirst({
          where: {
            scanHistoryId: existing.id,
          },
          orderBy: {
            happenedAt: "desc",
          },
        });

        if (!latestPrice || latestPrice.price !== currentPrice) {
          await tx.scanHistoryPrice.create({
            data: {
              scanHistoryId: existing.id,
              price: currentPrice,
              happenedAt,
            },
          });
        }
      }

      didAppendLocationEvent = true;
      return tx.scanHistory.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          events: {
            orderBy: {
              happenedAt: "desc",
            },
          },
          priceHistory: {
            orderBy: {
              happenedAt: "desc",
            },
          },
        },
      });
    });

    logger.info("Scan history append completed", {
      scanHistoryId: history.id,
      shopId: history.shopId,
      productId: history.productId,
      latestLocation: history.events[0]?.location ?? null,
      latestEventType: history.events[0]?.eventType ?? null,
    });

    const result = toDomain(history);
    if (didAppendLocationEvent) {
      broadcastToShop(input.shopId, {
        type: "scan_history_updated",
        productId: result.productId,
      });
    }

    return result;
  },

  async appendSoldTerminalEventWithFallback(input: {
    shopId: string;
    userId?: string | null;
    username: string;
    productId: string;
    itemSku?: string | null;
    itemBarcode?: string | null;
    itemImageUrl?: string | null;
    itemType: string;
    itemTitle: string;
    itemCategory?: string | null;
    soldPrice?: string | null;
    orderId?: string | null;
    orderGroupId?: string | null;
    unknownLocation: string;
    soldLocation: string;
    happenedAt?: Date;
    salesChannel?: SalesChannel;
  }): Promise<ScanHistoryRecord> {
    const happenedAt = input.happenedAt ?? new Date();
    const salesChannel: SalesChannel = input.salesChannel ?? "unknown";
    const soldPrice = normalizePrice(input.soldPrice);
    const soldValuation = parsePriceValue(soldPrice);
    const itemCategory = normalizeCategory(input.itemCategory);
    const normalizedUnknownLocation = normalizeLocation(input.unknownLocation);
    const normalizedSoldLocation = normalizeLocation(input.soldLocation);
    const orderId = input.orderId ?? null;
    const orderGroupId = input.orderGroupId ?? null;

    if (!normalizedUnknownLocation || !normalizedSoldLocation) {
      throw new Error("Sold and fallback locations are required");
    }

    const history = await prisma.$transaction(async (tx) => {
      const txWithSalesChannelStats = tx as typeof tx & {
        salesChannelStatsDaily: typeof prisma.salesChannelStatsDaily;
      };
      const existing = await tx.scanHistory.findUnique({
        where: {
          shopId_productId: {
            shopId: input.shopId,
            productId: input.productId,
          },
        },
      });

      if (!existing) {
        const statsDate = startOfUtcDay(happenedAt);

        if (salesChannel === "physical") {
          await tx.locationStatsDaily.upsert({
            where: {
              date_location: {
                date: statsDate,
                location: normalizedUnknownLocation,
              },
            },
            create: {
              date: statsDate,
              location: normalizedUnknownLocation,
              itemsSold: 1,
              itemsReceived: 0,
              totalTimeToSellSeconds: 0,
              totalValuation: soldValuation,
            },
            update: {
              itemsSold: {
                increment: 1,
              },
              totalTimeToSellSeconds: {
                increment: 0,
              },
              totalValuation: {
                increment: soldValuation,
              },
            },
          });

          await tx.locationCategoryStatsDaily.upsert({
            where: {
              date_location_itemCategory: {
                date: statsDate,
                location: normalizedUnknownLocation,
                itemCategory,
              },
            },
            create: {
              date: statsDate,
              location: normalizedUnknownLocation,
              itemCategory,
              itemsSold: 1,
              totalRevenue: soldValuation,
              totalTimeToSellSeconds: 0,
            },
            update: {
              itemsSold: {
                increment: 1,
              },
              totalRevenue: {
                increment: soldValuation,
              },
              totalTimeToSellSeconds: {
                increment: 0,
              },
            },
          });
        }

        await txWithSalesChannelStats.salesChannelStatsDaily.upsert({
          where: {
            date_shopId_salesChannel: {
              date: statsDate,
              shopId: input.shopId,
              salesChannel,
            },
          },
          create: {
            date: statsDate,
            shopId: input.shopId,
            salesChannel,
            itemsSold: 1,
            totalRevenue: soldValuation,
          },
          update: {
            itemsSold: { increment: 1 },
            totalRevenue: { increment: soldValuation },
          },
        });

        return tx.scanHistory.create({
          data: {
            shopId: input.shopId,
            userId: input.userId ?? null,
            username: input.username,
            productId: input.productId,
            itemCategory,
            itemSku: input.itemSku ?? null,
            itemBarcode: input.itemBarcode ?? null,
            itemImageUrl: input.itemImageUrl ?? null,
            itemType: input.itemType,
            itemTitle: input.itemTitle,
            latestLocation: normalizedSoldLocation,
            isSold: true,
            lastSoldChannel: salesChannel,
            orderId: orderId ?? null,
            lastModifiedAt: happenedAt,
            events: {
              create: [
                {
                  username: input.username,
                  eventType: "unknown_position",
                  orderId,
                  orderGroupId,
                  location: normalizedUnknownLocation,
                  happenedAt,
                },
                {
                  username: input.username,
                  eventType: "sold_terminal",
                  orderId,
                  orderGroupId,
                  salesChannel,
                  location: normalizedSoldLocation,
                  happenedAt,
                },
              ],
            },
            priceHistory: {
              create: [
                {
                  price: soldPrice,
                  terminalType: "unknown_position",
                  orderId,
                  orderGroupId,
                  happenedAt,
                },
                {
                  price: soldPrice,
                  terminalType: "sold_terminal",
                  orderId,
                  orderGroupId,
                  happenedAt,
                },
              ],
            },
          },
          include: {
            events: {
              orderBy: {
                happenedAt: "desc",
              },
            },
            priceHistory: {
              orderBy: {
                happenedAt: "desc",
              },
            },
          },
        });
      }

      if (orderId) {
        const alreadyProcessedForOrder = await tx.scanHistoryEvent.findFirst({
          where: {
            scanHistoryId: existing.id,
            orderId,
            eventType: "sold_terminal",
          },
        });

        if (alreadyProcessedForOrder) {
          return tx.scanHistory.findUniqueOrThrow({
            where: { id: existing.id },
            include: {
              events: {
                orderBy: {
                  happenedAt: "desc",
                },
              },
              priceHistory: {
                orderBy: {
                  happenedAt: "desc",
                },
              },
            },
          });
        }
      }

      const alreadyTerminalForLocation = await tx.scanHistoryEvent.findFirst({
        where: {
          scanHistoryId: existing.id,
          eventType: "sold_terminal",
          location: normalizedSoldLocation,
        },
      });

      const latestLocationUnchanged =
        normalizeLocation(existing.latestLocation) === normalizedSoldLocation;

      if (alreadyTerminalForLocation) {
        await tx.scanHistory.update({
          where: { id: existing.id },
          data: {
            userId: input.userId ?? null,
            username: input.username,
            itemCategory,
            itemSku: input.itemSku ?? null,
            itemBarcode: input.itemBarcode ?? null,
            itemImageUrl: input.itemImageUrl ?? null,
            itemType: input.itemType,
            itemTitle: input.itemTitle,
            ...(latestLocationUnchanged
              ? {}
              : { latestLocation: normalizedSoldLocation }),
            isSold: true,
            lastSoldChannel: salesChannel,
            orderId: orderId ?? existing.orderId ?? null,
            lastModifiedAt: happenedAt,
          },
        });

        return tx.scanHistory.findUniqueOrThrow({
          where: { id: existing.id },
          include: {
            events: {
              orderBy: {
                happenedAt: "desc",
              },
            },
            priceHistory: {
              orderBy: {
                happenedAt: "desc",
              },
            },
          },
        });
      }

      await tx.scanHistory.update({
        where: { id: existing.id },
        data: {
          userId: input.userId ?? null,
          username: input.username,
          itemCategory,
          itemSku: input.itemSku ?? null,
          itemBarcode: input.itemBarcode ?? null,
          itemImageUrl: input.itemImageUrl ?? null,
          itemType: input.itemType,
          itemTitle: input.itemTitle,
          ...(latestLocationUnchanged
            ? {}
            : { latestLocation: normalizedSoldLocation }),
          isSold: true,
          lastSoldChannel: salesChannel,
          orderId: orderId ?? existing.orderId ?? null,
          lastModifiedAt: happenedAt,
        },
      });

      const arrivedEvent = await tx.scanHistoryEvent.findFirst({
        where: {
          scanHistoryId: existing.id,
          eventType: {
            in: ["location_update", "unknown_position"],
          },
        },
        orderBy: {
          happenedAt: "desc",
        },
      });

      const arrivedTime = arrivedEvent?.happenedAt ?? happenedAt;
      const arrivedLocation =
        arrivedEvent?.location ?? normalizedUnknownLocation;
      const totalTimeToSellSeconds = toDurationSeconds(arrivedTime, happenedAt);
      const statsDate = startOfUtcDay(happenedAt);
      const soldItemCategory = normalizeCategory(
        existing.itemCategory ?? itemCategory,
      );

      if (!latestLocationUnchanged) {
        await tx.scanHistoryEvent.create({
          data: {
            scanHistoryId: existing.id,
            username: input.username,
            eventType: "sold_terminal",
            orderId,
            orderGroupId,
            salesChannel,
            location: normalizedSoldLocation,
            happenedAt,
          },
        });
      }

      await tx.scanHistoryPrice.create({
        data: {
          scanHistoryId: existing.id,
          price: soldPrice,
          terminalType: "sold_terminal",
          orderId,
          orderGroupId,
          happenedAt,
        },
      });

      if (salesChannel === "physical") {
        await tx.locationStatsDaily.upsert({
          where: {
            date_location: {
              date: statsDate,
              location: arrivedLocation,
            },
          },
          create: {
            date: statsDate,
            location: arrivedLocation,
            itemsSold: 1,
            itemsReceived: 0,
            totalTimeToSellSeconds,
            totalValuation: soldValuation,
          },
          update: {
            itemsSold: {
              increment: 1,
            },
            totalTimeToSellSeconds: {
              increment: totalTimeToSellSeconds,
            },
            totalValuation: {
              increment: soldValuation,
            },
          },
        });

        await tx.locationCategoryStatsDaily.upsert({
          where: {
            date_location_itemCategory: {
              date: statsDate,
              location: arrivedLocation,
              itemCategory: soldItemCategory,
            },
          },
          create: {
            date: statsDate,
            location: arrivedLocation,
            itemCategory: soldItemCategory,
            itemsSold: 1,
            totalRevenue: soldValuation,
            totalTimeToSellSeconds,
          },
          update: {
            itemsSold: {
              increment: 1,
            },
            totalRevenue: {
              increment: soldValuation,
            },
            totalTimeToSellSeconds: {
              increment: totalTimeToSellSeconds,
            },
          },
        });
      }

      await txWithSalesChannelStats.salesChannelStatsDaily.upsert({
        where: {
          date_shopId_salesChannel: {
            date: statsDate,
            shopId: input.shopId,
            salesChannel,
          },
        },
        create: {
          date: statsDate,
          shopId: input.shopId,
          salesChannel,
          itemsSold: 1,
          totalRevenue: soldValuation,
        },
        update: {
          itemsSold: { increment: 1 },
          totalRevenue: { increment: soldValuation },
        },
      });

      return tx.scanHistory.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          events: {
            orderBy: {
              happenedAt: "desc",
            },
          },
          priceHistory: {
            orderBy: {
              happenedAt: "desc",
            },
          },
        },
      });
    });

    const result = toDomain(history);
    broadcastToShop(input.shopId, {
      type: "scan_history_updated",
      productId: result.productId,
    });

    return result;
  },

  async appendPriceChangeIfHistoryExists(input: {
    shopId: string;
    productId: string;
    price: string;
    happenedAt?: Date;
    emitBroadcast?: boolean;
  }): Promise<boolean> {
    const happenedAt = input.happenedAt ?? new Date();
    const normalizedPrice = normalizePrice(input.price);

    if (!normalizedPrice) {
      return false;
    }

    const existing = await prisma.scanHistory.findUnique({
      where: {
        shopId_productId: {
          shopId: input.shopId,
          productId: input.productId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return false;
    }

    const latestPrice = await prisma.scanHistoryPrice.findFirst({
      where: {
        scanHistoryId: existing.id,
      },
      orderBy: {
        happenedAt: "desc",
      },
      select: {
        price: true,
      },
    });

    if (latestPrice?.price === normalizedPrice) {
      return false;
    }

    await prisma.scanHistoryPrice.create({
      data: {
        scanHistoryId: existing.id,
        price: normalizedPrice,
        terminalType: "price_update",
        happenedAt,
      },
    });

    if (input.emitBroadcast !== false) {
      broadcastToShop(input.shopId, {
        type: "scan_history_updated",
        productId: input.productId,
      });
    }

    return true;
  },

  async listByShopPaginated(input: {
    shopId: string;
    page: number;
    pageSize: number;
    q?: string;
    includeLocationHistory?: boolean;
    stringColumns?: ScanHistoryStringFilterColumn[];
    sold?: boolean;
    inStore?: boolean;
    salesChannel?: SalesChannel;
    from?: Date;
    to?: Date;
  }): Promise<ScanHistoryPage> {
    const skip = (input.page - 1) * input.pageSize;
    const trimmedQuery = input.q?.trim();

    const whereAnd: Prisma.ScanHistoryWhereInput[] = [
      {
        shopId: input.shopId,
      },
    ];

    if (input.from || input.to) {
      whereAnd.push({
        lastModifiedAt: {
          ...(input.from ? { gte: input.from } : {}),
          ...(input.to ? { lte: input.to } : {}),
        },
      });
    }

    if (input.sold === true && input.inStore !== true) {
      whereAnd.push({ isSold: true });
    }

    if (input.inStore === true && input.sold !== true) {
      whereAnd.push({ isSold: false });
    }

    if (input.salesChannel) {
      whereAnd.push({ lastSoldChannel: input.salesChannel });
    }

    if (trimmedQuery) {
      const stringFilterOptions = input.includeLocationHistory
        ? { includeLocationHistory: true }
        : undefined;

      whereAnd.push({
        OR: buildStringFilterConditions(
          trimmedQuery,
          input.stringColumns,
          stringFilterOptions,
        ),
      });
    }

    const where: Prisma.ScanHistoryWhereInput = {
      AND: whereAnd,
    };

    const [total, records] = await Promise.all([
      prisma.scanHistory.count({
        where,
      }),
      prisma.scanHistory.findMany({
        where,
        orderBy: { lastModifiedAt: "desc" },
        skip,
        take: input.pageSize,
        include: {
          events: {
            orderBy: {
              happenedAt: "desc",
            },
          },
          priceHistory: {
            orderBy: {
              happenedAt: "desc",
            },
          },
        },
      }),
    ]);

    return {
      items: records.map(toDomain),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  },
};
