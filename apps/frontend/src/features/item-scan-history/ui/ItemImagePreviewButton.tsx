import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";

import { itemImageViewerActions } from "../actions/item-image-viewer.actions";
import { normalizeImageUrls } from "../domain/item-image-viewer.domain";
import { getThumbnailImageUrl } from "../domain/item-image-resolution.domain";
import {
  prefetchFullscreenImage,
} from "../domain/item-image-prefetch.domain";

interface ItemImagePreviewButtonProps {
  imageUrls: string | string[] | null | undefined;
  title?: string | null;
  imageAlt?: string;
  buttonClassName: string;
  imageClassName?: string;
  placeholderClassName?: string;
  placeholderLabel?: string;
  overlay?: ReactNode;
}

export function ItemImagePreviewButton({
  imageUrls,
  title,
  imageAlt = "",
  buttonClassName,
  imageClassName = "h-full w-full object-cover",
  placeholderClassName = "bg-slate-100",
  placeholderLabel,
  overlay,
}: ItemImagePreviewButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const images = useMemo(() => normalizeImageUrls(imageUrls), [imageUrls]);
  const firstImageUrl = images[0] ?? null;

  useEffect(() => {
    const button = buttonRef.current;
    if (
      !button ||
      !firstImageUrl ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        void prefetchFullscreenImage(firstImageUrl, { idle: true });
        observer.disconnect();
      },
      {
        rootMargin: "600px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(button);

    return () => {
      observer.disconnect();
    };
  }, [firstImageUrl]);

  const prefetchPrimaryImage = () => {
    if (!firstImageUrl) {
      return;
    }

    void prefetchFullscreenImage(firstImageUrl, { priority: true });
  };

  if (!firstImageUrl) {
    return (
      <div className={`${buttonClassName} ${placeholderClassName}`} aria-hidden="true">
        {placeholderLabel}
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={buttonClassName}
      onClick={(event) => {
        event.stopPropagation();
        itemImageViewerActions.openImageViewer({
          imageUrls: images,
          title,
        });
      }}
      onFocus={prefetchPrimaryImage}
      onPointerDown={prefetchPrimaryImage}
      onPointerEnter={prefetchPrimaryImage}
      onTouchStart={prefetchPrimaryImage}
      aria-label={`View ${images.length > 1 ? `${images.length} images` : "image"}`}
    >
      <img
        src={getThumbnailImageUrl(firstImageUrl)}
        alt={imageAlt}
        width={128}
        height={128}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className={imageClassName}
        draggable={false}
      />
      {overlay}
    </button>
  );
}
