import { NotFoundError, UnauthorizedError, ValidationError, } from "../../../shared/errors/http-errors.js";
import { verifyShopifyWebhookHmac } from "../integrations/shopify-hmac.service.js";
import { shopRepository } from "../repositories/shop.repository.js";
const createVerifyShopifyWebhookMiddleware = (expectedTopic) => {
    return async (req, _res, next) => {
        const shopDomainHeader = req.get("X-Shopify-Shop-Domain");
        const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
        const topicHeader = req.get("X-Shopify-Topic");
        const webhookIdHeader = req.get("X-Shopify-Webhook-Id");
        if (!shopDomainHeader || !hmacHeader || !topicHeader || !webhookIdHeader) {
            throw new UnauthorizedError("Missing Shopify webhook headers");
        }
        if (topicHeader !== expectedTopic) {
            throw new ValidationError("Unsupported Shopify webhook topic", {
                topic: topicHeader,
            });
        }
        const bodyBuffer = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(typeof req.body === "string" ? req.body : "", "utf8");
        const rawBody = bodyBuffer.toString("utf8");
        if (!rawBody) {
            throw new ValidationError("Webhook body is required");
        }
        const isValid = verifyShopifyWebhookHmac({
            rawBody,
            hmacBase64: hmacHeader,
        });
        if (!isValid) {
            throw new UnauthorizedError("Invalid Shopify webhook signature");
        }
        const shop = await shopRepository.findByDomain(shopDomainHeader);
        if (!shop) {
            throw new NotFoundError("Linked Shopify store not found for webhook");
        }
        req.webhookContext = {
            shopId: shop.id,
            shopDomain: shopDomainHeader,
            topic: topicHeader,
            webhookId: webhookIdHeader,
            rawBody,
        };
        next();
    };
};
export const verifyOrdersPaidWebhookMiddleware = createVerifyShopifyWebhookMiddleware("orders/paid");
export const verifyProductsUpdateWebhookMiddleware = createVerifyShopifyWebhookMiddleware("products/update");
//# sourceMappingURL=verify-shopify-webhook.middleware.js.map