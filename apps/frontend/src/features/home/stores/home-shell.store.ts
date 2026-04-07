import { create } from "zustand";

import type {
  HomePageId,
  HomePageRegistration,
  OverlayPageId,
} from "../types/home-shell.types";

interface HomeShellStoreState {
  registry: Record<string, HomePageRegistration>;
  openPageIds: HomePageId[];
  currentPageId: HomePageId | null;
  fullFeaturePageId: HomePageId | null;
  isFullFeatureOpen: boolean;
  overlayPageId: OverlayPageId | null;
  overlayTitle: string;
  isOverlayOpen: boolean;
  registerPages: (pages: HomePageRegistration[]) => void;
  unregisterPage: (pageId: HomePageId) => void;
  openPage: (pageId: HomePageId) => void;
  closePage: (pageId: HomePageId) => void;
  setCurrentPage: (pageId: HomePageId) => void;
  openFullFeature: (pageId: HomePageId) => void;
  closeFullFeature: () => void;
  openOverlay: (pageId: OverlayPageId, title: string) => void;
  closeOverlay: () => void;
  reset: () => void;
}

const initialState = {
  registry: {},
  openPageIds: [],
  currentPageId: null,
  fullFeaturePageId: null,
  isFullFeatureOpen: false,
  overlayPageId: null,
  overlayTitle: "",
  isOverlayOpen: false,
};

export const useHomeShellStore = create<HomeShellStoreState>((set, get) => ({
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
      const nextCurrentPage =
        state.currentPageId === pageId
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
      const nextCurrentPage =
        state.currentPageId === pageId
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
  reset: () => {
    set(initialState);
  },
}));

export const selectHomeShellRegistry = (state: HomeShellStoreState) =>
  state.registry;
export const selectHomeShellCurrentPageId = (state: HomeShellStoreState) =>
  state.currentPageId;
export const selectHomeShellFullFeaturePageId = (state: HomeShellStoreState) =>
  state.fullFeaturePageId;
export const selectHomeShellIsFullFeatureOpen = (state: HomeShellStoreState) =>
  state.isFullFeatureOpen;
export const selectHomeShellIsOverlayOpen = (state: HomeShellStoreState) =>
  state.isOverlayOpen;
export const selectHomeShellOverlayTitle = (state: HomeShellStoreState) =>
  state.overlayTitle;
export const selectHomeShellOverlayPageId = (state: HomeShellStoreState) =>
  state.overlayPageId;
