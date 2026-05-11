import { useItemImageViewerStore } from "../stores/item-image-viewer.store";
import { normalizeImageUrls, parseImageUrls } from "../domain/item-image-viewer.domain";
import { prefetchFullscreenImages } from "../domain/item-image-prefetch.domain";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";

interface OpenItemImageViewerInput {
  imageUrls: string | string[] | null | undefined;
  startIndex?: number;
  title?: string | null;
}

export const itemImageViewerActions = {
  openImageViewer: (
    input: ItemScanHistoryItem | OpenItemImageViewerInput,
    imageIndex?: number,
  ): void => {
    const isLegacyItem = "imageUrl" in input;
    const images = isLegacyItem
      ? parseImageUrls(input.imageUrl)
      : normalizeImageUrls(input.imageUrls);
    const startIndex = isLegacyItem
      ? (imageIndex ?? 0)
      : (input.startIndex ?? imageIndex ?? 0);
    const title = isLegacyItem ? input.title : input.title;

    if (images.length === 0) {
      return; // No images to view
    }

    const safeIndex = Math.max(0, Math.min(startIndex, images.length - 1));
    prefetchFullscreenImages(images, { priority: true });
    useItemImageViewerStore
      .getState()
      .openImageViewer(images, safeIndex, title ?? undefined);
  },

  prefetchItemImages(
    input: ItemScanHistoryItem | string | string[] | null | undefined,
  ): void {
    const images =
      typeof input === "object" && input !== null && !Array.isArray(input)
        ? parseImageUrls(input.imageUrl)
        : normalizeImageUrls(input);
    prefetchFullscreenImages(images, { priority: true });
  },

  closeImageViewer: (): void => {
    useItemImageViewerStore.getState().closeImageViewer();
  },

  navigateToImage: (index: number, totalImages: number): void => {
    if (index < 0 || index >= totalImages) {
      return; // Boundary check
    }
    useItemImageViewerStore.getState().goToImage(index);
  },

  navigatePrevious: (): void => {
    const state = useItemImageViewerStore.getState();
    if (state.currentImageIndex > 0) {
      state.goToPrevious();
    }
  },

  navigateNext: (totalImages: number): void => {
    const state = useItemImageViewerStore.getState();
    if (state.currentImageIndex < totalImages - 1) {
      state.goToNext();
    }
  },
};
