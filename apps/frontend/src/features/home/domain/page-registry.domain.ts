import type {
  BottomMenuItem,
  HomePageId,
  HomePageRegistration,
} from "../types/home-shell.types";

export const HOME_DEFAULT_PAGE_ID: HomePageId = "item-scan-history";

export function getVisibleBottomMenuItems(
  registry: Record<string, HomePageRegistration>,
  activePageId: HomePageId | null,
): BottomMenuItem[] {
  return Object.values(registry)
    .filter((page) => Boolean(page.bottomMenu))
    .sort(
      (left, right) =>
        (left.bottomMenu?.order ?? 0) - (right.bottomMenu?.order ?? 0),
    )
    .map((page) => ({
      id: page.id,
      label: page.bottomMenu?.label ?? page.title,
      icon: page.bottomMenu?.icon,
      slot: page.bottomMenu?.slot ?? "center",
      isActive: page.id === activePageId,
      isHidden: !(page.bottomMenu?.visible ?? true),
    }));
}

export function hasRegisteredPage(
  registry: Record<string, HomePageRegistration>,
  pageId: HomePageId,
): boolean {
  return Boolean(registry[pageId]);
}
