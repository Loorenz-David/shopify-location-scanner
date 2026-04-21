import type { UserRole } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";

function buildRoleWhere(
  role: UserRole,
  shopId: string,
): Record<string, any> | null {
  const base = { shopId, isSold: true, logisticsCompletedAt: null };
  const withIntention = {
    ...base,
    intention: { not: null, notIn: ["customer_took_it"] },
  };

  switch (role) {
    case "manager":
      return {
        ...withIntention,
        lastLogisticEventType: "placed",
        fixItem: true,
        isItemFixed: false,
      };
    case "seller":
      return { ...base, intention: null };
    case "worker":
      return { ...withIntention, lastLogisticEventType: "marked_intention" };
    default:
      return null; // admin: no default filters → no badge
  }
}

export const getActiveTaskIdsQuery = async (input: {
  shopId: string;
  role: UserRole;
}): Promise<string[]> => {
  const where = buildRoleWhere(input.role, input.shopId);
  if (!where) return [];

  const records = await prisma.scanHistory.findMany({
    where,
    select: { id: true },
  });

  return records.map((r) => r.id);
};
