import type { Request, Response } from "express";
import {
  AppendMetafieldOptionsInputSchema,
  InstallShopInputSchema,
  QueryBySkuSchema,
  RemoveMetafieldOptionParamsSchema,
  SetMetafieldOptionsInputSchema,
  ShopifyOrdersCreateWebhookPayloadSchema,
  ShopifyOrdersPaidWebhookPayloadSchema,
  ShopifyCallbackQuerySchema,
  UpdateItemLocationByIdentifierBatchSchema,
  UpdateItemLocationByIdentifierSchema,
  UpdateItemLocationInputSchema,
} from "../contracts/shopify.contract.js";
import { createInstallUrlCommand } from "../commands/create-install-url.command.js";
import { handleOauthCallbackCommand } from "../commands/handle-oauth-callback.command.js";
import { getProductQuery } from "../queries/get-product.query.js";
import { updateItemLocationCommand } from "../commands/update-item-location.command.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/http-errors.js";
import { searchProductsBySkuQuery } from "../queries/search-products-by-sku.query.js";
import { getMetafieldOptionsQuery } from "../queries/get-metafield-options.query.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { resolveProductIdCommand } from "../commands/resolve-product-id.command.js";
import { setMetafieldOptionsCommand } from "../commands/set-metafield-options.command.js";
import { getLinkedShopQuery } from "../queries/get-linked-shop.query.js";
import { unlinkShopCommand } from "../commands/unlink-shop.command.js";
import { removeMetafieldOptionCommand } from "../commands/remove-metafield-option.command.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { logger } from "../../../shared/logging/logger.js";
import { env } from "../../../config/env.js";
import { appendMetafieldOptionsCommand } from "../commands/append-metafield-options.command.js";
import { handleOrdersCreateWebhookCommand } from "../commands/handle-orders-create-webhook.command.js";
import { handleOrdersPaidWebhookCommand } from "../commands/handle-orders-paid-webhook.command.js";
import { webhookQueue } from "../../../shared/queue/index.js";
import { webhookIntakeRepository } from "../repositories/webhook-intake.repository.js";

const extractCallbackParams = (req: Request): Record<string, string> => {
  const url = new URL(req.originalUrl, "http://localhost");
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  return params;
};

export const shopifyController = {
  handleProductsUpdateWebhook: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const context = req.webhookContext;
    if (!context) {
      throw new ValidationError("Webhook context missing");
    }

    const { id: intakeId, isDuplicate } =
      await webhookIntakeRepository.createIntakeRecord({
        shopId: context.shopId,
        shopDomain: context.shopDomain,
        topic: context.topic,
        webhookId: context.webhookId,
        rawPayload: context.rawBody,
      });

    await webhookQueue.add(
      context.topic,
      {
        intakeId,
      },
      {
        jobId: intakeId,
      },
    );

    logger.info("Accepted Shopify products/update webhook", {
      shopId: context.shopId,
      shopDomain: context.shopDomain,
      topic: context.topic,
      webhookId: context.webhookId,
      intakeId,
      isDuplicate,
    });

    res.status(200).json({ received: true });
  },

  handleOrdersCreateWebhook: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const context = req.webhookContext;
    if (!context) {
      throw new ValidationError("Webhook context missing");
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(context.rawBody);
    } catch {
      throw new ValidationError("Invalid webhook JSON payload");
    }

    const payload = ShopifyOrdersCreateWebhookPayloadSchema.parse(parsedBody);
    const result = await handleOrdersCreateWebhookCommand({
      shopId: context.shopId,
      shopDomain: context.shopDomain,
      topic: context.topic,
      webhookId: context.webhookId,
      payload,
    });

    res.status(200).json({ ok: true, ...result });
  },

  handleOrdersPaidWebhook: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const context = req.webhookContext;
    if (!context) {
      throw new ValidationError("Webhook context missing");
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(context.rawBody);
    } catch {
      throw new ValidationError("Invalid webhook JSON payload");
    }

    const payload = ShopifyOrdersPaidWebhookPayloadSchema.parse(parsedBody);
    const result = await handleOrdersPaidWebhookCommand({
      shopId: context.shopId,
      shopDomain: context.shopDomain,
      topic: context.topic,
      webhookId: context.webhookId,
      payload,
    });

    res.status(200).json({ ok: true, ...result });
  },

  getLinkedShop: async (req: Request, res: Response): Promise<void> => {
    const shop = await getLinkedShopQuery({
      shopId: req.authUser.shopId as string,
    });

    res.status(200).json({ shop });
  },

  install: async (req: Request, res: Response): Promise<void> => {
    const input = InstallShopInputSchema.parse(req.body);
    const result = await createInstallUrlCommand(input, req.authUser.userId);
    res.status(200).json(result);
  },

  callback: async (req: Request, res: Response): Promise<void> => {
    const parsed = ShopifyCallbackQuerySchema.parse({
      code: req.query.code,
      hmac: req.query.hmac,
      shop: req.query.shop,
      state: req.query.state,
      timestamp: req.query.timestamp,
    });

    const rawParams = extractCallbackParams(req);

    await handleOauthCallbackCommand({
      query: parsed,
      rawParams,
    });

    res.redirect(302, env.FRONTEND_URL);
  },

  getProduct: async (req: Request, res: Response): Promise<void> => {
    const param = req.params.productId;
    const productId = Array.isArray(param) ? param[0] : param;
    if (!productId) {
      throw new ValidationError("Product id is required");
    }

    const result = await getProductQuery({
      shopId: req.authUser.shopId as string,
      productId,
    });

    res.status(200).json({ product: result });
  },

  updateLocation: async (req: Request, res: Response): Promise<void> => {
    const param = req.params.productId;
    const productId = Array.isArray(param) ? param[0] : param;
    if (!productId) {
      throw new ValidationError("Product id is required");
    }

    const payload = UpdateItemLocationInputSchema.parse(req.body);
    const result = await updateItemLocationCommand({
      shopId: req.authUser.shopId as string,
      userId: req.authUser.userId,
      resolvedProductId: productId,
      originalItemId: productId,
      idType: "product_id",
      payload,
    });

    res.status(200).json(result);
  },

  updateLocationByIdentifier: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const parsed = UpdateItemLocationByIdentifierBatchSchema.safeParse(
      req.body,
    );
    const items = parsed.success
      ? parsed.data.items
      : [UpdateItemLocationByIdentifierSchema.parse(req.body)];
    const shopId = req.authUser.shopId as string;

    logger.info("Shopify item location update batch started", {
      requestId: req.requestId,
      route: "/shopify/items/location/by-identifier",
      shopId,
      userId: req.authUser.userId,
      batchSize: items.length,
      inputValidatedAsBatch: parsed.success,
    });

    const shop = await shopRepository.findById(shopId);
    if (!shop || !shop.accessToken) {
      throw new NotFoundError("Linked Shopify store not found");
    }
    const accessToken = shop.accessToken;

    const results = await Promise.all(
      items.map(async (input, index) => {
        try {
          logger.info("Shopify item location update attempt started", {
            requestId: req.requestId,
            shopId,
            userId: req.authUser.userId,
            index,
            idType: input.idType,
            itemId: input.itemId,
            requestedLocation: input.location,
          });

          const resolvedProductId = await resolveProductIdCommand({
            idType: input.idType,
            itemId: input.itemId,
            shopDomain: shop.shopDomain,
            accessToken,
          });

          logger.info("Shopify item identifier resolved", {
            requestId: req.requestId,
            shopId,
            index,
            idType: input.idType,
            itemId: input.itemId,
            resolvedProductId,
          });

          const result = await updateItemLocationCommand({
            shopId,
            userId: req.authUser.userId,
            resolvedProductId,
            originalItemId: input.itemId,
            idType: input.idType,
            payload: {
              location: input.location,
            },
          });

          logger.info("Shopify item location update attempt succeeded", {
            requestId: req.requestId,
            shopId,
            index,
            idType: input.idType,
            itemId: input.itemId,
            resolvedProductId,
            previousLocation: result.product.previousLocation,
            resultingLocation: result.product.location,
            historyItemId: result.historyItem.id,
          });

          return {
            index,
            idType: input.idType,
            itemId: input.itemId,
            ok: true as const,
            product: result.product,
            historyItem: result.historyItem,
          };
        } catch (error) {
          const appError = error instanceof AppError ? error : null;

          logger.warn("Shopify item location update attempt failed", {
            requestId: req.requestId,
            shopId,
            userId: req.authUser.userId,
            index,
            idType: input.idType,
            itemId: input.itemId,
            requestedLocation: input.location,
            errorCode: appError?.code ?? "INTERNAL_ERROR",
            errorMessage: appError?.message ?? "Unexpected error",
          });

          return {
            index,
            idType: input.idType,
            itemId: input.itemId,
            ok: false as const,
            error: {
              code: appError?.code ?? "INTERNAL_ERROR",
              message: appError?.message ?? "Unexpected error",
            },
          };
        }
      }),
    );

    const successCount = results.filter((result) => result.ok).length;

    logger.info("Shopify item location update batch completed", {
      requestId: req.requestId,
      route: "/shopify/items/location/by-identifier",
      shopId,
      userId: req.authUser.userId,
      total: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
    });

    if (
      !parsed.success &&
      items.length === 1 &&
      successCount === 1 &&
      results[0]?.ok
    ) {
      res.status(200).json({
        product: results[0].product,
        historyItem: results[0].historyItem,
      });
      return;
    }

    res.status(200).json({
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
      },
    });
  },

  queryBySku: async (req: Request, res: Response): Promise<void> => {
    const input = QueryBySkuSchema.parse({
      sku: req.query.sku,
    });

    const items = await searchProductsBySkuQuery({
      shopId: req.authUser.shopId as string,
      sku: input.sku,
    });

    logger.info("Shopify SKU query results", {
      requestId: req.requestId,
      route: "/shopify/items/by-sku",
      sku: input.sku,
      count: items.length,
      items,
    });

    res.status(200).json({
      items,
      count: items.length,
    });
  },

  metafieldOptions: async (req: Request, res: Response): Promise<void> => {
    const metafield = await getMetafieldOptionsQuery({
      shopId: req.authUser.shopId as string,
    });

    res.status(200).json({ metafield });
  },

  setMetafieldOptions: async (req: Request, res: Response): Promise<void> => {
    const payload = SetMetafieldOptionsInputSchema.parse(req.body);
    const metafield = await setMetafieldOptionsCommand({
      shopId: req.authUser.shopId as string,
      payload,
    });

    res.status(200).json({ metafield });
  },

  appendMetafieldOptions: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const payload = AppendMetafieldOptionsInputSchema.parse(req.body);
    const metafield = await appendMetafieldOptionsCommand({
      shopId: req.authUser.shopId as string,
      payload,
    });

    res.status(200).json({ metafield });
  },

  removeMetafieldOption: async (req: Request, res: Response): Promise<void> => {
    const params = RemoveMetafieldOptionParamsSchema.parse(req.params);
    const metafield = await removeMetafieldOptionCommand({
      shopId: req.authUser.shopId as string,
      optionValue: params.optionValue,
    });

    res.status(200).json({ metafield });
  },

  unlinkShop: async (req: Request, res: Response): Promise<void> => {
    const shop = await unlinkShopCommand({
      shopId: req.authUser.shopId as string,
    });

    res.status(200).json({ ok: true, shop });
  },
};
