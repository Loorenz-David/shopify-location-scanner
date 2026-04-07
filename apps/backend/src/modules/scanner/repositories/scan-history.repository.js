import { prisma } from "../../../shared/database/prisma-client.js";
const toDomain = (record) => {
    return {
        id: record.id,
        shopId: record.shopId,
        userId: record.userId,
        username: record.username,
        productId: record.productId,
        itemSku: record.itemSku,
        itemImageUrl: record.itemImageUrl,
        itemType: record.itemType,
        itemTitle: record.itemTitle,
        lastModifiedAt: record.lastModifiedAt,
        events: record.events.map((entry) => ({
            username: entry.username,
            location: entry.location,
            happenedAt: entry.happenedAt,
        })),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
};
export const scanHistoryRepository = {
    async appendLocationEvent(input) {
        const happenedAt = input.happenedAt ?? new Date();
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
                return tx.scanHistory.create({
                    data: {
                        shopId: input.shopId,
                        userId: input.userId ?? null,
                        username: input.username,
                        productId: input.productId,
                        itemSku: input.itemSku ?? null,
                        itemImageUrl: input.itemImageUrl ?? null,
                        itemType: input.itemType,
                        itemTitle: input.itemTitle,
                        lastModifiedAt: happenedAt,
                        events: {
                            create: {
                                username: input.username,
                                location: input.location,
                                happenedAt,
                            },
                        },
                    },
                    include: {
                        events: {
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
                    itemSku: input.itemSku ?? null,
                    itemImageUrl: input.itemImageUrl ?? null,
                    itemType: input.itemType,
                    itemTitle: input.itemTitle,
                    lastModifiedAt: happenedAt,
                },
            });
            await tx.scanHistoryEvent.create({
                data: {
                    scanHistoryId: existing.id,
                    username: input.username,
                    location: input.location,
                    happenedAt,
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
                },
            });
        });
        return toDomain(history);
    },
    async listByShopPaginated(input) {
        const skip = (input.page - 1) * input.pageSize;
        const trimmedQuery = input.q?.trim();
        const where = trimmedQuery
            ? {
                shopId: input.shopId,
                OR: [
                    { username: { startsWith: trimmedQuery } },
                    { productId: { startsWith: trimmedQuery } },
                    { itemSku: { startsWith: trimmedQuery } },
                    { itemType: { startsWith: trimmedQuery } },
                    { itemTitle: { startsWith: trimmedQuery } },
                    {
                        events: {
                            some: {
                                username: { startsWith: trimmedQuery },
                            },
                        },
                    },
                    {
                        events: {
                            some: {
                                location: { startsWith: trimmedQuery },
                            },
                        },
                    },
                ],
            }
            : { shopId: input.shopId };
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