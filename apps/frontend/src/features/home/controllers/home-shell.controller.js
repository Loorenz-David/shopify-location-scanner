import { hasRegisteredPage, HOME_DEFAULT_PAGE_ID, } from "../domain/page-registry.domain";
import { useHomeShellStore } from "../stores/home-shell.store";
function resolveFallbackPageId(preferredPageId) {
    const state = useHomeShellStore.getState();
    if (hasRegisteredPage(state.registry, preferredPageId)) {
        return preferredPageId;
    }
    if (hasRegisteredPage(state.registry, HOME_DEFAULT_PAGE_ID)) {
        return HOME_DEFAULT_PAGE_ID;
    }
    const firstPageId = Object.keys(state.registry).at(0);
    return firstPageId ?? null;
}
export function registerHomePagesController(pages) {
    useHomeShellStore.getState().registerPages(pages);
}
export function bootstrapHomeShellController(preferredPageId) {
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
export function openHomePageController(pageId) {
    const state = useHomeShellStore.getState();
    if (!hasRegisteredPage(state.registry, pageId)) {
        return;
    }
    state.closeFullFeature();
    state.openPage(pageId);
}
export function closeHomePageController(pageId) {
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
export function openOverlayPageController(pageId, title) {
    useHomeShellStore.getState().openOverlay(pageId, title);
}
export function closeOverlayPageController() {
    useHomeShellStore.getState().closeOverlay();
}
export function openFullFeaturePageController(pageId) {
    const state = useHomeShellStore.getState();
    if (!hasRegisteredPage(state.registry, pageId)) {
        return;
    }
    state.openFullFeature(pageId);
}
export function closeFullFeaturePageController() {
    useHomeShellStore.getState().closeFullFeature();
}
export function openPopupPageController(pageId) {
    useHomeShellStore.getState().openPopup(pageId);
}
export function closePopupPageController() {
    useHomeShellStore.getState().closePopup();
}
export function selectNavigationPageController(pageId) {
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
