import { prisma } from "../../../shared/database/prisma-client.js";
import { logger } from "../../../shared/logging/logger.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";

export const updateFixNotesService = async (input: {
  scanHistoryId: string;
  shopId: string;
  fixNotes: string | null;
}): Promise<void> => {
  logger.info("Update fix notes started", input);

  const scanHistory = await prisma.scanHistory.findFirst({
    where: {
      id: input.scanHistoryId,
      shopId: input.shopId,
      isSold: true,
      fixItem: true,
    },
    select: { id: true },
  });

  if (!scanHistory) {
    throw new NotFoundError("Fix item not found");
  }

  await prisma.scanHistory.update({
    where: { id: scanHistory.id },
    data: { fixNotes: input.fixNotes },
  });

  logger.info("Update fix notes completed", input);
};
