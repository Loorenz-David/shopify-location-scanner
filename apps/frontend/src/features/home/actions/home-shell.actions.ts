import {
  bootstrapHomeShellController,
  closeFullFeaturePageController,
  closeOverlayPageController,
  closeHomePageController,
  openFullFeaturePageController,
  openOverlayPageController,
  openHomePageController,
  registerHomePagesController,
  selectNavigationPageController,
} from "../controllers/home-shell.controller";
import { HOME_DEFAULT_PAGE_ID } from "../domain/page-registry.domain";
import type {
  HomePageId,
  HomePageRegistration,
  OverlayPageId,
} from "../types/home-shell.types";

export const homeShellActions = {
  registerFeaturePages(pages: HomePageRegistration[]): void {
    registerHomePagesController(pages);
  },
  bootstrapDefaultPage(pageId: HomePageId = HOME_DEFAULT_PAGE_ID): void {
    bootstrapHomeShellController(pageId);
  },
  openFeaturePage(pageId: HomePageId): void {
    openHomePageController(pageId);
  },
  closeFeaturePage(pageId: HomePageId): void {
    closeHomePageController(pageId);
  },
  selectNavigationPage(pageId: HomePageId): void {
    selectNavigationPageController(pageId);
  },
  openFullFeaturePage(pageId: HomePageId): void {
    openFullFeaturePageController(pageId);
  },
  closeFullFeaturePage(): void {
    closeFullFeaturePageController();
  },
  openOverlayPage(pageId: OverlayPageId, title: string): void {
    openOverlayPageController(pageId, title);
  },
  closeOverlayPage(): void {
    closeOverlayPageController();
  },
};
