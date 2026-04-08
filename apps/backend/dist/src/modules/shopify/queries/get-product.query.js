import { NotFoundError } from "../../../shared/errors/http-errors.js";
import { shopifyAdminApi } from "../integrations/shopify-admin-api.integration.js";
import { shopRepository } from "../repositories/shop.repository.js";
const normalizeProductId = (productId) => {
    if (productId.startsWith("gid://shopify/Product/")) {
        return productId;
    }
    if (/^\d+$/.test(productId)) {
        return `gid://shopify/Product/${productId}`;
    }
    return productId;
};
export const getProductQuery = async (input) => {
    const shop = await shopRepository.findById(input.shopId);
    if (!shop || !shop.accessToken) {
        throw new NotFoundError("Linked Shopify store not found");
    }
    const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId: normalizeProductId(input.productId),
    });
    return {
        id: product.id,
        title: product.title,
        barcode: product.barcode,
        location: product.location,
        updatedAt: product.updatedAt,
    };
};
//# sourceMappingURL=get-product.query.js.map