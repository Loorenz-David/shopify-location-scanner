import type { Request, Response } from "express";
import {
  CreateLogisticLocationInputSchema,
  ClearPendingTasksInputSchema,
  DeletePushSubscriptionInputSchema,
  FulfilItemInputSchema,
  MarkAsCompletedInputSchema,
  MarkAsUncompletedInputSchema,
  MarkItemFixedInputSchema,
  GetLogisticItemsQuerySchema,
  GetLogisticLocationsQuerySchema,
  MarkIntentionInputSchema,
  MarkPlacementInputSchema,
  SavePushSubscriptionInputSchema,
  UpdateFixNotesInputSchema,
  UpdateLogisticLocationInputSchema,
} from "../contracts/logistic.contract.js";
import { logisticLocationRepository } from "../repositories/logistic-location.repository.js";
import { pushSubscriptionRepository } from "../repositories/push-subscription.repository.js";
import { markLogisticIntentionCommand } from "../commands/mark-logistic-intention.command.js";
import { markLogisticPlacementCommand } from "../commands/mark-logistic-placement.command.js";
import { fulfilLogisticItemService } from "../services/fulfil-logistic-item.service.js";
import { markAsCompleted as markAsCompletedService } from "../services/mark-as-completed.service.js";
import { markAsUncompleted } from "../services/mark-as-uncompleted.service.js";
import { markItemFixedService } from "../services/mark-item-fixed.service.js";
import { updateFixNotesService } from "../services/update-fix-notes.service.js";
import { getActiveTaskIdsQuery } from "../queries/get-active-task-ids.query.js";
import { getLogisticItemsQuery } from "../queries/get-logistic-items.query.js";
import { getLogisticIntentionCountsQuery } from "../queries/get-logistic-intention-counts.query.js";
import {
  clearPendingTasks,
  getTaskClearBatchItems,
  listTaskClearBatches,
  previewPendingTaskClear,
  restoreClearedTasks,
} from "../services/clear-pending-tasks.service.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type { UserRole } from "@prisma/client";

function requireTaskClearRole(req: Request): void {
  if (req.authUser.role !== "manager" && req.authUser.role !== "admin") {
    throw new ForbiddenError("Manager or admin role is required");
  }
}

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw new ValidationError(`${name} param is required`);
  return value;
}

export const logisticController = {
  listLocations: async (req: Request, res: Response): Promise<void> => {
    const query = GetLogisticLocationsQuerySchema.parse({
      q: req.query.q,
      zoneType: req.query.zoneType,
    });

    const locations = await logisticLocationRepository.findByShop({
      shopId: req.authUser.shopId as string,
      ...(query.q ? { q: query.q } : {}),
      ...(query.zoneType ? { zoneType: query.zoneType } : {}),
    });

    res.status(200).json({ locations });
  },

  createLocation: async (req: Request, res: Response): Promise<void> => {
    const input = CreateLogisticLocationInputSchema.parse(req.body);

    const location = await logisticLocationRepository.create({
      shopId: req.authUser.shopId as string,
      location: input.location,
      zoneType: input.zoneType,
    });

    logger.info("Logistic location created", {
      shopId: req.authUser.shopId,
      locationId: location.id,
    });

    res.status(201).json({ location });
  },

  updateLocation: async (req: Request, res: Response): Promise<void> => {
    const locationId = req.params["locationId"] as string;
    if (!locationId) throw new ValidationError("locationId param is required");

    const input = UpdateLogisticLocationInputSchema.parse(req.body);

    const location = await logisticLocationRepository.update({
      id: locationId,
      shopId: req.authUser.shopId as string,
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.zoneType !== undefined ? { zoneType: input.zoneType } : {}),
    });

    if (!location) throw new NotFoundError("Logistic location not found");

    logger.info("Logistic location updated", {
      shopId: req.authUser.shopId,
      locationId,
    });

    res.status(200).json({ location });
  },

  deleteLocation: async (req: Request, res: Response): Promise<void> => {
    const locationId = req.params["locationId"] as string;
    if (!locationId) throw new ValidationError("locationId param is required");

    const deleted = await logisticLocationRepository.delete({
      id: locationId,
      shopId: req.authUser.shopId as string,
    });

    if (!deleted) throw new NotFoundError("Logistic location not found");

    logger.info("Logistic location deleted", {
      shopId: req.authUser.shopId,
      locationId,
    });

    res.status(200).json({ ok: true });
  },

  getActiveTaskIds: async (req: Request, res: Response): Promise<void> => {
    const ids = await getActiveTaskIdsQuery({
      shopId: req.authUser.shopId as string,
      role: req.authUser.role as UserRole,
    });
    res.status(200).json({ ids });
  },

  getItems: async (req: Request, res: Response): Promise<void> => {
    const filters = GetLogisticItemsQuerySchema.parse({
      q: req.query.q,
      fixItem: req.query.fixItem,
      isItemFixed: req.query.isItemFixed,
      lastLogisticEventType: req.query.lastLogisticEventType,
      zoneType: req.query.zoneType,
      intention: req.query.intention,
      orderId: req.query.orderId,
      ids: req.query.ids,
      noIntention: req.query.noIntention,
      limit: req.query.limit,
      cursor: req.query.cursor,
    });
    if (filters.lastLogisticEventType === "dismissed") requireTaskClearRole(req);

    const page = await getLogisticItemsQuery({
      shopId: req.authUser.shopId as string,
      filters,
    });

    res.status(200).json(page);
  },

  getIntentionCounts: async (req: Request, res: Response): Promise<void> => {
    const filters = GetLogisticItemsQuerySchema.parse({
      q: req.query.q,
      fixItem: req.query.fixItem,
      isItemFixed: req.query.isItemFixed,
      lastLogisticEventType: req.query.lastLogisticEventType,
      zoneType: req.query.zoneType,
      intention: req.query.intention,
      orderId: req.query.orderId,
      noIntention: req.query.noIntention,
    });
    if (filters.lastLogisticEventType === "dismissed") requireTaskClearRole(req);
    const counts = await getLogisticIntentionCountsQuery({
      shopId: req.authUser.shopId as string,
      filters,
    });
    res.status(200).json({ counts });
  },

  previewPendingTaskClear: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    res.status(200).json(await previewPendingTaskClear(req.authUser.shopId as string));
  },

  clearPendingTasks: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    const input = ClearPendingTasksInputSchema.parse(req.body);
    res.status(200).json(await clearPendingTasks({
      shopId: req.authUser.shopId as string,
      actorUserId: req.authUser.userId,
      actorName: req.authUser.username,
      ...input,
    }));
  },

  listTaskClearBatches: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    res.status(200).json(await listTaskClearBatches(req.authUser.shopId as string, cursor));
  },

  getTaskClearBatchItems: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    res.status(200).json(await getTaskClearBatchItems(
      req.authUser.shopId as string,
      requiredParam(req, "batchId"),
      cursor,
    ));
  },

  restoreTaskClearBatch: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    res.status(200).json(await restoreClearedTasks({
      shopId: req.authUser.shopId as string,
      batchId: requiredParam(req, "batchId"),
      username: req.authUser.username,
    }));
  },

  restoreTaskClearItem: async (req: Request, res: Response): Promise<void> => {
    requireTaskClearRole(req);
    res.status(200).json(await restoreClearedTasks({
      shopId: req.authUser.shopId as string,
      batchId: requiredParam(req, "batchId"),
      scanHistoryId: requiredParam(req, "scanHistoryId"),
      username: req.authUser.username,
    }));
  },

  markIntention: async (req: Request, res: Response): Promise<void> => {
    const payload = MarkIntentionInputSchema.parse(req.body);
    const result = await markLogisticIntentionCommand({
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
      payload,
    });
    res.status(200).json(result);
  },

  markPlacement: async (req: Request, res: Response): Promise<void> => {
    const payload = MarkPlacementInputSchema.parse(req.body);
    const result = await markLogisticPlacementCommand({
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
      callerRole: req.authUser.role as UserRole,
      payload,
    });
    res.status(200).json(result);
  },

  fulfilItem: async (req: Request, res: Response): Promise<void> => {
    const input = FulfilItemInputSchema.parse(req.body);
    await fulfilLogisticItemService({
      scanHistoryId: input.scanHistoryId,
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
    });
    res.status(200).json({ ok: true });
  },

  markAsCompleted: async (req: Request, res: Response): Promise<void> => {
    const input = MarkAsCompletedInputSchema.parse(req.body);
    await markAsCompletedService({
      scanHistoryId: input.scanHistoryId,
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
    });
    res.status(200).json({ ok: true });
  },

  markAsUncompleted: async (req: Request, res: Response): Promise<void> => {
    const input = MarkAsUncompletedInputSchema.parse(req.body);
    await markAsUncompleted({
      scanHistoryId: input.scanHistoryId,
      shopId: req.authUser.shopId as string,
      username: req.authUser.username,
    });
    res.status(200).json({ ok: true });
  },

  markItemFixed: async (req: Request, res: Response): Promise<void> => {
    const input = MarkItemFixedInputSchema.parse(req.body);
    await markItemFixedService({
      scanHistoryId: input.scanHistoryId,
      shopId: req.authUser.shopId as string,
    });
    res.status(200).json({ ok: true });
  },

  updateFixNotes: async (req: Request, res: Response): Promise<void> => {
    const scanHistoryId = req.params["scanHistoryId"] as string;
    if (!scanHistoryId) throw new ValidationError("scanHistoryId param is required");

    const input = UpdateFixNotesInputSchema.parse(req.body);

    await updateFixNotesService({
      scanHistoryId,
      shopId: req.authUser.shopId as string,
      fixNotes: input.fixNotes,
    });

    res.status(200).json({ ok: true });
  },

  savePushSubscription: async (req: Request, res: Response): Promise<void> => {
    logger.info("Save push subscription", { userId: req.authUser.userId });

    const input = SavePushSubscriptionInputSchema.parse(req.body);

    await pushSubscriptionRepository.upsert({
      userId: req.authUser.userId as string,
      shopId: req.authUser.shopId as string,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    });

    res.status(200).json({ ok: true });
  },

  deletePushSubscription: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    logger.info("Delete push subscription", { userId: req.authUser.userId });

    const input = DeletePushSubscriptionInputSchema.parse(req.body);

    await pushSubscriptionRepository.deleteByEndpoint({
      userId: req.authUser.userId as string,
      endpoint: input.endpoint,
    });

    res.status(200).json({ ok: true });
  },
};
