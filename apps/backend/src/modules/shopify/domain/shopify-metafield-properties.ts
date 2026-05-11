export type ShopifyPropertyMetafieldDefinition = {
  alias: string;
  namespace: string;
  key: string;
  propertyKey: string;
};

export const SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS: readonly ShopifyPropertyMetafieldDefinition[] =
  [
    {
      alias: "extensionTypeMeta",
      namespace: "custom",
      key: "extension_type",
      propertyKey: "extension_type",
    },
    {
      alias: "extensionQuantityMeta",
      namespace: "custom",
      key: "extension_quantity",
      propertyKey: "extension_quantity",
    },
  ];

export const buildShopifyPropertyMetafieldSelection = (): string => {
  return SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS.map(
    (definition) =>
      `${definition.alias}: metafield(namespace: "${definition.namespace}", key: "${definition.key}") {\n            value\n          }`,
  ).join("\n");
};

export const extractShopifyScanHistoryProperties = (
  metafieldsByAlias: Record<
    string,
    { value: string | null } | null | undefined
  >,
): Record<string, string> | null => {
  const properties: Record<string, string> = {};

  for (const definition of SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS) {
    const rawValue = metafieldsByAlias[definition.alias]?.value;
    const normalizedValue = rawValue?.trim();

    if (normalizedValue) {
      properties[definition.propertyKey] = normalizedValue;
    }
  }

  return Object.keys(properties).length > 0 ? properties : null;
};
