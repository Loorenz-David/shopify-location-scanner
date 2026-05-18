export const USER_ROLE_LABELS = {
    admin: "Admin",
    manager: "Manager",
    worker: "Worker",
    seller: "Seller",
};
export const USER_ROLE_ORDER = [
    "admin",
    "manager",
    "worker",
    "seller",
];
export const USER_ROLE_COLORS = {
    admin: {
        badge: "bg-rose-100 text-rose-700",
        active: "border-rose-400 bg-rose-50 text-rose-800",
        inactive: "border-slate-200 bg-white text-slate-700",
    },
    manager: {
        badge: "bg-amber-100 text-amber-700",
        active: "border-amber-400 bg-amber-50 text-amber-800",
        inactive: "border-slate-200 bg-white text-slate-700",
    },
    worker: {
        badge: "bg-sky-100 text-sky-700",
        active: "border-sky-400 bg-sky-50 text-sky-800",
        inactive: "border-slate-200 bg-white text-slate-700",
    },
    seller: {
        badge: "bg-emerald-100 text-emerald-700",
        active: "border-emerald-400 bg-emerald-50 text-emerald-800",
        inactive: "border-slate-200 bg-white text-slate-700",
    },
};
export function normalizeUser(dto) {
    return {
        id: dto.id,
        username: dto.username,
        role: dto.role,
        shopId: dto.shopId,
        createdAt: dto.createdAt,
    };
}
export function normalizeUsers(dtos) {
    return dtos.map(normalizeUser);
}
