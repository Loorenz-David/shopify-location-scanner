export const HOME_DEFAULT_PAGE_ID = "item-scan-history";
export function getVisibleBottomMenuItems(registry, activePageId) {
    return Object.values(registry)
        .filter((page) => Boolean(page.bottomMenu))
        .sort((left, right) => (left.bottomMenu?.order ?? 0) - (right.bottomMenu?.order ?? 0))
        .map((page) => ({
        id: page.id,
        label: page.bottomMenu?.label ?? page.title,
        icon: page.bottomMenu?.icon,
        slot: page.bottomMenu?.slot ?? "center",
        isActive: page.id === activePageId,
        isHidden: !(page.bottomMenu?.visible ?? true),
    }));
}
export function hasRegisteredPage(registry, pageId) {
    return Boolean(registry[pageId]);
}
