import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../../shared/database/prisma-client.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { webhookQueue } from "../../../shared/queue/index.js";
import { webhookIntakeRepository } from "../repositories/webhook-intake.repository.js";

const ListWebhookRecordsQuerySchema = z.object({
  status: z.enum(["pending", "processing", "processed", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const ReplayWebhookParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const applyShopScope = (req: Request): { shopId?: string } =>
  req.authUser.shopId ? { shopId: req.authUser.shopId } : {};

export const webhookAdminController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const query = ListWebhookRecordsQuerySchema.parse(req.query);
    const records = await prisma.webhookIntakeRecord.findMany({
      where: {
        ...applyShopScope(req),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: query.limit,
      select: {
        id: true,
        topic: true,
        shopDomain: true,
        webhookId: true,
        status: true,
        attempts: true,
        processedAt: true,
        lastError: true,
        retryable: true,
        receivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ records });
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    const { id } = ReplayWebhookParamsSchema.parse(req.params);
    const record = await prisma.webhookIntakeRecord.findFirst({
      where: {
        id,
        ...applyShopScope(req),
      },
      select: {
        id: true,
        shopId: true,
        shopDomain: true,
        topic: true,
        webhookId: true,
        rawPayload: true,
        status: true,
        attempts: true,
        processedAt: true,
        lastError: true,
        retryable: true,
        receivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!record) {
      throw new NotFoundError("Webhook intake record not found");
    }

    res.status(200).json({ record });
  },

  replay: async (req: Request, res: Response): Promise<void> => {
    const { id } = ReplayWebhookParamsSchema.parse(req.params);
    const intake = await prisma.webhookIntakeRecord.findFirst({
      where: {
        id,
        ...applyShopScope(req),
      },
      select: {
        id: true,
        topic: true,
        shopId: true,
      },
    });

    if (!intake) {
      throw new NotFoundError("Webhook intake record not found");
    }

    if (intake.topic !== "products/update") {
      throw new ValidationError("Replay is only supported for products/update");
    }

    await prisma.webhookIntakeRecord.update({
      where: {
        id: intake.id,
      },
      data: {
        status: "pending",
        processedAt: null,
        lastError: null,
        retryable: true,
      },
    });

    await webhookQueue.add(
      intake.topic,
      {
        intakeId: intake.id,
      },
      {
        jobId: intake.id,
      },
    );

    const record = await webhookIntakeRepository.findById(intake.id);

    res.status(200).json({
      queued: true,
      record,
    });
  },
};
