import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireAdminMiddleware } from "../../auth/middleware/require-admin.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import { shopifyController } from "../controllers/shopify.controller.js";
import {
  verifyOrdersCreateWebhookMiddleware,
  verifyOrdersPaidWebhookMiddleware,
  verifyProductsUpdateWebhookMiddleware,
} from "../middleware/verify-shopify-webhook.middleware.js";

export const shopifyRouter = Router();

shopifyRouter.post(
  "/webhooks/orders/create",
  verifyOrdersCreateWebhookMiddleware,
  asyncHandler(shopifyController.handleOrdersCreateWebhook),
);

shopifyRouter.post(
  "/webhooks/orders/paid",
  verifyOrdersPaidWebhookMiddleware,
  asyncHandler(shopifyController.handleOrdersPaidWebhook),
);

shopifyRouter.post(
  "/webhooks/products/update",
  verifyProductsUpdateWebhookMiddleware,
  asyncHandler(shopifyController.handleProductsUpdateWebhook),
);

shopifyRouter.get(
  "/shop",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.getLinkedShop),
);

shopifyRouter.get("/oauth/install", asyncHandler(shopifyController.install));

shopifyRouter.get("/oauth/callback", asyncHandler(shopifyController.callback));

shopifyRouter.get(
  "/products/:productId",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.getProduct),
);

shopifyRouter.patch(
  "/products/:productId/location",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.updateLocation),
);

shopifyRouter.patch(
  "/items/location",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.updateLocationByIdentifier),
);

shopifyRouter.post(
  "/items/location",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.updateLocationByIdentifier),
);

shopifyRouter.get(
  "/items/by-sku",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.queryBySku),
);

shopifyRouter.get(
  "/metafields/options",
  authenticateUserMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.metafieldOptions),
);

shopifyRouter.put(
  "/metafields/options",
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.setMetafieldOptions),
);

shopifyRouter.post(
  "/metafields/options",
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.appendMetafieldOptions),
);

shopifyRouter.delete(
  "/metafields/options/:optionValue",
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.removeMetafieldOption),
);

shopifyRouter.delete(
  "/shop",
  authenticateUserMiddleware,
  requireAdminMiddleware,
  requireShopLinkMiddleware,
  asyncHandler(shopifyController.unlinkShop),
);
