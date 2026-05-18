import { create } from "zustand";
export const useItemImageViewerStore = create((set) => ({
    isOpen: false,
    images: [],
    currentImageIndex: 0,
    title: null,
    openImageViewer: (images, startIndex, title) => set({
        isOpen: true,
        images,
        currentImageIndex: Math.max(0, startIndex),
        title: title ?? null,
    }),
    closeImageViewer: () => set({
        isOpen: false,
        images: [],
        currentImageIndex: 0,
        title: null,
    }),
    goToImage: (index) => set({
        currentImageIndex: Math.max(0, index),
    }),
    goToPrevious: () => set((prevState) => ({
        currentImageIndex: Math.max(0, prevState.currentImageIndex - 1),
    })),
    goToNext: () => set((prevState) => ({
        currentImageIndex: prevState.currentImageIndex + 1,
    })),
    setImageIndex: (index) => set({
        currentImageIndex: Math.max(0, index),
    }),
}));
// Selectors
export const selectIsImageViewerOpen = (state) => state.isOpen;
export const selectCurrentImageIndex = (state) => state.currentImageIndex;
