import type { Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import { registerOutboundTargetCommand } from "../commands/register-outbound-target.command.js";
import { removeOutboundTargetCommand } from "../commands/remove-outbound-target.command.js";
import { setOutboundTargetActiveCommand } from "../commands/set-outbound-target-active.command.js";
import {
  DeliveryQuerySchema,
  ManagerStockQuerySchema,
  OutboundWebhookTargetParamsSchema,
  RegisterOutboundTargetInputSchema,
  SetOutboundTargetActiveInputSchema,
} from "../contracts/outbound-webhook.contract.js";
import { listDeliveriesQuery } from "../queries/list-deliveries.query.js";
import { listManagerStockQuery } from "../queries/list-manager-stock.query.js";
import { listOutboundTargetsQuery } from "../queries/list-outbound-targets.query.js";

export const outboundWebhookController = {
  async register(req: Request, res: Response): Promise<void> {
    const parsed = RegisterOutboundTargetInputSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const result = await registerOutboundTargetCommand({
      shopId: req.authUser.shopId as string,
      payload: parsed.data,
    });

    res.status(201).json(result);
  },

  async list(req: Request, res: Response): Promise<void> {
    const targets = await listOutboundTargetsQuery({
      shopId: req.authUser.shopId as string,
    });

    res.status(200).json({ targets });
  },

  async deliveries(req: Request, res: Response): Promise<void> {
    const parsed = DeliveryQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const deliveries = await listDeliveriesQuery({
      shopId: req.authUser.shopId as string,
      ...parsed.data,
    });

    res.status(200).json({ deliveries });
  },

  async managerStock(req: Request, res: Response): Promise<void> {
    const parsed = ManagerStockQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const identities = await listManagerStockQuery({
      shopId: req.authUser.shopId as string,
      ...parsed.data,
    });

    res.status(200).json({ identities });
  },

  async toggle(req: Request, res: Response): Promise<void> {
    const params = OutboundWebhookTargetParamsSchema.safeParse(req.params);
    const body = SetOutboundTargetActiveInputSchema.safeParse(req.body);

    if (!params.success) {
      throw new ValidationError(params.error.message);
    }

    if (!body.success) {
      throw new ValidationError(body.error.message);
    }

    await setOutboundTargetActiveCommand({
      id: params.data.id,
      shopId: req.authUser.shopId as string,
      active: body.data.active,
    });

    res.status(204).end();
  },

  async remove(req: Request, res: Response): Promise<void> {
    const params = OutboundWebhookTargetParamsSchema.safeParse(req.params);

    if (!params.success) {
      throw new ValidationError(params.error.message);
    }

    await removeOutboundTargetCommand({
      id: params.data.id,
      shopId: req.authUser.shopId as string,
    });

    res.status(204).end();
  },
};
