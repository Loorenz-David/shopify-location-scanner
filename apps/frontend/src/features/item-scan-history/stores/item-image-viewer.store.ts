import { create } from "zustand";
import type { ItemImageViewerState } from "../types/item-image-viewer.types";

interface ItemImageViewerStore extends ItemImageViewerState {
  openImageViewer: (images: string[], startIndex: number, title?: string) => void;
  closeImageViewer: () => void;
  goToImage: (index: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  setImageIndex: (index: number) => void;
}

export const useItemImageViewerStore = create<ItemImageViewerStore>((set) => ({
  isOpen: false,
  images: [],
  currentImageIndex: 0,
  title: null,

  openImageViewer: (images: string[], startIndex: number, title?: string) =>
    set({
      isOpen: true,
      images,
      currentImageIndex: Math.max(0, startIndex),
      title: title ?? null,
    }),

  closeImageViewer: () =>
    set({
      isOpen: false,
      images: [],
      currentImageIndex: 0,
      title: null,
    }),

  goToImage: (index: number) =>
    set({
      currentImageIndex: Math.max(0, index),
    }),

  goToPrevious: () =>
    set((prevState) => ({
      currentImageIndex: Math.max(0, prevState.currentImageIndex - 1),
    })),

  goToNext: () =>
    set((prevState) => ({
      currentImageIndex: prevState.currentImageIndex + 1,
    })),

  setImageIndex: (index: number) =>
    set({
      currentImageIndex: Math.max(0, index),
    }),
}));

// Selectors
export const selectIsImageViewerOpen = (state: ItemImageViewerStore): boolean =>
  state.isOpen;

export const selectCurrentImageIndex = (state: ItemImageViewerStore): number =>
  state.currentImageIndex;
