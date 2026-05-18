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
  ScanHistoryLogisticEvent,
  ScanHistoryRecord,
} from "../domain/scan-history.js";
import type { Prisma } from "@prisma/client";
import { ScanHistoryEventType } from "@prisma/client";

const normalizePrice = (price?: string | null): string | null => {
  const trimmed = price?.trim();
  return trimmed ? trimmed : null;
};

const normalizeQuantity = (value?: number | null): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value;
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

const resolveStringForUpdate = (
  inputValue: string | null | undefined,
  existingValue: string | null,
  fallback: string | null = null,
): string | null => {
  const trimmed = inputValue?.trim();
  if (trimmed) {
    return trimmed;
  }

  const persisted = existingValue?.trim();
  if (persisted) {
    return persisted;
  }

  return fallback;
};

const resolveCategoryForUpdate = (
  inputCategory: string | null | undefined,
  existingCategory: string | null,
): string => {
  return (
    resolveStringForUpdate(inputCategory, existingCategory, "unknown") ??
    "unknown"
  );
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

const sameNullableString = (
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  return (left?.trim() || null) === (right?.trim() || null);
};

const normalizeIncomingProperties = (
  properties?: Record<string, unknown> | null,
): Record<string, string> => {
  if (!properties) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(properties)) {
    if (typeof rawValue !== "string") {
      continue;
    }

    const normalizedKey = key.trim();
    const normalizedValue = rawValue.trim();
    if (normalizedKey && normalizedValue) {
      normalized[normalizedKey] = normalizedValue;
    }
  }

  return normalized;
};

const normalizeStoredProperties = (
  properties: Prisma.JsonValue | null | undefined,
): Record<string, string> => {
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (normalizedKey && normalizedValue) {
      normalized[normalizedKey] = normalizedValue;
    }
  }

  return normalized;
};

const resolvePropertiesForCreate = (
  properties?: Record<string, unknown> | null,
): Record<string, string> | undefined => {
  const normalized = normalizeIncomingProperties(properties);
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolvePropertiesForUpdate = (
  existingProperties: Prisma.JsonValue | null | undefined,
  incomingProperties?: Record<string, unknown> | null,
): Record<string, string> | undefined => {
  const normalizedIncoming = normalizeIncomingProperties(incomingProperties);
  if (Object.keys(normalizedIncoming).length === 0) {
    return undefined;
  }

  return {
    ...normalizeStoredProperties(existingProperties),
    ...normalizedIncoming,
  };
};

const sameStringRecord = (
  left: Record<string, string>,
  right: Record<string, string>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
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
  const logisticEvents = (record.logisticEvents ?? []).map(
    (entry: any): ScanHistoryLogisticEvent => ({
      username: entry.username,
      description: entry.description ?? null,
      eventType: entry.eventType,
      location: entry.logisticLocation?.location ?? null,
      zoneType: entry.logisticLocation?.zoneType ?? null,
      happenedAt: entry.happenedAt,
    }),
  );
  const latestLogisticEvent = logisticEvents[0] ?? null;
  const logisticLocation = record.logisticLocation
    ? {
        id: record.logisticLocation.id,
        location: record.logisticLocation.location,
        zoneType: record.logisticLocation.zoneType,
      }
    : null;
  const properties =
    record.properties &&
    typeof record.properties === "object" &&
    !Array.isArray(record.properties)
      ? (record.properties as Record<string, unknown>)
      : null;

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
    properties,
    quantity: record.quantity ?? 1,
    latestLocation: record.latestLocation,
    isSold: record.isSold,
    lastSoldChannel: record.lastSoldChannel,
    orderId: record.orderId ?? null,
    orderNumber: record.orderNumber ?? null,
    lastLogisticEventType: record.lastLogisticEventType ?? null,
    logisticLocationId: record.logisticLocationId ?? null,
    logisticLocation,
    lastLogisticLocation: logisticLocation?.location ?? null,
    logisticEvent: latestLogisticEvent ? latestLogisticEvent : null,
    logisticEvents,
    logisticsCompletedAt: record.logisticsCompletedAt ?? null,
    lastModifiedAt: record.lastModifiedAt,
    events: (record.events ?? []).map((entry: any) => ({
      username: entry.username,
      eventType: entry.eventType,
      orderId: entry.orderId,
      orderGroupId: entry.orderGroupId,
      salesChannel: entry.salesChannel ?? null,
      location: entry.location,
      happenedAt: entry.happenedAt,
    })),
    priceHistory: (record.priceHistory ?? []).map((entry: any) => ({
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
        logisticLocation: true,
        logisticEvents: {
          orderBy: [
            { happenedAt: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          include: {
            logisticLocation: true,
          },
        },
      },
    });

    return record ? toDomain(record) : null;
  },

  async findActiveSoldIdsByOrder(input: {
    shopId: string;
    orderId: string;
  }): Promise<string[]> {
    const records = await prisma.scanHistory.findMany({
      where: {
        shopId: input.shopId,
        orderId: input.orderId,
        isSold: true,
        logisticsCompletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return records.map((record) => record.id);
  },

  async updateFixItemForIds(input: {
    shopId: string;
    scanHistoryIds: string[];
    fixItem: boolean;
  }): Promise<number> {
    if (input.scanHistoryIds.length === 0) {
      return 0;
    }

    const result = await prisma.scanHistory.updateMany({
      where: {
        shopId: input.shopId,
        id: {
          in: input.scanHistoryIds,
        },
      },
      data: {
        fixItem: input.fixItem,
      },
    });

    return result.count;
  },

  async scheduleSoldItemsByOrder(input: {
    orderId: string;
    scheduledDate: Date | null;
  }): Promise<{
    updatedItemIds: string[];
    resolvedShopId: string | null;
    matchedShopIds: string[];
  }> {
    const items = await prisma.scanHistory.findMany({
      where: {
        orderId: input.orderId,
        isSold: true,
      },
      select: {
        id: true,
        shopId: true,
      },
    });

    if (items.length === 0) {
      return {
        updatedItemIds: [],
        resolvedShopId: null,
        matchedShopIds: [],
      };
    }

    const matchedShopIds = Array.from(new Set(items.map((item) => item.shopId)));
    if (matchedShopIds.length !== 1) {
      return {
        updatedItemIds: [],
        resolvedShopId: null,
        matchedShopIds,
      };
    }

    const resolvedShopId = matchedShopIds[0];
    if (!resolvedShopId) {
      return {
        updatedItemIds: [],
        resolvedShopId: null,
        matchedShopIds,
      };
    }

    await prisma.scanHistory.updateMany({
      where: {
        shopId: resolvedShopId,
        id: {
          in: items.map((item) => item.id),
        },
      },
      data: {
        scheduledDate: input.scheduledDate,
      },
    });

    return {
      updatedItemIds: items.map((item) => item.id),
      resolvedShopId,
      matchedShopIds,
    };
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
    const quantity = normalizeQuantity(input.quantity);
    const propertiesForCreate = resolvePropertiesForCreate(input.properties);
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
            quantity,
            ...(propertiesForCreate !== undefined
              ? { properties: propertiesForCreate }
              : {}),
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
              itemsReceived: quantity,
              itemsSold: 0,
              totalTimeToSellSeconds: 0,
              totalValuation: 0,
            },
            update: {
              itemsReceived: { increment: quantity },
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

      const propertiesForUpdate = resolvePropertiesForUpdate(
        existing.properties,
        input.properties,
      );

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
          ...(propertiesForUpdate !== undefined
            ? { properties: propertiesForUpdate }
            : {}),
          quantity,
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
            itemsReceived: quantity,
            itemsSold: 0,
            totalTimeToSellSeconds: 0,
            totalValuation: 0,
          },
          update: {
            itemsReceived: { increment: quantity },
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
          logisticLocation: true,
          logisticEvents: {
            orderBy: [
              { happenedAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: {
              logisticLocation: true,
            },
          },
        },
      });
    });

    const result = toDomain(history);
    logger.info("Scan history append completed", {
      scanHistoryId: result.id,
      shopId: result.shopId,
      productId: result.productId,
      latestLocation: result.events[0]?.location ?? null,
      latestEventType: result.events[0]?.eventType ?? null,
    });

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
    itemHeight?: number | null;
    itemWidth?: number | null;
    itemDepth?: number | null;
    volume?: number | null;
    soldPrice?: string | null;
    orderId?: string | null;
    orderNumber?: number | null;
    orderGroupId?: string | null;
    unknownLocation: string;
    soldLocation: string;
    happenedAt?: Date;
    salesChannel?: SalesChannel;
    quantity?: number | null;
    properties?: Record<string, string> | null;
  }): Promise<ScanHistoryRecord> {
    const happenedAt = input.happenedAt ?? new Date();
    const salesChannel: SalesChannel = input.salesChannel ?? "unknown";
    const soldPrice = normalizePrice(input.soldPrice);
    const soldValuation = parsePriceValue(soldPrice);
    const itemCategory = normalizeCategory(input.itemCategory);
    const normalizedUnknownLocation = normalizeLocation(input.unknownLocation);
    const normalizedSoldLocation = normalizeLocation(input.soldLocation);
    const orderId = input.orderId ?? null;
    const orderNumber = input.orderNumber ?? null;
    const orderGroupId = input.orderGroupId ?? null;
    const quantity = normalizeQuantity(input.quantity);
    const propertiesForCreate = resolvePropertiesForCreate(input.properties);
    const itemHeight = normalizeDimension(input.itemHeight);
    const itemWidth = normalizeDimension(input.itemWidth);
    const itemDepth = normalizeDimension(input.itemDepth);
    const volume = normalizeVolume(input.volume);

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
              itemsSold: quantity,
              itemsReceived: 0,
              totalTimeToSellSeconds: 0,
              totalValuation: soldValuation,
            },
            update: {
              itemsSold: {
                increment: quantity,
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
              itemsSold: quantity,
              totalRevenue: soldValuation,
              totalTimeToSellSeconds: 0,
            },
            update: {
              itemsSold: {
                increment: quantity,
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
            itemsSold: quantity,
            totalRevenue: soldValuation,
          },
          update: {
            itemsSold: { increment: quantity },
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
            ...(itemHeight !== null ? { itemHeight } : {}),
            ...(itemWidth !== null ? { itemWidth } : {}),
            ...(itemDepth !== null ? { itemDepth } : {}),
            ...(volume !== null ? { volume } : {}),
            ...(propertiesForCreate !== undefined
              ? { properties: propertiesForCreate }
              : {}),
            latestLocation: null,
            isSold: true,
            lastSoldChannel: salesChannel,
            orderId: orderId ?? null,
            orderNumber: orderNumber ?? null,
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

      const resolvedItemCategory = resolveCategoryForUpdate(
        input.itemCategory,
        existing.itemCategory,
      );
      const resolvedItemSku = resolveStringForUpdate(
        input.itemSku,
        existing.itemSku,
      );
      const resolvedItemBarcode = resolveStringForUpdate(
        input.itemBarcode,
        existing.itemBarcode,
      );
      const resolvedItemTitle =
        resolveStringForUpdate(input.itemTitle, existing.itemTitle) ??
        input.itemTitle;
      const resolvedItemType =
        resolveStringForUpdate(input.itemType, existing.itemType) ??
        input.itemType;
      const propertiesForUpdate = resolvePropertiesForUpdate(
        existing.properties,
        input.properties,
      );

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
            itemCategory: resolvedItemCategory,
            itemSku: resolvedItemSku,
            itemBarcode: resolvedItemBarcode,
            itemImageUrl: input.itemImageUrl ?? existing.itemImageUrl ?? null,
            itemType: resolvedItemType,
            itemTitle: resolvedItemTitle,
            ...(propertiesForUpdate !== undefined
              ? { properties: propertiesForUpdate }
              : {}),
            isSold: true,
            lastSoldChannel: salesChannel,
            orderId: orderId ?? existing.orderId ?? null,
            orderNumber: orderNumber ?? existing.orderNumber ?? null,
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
          itemCategory: resolvedItemCategory,
          itemSku: resolvedItemSku,
          itemBarcode: resolvedItemBarcode,
          itemImageUrl: input.itemImageUrl ?? existing.itemImageUrl ?? null,
          itemType: resolvedItemType,
          itemTitle: resolvedItemTitle,
          ...(propertiesForUpdate !== undefined
            ? { properties: propertiesForUpdate }
            : {}),
          isSold: true,
          lastSoldChannel: salesChannel,
          orderId: orderId ?? existing.orderId ?? null,
          orderNumber: orderNumber ?? existing.orderNumber ?? null,
          lastModifiedAt: happenedAt,
        },
      });

      const arrivedEvent = await tx.scanHistoryEvent.findFirst({
        where: {
          scanHistoryId: existing.id,
          eventType: "location_update",
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
      const soldItemCategory = normalizeCategory(resolvedItemCategory);

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
            itemsSold: quantity,
            itemsReceived: 0,
            totalTimeToSellSeconds: quantity * totalTimeToSellSeconds,
            totalValuation: soldValuation,
          },
          update: {
            itemsSold: {
              increment: quantity,
            },
            totalTimeToSellSeconds: {
              increment: quantity * totalTimeToSellSeconds,
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
            itemsSold: quantity,
            totalRevenue: soldValuation,
            totalTimeToSellSeconds: quantity * totalTimeToSellSeconds,
          },
          update: {
            itemsSold: {
              increment: quantity,
            },
            totalRevenue: {
              increment: soldValuation,
            },
            totalTimeToSellSeconds: {
              increment: quantity * totalTimeToSellSeconds,
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
          itemsSold: quantity,
          totalRevenue: soldValuation,
        },
        update: {
          itemsSold: { increment: quantity },
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
          logisticLocation: true,
          logisticEvents: {
            orderBy: [
              { happenedAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: {
              logisticLocation: true,
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

  async syncProductSnapshotIfHistoryExists(input: {
    shopId: string;
    productId: string;
    itemCategory?: string | null;
    itemSku?: string | null;
    itemBarcode?: string | null;
    itemImageUrl?: string | null;
    itemType: string;
    itemTitle: string;
    itemHeight?: number | null;
    itemWidth?: number | null;
    itemDepth?: number | null;
    volume?: number | null;
    quantity?: number | null;
    properties?: Record<string, string> | null | undefined;
    emitBroadcast?: boolean;
  }): Promise<boolean> {
    const existing = await prisma.scanHistory.findUnique({
      where: {
        shopId_productId: {
          shopId: input.shopId,
          productId: input.productId,
        },
      },
      select: {
        id: true,
        itemCategory: true,
        itemSku: true,
        itemBarcode: true,
        itemImageUrl: true,
        itemType: true,
        itemTitle: true,
        itemHeight: true,
        itemWidth: true,
        itemDepth: true,
        volume: true,
        quantity: true,
        properties: true,
      },
    });

    if (!existing) {
      return false;
    }

    const nextItemCategory = resolveCategoryForUpdate(
      input.itemCategory,
      existing.itemCategory,
    );
    const nextItemSku = resolveStringForUpdate(input.itemSku, existing.itemSku);
    const nextItemBarcode = resolveStringForUpdate(
      input.itemBarcode,
      existing.itemBarcode,
    );
    const nextItemImageUrl = resolveStringForUpdate(
      input.itemImageUrl,
      existing.itemImageUrl,
    );
    const nextItemType =
      resolveStringForUpdate(input.itemType, existing.itemType) ??
      input.itemType;
    const nextItemTitle =
      resolveStringForUpdate(input.itemTitle, existing.itemTitle) ??
      input.itemTitle;
    const nextItemHeight = normalizeDimension(input.itemHeight);
    const nextItemWidth = normalizeDimension(input.itemWidth);
    const nextItemDepth = normalizeDimension(input.itemDepth);
    const nextVolume = normalizeVolume(input.volume);
    const nextQuantity = normalizeQuantity(input.quantity);
    const nextProperties = resolvePropertiesForUpdate(
      existing.properties,
      input.properties,
    );
    const currentProperties = normalizeStoredProperties(existing.properties);
    const propertyValuesChanged =
      nextProperties !== undefined &&
      !sameStringRecord(currentProperties, nextProperties);

    const hasChanges =
      !sameNullableString(existing.itemCategory, nextItemCategory) ||
      !sameNullableString(existing.itemSku, nextItemSku) ||
      !sameNullableString(existing.itemBarcode, nextItemBarcode) ||
      !sameNullableString(existing.itemImageUrl, nextItemImageUrl) ||
      !sameNullableString(existing.itemType, nextItemType) ||
      !sameNullableString(existing.itemTitle, nextItemTitle) ||
      existing.itemHeight !== nextItemHeight ||
      existing.itemWidth !== nextItemWidth ||
      existing.itemDepth !== nextItemDepth ||
      existing.volume !== nextVolume ||
      existing.quantity !== nextQuantity ||
      propertyValuesChanged;

    if (!hasChanges) {
      return false;
    }

    await prisma.scanHistory.update({
      where: { id: existing.id },
      data: {
        itemCategory: nextItemCategory,
        itemSku: nextItemSku,
        itemBarcode: nextItemBarcode,
        itemImageUrl: nextItemImageUrl,
        itemType: nextItemType,
        itemTitle: nextItemTitle,
        itemHeight: nextItemHeight,
        itemWidth: nextItemWidth,
        itemDepth: nextItemDepth,
        volume: nextVolume,
        quantity: nextQuantity,
        ...(nextProperties !== undefined ? { properties: nextProperties } : {}),
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

  async syncSoldQuantityIfHistoryExists(input: {
    shopId: string;
    productId: string;
    quantity?: number | null;
    emitBroadcast?: boolean;
  }): Promise<boolean> {
    const nextQuantity = normalizeQuantity(input.quantity);

    const changed = await prisma.$transaction(async (tx) => {
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
        select: {
          id: true,
          isSold: true,
          quantity: true,
          itemCategory: true,
          lastSoldChannel: true,
          lastModifiedAt: true,
        },
      });

      if (!existing || !existing.isSold) {
        return false;
      }

      if (existing.quantity === nextQuantity) {
        return false;
      }

      const quantityDelta = nextQuantity - existing.quantity;

      const soldEvent = await tx.scanHistoryEvent.findFirst({
        where: {
          scanHistoryId: existing.id,
          eventType: "sold_terminal",
        },
        orderBy: {
          happenedAt: "desc",
        },
        select: {
          happenedAt: true,
          salesChannel: true,
        },
      });

      const soldAt = soldEvent?.happenedAt ?? existing.lastModifiedAt;
      const statsDate = startOfUtcDay(soldAt);
      const salesChannel: SalesChannel =
        (soldEvent?.salesChannel as SalesChannel | null) ??
        ((existing.lastSoldChannel as SalesChannel | null) ?? "unknown");

      const arrivedEvent = await tx.scanHistoryEvent.findFirst({
        where: {
          scanHistoryId: existing.id,
          eventType: "location_update",
        },
        orderBy: {
          happenedAt: "desc",
        },
        select: {
          location: true,
          happenedAt: true,
        },
      });

      const arrivedLocation = arrivedEvent?.location ?? "UNKNOWN_POSITION";
      const arrivedAt = arrivedEvent?.happenedAt ?? soldAt;
      const timeToSellSeconds = toDurationSeconds(arrivedAt, soldAt);

      const soldPriceRow = await tx.scanHistoryPrice.findFirst({
        where: {
          scanHistoryId: existing.id,
          terminalType: "sold_terminal",
        },
        orderBy: {
          happenedAt: "desc",
        },
        select: {
          price: true,
        },
      });

      const unitPrice = parsePriceValue(soldPriceRow?.price ?? null);
      const valuationDelta = unitPrice * quantityDelta;
      const soldItemCategory = normalizeCategory(existing.itemCategory);

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
            itemsSold: quantityDelta,
            itemsReceived: 0,
            totalTimeToSellSeconds: quantityDelta * timeToSellSeconds,
            totalValuation: valuationDelta,
          },
          update: {
            itemsSold: {
              increment: quantityDelta,
            },
            totalTimeToSellSeconds: {
              increment: quantityDelta * timeToSellSeconds,
            },
            totalValuation: {
              increment: valuationDelta,
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
            itemsSold: quantityDelta,
            totalRevenue: valuationDelta,
            totalTimeToSellSeconds: quantityDelta * timeToSellSeconds,
          },
          update: {
            itemsSold: {
              increment: quantityDelta,
            },
            totalRevenue: {
              increment: valuationDelta,
            },
            totalTimeToSellSeconds: {
              increment: quantityDelta * timeToSellSeconds,
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
          itemsSold: quantityDelta,
          totalRevenue: valuationDelta,
        },
        update: {
          itemsSold: {
            increment: quantityDelta,
          },
          totalRevenue: {
            increment: valuationDelta,
          },
        },
      });

      await tx.scanHistory.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
        },
      });

      return true;
    });

    if (changed && input.emitBroadcast !== false) {
      broadcastToShop(input.shopId, {
        type: "scan_history_updated",
        productId: input.productId,
      });
    }

    return changed;
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
    logisticsCompleted?: true | null;
    salesChannel?: SalesChannel;
    from?: Date;
    to?: Date;
    cursor?: string; // format: "<lastModifiedAt ISO>|<id>"
  }) {
    const trimmedQuery = input.q?.trim() ?? "";
    const whereAnd: Prisma.ScanHistoryWhereInput[] = [{ shopId: input.shopId }];

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

    if (input.logisticsCompleted === true) {
      whereAnd.push({ logisticsCompletedAt: { not: null } });
    }

    if (input.logisticsCompleted === null) {
      whereAnd.push({ logisticsCompletedAt: null });
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

    const totalWhere: Prisma.ScanHistoryWhereInput = { AND: [...whereAnd] };

    // Cursor-based pagination: sort is lastModifiedAt DESC, id ASC.
    // Next page: lastModifiedAt < cursorDate OR (lastModifiedAt = cursorDate AND id > cursorId)
    if (input.cursor) {
      const separatorIndex = input.cursor.indexOf("|");
      const isoStr = input.cursor.slice(0, separatorIndex);
      const cursorId = input.cursor.slice(separatorIndex + 1);
      const cursorDate = new Date(isoStr);
      whereAnd.push({
        OR: [
          { lastModifiedAt: { lt: cursorDate } },
          {
            AND: [{ lastModifiedAt: cursorDate }, { id: { gt: cursorId } }],
          },
        ],
      });
    }

    const where: Prisma.ScanHistoryWhereInput = { AND: whereAnd };

    // Fetch one extra record to determine if there is a next page
    const [total, records] = await Promise.all([
      prisma.scanHistory.count({ where: totalWhere }),
      prisma.scanHistory.findMany({
        where,
        orderBy: [{ lastModifiedAt: "desc" }, { id: "asc" }],
        take: input.pageSize + 1,
        include: {
          events: { orderBy: { happenedAt: "desc" } },
          priceHistory: { orderBy: { happenedAt: "desc" } },
          logisticLocation: true,
          logisticEvents: {
            orderBy: [
              { happenedAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: { logisticLocation: true },
          },
        },
      }),
    ]);

    const hasMore = records.length > input.pageSize;
    const pageRecords = hasMore ? records.slice(0, input.pageSize) : records;
    const lastRecord = pageRecords[pageRecords.length - 1];
    const nextCursor =
      hasMore && lastRecord
        ? `${lastRecord.lastModifiedAt.toISOString()}|${lastRecord.id}`
        : null;

    return {
      items: pageRecords.map(toDomain),
      total,
      page: input.page,
      pageSize: input.pageSize,
      hasMore,
      nextCursor,
    };
  },

  async findBySkuOrBarcode(input: {
    shopId: string;
    value: string;
    limit: number;
  }): Promise<
    Array<{
      id: string;
      productId: string;
      itemSku: string | null;
      itemBarcode: string | null;
      itemImageUrl: string | null;
      properties: Prisma.JsonValue | null;
      itemCategory: string | null;
      itemTitle: string;
      quantity: number;
      latestLocation: string | null;
      isSold: boolean;
      logisticsCompletedAt: Date | null;
      intention: string | null;
      fixItem: boolean | null;
      isItemFixed: boolean;
    }>
  > {
    const normalizedValue = input.value.trim().toLowerCase();

    return prisma.scanHistory.findMany({
      where: {
        shopId: input.shopId,
        OR: [
          { itemSku: { contains: normalizedValue } },
          { itemBarcode: { contains: normalizedValue } },
        ],
      },
      select: {
        id: true,
        productId: true,
        itemSku: true,
        itemBarcode: true,
        itemImageUrl: true,
        properties: true,
        itemCategory: true,
        itemTitle: true,
        quantity: true,
        latestLocation: true,
        isSold: true,
        logisticsCompletedAt: true,
        intention: true,
        fixItem: true,
        isItemFixed: true,
      },
      orderBy: { lastModifiedAt: "desc" },
      take: input.limit,
    });
  },

  async findManyByProductIds(input: {
    shopId: string;
    productIds: string[];
  }): Promise<
    Map<
      string,
      {
        id: string;
        productId: string;
        itemSku: string | null;
        itemBarcode: string | null;
        itemImageUrl: string | null;
        properties: Prisma.JsonValue | null;
        itemCategory: string | null;
        itemTitle: string;
        quantity: number;
        latestLocation: string | null;
        isSold: boolean;
        logisticsCompletedAt: Date | null;
        intention: string | null;
        fixItem: boolean | null;
        isItemFixed: boolean;
      }
    >
  > {
    if (input.productIds.length === 0) return new Map();

    const records = await prisma.scanHistory.findMany({
      where: {
        shopId: input.shopId,
        productId: { in: input.productIds },
      },
      select: {
        id: true,
        productId: true,
        itemSku: true,
        itemBarcode: true,
        itemImageUrl: true,
        properties: true,
        itemCategory: true,
        itemTitle: true,
        quantity: true,
        latestLocation: true,
        isSold: true,
        logisticsCompletedAt: true,
        intention: true,
        fixItem: true,
        isItemFixed: true,
      },
      orderBy: { lastModifiedAt: "desc" },
    });

    return new Map(records.map((r) => [r.productId, r]));
  },
};
