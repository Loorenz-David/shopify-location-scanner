import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import { ScanHistoryEventType } from "@prisma/client";
const normalizePrice = (price) => {
    const trimmed = price?.trim();
    return trimmed ? trimmed : null;
};
const normalizeVolume = (volume) => {
    if (typeof volume !== "number" || !Number.isFinite(volume) || volume <= 0) {
        return null;
    }
    return volume;
};
const normalizeDimension = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return null;
    }
    return value;
};
const normalizeCategory = (category) => {
    const trimmed = category?.trim();
    return trimmed ? trimmed : "unknown";
};
const parsePriceValue = (price) => {
    if (!price) {
        return 0;
    }
    const normalized = price.replace(/,/g, "").trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};
const startOfUtcDay = (value) => {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
const toDurationSeconds = (from, to) => {
    const seconds = (to.getTime() - from.getTime()) / 1000;
    return seconds > 0 ? seconds : 0;
};
const ALL_STRING_FILTER_COLUMNS = [
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
const buildStringFilterConditions = (query, columns) => {
    const targetColumns = columns?.length ? columns : ALL_STRING_FILTER_COLUMNS;
    const conditionsByColumn = {
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
            events: {
                some: {
                    location: { contains: query },
                },
            },
        },
    };
    return targetColumns.map((column) => conditionsByColumn[column]);
};
const toDomain = (record) => {
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
        lastModifiedAt: record.lastModifiedAt,
        events: record.events.map((entry) => ({
            username: entry.username,
            eventType: entry.eventType,
            orderId: entry.orderId,
            orderGroupId: entry.orderGroupId,
            location: entry.location,
            happenedAt: entry.happenedAt,
        })),
        priceHistory: record.priceHistory.map((entry) => ({
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
    async appendLocationEvent(input) {
        const happenedAt = input.happenedAt ?? new Date();
        const eventType = input.eventType ?? "location_update";
        const currentPrice = normalizePrice(input.currentPrice);
        const itemCategory = normalizeCategory(input.itemCategory);
        const itemHeight = normalizeDimension(input.itemHeight);
        const itemWidth = normalizeDimension(input.itemWidth);
        const itemDepth = normalizeDimension(input.itemDepth);
        const volume = normalizeVolume(input.volume);
        logger.info("Scan history append started", {
            shopId: input.shopId,
            productId: input.productId,
            username: input.username,
            eventType,
            location: input.location,
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
                    location: input.location,
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
                        itemHeight,
                        itemWidth,
                        itemDepth,
                        volume,
                        isSold: eventType === "sold_terminal",
                        lastModifiedAt: happenedAt,
                        events: {
                            create: {
                                username: input.username,
                                eventType,
                                location: input.location,
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
            }
            logger.info("Scan history record found; appending event", {
                scanHistoryId: existing.id,
                shopId: input.shopId,
                productId: input.productId,
                eventType,
                location: input.location,
            });
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
                    isSold: eventType === "sold_terminal",
                    lastModifiedAt: happenedAt,
                },
            });
            await tx.scanHistoryEvent.create({
                data: {
                    scanHistoryId: existing.id,
                    username: input.username,
                    eventType,
                    location: input.location,
                    happenedAt,
                },
            });
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
        broadcastToShop(input.shopId, {
            type: "scan_history_updated",
            productId: result.productId,
        });
        return result;
    },
    async appendSoldTerminalEventWithFallback(input) {
        const happenedAt = input.happenedAt ?? new Date();
        const soldPrice = normalizePrice(input.soldPrice);
        const soldValuation = parsePriceValue(soldPrice);
        const itemCategory = normalizeCategory(input.itemCategory);
        const orderId = input.orderId ?? null;
        const orderGroupId = input.orderGroupId ?? null;
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
                const statsDate = startOfUtcDay(happenedAt);
                await tx.locationStatsDaily.upsert({
                    where: {
                        date_location: {
                            date: statsDate,
                            location: input.unknownLocation,
                        },
                    },
                    create: {
                        date: statsDate,
                        location: input.unknownLocation,
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
                            location: input.unknownLocation,
                            itemCategory,
                        },
                    },
                    create: {
                        date: statsDate,
                        location: input.unknownLocation,
                        itemCategory,
                        itemsSold: 1,
                        totalRevenue: soldValuation,
                    },
                    update: {
                        itemsSold: {
                            increment: 1,
                        },
                        totalRevenue: {
                            increment: soldValuation,
                        },
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
                        isSold: true,
                        lastModifiedAt: happenedAt,
                        events: {
                            create: [
                                {
                                    username: input.username,
                                    eventType: "unknown_position",
                                    orderId,
                                    orderGroupId,
                                    location: input.unknownLocation,
                                    happenedAt,
                                },
                                {
                                    username: input.username,
                                    eventType: "sold_terminal",
                                    orderId,
                                    orderGroupId,
                                    location: input.soldLocation,
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
                    isSold: true,
                    lastModifiedAt: happenedAt,
                },
            });
            const alreadyTerminalForLocation = await tx.scanHistoryEvent.findFirst({
                where: {
                    scanHistoryId: existing.id,
                    eventType: "sold_terminal",
                    location: input.soldLocation,
                },
            });
            if (alreadyTerminalForLocation) {
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
            const arrivedLocation = arrivedEvent?.location ?? input.unknownLocation;
            const totalTimeToSellSeconds = toDurationSeconds(arrivedTime, happenedAt);
            const statsDate = startOfUtcDay(happenedAt);
            const soldItemCategory = normalizeCategory(existing.itemCategory ?? itemCategory);
            await tx.scanHistoryEvent.create({
                data: {
                    scanHistoryId: existing.id,
                    username: input.username,
                    eventType: "sold_terminal",
                    orderId,
                    orderGroupId,
                    location: input.soldLocation,
                    happenedAt,
                },
            });
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
                },
                update: {
                    itemsSold: {
                        increment: 1,
                    },
                    totalRevenue: {
                        increment: soldValuation,
                    },
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
    async appendPriceChangeIfHistoryExists(input) {
        const happenedAt = input.happenedAt ?? new Date();
        const normalizedPrice = normalizePrice(input.price);
        if (!normalizedPrice) {
            return false;
        }
        const didAppend = await prisma.$transaction(async (tx) => {
            const existing = await tx.scanHistory.findUnique({
                where: {
                    shopId_productId: {
                        shopId: input.shopId,
                        productId: input.productId,
                    },
                },
            });
            if (!existing) {
                return false;
            }
            const latestPrice = await tx.scanHistoryPrice.findFirst({
                where: {
                    scanHistoryId: existing.id,
                },
                orderBy: {
                    happenedAt: "desc",
                },
            });
            if (latestPrice?.price === normalizedPrice) {
                return true;
            }
            await tx.scanHistoryPrice.create({
                data: {
                    scanHistoryId: existing.id,
                    price: normalizedPrice,
                    terminalType: "price_update",
                    happenedAt,
                },
            });
            return true;
        });
        if (didAppend) {
            broadcastToShop(input.shopId, {
                type: "scan_history_updated",
                productId: input.productId,
            });
        }
        return didAppend;
    },
    async listByShopPaginated(input) {
        const skip = (input.page - 1) * input.pageSize;
        const trimmedQuery = input.q?.trim();
        const whereAnd = [
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
        if (trimmedQuery) {
            whereAnd.push({
                OR: buildStringFilterConditions(trimmedQuery, input.stringColumns),
            });
        }
        const where = {
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
//# sourceMappingURL=scan-history.repository.js.map