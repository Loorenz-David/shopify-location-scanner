import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";

export const markItemFixedService = async (input: {
  scanHistoryId: string;
  shopId: string;
}): Promise<void> => {
  logger.info("Mark item fixed started", input);

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
      fixItem: true,
      isItemFixed: false,
    },
    select: { id: true },
  });

  if (!scanHistory) {
    // Covers: wrong shop, not a fix item, already marked as fixed
    throw new NotFoundError("Active fix item not found");
  }

  await prisma.scanHistory.update({
    where: { id: scanHistory.id },
    data: { isItemFixed: true },
  });

  logger.info("Mark item fixed completed", input);
};
