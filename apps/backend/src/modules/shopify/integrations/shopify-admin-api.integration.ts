import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { ProductLocationData } from "../domain/shopify-shop.js";
import type {
  ShopifyMetafieldOptionsDto,
  ShopifySkuSearchItemDto,
} from "../contracts/shopify.contract.js";

const shopifyGraphql = async <T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
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
    throw new AppError("Shopify API request failed", {
      code: "INTERNAL_ERROR",
      statusCode: 502,
      details: { status: response.status },
    });
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: unknown;
  };

  if (payload.errors || !payload.data) {
    throw new AppError("Shopify GraphQL returned an error", {
      code: "INTERNAL_ERROR",
      statusCode: 502,
      details: payload.errors,
    });
  }

  return payload.data;
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
        updatedAt: string;
        featuredImage: {
          url: string;
        } | null;
        variants: {
          edges: Array<{
            node: {
              sku: string | null;
              barcode: string | null;
            };
          }>;
        };
        itemLocation: { value: string | null } | null;
      } | null;
    }>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      query GetProduct($id: ID!, $namespace: String!, $key: String!) {
        product(id: $id) {
          id
          title
          updatedAt
          featuredImage {
            url
          }
          variants(first: 1) {
            edges {
              node {
                sku
                barcode
              }
            }
          }
          itemLocation: metafield(namespace: $namespace, key: $key) {
            value
          }
        }
      }`,
      {
        id: input.productId,
        namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
        key: env.SHOPIFY_METAFIELD_KEY,
      },
    );

    if (!data.product) {
      throw new AppError("Shopify product not found", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    return {
      id: data.product.id,
      title: data.product.title,
      sku: data.product.variants.edges[0]?.node.sku ?? null,
      barcode: data.product.variants.edges[0]?.node.barcode ?? null,
      imageUrl: data.product.featuredImage?.url ?? null,
      updatedAt: data.product.updatedAt,
      location: data.product.itemLocation?.value ?? null,
    };
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
    limit?: number;
  }): Promise<ShopifySkuSearchItemDto[]> {
    const limit = input.limit ?? 10;
    const normalizedInputSku = input.sku.trim().toLowerCase();

    const data = await shopifyGraphql<{
      products: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            featuredImage: {
              url: string;
            } | null;
            variants: {
              edges: Array<{
                node: {
                  sku: string | null;
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
      }`,
      {
        first: limit,
        query: `sku:*${input.sku.trim()}* OR barcode:*${input.sku.trim()}*`,
      },
    );

    return data.products.edges
      .map((edge) => {
        const matchedVariant = edge.node.variants.edges.find((variantEdge) => {
          const variantSku = variantEdge.node.sku?.trim().toLowerCase() ?? "";
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

        return {
          productId: edge.node.id,
          title: edge.node.title,
          imageUrl: edge.node.featuredImage?.url ?? null,
          sku: matchedVariant.node.sku,
          barcode: matchedVariant.node.barcode,
        };
      })
      .filter((item): item is ShopifySkuSearchItemDto => item !== null)
      .slice(0, limit);
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

  async updateProductLocation(input: {
    shopDomain: string;
    accessToken: string;
    productId: string;
    location: string;
  }): Promise<void> {
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
      throw new AppError(firstError.message, {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: { field: firstError.field },
      });
    }
  },
};
