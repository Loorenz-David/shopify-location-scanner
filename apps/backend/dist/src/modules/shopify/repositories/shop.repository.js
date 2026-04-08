import { prisma } from "../../../shared/database/prisma-client.js";
const toDomain = (record) => {
    return {
        id: record.id,
        shopDomain: record.shopDomain,
        accessToken: record.accessToken,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
};
export const shopRepository = {
    async findAnyLinkedShop() {
        const record = await prisma.shop.findFirst({
            orderBy: { createdAt: "asc" },
        });
        return record ? toDomain(record) : null;
    },
    async findById(id) {
        const record = await prisma.shop.findUnique({ where: { id } });
        return record ? toDomain(record) : null;
    },
    async findByDomain(shopDomain) {
        const record = await prisma.shop.findUnique({ where: { shopDomain } });
        return record ? toDomain(record) : null;
    },
    async upsertByDomain(input) {
        const record = await prisma.shop.upsert({
            where: { shopDomain: input.shopDomain },
            create: {
                shopDomain: input.shopDomain,
                accessToken: input.accessToken,
            },
            update: {
                accessToken: input.accessToken,
            },
        });
        return toDomain(record);
    },
    async deleteById(id) {
        const record = await prisma.shop.delete({
            where: { id },
        });
        return toDomain(record);
    },
};
//# sourceMappingURL=shop.repository.js.map