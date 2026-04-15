import { backendPublicUrl, env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { logger } from "../../../shared/logging/logger.js";
const MANAGED_WEBHOOK_SUBSCRIPTIONS = [
    {
        topic: "ORDERS_CREATE",
        path: "/api/shopify/webhooks/orders/create",
    },
    {
        topic: "ORDERS_PAID",
        path: "/api/shopify/webhooks/orders/paid",
    },
    {
        topic: "PRODUCTS_UPDATE",
        path: "/api/shopify/webhooks/products/update",
    },
];
const managedWebhookCallbackByTopic = new Map(MANAGED_WEBHOOK_SUBSCRIPTIONS.map(({ topic, path }) => [
    topic,
    new URL(path, backendPublicUrl).toString(),
]));
const isWebhookHttpEndpoint = (endpoint) => endpoint.__typename === "WebhookHttpEndpoint";
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getThrottleRetryDelayMs = (errors, attempt) => {
    if (!Array.isArray(errors)) {
        return null;
    }
    const isThrottled = errors.some((error) => {
        if (!error || typeof error !== "object") {
            return false;
        }
        const extensions = "extensions" in error && error.extensions && typeof error.extensions === "object"
            ? error.extensions
            : null;
        return (("message" in error && error.message === "Throttled") ||
            (extensions &&
                "code" in extensions &&
                typeof extensions.code === "string" &&
                extensions.code.toUpperCase() === "THROTTLED"));
    });
    if (!isThrottled) {
        return null;
    }
    const baseDelayMs = 1_000;
    const maxDelayMs = 8_000;
    return Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
};
const shopifyGraphql = async (shopDomain, accessToken, query, variables) => {
    const operationName = query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1] ?? "anonymous";
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await fetch(`https://${shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) {
            const responseBody = await response.text().catch(() => null);
            if (response.status === 429 && attempt < maxAttempts - 1) {
                const retryAfterHeader = response.headers.get("retry-after");
                const retryAfterSeconds = retryAfterHeader
                    ? Number.parseInt(retryAfterHeader, 10)
                    : Number.NaN;
                const retryDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                    ? retryAfterSeconds * 1_000
                    : Math.min(1_000 * 2 ** attempt, 8_000);
                logger.warn("Shopify API throttled request; retrying", {
                    operationName,
                    attempt: attempt + 1,
                    retryDelayMs,
                    status: response.status,
                });
                await sleep(retryDelayMs);
                continue;
            }
            throw new AppError("Shopify API request failed", {
                code: "INTERNAL_ERROR",
                statusCode: 502,
                details: {
                    operationName,
                    status: response.status,
                    responseBody,
                },
            });
        }
        const payload = (await response.json());
        const throttleRetryDelayMs = getThrottleRetryDelayMs(payload.errors, attempt);
        if (throttleRetryDelayMs !== null && attempt < maxAttempts - 1) {
            logger.warn("Shopify GraphQL throttled request; retrying", {
                operationName,
                attempt: attempt + 1,
                retryDelayMs: throttleRetryDelayMs,
            });
            await sleep(throttleRetryDelayMs);
            continue;
        }
        if (payload.errors || !payload.data) {
            throw new AppError("Shopify GraphQL returned an error", {
                code: "INTERNAL_ERROR",
                statusCode: 502,
                details: {
                    operationName,
                    errors: payload.errors ?? null,
                },
            });
        }
        return payload.data;
    }
    throw new AppError("Shopify GraphQL retries exhausted", {
        code: "INTERNAL_ERROR",
        statusCode: 502,
        details: {
            operationName,
        },
    });
};
const parseDimensionCm = (value) => {
    if (!value) {
        return null;
    }
    const match = value.match(/-?\d+(?:[\.,]\d+)?/);
    if (!match) {
        return null;
    }
    const parsed = Number.parseFloat(match[0].replace(/,/g, "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};
const resolveDimensions = (input) => {
    const itemHeight = parseDimensionCm(input.height);
    const itemWidth = parseDimensionCm(input.width);
    const itemDepth = parseDimensionCm(input.depth);
    return {
        itemHeight,
        itemWidth,
        itemDepth,
        volume: itemHeight !== null && itemWidth !== null && itemDepth !== null
            ? itemHeight * itemWidth * itemDepth
            : null,
    };
};
const DIMENSION_NAMESPACE_FALLBACK = "custom";
const coalesceMetafieldValue = (...values) => {
    for (const value of values) {
        const trimmed = value?.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return null;
};
const resolveProductCategory = (productType, collections) => {
    const trimmedType = productType?.trim();
    if (trimmedType) {
        return trimmedType;
    }
    const firstCollection = collections.edges[0]?.node.title?.trim();
    if (firstCollection) {
        return firstCollection;
    }
    return null;
};
const mapProductNodeToLocationSnapshot = (product) => {
    const dimensions = resolveDimensions({
        height: coalesceMetafieldValue(product.itemHeight?.value, product.itemHeightAlt?.value, product.itemHeightFallback?.value, product.itemHeightAltFallback?.value),
        width: coalesceMetafieldValue(product.itemWidth?.value, product.itemWidthAlt?.value, product.itemWidthFallback?.value, product.itemWidthAltFallback?.value),
        depth: coalesceMetafieldValue(product.itemDepth?.value, product.itemDepthAlt?.value, product.itemDepthFallback?.value, product.itemDepthAltFallback?.value),
    });
    return {
        id: product.id,
        title: product.title,
        itemCategory: resolveProductCategory(product.productType, product.collections),
        sku: product.variants.edges[0]?.node.sku ?? null,
        barcode: product.variants.edges[0]?.node.barcode ?? null,
        price: product.variants.edges[0]?.node.price ?? null,
        itemHeight: dimensions.itemHeight,
        itemWidth: dimensions.itemWidth,
        itemDepth: dimensions.itemDepth,
        volume: dimensions.volume,
        imageUrl: product.featuredImage?.url ?? null,
        updatedAt: product.updatedAt,
        location: product.itemLocation?.value ?? null,
    };
};
export const shopifyAdminApi = {
    async exchangeCodeForAccessToken(input) {
        const response = await fetch(`https://${input.shopDomain}/admin/oauth/access_token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: env.SHOPIFY_API_KEY,
                client_secret: env.SHOPIFY_API_SECRET,
                code: input.code,
                redirect_uri: input.redirectUri,
            }),
        });
        if (!response.ok) {
            throw new AppError("Failed to exchange Shopify OAuth code", {
                code: "INTERNAL_ERROR",
                statusCode: 502,
                details: { status: response.status },
            });
        }
        const payload = (await response.json());
        if (!payload.access_token) {
            throw new AppError("Shopify OAuth response missing access token", {
                code: "INTERNAL_ERROR",
                statusCode: 502,
            });
        }
        return payload.access_token;
    },
    async getProductWithLocation(input) {
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query GetProduct(
        $id: ID!
        $namespace: String!
        $locationKey: String!
        $heightKey: String!
        $heightKeyAlt: String!
        $dimensionNamespaceFallback: String!
        $widthKey: String!
        $widthKeyAlt: String!
        $depthKey: String!
        $depthKeyAlt: String!
      ) {
        product(id: $id) {
          id
          title
          productType
          updatedAt
          featuredImage {
            url
          }
          collections(first: 5) {
            edges {
              node {
                title
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                sku
                barcode
                price
              }
            }
          }
          itemLocation: metafield(namespace: $namespace, key: $locationKey) {
            value
          }
          itemHeight: metafield(namespace: $namespace, key: $heightKey) {
            value
          }
          itemHeightAlt: metafield(namespace: $namespace, key: $heightKeyAlt) {
            value
          }
          itemHeightFallback: metafield(namespace: $dimensionNamespaceFallback, key: $heightKey) {
            value
          }
          itemHeightAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $heightKeyAlt) {
            value
          }
          itemWidth: metafield(namespace: $namespace, key: $widthKey) {
            value
          }
          itemWidthAlt: metafield(namespace: $namespace, key: $widthKeyAlt) {
            value
          }
          itemWidthFallback: metafield(namespace: $dimensionNamespaceFallback, key: $widthKey) {
            value
          }
          itemWidthAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $widthKeyAlt) {
            value
          }
          itemDepth: metafield(namespace: $namespace, key: $depthKey) {
            value
          }
          itemDepthAlt: metafield(namespace: $namespace, key: $depthKeyAlt) {
            value
          }
          itemDepthFallback: metafield(namespace: $dimensionNamespaceFallback, key: $depthKey) {
            value
          }
          itemDepthAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $depthKeyAlt) {
            value
          }
        }
      }`, {
            id: input.productId,
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            locationKey: env.SHOPIFY_METAFIELD_KEY,
            heightKey: "height",
            heightKeyAlt: "Height",
            dimensionNamespaceFallback: DIMENSION_NAMESPACE_FALLBACK,
            widthKey: "width",
            widthKeyAlt: "Width",
            depthKey: "depth",
            depthKeyAlt: "Depth",
        });
        if (!data.product) {
            throw new AppError("Shopify product not found", {
                code: "NOT_FOUND",
                statusCode: 404,
            });
        }
        return mapProductNodeToLocationSnapshot(data.product);
    },
    async listProductsWithLocation(input) {
        const pageSize = input.pageSize ?? 100;
        const results = [];
        let hasNextPage = true;
        let cursor = null;
        while (hasNextPage) {
            const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
        query ListProductsWithLocation(
          $first: Int!
          $after: String
          $namespace: String!
          $locationKey: String!
          $heightKey: String!
          $heightKeyAlt: String!
          $dimensionNamespaceFallback: String!
          $widthKey: String!
          $widthKeyAlt: String!
          $depthKey: String!
          $depthKeyAlt: String!
        ) {
          products(first: $first, after: $after) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                title
                productType
                updatedAt
                featuredImage {
                  url
                }
                collections(first: 5) {
                  edges {
                    node {
                      title
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      sku
                      barcode
                      price
                    }
                  }
                }
                itemLocation: metafield(namespace: $namespace, key: $locationKey) {
                  value
                }
                itemHeight: metafield(namespace: $namespace, key: $heightKey) {
                  value
                }
                itemHeightAlt: metafield(namespace: $namespace, key: $heightKeyAlt) {
                  value
                }
                itemHeightFallback: metafield(namespace: $dimensionNamespaceFallback, key: $heightKey) {
                  value
                }
                itemHeightAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $heightKeyAlt) {
                  value
                }
                itemWidth: metafield(namespace: $namespace, key: $widthKey) {
                  value
                }
                itemWidthAlt: metafield(namespace: $namespace, key: $widthKeyAlt) {
                  value
                }
                itemWidthFallback: metafield(namespace: $dimensionNamespaceFallback, key: $widthKey) {
                  value
                }
                itemWidthAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $widthKeyAlt) {
                  value
                }
                itemDepth: metafield(namespace: $namespace, key: $depthKey) {
                  value
                }
                itemDepthAlt: metafield(namespace: $namespace, key: $depthKeyAlt) {
                  value
                }
                itemDepthFallback: metafield(namespace: $dimensionNamespaceFallback, key: $depthKey) {
                  value
                }
                itemDepthAltFallback: metafield(namespace: $dimensionNamespaceFallback, key: $depthKeyAlt) {
                  value
                }
              }
            }
          }
        }`, {
                first: pageSize,
                after: cursor,
                namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
                locationKey: env.SHOPIFY_METAFIELD_KEY,
                heightKey: "height",
                heightKeyAlt: "Height",
                dimensionNamespaceFallback: DIMENSION_NAMESPACE_FALLBACK,
                widthKey: "width",
                widthKeyAlt: "Width",
                depthKey: "depth",
                depthKeyAlt: "Depth",
            });
            for (const edge of data.products.edges) {
                const location = edge.node.itemLocation?.value?.trim();
                if (!location) {
                    continue;
                }
                results.push(mapProductNodeToLocationSnapshot(edge.node));
            }
            hasNextPage = data.products.pageInfo.hasNextPage;
            cursor = data.products.edges.at(-1)?.cursor ?? null;
        }
        return results;
    },
    async resolveProductIdByHandle(input) {
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query ResolveProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
        }
      }`, { handle: input.handle });
        return data.productByHandle?.id ?? null;
    },
    async resolveProductIdBySku(input) {
        const results = await this.searchProductsBySku({
            shopDomain: input.shopDomain,
            accessToken: input.accessToken,
            sku: input.sku,
            limit: 1,
        });
        return results[0]?.productId ?? null;
    },
    async resolveProductIdByBarcode(input) {
        const normalizedBarcode = input.barcode.trim().toLowerCase();
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query ResolveProductByBarcode($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              variants(first: 20) {
                edges {
                  node {
                    barcode
                  }
                }
              }
            }
          }
        }
      }`, {
            first: 20,
            query: `barcode:${input.barcode.trim()}*`,
        });
        const matched = data.products.edges.find((edge) => edge.node.variants.edges.some((variantEdge) => {
            const variantBarcode = variantEdge.node.barcode?.trim().toLowerCase() ?? "";
            return variantBarcode === normalizedBarcode;
        }));
        return matched?.node.id ?? null;
    },
    async searchProductsBySku(input) {
        const limit = input.limit ?? 10;
        const normalizedInputSku = input.sku.trim().toLowerCase();
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query SearchProductsBySku($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              featuredImage {
                url
              }
              variants(first: 20) {
                edges {
                  node {
                    sku
                    barcode
                  }
                }
              }
            }
          }
        }
      }`, {
            first: limit,
            query: `sku:*${input.sku.trim()}* OR barcode:*${input.sku.trim()}*`,
        });
        return data.products.edges
            .map((edge) => {
            const matchedVariant = edge.node.variants.edges.find((variantEdge) => {
                const variantSku = variantEdge.node.sku?.trim().toLowerCase() ?? "";
                const variantBarcode = variantEdge.node.barcode?.trim().toLowerCase() ?? "";
                return (variantSku.includes(normalizedInputSku) ||
                    variantBarcode.includes(normalizedInputSku));
            });
            if (!matchedVariant?.node.sku) {
                return null;
            }
            return {
                productId: edge.node.id,
                title: edge.node.title,
                imageUrl: edge.node.featuredImage?.url ?? null,
                sku: matchedVariant.node.sku,
                barcode: matchedVariant.node.barcode,
            };
        })
            .filter((item) => item !== null)
            .slice(0, limit);
    },
    async getMetafieldOptions(input) {
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query GetMetafieldDefinition($namespace: String!, $key: String!) {
        metafieldDefinitions(
          first: 1,
          ownerType: PRODUCT,
          namespace: $namespace,
          key: $key
        ) {
          nodes {
            type {
              name
            }
            validations {
              name
              value
            }
          }
        }
      }`, {
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            key: env.SHOPIFY_METAFIELD_KEY,
        });
        const definition = data.metafieldDefinitions.nodes[0];
        const validations = definition?.validations ?? [];
        const options = validations
            .filter((validation) => validation.name === "choices")
            .flatMap((validation) => {
            try {
                const parsed = JSON.parse(validation.value);
                return parsed.map((value) => ({ label: value, value }));
            }
            catch {
                return [];
            }
        });
        return {
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            key: env.SHOPIFY_METAFIELD_KEY,
            type: definition?.type.name ?? "single_line_text_field",
            options,
        };
    },
    async upsertMetafieldOptions(input) {
        const choicesValue = JSON.stringify(input.options);
        const definitionData = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query GetMetafieldDefinitionId($namespace: String!, $key: String!) {
        metafieldDefinitions(
          first: 1,
          ownerType: PRODUCT,
          namespace: $namespace,
          key: $key
        ) {
          nodes {
            id
            type {
              name
            }
          }
        }
      }`, {
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            key: env.SHOPIFY_METAFIELD_KEY,
        });
        const definition = definitionData.metafieldDefinitions.nodes[0];
        if (definition) {
            const updateData = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
        mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
          metafieldDefinitionUpdate(definition: $definition) {
            userErrors {
              field
              message
            }
          }
        }`, {
                definition: {
                    ownerType: "PRODUCT",
                    namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
                    key: env.SHOPIFY_METAFIELD_KEY,
                    validations: [
                        {
                            name: "choices",
                            value: choicesValue,
                        },
                    ],
                },
            });
            const firstError = updateData.metafieldDefinitionUpdate.userErrors[0];
            if (firstError) {
                throw new AppError(firstError.message, {
                    code: "VALIDATION_ERROR",
                    statusCode: 400,
                    details: { field: firstError.field },
                });
            }
        }
        else {
            const createData = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            userErrors {
              field
              message
            }
          }
        }`, {
                definition: {
                    name: "Item Location",
                    ownerType: "PRODUCT",
                    namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
                    key: env.SHOPIFY_METAFIELD_KEY,
                    type: "single_line_text_field",
                    validations: [
                        {
                            name: "choices",
                            value: choicesValue,
                        },
                    ],
                },
            });
            const firstError = createData.metafieldDefinitionCreate.userErrors[0];
            if (firstError) {
                throw new AppError(firstError.message, {
                    code: "VALIDATION_ERROR",
                    statusCode: 400,
                    details: { field: firstError.field },
                });
            }
        }
        return this.getMetafieldOptions({
            shopDomain: input.shopDomain,
            accessToken: input.accessToken,
        });
    },
    async ensureWebhookSubscriptions(input) {
        const existing = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query GetWebhookSubscriptions($first: Int!) {
        webhookSubscriptions(first: $first) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
            }
          }
        }
      }`, {
            first: 100,
        });
        for (const { topic, path } of MANAGED_WEBHOOK_SUBSCRIPTIONS) {
            const callbackUrl = new URL(path, backendPublicUrl).toString();
            const alreadySubscribed = existing.webhookSubscriptions.edges.some((edge) => edge.node.topic === topic &&
                isWebhookHttpEndpoint(edge.node.endpoint) &&
                edge.node.endpoint.callbackUrl === callbackUrl);
            if (alreadySubscribed) {
                continue;
            }
            try {
                const created = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
          mutation CreateWebhookSubscription(
            $topic: WebhookSubscriptionTopic!
            $callbackUrl: URL!
          ) {
            webhookSubscriptionCreate(
              topic: $topic
              webhookSubscription: {
                callbackUrl: $callbackUrl
                format: JSON
              }
            ) {
              webhookSubscription {
                id
              }
              userErrors {
                field
                message
              }
            }
          }`, {
                    topic,
                    callbackUrl,
                });
                const firstError = created.webhookSubscriptionCreate.userErrors[0];
                if (firstError) {
                    logger.warn("Shopify webhook subscription creation failed", {
                        topic,
                        callbackUrl,
                        field: firstError.field,
                        message: firstError.message,
                    });
                }
            }
            catch (error) {
                logger.warn("Shopify webhook subscription request failed", {
                    topic,
                    callbackUrl,
                    error: error instanceof Error ? error.message : "unknown",
                });
            }
        }
    },
    async removeManagedWebhookSubscriptions(input) {
        const existing = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      query GetWebhookSubscriptions($first: Int!) {
        webhookSubscriptions(first: $first) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
            }
          }
        }
      }`, {
            first: 100,
        });
        const managedSubscriptionIds = existing.webhookSubscriptions.edges
            .filter((edge) => {
            if (!isWebhookHttpEndpoint(edge.node.endpoint)) {
                return false;
            }
            const expectedCallbackUrl = managedWebhookCallbackByTopic.get(edge.node.topic);
            return (expectedCallbackUrl !== undefined &&
                edge.node.endpoint.callbackUrl === expectedCallbackUrl);
        })
            .map((edge) => edge.node.id);
        for (const id of managedSubscriptionIds) {
            const deleted = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
        mutation DeleteWebhookSubscription($id: ID!) {
          webhookSubscriptionDelete(id: $id) {
            deletedWebhookSubscriptionId
            userErrors {
              field
              message
            }
          }
        }`, {
                id,
            });
            const firstError = deleted.webhookSubscriptionDelete.userErrors[0];
            if (firstError) {
                throw new AppError(firstError.message, {
                    code: "INTERNAL_ERROR",
                    statusCode: 502,
                    details: {
                        id,
                        field: firstError.field,
                    },
                });
            }
        }
    },
    async updateProductLocation(input) {
        logger.info("Shopify GraphQL updateProductLocation request", {
            shopDomain: input.shopDomain,
            productId: input.productId,
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            key: env.SHOPIFY_METAFIELD_KEY,
            location: input.location,
        });
        const data = await shopifyGraphql(input.shopDomain, input.accessToken, `#graphql
      mutation UpdateProductLocation($input: ProductInput!) {
        productUpdate(input: $input) {
          userErrors {
            field
            message
          }
        }
      }`, {
            input: {
                id: input.productId,
                metafields: [
                    {
                        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
                        key: env.SHOPIFY_METAFIELD_KEY,
                        type: "single_line_text_field",
                        value: input.location,
                    },
                ],
            },
        });
        const firstError = data.productUpdate.userErrors[0];
        if (firstError) {
            logger.warn("Shopify GraphQL updateProductLocation returned user error", {
                shopDomain: input.shopDomain,
                productId: input.productId,
                location: input.location,
                field: firstError.field,
                message: firstError.message,
            });
            throw new AppError(firstError.message, {
                code: "VALIDATION_ERROR",
                statusCode: 400,
                details: { field: firstError.field },
            });
        }
        logger.info("Shopify GraphQL updateProductLocation succeeded", {
            shopDomain: input.shopDomain,
            productId: input.productId,
            location: input.location,
        });
    },
};
//# sourceMappingURL=shopify-admin-api.integration.js.map