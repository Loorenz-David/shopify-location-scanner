import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/database/prisma-client.js";

const toDedupeKey = (input: {
  shopId: string;
  topic: string;
  webhookId: string;
}): string => `${input.shopId}:${input.topic}:${input.webhookId}`;

export const webhookIntakeRepository = {
  async createIntakeRecord(input: {
    shopId: string;
    shopDomain: string;
    topic: string;
    webhookId: string;
    rawPayload: string;
  }): Promise<{ id: string; isDuplicate: boolean }> {
    const dedupeKey = toDedupeKey(input);

    try {
      const record = await prisma.webhookIntakeRecord.create({
        data: {
          shopId: input.shopId,
          shopDomain: input.shopDomain,
          topic: input.topic,
          webhookId: input.webhookId,
          rawPayload: input.rawPayload,
          dedupeKey,
          status: "pending",
        },
        select: {
          id: true,
        },
      });

      return {
        id: record.id,
        isDuplicate: false,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.webhookIntakeRecord.findUniqueOrThrow({
          where: {
            dedupeKey,
          },
          select: {
            id: true,
          },
        });

        return {
          id: existing.id,
          isDuplicate: true,
        };
      }

      throw error;
    }
  },

  async findById(id: string) {
    return prisma.webhookIntakeRecord.findUnique({
      where: {
        id,
      },
    });
  },

  async markProcessing(id: string) {
    return prisma.webhookIntakeRecord.update({
      where: {
        id,
      },
      data: {
        status: "processing",
        attempts: {
          increment: 1,
        },
        lastError: null,
      },
    });
  },

  async markProcessed(id: string) {
    return prisma.webhookIntakeRecord.update({
      where: {
        id,
      },
      data: {
        status: "processed",
        processedAt: new Date(),
        lastError: null,
      },
    });
  },

  async markFailed(id: string, error: string, retryable: boolean) {
    return prisma.webhookIntakeRecord.update({
      where: {
        id,
      },
      data: {
        status: "failed",
        lastError: error.slice(0, 2_000),
        retryable,
      },
    });
  },
};
