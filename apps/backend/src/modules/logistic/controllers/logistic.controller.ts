import type { Request, Response } from "express";
import {
  CreateLogisticLocationInputSchema,
  DeletePushSubscriptionInputSchema,
  FulfilItemInputSchema,
  GetLogisticItemsQuerySchema,
  GetLogisticLocationsQuerySchema,
  MarkIntentionInputSchema,
  MarkPlacementInputSchema,
  SavePushSubscriptionInputSchema,
  UpdateLogisticLocationInputSchema,
} from "../contracts/logistic.contract.js";
import { logisticLocationRepository } from "../repositories/logistic-location.repository.js";
import { pushSubscriptionRepository } from "../repositories/push-subscription.repository.js";
import { markLogisticIntentionCommand } from "../commands/mark-logistic-intention.command.js";
import { markLogisticPlacementCommand } from "../commands/mark-logistic-placement.command.js";
import { fulfilLogisticItemService } from "../services/fulfil-logistic-item.service.js";
import { getLogisticItemsQuery } from "../queries/get-logistic-items.query.js";
import { logger } from "../../../shared/logging/logger.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import type { UserRole } from "@prisma/client";

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

  getItems: async (req: Request, res: Response): Promise<void> => {
    const filters = GetLogisticItemsQuerySchema.parse({
      fixItem: req.query.fixItem,
      lastLogisticEventType: req.query.lastLogisticEventType,
      zoneType: req.query.zoneType,
      intention: req.query.intention,
      orderId: req.query.orderId,
    });

    const page = await getLogisticItemsQuery({
      shopId: req.authUser.shopId as string,
      filters,
    });

    res.status(200).json(page);
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
