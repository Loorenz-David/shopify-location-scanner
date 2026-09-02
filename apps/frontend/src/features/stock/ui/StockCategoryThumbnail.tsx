import { useState } from "react";

import { getCategoryImageUrl } from "../domain/stock-category-images.domain";

// The stand-in when a category has no illustration (context/design-language.md §3.3 —
// placeholder-only). Kept as its own export: it also holds the row's layout slot, so an
// unmatched category still aligns with its neighbours instead of shifting the label left.
export function StockThumbnailPlaceholder({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="block flex-shrink-0 rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundImage:
          "repeating-linear-gradient(135deg, #E6ECE8 0 10px, #F3F6F4 10px 20px)",
      }}
    />
  );
}

// The item category is the only handle the stock screens have on what a row *is*, so the
// thumbnail is looked up from it. Categories outside the map — and images that fail to
// load — fall back to the placeholder rather than leaving a broken-image glyph in a card.
export function StockCategoryThumbnail({
  itemCategory,
  size,
}: {
  itemCategory: string;
  size: number;
}) {
  const url = getCategoryImageUrl(itemCategory);
  // Held by value, not as a boolean, so a row that swaps to another category recovers.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url === null || url === failedUrl) {
    return <StockThumbnailPlaceholder size={size} />;
  }

  return (
    <span
      className="block flex-shrink-0 overflow-hidden rounded-lg bg-[var(--stock-track)]"
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-full w-full object-contain p-1"
        onError={() => setFailedUrl(url)}
      />
    </span>
  );
}
