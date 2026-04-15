import { prisma } from "../../../shared/database/prisma-client.js";
const toDomain = (record) => {
    return {
        id: record.id,
        username: record.username,
        passwordHash: record.passwordHash,
        role: record.role,
        shopId: record.shopId,
        tokenVersion: record.tokenVersion,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
};
export const userRepository = {
    async findByUsername(username) {
        const record = await prisma.user.findUnique({
            where: { username },
        });
        return record ? toDomain(record) : null;
    },
    async findById(id) {
        const record = await prisma.user.findUnique({
            where: { id },
        });
        return record ? toDomain(record) : null;
    },
    async countUsers() {
        return prisma.user.count();
    },
    async countAdmins() {
        return prisma.user.count({
            where: {
                role: "admin",
            },
        });
    },
    async create(input) {
        const record = await prisma.user.create({
            data: {
                username: input.username,
                passwordHash: input.passwordHash,
                role: input.role,
                shopId: input.shopId ?? null,
            },
        });
        return toDomain(record);
    },
    async assignShop(userId, shopId) {
        await prisma.user.update({
            where: { id: userId },
            data: { shopId },
        });
    },
    async assignUnlinkedUsersToShop(shopId) {
        await prisma.user.updateMany({
            where: {
                shopId: null,
            },
            data: {
                shopId,
            },
        });
    },
    async unassignUsersFromShop(shopId) {
        await prisma.user.updateMany({
            where: {
                shopId,
            },
            data: {
                shopId: null,
            },
        });
    },
    async findAllByShop(shopId) {
        const records = await prisma.user.findMany({
            where: { shopId },
            orderBy: { createdAt: "asc" },
        });
        return records.map(toDomain);
    },
    async updateRole(userId, role) {
        const record = await prisma.user.update({
            where: { id: userId },
            data: { role, tokenVersion: { increment: 1 } },
        });
        return toDomain(record);
    },
    async incrementTokenVersion(userId) {
        await prisma.user.update({
            where: { id: userId },
            data: { tokenVersion: { increment: 1 } },
        });
    },
};
//# sourceMappingURL=user.repository.js.map