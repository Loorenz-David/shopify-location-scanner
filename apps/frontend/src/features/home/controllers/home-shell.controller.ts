import {
  hasRegisteredPage,
  HOME_DEFAULT_PAGE_ID,
} from "../domain/page-registry.domain";
import { useHomeShellStore } from "../stores/home-shell.store";
import type {
  HomePageId,
  HomePageRegistration,
  OverlayPageId,
} from "../types/home-shell.types";

function resolveFallbackPageId(preferredPageId: HomePageId): HomePageId | null {
  const state = useHomeShellStore.getState();

  if (hasRegisteredPage(state.registry, preferredPageId)) {
    return preferredPageId;
  }

  if (hasRegisteredPage(state.registry, HOME_DEFAULT_PAGE_ID)) {
    return HOME_DEFAULT_PAGE_ID;
  }

  const firstPageId = Object.keys(state.registry).at(0);
  return (firstPageId as HomePageId | undefined) ?? null;
}

export function registerHomePagesController(
  pages: HomePageRegistration[],
): void {
  useHomeShellStore.getState().registerPages(pages);
}

export function bootstrapHomeShellController(
  preferredPageId: HomePageId,
): void {
  const state = useHomeShellStore.getState();
  if (state.currentPageId) {
    return;
  }

  const fallbackPageId = resolveFallbackPageId(preferredPageId);
  if (!fallbackPageId) {
    return;
  }

  state.openPage(fallbackPageId);
}

export function openHomePageController(pageId: HomePageId): void {
  const state = useHomeShellStore.getState();
  if (!hasRegisteredPage(state.registry, pageId)) {
    return;
  }

  state.closeFullFeature();
  state.openPage(pageId);
}

export function closeHomePageController(pageId: HomePageId): void {
  const state = useHomeShellStore.getState();
  if (!hasRegisteredPage(state.registry, pageId)) {
    return;
  }

  state.closePage(pageId);

  const nextState = useHomeShellStore.getState();
  if (nextState.currentPageId) {
    return;
  }

  const fallbackPageId = resolveFallbackPageId(HOME_DEFAULT_PAGE_ID);
  if (!fallbackPageId) {
    return;
  }

  nextState.openPage(fallbackPageId);
}

export function openOverlayPageController(
  pageId: OverlayPageId,
  title: string,
): void {
  useHomeShellStore.getState().openOverlay(pageId, title);
}

export function closeOverlayPageController(): void {
  useHomeShellStore.getState().closeOverlay();
}

export function openFullFeaturePageController(pageId: HomePageId): void {
  const state = useHomeShellStore.getState();
  if (!hasRegisteredPage(state.registry, pageId)) {
    return;
  }

  state.openFullFeature(pageId);
}

export function closeFullFeaturePageController(): void {
  useHomeShellStore.getState().closeFullFeature();
}

export function selectNavigationPageController(pageId: HomePageId): void {
  const state = useHomeShellStore.getState();
  const page = state.registry[pageId];
  if (!page) {
    return;
  }

  if (page.presentation === "full-overlay") {
    state.openFullFeature(pageId);
    return;
  }

  state.closeFullFeature();
  state.openPage(pageId);
}
