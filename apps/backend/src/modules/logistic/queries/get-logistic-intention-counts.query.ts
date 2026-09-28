import { prisma } from "../../../shared/database/prisma-client.js";
import type { GetLogisticItemsQuery } from "../contracts/logistic.contract.js";
import type { LogisticIntention } from "../domain/logistic.domain.js";
import { buildLogisticItemsWhere } from "./logistic-items-filter.js";

export async function getLogisticIntentionCountsQuery(input: {
  shopId: string;
  filters: GetLogisticItemsQuery;
}): Promise<Partial<Record<LogisticIntention, number>>> {
  const rows = await prisma.scanHistory.groupBy({
    by: ["intention"],
    where: buildLogisticItemsWhere(input.shopId, input.filters),
    _count: { _all: true },
  });

  const counts: Partial<Record<LogisticIntention, number>> = {};
  for (const row of rows) {
    if (row.intention) counts[row.intention] = row._count._all;
  }
  return counts;
}
