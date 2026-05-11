import { motion, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  getFullscreenImageUrl,
  getThumbnailImageUrl,
} from "../domain/item-image-resolution.domain";
import {
  getItemImagePrefetchStatus,
  prefetchFullscreenImage,
} from "../domain/item-image-prefetch.domain";

interface ItemImageCarouselProps {
  images: string[];
  currentIndex: number;
  onImageChange: (newIndex: number) => void;
}

export function ItemImageCarousel({
  images,
  currentIndex,
  onImageChange,
}: ItemImageCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Swipe detection thresholds
  const SWIPE_DISTANCE_THRESHOLD = 50; // pixels
  const SWIPE_VELOCITY_THRESHOLD = 500; // pixels/second
  const DRAG_ELASTICITY = 0.1; // Allow slight over-drag at boundaries

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;
  const trackX =
    containerWidth > 0 ? -currentIndex * containerWidth : `${-currentIndex * 100}%`;

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const swipeDistance = info.offset.x;
    const swipeVelocity = info.velocity.x;

    // Detect swipe left (next image)
    const isSwipeLeft =
      swipeDistance < -SWIPE_DISTANCE_THRESHOLD ||
      swipeVelocity < -SWIPE_VELOCITY_THRESHOLD;

    // Detect swipe right (previous image)
    const isSwipeRight =
      swipeDistance > SWIPE_DISTANCE_THRESHOLD ||
      swipeVelocity > SWIPE_VELOCITY_THRESHOLD;

    if (isSwipeLeft && canGoNext) {
      onImageChange(currentIndex + 1);
    } else if (isSwipeRight && canGoPrevious) {
      onImageChange(currentIndex - 1);
    }
    // Otherwise snap back to current image (no action needed, animation handles it)
  };

  // Prevent zoom on double-tap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    return () => container.removeEventListener("touchstart", handleTouchStart);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncWidth = () => {
      setContainerWidth(container.getBoundingClientRect().width);
    };

    syncWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncWidth);
      return () => window.removeEventListener("resize", syncWidth);
    }

    const observer = new ResizeObserver(syncWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        className="flex h-full w-full"
        animate={{ x: trackX }}
        drag={images.length > 1 ? "x" : false}
        dragElastic={DRAG_ELASTICITY}
        dragConstraints={{
          left:
            containerWidth > 0
              ? -(images.length - 1) * containerWidth
              : 0,
          right: 0,
        }}
        onDragEnd={handleDragEnd}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          touchAction: "pan-y",
          cursor: images.length > 1 ? "grab" : "default",
        }}
      >
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className="w-full flex-shrink-0 flex items-center justify-center bg-black"
            style={{ height: "100%" }}
          >
            <CarouselImage
              imageUrl={imageUrl}
              alt={`Image ${index + 1}`}
              isActive={index === currentIndex}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

interface CarouselImageProps {
  imageUrl: string;
  alt: string;
  isActive: boolean;
}

function CarouselImage({ imageUrl, alt, isActive }: CarouselImageProps) {
  const fullscreenUrl = getFullscreenImageUrl(imageUrl);
  const thumbnailUrl = getThumbnailImageUrl(imageUrl);
  const [isFullscreenReady, setIsFullscreenReady] = useState(
    () => getItemImagePrefetchStatus(imageUrl) === "loaded",
  );

  useEffect(() => {
    let disposed = false;

    void prefetchFullscreenImage(imageUrl, {
      priority: isActive,
      idle: !isActive,
    }).finally(() => {
      if (!disposed) {
        setIsFullscreenReady(getItemImagePrefetchStatus(imageUrl) === "loaded");
      }
    });

    return () => {
      disposed = true;
    };
  }, [imageUrl, isActive]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {!isFullscreenReady ? (
        <motion.img
          src={thumbnailUrl}
          alt={alt}
          className="block h-auto max-h-full w-auto max-w-full object-contain"
          draggable={false}
          decoding="async"
          fetchPriority="low"
        />
      ) : null}

      {isActive || isFullscreenReady ? (
        <motion.img
          src={fullscreenUrl}
          alt={alt}
          className={`block h-auto max-h-full w-auto max-w-full object-contain transition-opacity duration-150 ${
            isFullscreenReady ? "opacity-100" : "absolute opacity-0"
          }`}
          draggable={false}
          decoding="async"
          fetchPriority={isActive ? "high" : "low"}
          onLoad={() => setIsFullscreenReady(true)}
        />
      ) : null}
    </div>
  );
}
