interface ItemQuantityPillProps {
  quantity: number | null | undefined;
  itemCategory: string | null | undefined;
  categoryMatch?: string;
  labelPrefix?: string;
  className?: string;
}

interface ResolveItemQuantityPillPropsInput {
  quantity: number | null | undefined;
  itemCategory: string | null | undefined;
  properties?: Record<string, unknown> | null;
}

export function ItemQuantityPill({
  quantity,
  itemCategory,
  categoryMatch = "chair",
  labelPrefix = "+",
  className = "",
}: ItemQuantityPillProps) {
  if (!itemCategory?.toLowerCase().includes(categoryMatch.toLowerCase())) {
    return null;
  }

  const normalizedQuantity =
    typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold leading-none text-slate-600 ${className}`}
      aria-label={`Quantity ${normalizedQuantity}`}
    >
      {labelPrefix}
      {normalizedQuantity}
    </span>
  );
}

export function resolveItemQuantityPillProps({
  quantity,
  itemCategory,
  properties,
}: ResolveItemQuantityPillPropsInput): Pick<
  ItemQuantityPillProps,
  "quantity" | "itemCategory" | "categoryMatch" | "labelPrefix"
> {
  const extensionQuantity = resolveExtensionQuantity(properties);

  if (
    itemCategory?.toLowerCase().includes("table") === true &&
    extensionQuantity !== null
  ) {
    return {
      quantity: extensionQuantity,
      itemCategory,
      categoryMatch: "table",
      labelPrefix: "ext ",
    };
  }

  return {
    quantity,
    itemCategory,
  };
}

function resolveExtensionQuantity(
  properties: Record<string, unknown> | null | undefined,
): number | null {
  const rawValue = properties?.extension_quantity;

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return null;
  }

  const extensionQuantity = Number(rawValue);

  if (!Number.isFinite(extensionQuantity) || extensionQuantity <= 0) {
    return null;
  }

  return extensionQuantity;
}
