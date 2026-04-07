import { AppendMetafieldOptionsInputSchema, InstallShopInputSchema, QueryBySkuSchema, RemoveMetafieldOptionParamsSchema, SetMetafieldOptionsInputSchema, ShopifyCallbackQuerySchema, UpdateItemLocationByIdentifierBatchSchema, UpdateItemLocationByIdentifierSchema, UpdateItemLocationInputSchema, } from "../contracts/shopify.contract.js";
import { createInstallUrlCommand } from "../commands/create-install-url.command.js";
import { handleOauthCallbackCommand } from "../commands/handle-oauth-callback.command.js";
import { getProductQuery } from "../queries/get-product.query.js";
import { updateItemLocationCommand } from "../commands/update-item-location.command.js";
import { NotFoundError, ValidationError, } from "../../../shared/errors/http-errors.js";
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
import { appendMetafieldOptionsCommand } from "../commands/append-metafield-options.command.js";
const extractCallbackParams = (req) => {
    const url = new URL(req.originalUrl, "http://localhost");
    const params = {};
    for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
    }
    return params;
};
export const shopifyController = {
    getLinkedShop: async (req, res) => {
        const shop = await getLinkedShopQuery({
            shopId: req.authUser.shopId,
        });
        res.status(200).json({ shop });
    },
    install: async (req, res) => {
        const input = InstallShopInputSchema.parse(req.body);
        const result = await createInstallUrlCommand(input, req.authUser.userId);
        res.status(200).json(result);
    },
    callback: async (req, res) => {
        const parsed = ShopifyCallbackQuerySchema.parse({
            code: req.query.code,
            hmac: req.query.hmac,
            shop: req.query.shop,
            state: req.query.state,
            timestamp: req.query.timestamp,
        });
        const rawParams = extractCallbackParams(req);
        const result = await handleOauthCallbackCommand({
            query: parsed,
            rawParams,
        });
        res.status(200).json({ ok: true, ...result });
    },
    getProduct: async (req, res) => {
        const param = req.params.productId;
        const productId = Array.isArray(param) ? param[0] : param;
        if (!productId) {
            throw new ValidationError("Product id is required");
        }
        const result = await getProductQuery({
            shopId: req.authUser.shopId,
            productId,
        });
        res.status(200).json({ product: result });
    },
    updateLocation: async (req, res) => {
        const param = req.params.productId;
        const productId = Array.isArray(param) ? param[0] : param;
        if (!productId) {
            throw new ValidationError("Product id is required");
        }
        const payload = UpdateItemLocationInputSchema.parse(req.body);
        const result = await updateItemLocationCommand({
            shopId: req.authUser.shopId,
            userId: req.authUser.userId,
            resolvedProductId: productId,
            originalItemId: productId,
            idType: "product_id",
            payload,
        });
        res.status(200).json(result);
    },
    updateLocationByIdentifier: async (req, res) => {
        const parsed = UpdateItemLocationByIdentifierBatchSchema.safeParse(req.body);
        const items = parsed.success
            ? parsed.data.items
            : [UpdateItemLocationByIdentifierSchema.parse(req.body)];
        const shopId = req.authUser.shopId;
        const shop = await shopRepository.findById(shopId);
        if (!shop || !shop.accessToken) {
            throw new NotFoundError("Linked Shopify store not found");
        }
        const accessToken = shop.accessToken;
        const results = await Promise.all(items.map(async (input, index) => {
            try {
                const resolvedProductId = await resolveProductIdCommand({
                    idType: input.idType,
                    itemId: input.itemId,
                    shopDomain: shop.shopDomain,
                    accessToken,
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
                return {
                    index,
                    idType: input.idType,
                    itemId: input.itemId,
                    ok: true,
                    product: result.product,
                    historyItem: result.historyItem,
                };
            }
            catch (error) {
                const appError = error instanceof AppError ? error : null;
                return {
                    index,
                    idType: input.idType,
                    itemId: input.itemId,
                    ok: false,
                    error: {
                        code: appError?.code ?? "INTERNAL_ERROR",
                        message: appError?.message ?? "Unexpected error",
                    },
                };
            }
        }));
        const successCount = results.filter((result) => result.ok).length;
        if (!parsed.success &&
            items.length === 1 &&
            successCount === 1 &&
            results[0]?.ok) {
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
    queryBySku: async (req, res) => {
        const input = QueryBySkuSchema.parse({
            sku: req.query.sku,
        });
        const items = await searchProductsBySkuQuery({
            shopId: req.authUser.shopId,
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
    metafieldOptions: async (req, res) => {
        const metafield = await getMetafieldOptionsQuery({
            shopId: req.authUser.shopId,
        });
        res.status(200).json({ metafield });
    },
    setMetafieldOptions: async (req, res) => {
        const payload = SetMetafieldOptionsInputSchema.parse(req.body);
        const metafield = await setMetafieldOptionsCommand({
            shopId: req.authUser.shopId,
            payload,
        });
        res.status(200).json({ metafield });
    },
    appendMetafieldOptions: async (req, res) => {
        const payload = AppendMetafieldOptionsInputSchema.parse(req.body);
        const metafield = await appendMetafieldOptionsCommand({
            shopId: req.authUser.shopId,
            payload,
        });
        res.status(200).json({ metafield });
    },
    removeMetafieldOption: async (req, res) => {
        const params = RemoveMetafieldOptionParamsSchema.parse(req.params);
        const metafield = await removeMetafieldOptionCommand({
            shopId: req.authUser.shopId,
            optionValue: params.optionValue,
        });
        res.status(200).json({ metafield });
    },
    unlinkShop: async (req, res) => {
        const shop = await unlinkShopCommand({
            shopId: req.authUser.shopId,
        });
        res.status(200).json({ ok: true, shop });
    },
};
//# sourceMappingURL=shopify.controller.js.map