interface ItemQuantityPillProps {
  quantity: number | null | undefined;
  itemCategory: string | null | undefined;
  className?: string;
}

export function ItemQuantityPill({
  quantity,
  itemCategory,
  className = "",
}: ItemQuantityPillProps) {
  if (!itemCategory?.toLowerCase().includes("chair")) {
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
      +{normalizedQuantity}
    </span>
  );
}
