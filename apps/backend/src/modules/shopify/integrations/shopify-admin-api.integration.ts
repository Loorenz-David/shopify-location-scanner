import { backendPublicUrl, env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { logger } from "../../../shared/logging/logger.js";
import { categoryResolverService } from "../../../shared/category/category-resolver.service.js";
import type { ScanValueType } from "../../../shared/utils/scan-value-normalizer.js";
import type {
  ProductLocationData,
  ProductLocationSnapshot,
} from "../domain/shopify-shop.js";
import {
  buildShopifyPropertyMetafieldSelection,
  extractShopifyScanHistoryProperties,
} from "../domain/shopify-metafield-properties.js";
import type {
  ShopifyMetafieldOptionsDto,
  ShopifySkuSearchItemDto,
} from "../contracts/shopify.contract.js";

type ManagedWebhookTopic = "ORDERS_CREATE" | "ORDERS_PAID" | "PRODUCTS_UPDATE";

type ShopifyProductSearchEdge = {
  node: {
    id: string;
    title: string;
    featuredImage: {
      url: string;
    } | null;
    itemCategoryMeta: { value: string | null } | null;
    quantityMeta: { value: string | null } | null;
    variants: {
      edges: Array<{
        node: {
          sku: string | null;
          barcode: string | null;
        };
      }>;
    };
  };
};

type ShopifyProductSnapshotNode = {
  __typename: "Product";
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  featuredImage: {
    url: string;
  } | null;
  images?: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  } | null;
  itemCategoryMeta: { value: string | null } | null;
  quantityMeta: { value: string | null } | null;
  extensionTypeMeta: { value: string | null } | null;
  extensionQuantityMeta: { value: string | null } | null;
  variants: {
    edges: Array<{
      node: {
        sku: string | null;
        barcode: string | null;
        price: string | null;
      };
    }>;
  };
  itemLocation: { value: string | null } | null;
  itemHeight: { value: string | null } | null;
  itemHeightAlt: { value: string | null } | null;
  itemHeightFallback: { value: string | null } | null;
  itemHeightAltFallback: { value: string | null } | null;
  itemWidth: { value: string | null } | null;
  itemWidthAlt: { value: string | null } | null;
  itemWidthFallback: { value: string | null } | null;
  itemWidthAltFallback: { value: string | null } | null;
  itemDepth: { value: string | null } | null;
  itemDepthAlt: { value: string | null } | null;
  itemDepthFallback: { value: string | null } | null;
  itemDepthAltFallback: { value: string | null } | null;
};

const MAX_PRODUCT_REDIRECT_HOPS = 5;
const SHOPIFY_PROPERTY_METAFIELD_SELECTION =
  buildShopifyPropertyMetafieldSelection();

const MANAGED_WEBHOOK_SUBSCRIPTIONS: Array<{
  topic: ManagedWebhookTopic;
  path: string;
}> = [
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

const managedWebhookCallbackByTopic = new Map(
  MANAGED_WEBHOOK_SUBSCRIPTIONS.map(({ topic, path }) => [
    topic,
    new URL(path, backendPublicUrl).toString(),
  ]),
);

const isWebhookHttpEndpoint = (
  endpoint:
    | {
        __typename: "WebhookHttpEndpoint";
        callbackUrl: string;
      }
    | {
        __typename: string;
      },
): endpoint is {
  __typename: "WebhookHttpEndpoint";
  callbackUrl: string;
} => endpoint.__typename === "WebhookHttpEndpoint";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const extractProductHandleFromPath = (
  value: string | null | undefined,
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed)
        : new URL(trimmed, "https://example.test");
    const segments = url.pathname.split("/").filter(Boolean);
    const productIndex = segments.findIndex(
      (segment) => segment === "products",
    );
    const handle = productIndex >= 0 ? segments[productIndex + 1] : null;
    return handle?.trim() || null;
  } catch {
    const segments = trimmed.split("?")[0]?.split("/").filter(Boolean) ?? [];
    const productIndex = segments.findIndex(
      (segment) => segment === "products",
    );
    const handle = productIndex >= 0 ? segments[productIndex + 1] : null;
    return handle?.trim() || null;
  }
};

const getThrottleRetryDelayMs = (
  errors: unknown,
  attempt: number,
): number | null => {
  if (!Array.isArray(errors)) {
    return null;
  }

  const isThrottled = errors.some((error) => {
    if (!error || typeof error !== "object") {
      return false;
    }

    const extensions =
      "extensions" in error &&
      error.extensions &&
      typeof error.extensions === "object"
        ? error.extensions
        : null;

    return (
      ("message" in error && error.message === "Throttled") ||
      (extensions &&
        "code" in extensions &&
        typeof extensions.code === "string" &&
        extensions.code.toUpperCase() === "THROTTLED")
    );
  });

  if (!isThrottled) {
    return null;
  }

  const baseDelayMs = 1_000;
  const maxDelayMs = 8_000;
  return Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
};

const shopifyGraphql = async <T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const operationName =
    query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1] ?? "anonymous";
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );

    if (!response.ok) {
      const responseBody = await response.text().catch(() => null);

      if (response.status === 429 && attempt < maxAttempts - 1) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : Number.NaN;
        const retryDelayMs =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
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

    const payload = (await response.json()) as {
      data?: T;
      errors?: unknown;
    };

    const throttleRetryDelayMs = getThrottleRetryDelayMs(
      payload.errors,
      attempt,
    );
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

const parseDimensionCm = (value?: string | null): number | null => {
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

const resolveDimensions = (input: {
  height: string | null;
  width: string | null;
  depth: string | null;
}): {
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
} => {
  const itemHeight = parseDimensionCm(input.height);
  const itemWidth = parseDimensionCm(input.width);
  const itemDepth = parseDimensionCm(input.depth);

  return {
    itemHeight,
    itemWidth,
    itemDepth,
    volume:
      itemHeight !== null && itemWidth !== null && itemDepth !== null
        ? itemHeight * itemWidth * itemDepth
        : null,
  };
};

const DIMENSION_NAMESPACE_FALLBACK = "custom";

const inferQuantityFromTitle = (title: string): number | null => {
  const normalized = title.toLowerCase();
  const match = normalized.match(/set\s+of\s+(\d+)/);
  if (!match || !match[1]) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const resolveQuantity = (
  metafieldValue: string | null | undefined,
  itemCategory: string,
  title: string,
): number => {
  const raw = metafieldValue?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  if (itemCategory === "dining_chair") {
    const inferred = inferQuantityFromTitle(title);
    if (inferred !== null) return inferred;
  }

  return 1;
};

const coalesceMetafieldValue = (
  ...values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

const serializeProductImageUrls = (product: {
  featuredImage: { url: string } | null;
  images?: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  } | null;
}): string | null => {
  const urls = [
    product.featuredImage?.url,
    ...(product.images?.edges.map((edge) => edge.node.url) ?? []),
  ]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url))
    .slice(0, 8);

  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls.length > 0 ? uniqueUrls.join(",") : null;
};

const mapProductNodeToLocationSnapshot = (product: {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  featuredImage: {
    url: string;
  } | null;
  images?: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  } | null;
  itemCategoryMeta: { value: string | null } | null;
  quantityMeta: { value: string | null } | null;
  extensionTypeMeta: { value: string | null } | null;
  extensionQuantityMeta: { value: string | null } | null;
  variants: {
    edges: Array<{
      node: {
        sku: string | null;
        barcode: string | null;
        price: string | null;
      };
    }>;
  };
  itemLocation: { value: string | null } | null;
  itemHeight: { value: string | null } | null;
  itemHeightAlt: { value: string | null } | null;
  itemHeightFallback: { value: string | null } | null;
  itemHeightAltFallback: { value: string | null } | null;
  itemWidth: { value: string | null } | null;
  itemWidthAlt: { value: string | null } | null;
  itemWidthFallback: { value: string | null } | null;
  itemWidthAltFallback: { value: string | null } | null;
  itemDepth: { value: string | null } | null;
  itemDepthAlt: { value: string | null } | null;
  itemDepthFallback: { value: string | null } | null;
  itemDepthAltFallback: { value: string | null } | null;
}): ProductLocationSnapshot => {
  const status =
    product.status === "ACTIVE" ||
    product.status === "DRAFT" ||
    product.status === "ARCHIVED" ||
    product.status === "UNLISTED"
      ? product.status
      : "UNKNOWN";

  const properties = extractShopifyScanHistoryProperties({
    extensionTypeMeta: product.extensionTypeMeta,
    extensionQuantityMeta: product.extensionQuantityMeta,
  });

  const dimensions = resolveDimensions({
    height: coalesceMetafieldValue(
      product.itemHeight?.value,
      product.itemHeightAlt?.value,
      product.itemHeightFallback?.value,
      product.itemHeightAltFallback?.value,
    ),
    width: coalesceMetafieldValue(
      product.itemWidth?.value,
      product.itemWidthAlt?.value,
      product.itemWidthFallback?.value,
      product.itemWidthAltFallback?.value,
    ),
    depth: coalesceMetafieldValue(
      product.itemDepth?.value,
      product.itemDepthAlt?.value,
      product.itemDepthFallback?.value,
      product.itemDepthAltFallback?.value,
    ),
  });

  const itemCategory = categoryResolverService.resolve(
    product.itemCategoryMeta?.value,
    product.title,
  );

  return {
    id: product.id,
    title: product.title,
    status,
    itemCategory,
    quantity: resolveQuantity(
      product.quantityMeta?.value,
      itemCategory,
      product.title,
    ),
    properties,
    sku: product.variants.edges[0]?.node.sku ?? null,
    barcode: product.variants.edges[0]?.node.barcode ?? null,
    price: product.variants.edges[0]?.node.price ?? null,
    itemHeight: dimensions.itemHeight,
    itemWidth: dimensions.itemWidth,
    itemDepth: dimensions.itemDepth,
    volume: dimensions.volume,
    imageUrl: serializeProductImageUrls(product),
    updatedAt: product.updatedAt,
    location: product.itemLocation?.value ?? null,
  };
};

const mapProductNodesToLocationSnapshots = (
  nodes: ShopifyProductSnapshotNode[],
): ProductLocationSnapshot[] =>
  nodes.map((node) => mapProductNodeToLocationSnapshot(node));

type ListProductsWithLocationResponse = {
  products: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        title: string;
        status: string;
        updatedAt: string;
        featuredImage: {
          url: string;
        } | null;
        images: {
          edges: Array<{
            node: {
              url: string;
            };
          }>;
        };
        itemCategoryMeta: { value: string | null } | null;
        quantityMeta: { value: string | null } | null;
        extensionTypeMeta: { value: string | null } | null;
        extensionQuantityMeta: { value: string | null } | null;
        variants: {
          edges: Array<{
            node: {
              sku: string | null;
              barcode: string | null;
              price: string | null;
            };
          }>;
        };
        itemLocation: { value: string | null } | null;
        itemHeight: { value: string | null } | null;
        itemHeightAlt: { value: string | null } | null;
        itemHeightFallback: { value: string | null } | null;
        itemHeightAltFallback: { value: string | null } | null;
        itemWidth: { value: string | null } | null;
        itemWidthAlt: { value: string | null } | null;
        itemWidthFallback: { value: string | null } | null;
        itemWidthAltFallback: { value: string | null } | null;
        itemDepth: { value: string | null } | null;
        itemDepthAlt: { value: string | null } | null;
        itemDepthFallback: { value: string | null } | null;
        itemDepthAltFallback: { value: string | null } | null;
      };
    }>;
  };
};

type GetProductsWithLocationResponse = {
  nodes: Array<ShopifyProductSnapshotNode | null>;
};

export const shopifyAdminApi = {
  async exchangeCodeForAccessToken(input: {
    shopDomain: string;
    code: string;
    redirectUri: string;
  }): Promise<string> {
    const response = await fetch(
      `https://${input.shopDomain}/admin/oauth/access_token`,
      {
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
      },
    );

    if (!response.ok) {
      throw new AppError("Failed to exchange Shopify OAuth code", {
        code: "INTERNAL_ERROR",
        statusCode: 502,
        details: { status: response.status },
      });
    }

    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new AppError("Shopify OAuth response missing access token", {
        code: "INTERNAL_ERROR",
        statusCode: 502,
      });
    }

    return payload.access_token;
  },

  async getProductWithLocation(input: {
    shopDomain: string;
    accessToken: string;
    productId: string;
  }): Promise<ProductLocationData> {
    const data = await shopifyGraphql<{
      product: {
        id: string;
        title: string;
        status: string;
        updatedAt: string;
        featuredImage: {
          url: string;
        } | null;
        images: {
          edges: Array<{
            node: {
              url: string;
            };
          }>;
        };
        itemCategoryMeta: { value: string | null } | null;
        quantityMeta: { value: string | null } | null;
        extensionTypeMeta: { value: string | null } | null;
        extensionQuantityMeta: { value: string | null } | null;
        variants: {
          edges: Array<{
            node: {
              sku: string | null;
              barcode: string | null;
              price: string | null;
            };
          }>;
        };
        itemLocation: { value: string | null } | null;
        itemHeight: { value: string | null } | null;
        itemHeightAlt: { value: string | null } | null;
        itemHeightFallback: { value: string | null } | null;
        itemHeightAltFallback: { value: string | null } | null;
        itemWidth: { value: string | null } | null;
        itemWidthAlt: { value: string | null } | null;
        itemWidthFallback: { value: string | null } | null;
        itemWidthAltFallback: { value: string | null } | null;
        itemDepth: { value: string | null } | null;
        itemDepthAlt: { value: string | null } | null;
        itemDepthFallback: { value: string | null } | null;
        itemDepthAltFallback: { value: string | null } | null;
      } | null;
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
          status
          updatedAt
          featuredImage {
            url
          }
          images(first: 8) {
            edges {
              node {
                url
              }
            }
          }
          itemCategoryMeta: metafield(namespace: "custom", key: "productcategory") {
            value
          }
          quantityMeta: metafield(namespace: "custom", key: "quantity") {
            value
          }
          ${SHOPIFY_PROPERTY_METAFIELD_SELECTION}
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
      }`,
      {
        id: input.productId,
        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
        locationKey: env.SHOPIFY_METAFIELD_KEY,
        heightKey: "totalheight",
        heightKeyAlt: "totalheight",
        dimensionNamespaceFallback: DIMENSION_NAMESPACE_FALLBACK,
        widthKey: "totalwidth",
        widthKeyAlt: "totalwidth",
        depthKey: "totaldepth",
        depthKeyAlt: "totaldepth",
      },
    );

    if (!data.product) {
      throw new AppError("Shopify product not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    return mapProductNodeToLocationSnapshot(data.product);
  },

  async getProductsWithLocation(input: {
    shopDomain: string;
    accessToken: string;
    productIds: string[];
  }): Promise<ProductLocationSnapshot[]> {
    const normalizedIds = [
      ...new Set(input.productIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (normalizedIds.length === 0) {
      return [];
    }

    const data = await shopifyGraphql<GetProductsWithLocationResponse>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      query GetProductsWithLocation(
        $ids: [ID!]!
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
        nodes(ids: $ids) {
          __typename
          ... on Product {
            id
            title
            status
            updatedAt
            featuredImage {
              url
            }
            images(first: 8) {
              edges {
                node {
                  url
                }
              }
            }
            itemCategoryMeta: metafield(namespace: "custom", key: "productcategory") {
              value
            }
            quantityMeta: metafield(namespace: "custom", key: "quantity") {
              value
            }
            ${SHOPIFY_PROPERTY_METAFIELD_SELECTION}
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
      }`,
      {
        ids: normalizedIds,
        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
        locationKey: env.SHOPIFY_METAFIELD_KEY,
        heightKey: "totalheight",
        heightKeyAlt: "totalheight",
        dimensionNamespaceFallback: DIMENSION_NAMESPACE_FALLBACK,
        widthKey: "totalwidth",
        widthKeyAlt: "totalwidth",
        depthKey: "totaldepth",
        depthKeyAlt: "totaldepth",
      },
    );

    return mapProductNodesToLocationSnapshots(
      data.nodes.filter(
        (node): node is ShopifyProductSnapshotNode =>
          node !== null && node.__typename === "Product",
      ),
    );
  },

  async listProductsWithLocation(input: {
    shopDomain: string;
    accessToken: string;
    pageSize?: number;
  }): Promise<ProductLocationSnapshot[]> {
    const pageSize = input.pageSize ?? 100;
    const results: ProductLocationSnapshot[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data: ListProductsWithLocationResponse =
        await shopifyGraphql<ListProductsWithLocationResponse>(
          input.shopDomain,
          input.accessToken,
          `#graphql
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
                status
                updatedAt
                featuredImage {
                  url
                }
                images(first: 8) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                itemCategoryMeta: metafield(namespace: "custom", key: "productcategory") {
                  value
                }
                quantityMeta: metafield(namespace: "custom", key: "quantity") {
                  value
                }
                ${SHOPIFY_PROPERTY_METAFIELD_SELECTION}
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
        }`,
          {
            first: pageSize,
            after: cursor,
            namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
            locationKey: env.SHOPIFY_METAFIELD_KEY,
            heightKey: "totalheight",
            heightKeyAlt: "totalheight",
            dimensionNamespaceFallback: DIMENSION_NAMESPACE_FALLBACK,
            widthKey: "totalwidth",
            widthKeyAlt: "totalwidth",
            depthKey: "totaldepth",
            depthKeyAlt: "totaldepth",
          },
        );

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

  async resolveProductIdByHandle(input: {
    shopDomain: string;
    accessToken: string;
    handle: string;
  }): Promise<string | null> {
    const data = await shopifyGraphql<{
      productByHandle: {
        id: string;
      } | null;
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      query ResolveProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
        }
      }`,
      { handle: input.handle },
    );

    return data.productByHandle?.id ?? null;
  },

  async resolveProductIdBySku(input: {
    shopDomain: string;
    accessToken: string;
    sku: string;
  }): Promise<string | null> {
    const results = await this.searchProductsBySku({
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      sku: input.sku,
      limit: 1,
    });

    return results[0]?.productId ?? null;
  },

  async resolveProductIdByBarcode(input: {
    shopDomain: string;
    accessToken: string;
    barcode: string;
  }): Promise<string | null> {
    const normalizedBarcode = input.barcode.trim().toLowerCase();

    const data = await shopifyGraphql<{
      products: {
        edges: Array<{
          node: {
            id: string;
            variants: {
              edges: Array<{
                node: {
                  barcode: string | null;
                };
              }>;
            };
          };
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
      }`,
      {
        first: 20,
        query: `barcode:${input.barcode.trim()}*`,
      },
    );

    const matched = data.products.edges.find((edge) =>
      edge.node.variants.edges.some((variantEdge) => {
        const variantBarcode =
          variantEdge.node.barcode?.trim().toLowerCase() ?? "";
        return variantBarcode === normalizedBarcode;
      }),
    );

    return matched?.node.id ?? null;
  },

  async searchProductsBySku(input: {
    shopDomain: string;
    accessToken: string;
    sku: string;
    type?: ScanValueType;
    limit?: number;
  }): Promise<ShopifySkuSearchItemDto[]> {
    const limit = input.limit ?? 10;
    const normalizedInputSku = input.sku.trim().toLowerCase();

    const searchProducts = async (
      query: string,
    ): Promise<ShopifyProductSearchEdge[]> => {
      const data = await shopifyGraphql<{
        products: {
          edges: ShopifyProductSearchEdge[];
        };
      }>(
        input.shopDomain,
        input.accessToken,
        `#graphql
      query SearchProductsBySku($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              featuredImage {
                url
              }
              itemCategoryMeta: metafield(namespace: "custom", key: "productcategory") {
                value
              }
              quantityMeta: metafield(namespace: "custom", key: "quantity") {
                value
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
      }`,
        {
          first: limit,
          query,
        },
      );

      return data.products.edges;
    };

    const mapProductEdges = (
      edges: ShopifyProductSearchEdge[],
      matchByHandle: boolean,
    ): ShopifySkuSearchItemDto[] =>
      edges
        .map((edge) => {
          const matchedVariant = matchByHandle
            ? edge.node.variants.edges[0]
            : edge.node.variants.edges.find((variantEdge) => {
                const variantSku =
                  variantEdge.node.sku?.trim().toLowerCase() ?? "";
                const variantBarcode =
                  variantEdge.node.barcode?.trim().toLowerCase() ?? "";
                return (
                  variantSku.includes(normalizedInputSku) ||
                  variantBarcode.includes(normalizedInputSku)
                );
              });

          if (!matchedVariant?.node.sku) {
            return null;
          }

          const itemCategory: string | null = categoryResolverService.resolve(
            edge.node.itemCategoryMeta?.value,
            edge.node.title,
          );

          const mappedItem: ShopifySkuSearchItemDto = {
            productId: edge.node.id,
            title: edge.node.title,
            imageUrl: edge.node.featuredImage?.url ?? null,
            itemCategory,
            sku: matchedVariant.node.sku,
            barcode: matchedVariant.node.barcode,
            quantity: resolveQuantity(
              edge.node.quantityMeta?.value,
              itemCategory,
              edge.node.title,
            ),
          };

          return mappedItem;
        })
        .filter((item): item is ShopifySkuSearchItemDto => item !== null)
        .slice(0, limit);

    const query =
      input.type === "url-handle"
        ? `handle:${input.sku.trim()}`
        : `sku:*${input.sku.trim()}* OR barcode:*${input.sku.trim()}*`;

    logger.info("Shopify SKU/product search query started", {
      shopDomain: input.shopDomain,
      inputValue: input.sku,
      inputType: input.type ?? "raw",
      query,
      limit,
    });

    const directEdges = await searchProducts(query);
    const directResults = mapProductEdges(
      directEdges,
      input.type === "url-handle",
    );

    logger.info("Shopify SKU/product search query completed", {
      shopDomain: input.shopDomain,
      inputValue: input.sku,
      inputType: input.type ?? "raw",
      query,
      edgeCount: directEdges.length,
      resultCount: directResults.length,
      edges: directEdges.map((edge) => ({
        productId: edge.node.id,
        title: edge.node.title,
        variants: edge.node.variants.edges.map((variantEdge) => ({
          sku: variantEdge.node.sku,
          barcode: variantEdge.node.barcode,
        })),
      })),
      results: directResults.map((item) => ({
        productId: item.productId,
        title: item.title,
        sku: item.sku,
        barcode: item.barcode,
      })),
    });

    if (directResults.length > 0 || input.type !== "url-handle") {
      return directResults;
    }

    const originalHandle = input.sku.trim();
    const visitedHandles = new Set([originalHandle]);
    let currentHandle = originalHandle;

    for (let hop = 1; hop <= MAX_PRODUCT_REDIRECT_HOPS; hop += 1) {
      const redirectedHandle = await this.findRedirectedProductHandle({
        shopDomain: input.shopDomain,
        accessToken: input.accessToken,
        handle: currentHandle,
      });

      if (!redirectedHandle || visitedHandles.has(redirectedHandle)) {
        return [];
      }

      visitedHandles.add(redirectedHandle);

      const redirectedQuery = `handle:${redirectedHandle}`;
      logger.info("Shopify redirected product search query started", {
        shopDomain: input.shopDomain,
        originalHandle,
        currentHandle,
        redirectedHandle,
        hop,
        query: redirectedQuery,
      });

      const redirectedEdges = await searchProducts(redirectedQuery);
      const redirectedResults = mapProductEdges(redirectedEdges, true);

      logger.info("Shopify redirected product search query completed", {
        shopDomain: input.shopDomain,
        originalHandle,
        currentHandle,
        redirectedHandle,
        hop,
        query: redirectedQuery,
        edgeCount: redirectedEdges.length,
        resultCount: redirectedResults.length,
        results: redirectedResults.map((item) => ({
          productId: item.productId,
          title: item.title,
          sku: item.sku,
          barcode: item.barcode,
        })),
      });

      if (redirectedResults.length > 0) {
        return redirectedResults;
      }

      currentHandle = redirectedHandle;
    }

    return [];
  },

  async findRedirectedProductHandle(input: {
    shopDomain: string;
    accessToken: string;
    handle: string;
  }): Promise<string | null> {
    const handle = input.handle.trim();
    if (!handle) {
      return null;
    }
    const redirectQuery = `path:/products/${handle}`;

    const data = await shopifyGraphql<{
      urlRedirects: {
        edges: Array<{
          node: {
            path: string;
            target: string;
          };
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      query FindProductUrlRedirect($query: String!) {
        urlRedirects(first: 1, query: $query) {
          edges {
            node {
              path
              target
            }
          }
        }
      }`,
      {
        query: redirectQuery,
      },
    );

    const redirect = data.urlRedirects.edges[0]?.node;
    if (!redirect) {
      logger.info("Shopify product URL redirect lookup returned no match", {
        shopDomain: input.shopDomain,
        handle,
        query: redirectQuery,
      });

      return null;
    }

    const redirectedHandle = extractProductHandleFromPath(redirect.target);

    logger.info("Shopify product URL redirect lookup completed", {
      shopDomain: input.shopDomain,
      handle,
      query: redirectQuery,
      redirectPath: redirect.path,
      redirectTarget: redirect.target,
      redirectedHandle,
    });

    return redirectedHandle;
  },

  async getMetafieldOptions(input: {
    shopDomain: string;
    accessToken: string;
  }): Promise<ShopifyMetafieldOptionsDto> {
    const data = await shopifyGraphql<{
      metafieldDefinitions: {
        nodes: Array<{
          type: {
            name: string;
          };
          validations: Array<{
            name: string;
            value: string;
          }>;
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
      }`,
      {
        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
        key: env.SHOPIFY_METAFIELD_KEY,
      },
    );

    const definition = data.metafieldDefinitions.nodes[0];
    const validations = definition?.validations ?? [];
    const options = validations
      .filter((validation) => validation.name === "choices")
      .flatMap((validation) => {
        try {
          const parsed = JSON.parse(validation.value) as string[];
          return parsed.map((value) => ({ label: value, value }));
        } catch {
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

  async upsertMetafieldOptions(input: {
    shopDomain: string;
    accessToken: string;
    options: string[];
  }): Promise<ShopifyMetafieldOptionsDto> {
    const choicesValue = JSON.stringify(input.options);

    const definitionData = await shopifyGraphql<{
      metafieldDefinitions: {
        nodes: Array<{
          id: string;
          type: {
            name: string;
          };
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
      }`,
      {
        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
        key: env.SHOPIFY_METAFIELD_KEY,
      },
    );

    const definition = definitionData.metafieldDefinitions.nodes[0];

    if (definition) {
      const updateData = await shopifyGraphql<{
        metafieldDefinitionUpdate: {
          userErrors: Array<{ field: string[] | null; message: string }>;
        };
      }>(
        input.shopDomain,
        input.accessToken,
        `#graphql
        mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
          metafieldDefinitionUpdate(definition: $definition) {
            userErrors {
              field
              message
            }
          }
        }`,
        {
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
        },
      );

      const firstError = updateData.metafieldDefinitionUpdate.userErrors[0];
      if (firstError) {
        throw new AppError(firstError.message, {
          code: "VALIDATION_ERROR",
          statusCode: 400,
          details: { field: firstError.field },
        });
      }
    } else {
      const createData = await shopifyGraphql<{
        metafieldDefinitionCreate: {
          userErrors: Array<{ field: string[] | null; message: string }>;
        };
      }>(
        input.shopDomain,
        input.accessToken,
        `#graphql
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            userErrors {
              field
              message
            }
          }
        }`,
        {
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
        },
      );

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

  async ensureWebhookSubscriptions(input: {
    shopDomain: string;
    accessToken: string;
  }): Promise<void> {
    const existing = await shopifyGraphql<{
      webhookSubscriptions: {
        edges: Array<{
          node: {
            id: string;
            topic: ManagedWebhookTopic;
            endpoint:
              | {
                  __typename: "WebhookHttpEndpoint";
                  callbackUrl: string;
                }
              | {
                  __typename: string;
                };
          };
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
      }`,
      {
        first: 100,
      },
    );

    for (const { topic, path } of MANAGED_WEBHOOK_SUBSCRIPTIONS) {
      const callbackUrl = new URL(path, backendPublicUrl).toString();
      const alreadySubscribed = existing.webhookSubscriptions.edges.some(
        (edge) =>
          edge.node.topic === topic &&
          isWebhookHttpEndpoint(edge.node.endpoint) &&
          edge.node.endpoint.callbackUrl === callbackUrl,
      );

      if (alreadySubscribed) {
        continue;
      }

      try {
        const created = await shopifyGraphql<{
          webhookSubscriptionCreate: {
            webhookSubscription: {
              id: string;
            } | null;
            userErrors: Array<{ field: string[] | null; message: string }>;
          };
        }>(
          input.shopDomain,
          input.accessToken,
          `#graphql
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
          }`,
          {
            topic,
            callbackUrl,
          },
        );

        const firstError = created.webhookSubscriptionCreate.userErrors[0];
        if (firstError) {
          logger.warn("Shopify webhook subscription creation failed", {
            topic,
            callbackUrl,
            field: firstError.field,
            message: firstError.message,
          });
        }
      } catch (error) {
        logger.warn("Shopify webhook subscription request failed", {
          topic,
          callbackUrl,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  },

  async removeManagedWebhookSubscriptions(input: {
    shopDomain: string;
    accessToken: string;
  }): Promise<void> {
    const existing = await shopifyGraphql<{
      webhookSubscriptions: {
        edges: Array<{
          node: {
            id: string;
            topic: ManagedWebhookTopic;
            endpoint:
              | {
                  __typename: "WebhookHttpEndpoint";
                  callbackUrl: string;
                }
              | {
                  __typename: string;
                };
          };
        }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
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
      }`,
      {
        first: 100,
      },
    );

    const managedSubscriptionIds = existing.webhookSubscriptions.edges
      .filter((edge) => {
        if (!isWebhookHttpEndpoint(edge.node.endpoint)) {
          return false;
        }

        const expectedCallbackUrl = managedWebhookCallbackByTopic.get(
          edge.node.topic,
        );

        return (
          expectedCallbackUrl !== undefined &&
          edge.node.endpoint.callbackUrl === expectedCallbackUrl
        );
      })
      .map((edge) => edge.node.id);

    for (const id of managedSubscriptionIds) {
      const deleted = await shopifyGraphql<{
        webhookSubscriptionDelete: {
          deletedWebhookSubscriptionId: string | null;
          userErrors: Array<{ field: string[] | null; message: string }>;
        };
      }>(
        input.shopDomain,
        input.accessToken,
        `#graphql
        mutation DeleteWebhookSubscription($id: ID!) {
          webhookSubscriptionDelete(id: $id) {
            deletedWebhookSubscriptionId
            userErrors {
              field
              message
            }
          }
        }`,
        {
          id,
        },
      );

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

  async updateProductLocation(input: {
    shopDomain: string;
    accessToken: string;
    productId: string;
    location: string;
  }): Promise<void> {
    logger.info("Shopify GraphQL updateProductLocation request", {
      shopDomain: input.shopDomain,
      productId: input.productId,
      namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
      key: env.SHOPIFY_METAFIELD_KEY,
      location: input.location,
    });

    const data = await shopifyGraphql<{
      productUpdate: {
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      mutation UpdateProductLocation($input: ProductInput!) {
        productUpdate(input: $input) {
          userErrors {
            field
            message
          }
        }
      }`,
      {
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
      },
    );

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
