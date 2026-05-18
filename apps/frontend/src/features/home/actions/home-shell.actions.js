import { bootstrapHomeShellController, closeFullFeaturePageController, closeOverlayPageController, closeHomePageController, openFullFeaturePageController, openOverlayPageController, openHomePageController, registerHomePagesController, selectNavigationPageController, openPopupPageController, closePopupPageController, } from "../controllers/home-shell.controller";
import { HOME_DEFAULT_PAGE_ID } from "../domain/page-registry.domain";
export const homeShellActions = {
    registerFeaturePages(pages) {
        registerHomePagesController(pages);
    },
    bootstrapDefaultPage(pageId = HOME_DEFAULT_PAGE_ID) {
        bootstrapHomeShellController(pageId);
    },
    openFeaturePage(pageId) {
        openHomePageController(pageId);
    },
    closeFeaturePage(pageId) {
        closeHomePageController(pageId);
    },
    selectNavigationPage(pageId) {
        selectNavigationPageController(pageId);
    },
    openFullFeaturePage(pageId) {
        openFullFeaturePageController(pageId);
    },
    closeFullFeaturePage() {
        closeFullFeaturePageController();
    },
    openOverlayPage(pageId, title) {
        openOverlayPageController(pageId, title);
    },
    closeOverlayPage() {
        closeOverlayPageController();
    },
    popupFeaturePage(pageId) {
        openPopupPageController(pageId);
    },
    closePopupPage() {
        closePopupPageController();
    },
};
