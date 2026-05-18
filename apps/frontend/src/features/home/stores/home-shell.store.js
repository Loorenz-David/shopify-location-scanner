import { create } from "zustand";
const initialState = {
    registry: {},
    openPageIds: [],
    currentPageId: null,
    fullFeaturePageId: null,
    isFullFeatureOpen: false,
    overlayPageId: null,
    overlayTitle: "",
    isOverlayOpen: false,
    popupPageId: null,
    isPopupOpen: false,
};
export const useHomeShellStore = create((set, get) => ({
    ...initialState,
    registerPages: (pages) => {
        set((state) => {
            const nextRegistry = { ...state.registry };
            for (const page of pages) {
                nextRegistry[page.id] = page;
            }
            return { registry: nextRegistry };
        });
    },
    unregisterPage: (pageId) => {
        set((state) => {
            if (!state.registry[pageId]) {
                return state;
            }
            const nextRegistry = { ...state.registry };
            delete nextRegistry[pageId];
            const nextOpenPages = state.openPageIds.filter((id) => id !== pageId);
            const nextCurrentPage = state.currentPageId === pageId
                ? (nextOpenPages.at(-1) ?? null)
                : state.currentPageId;
            return {
                registry: nextRegistry,
                openPageIds: nextOpenPages,
                currentPageId: nextCurrentPage,
            };
        });
    },
    openPage: (pageId) => {
        if (!get().registry[pageId]) {
            return;
        }
        set((state) => {
            const nextOpenPages = state.openPageIds.includes(pageId)
                ? state.openPageIds
                : [...state.openPageIds, pageId];
            return {
                openPageIds: nextOpenPages,
                currentPageId: pageId,
            };
        });
    },
    closePage: (pageId) => {
        set((state) => {
            if (!state.openPageIds.includes(pageId)) {
                return state;
            }
            const nextOpenPages = state.openPageIds.filter((id) => id !== pageId);
            const nextCurrentPage = state.currentPageId === pageId
                ? (nextOpenPages.at(-1) ?? null)
                : state.currentPageId;
            return {
                openPageIds: nextOpenPages,
                currentPageId: nextCurrentPage,
            };
        });
    },
    setCurrentPage: (pageId) => {
        if (!get().registry[pageId]) {
            return;
        }
        set((state) => {
            const nextOpenPages = state.openPageIds.includes(pageId)
                ? state.openPageIds
                : [...state.openPageIds, pageId];
            return {
                openPageIds: nextOpenPages,
                currentPageId: pageId,
            };
        });
    },
    openFullFeature: (pageId) => {
        if (!get().registry[pageId]) {
            return;
        }
        set({
            fullFeaturePageId: pageId,
            isFullFeatureOpen: true,
        });
    },
    closeFullFeature: () => {
        set({
            fullFeaturePageId: null,
            isFullFeatureOpen: false,
        });
    },
    openOverlay: (pageId, title) => {
        set({
            isOverlayOpen: true,
            overlayPageId: pageId,
            overlayTitle: title,
        });
    },
    closeOverlay: () => {
        set({
            isOverlayOpen: false,
            overlayPageId: null,
            overlayTitle: "",
        });
    },
    openPopup: (pageId) => {
        set({ isPopupOpen: true, popupPageId: pageId });
    },
    closePopup: () => {
        set({ isPopupOpen: false, popupPageId: null });
    },
    reset: () => {
        set(initialState);
    },
}));
export const selectHomeShellRegistry = (state) => state.registry;
export const selectHomeShellCurrentPageId = (state) => state.currentPageId;
export const selectHomeShellFullFeaturePageId = (state) => state.fullFeaturePageId;
export const selectHomeShellIsFullFeatureOpen = (state) => state.isFullFeatureOpen;
export const selectHomeShellIsOverlayOpen = (state) => state.isOverlayOpen;
export const selectHomeShellOverlayTitle = (state) => state.overlayTitle;
export const selectHomeShellOverlayPageId = (state) => state.overlayPageId;
export const selectHomeShellIsPopupOpen = (state) => state.isPopupOpen;
export const selectHomeShellPopupPageId = (state) => state.popupPageId;
