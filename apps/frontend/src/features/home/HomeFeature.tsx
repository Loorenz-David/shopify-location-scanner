import { useMemo } from "react";

import { homeShellActions } from "./actions/home-shell.actions";
import {
  getVisibleBottomMenuItems,
  HOME_DEFAULT_PAGE_ID,
} from "./domain/page-registry.domain";
import { useHomeShellFlow } from "./flows/use-home-shell.flow";
import {
  selectHomeShellCurrentPageId,
  selectHomeShellFullFeaturePageId,
  selectHomeShellIsFullFeatureOpen,
  selectHomeShellIsOverlayOpen,
  selectHomeShellOverlayTitle,
  selectHomeShellRegistry,
  useHomeShellStore,
} from "./stores/home-shell.store";
import type { HomePageRegistration } from "./types/home-shell.types";
import { HomeLayout } from "./ui/HomeLayout";
import { HomePage } from "./ui/HomePage";
import { ItemScanHistoryPage } from "../item-scan-history/ui/ItemScanHistoryPage";
import { ScannerFeature } from "../scanner/ScannerFeature";
import { ScannerOverlayHost } from "../scanner/ScannerOverlayHost";
import { LocationOptionsSettingsPage } from "../location-options/ui/LocationOptionsSettingsPage";
import { SettingsFeature } from "../settings/SettingsFeature";
import { ShopifySettingsPage } from "../shopify/ui/ShopifySettingsPage";
import { UsersSettingsPage } from "../users/ui/UsersSettingsPage";

interface HomeFeatureProps {
  onLogout: () => void;
}

export function HomeFeature({ onLogout }: HomeFeatureProps) {
  const registry = useHomeShellStore(selectHomeShellRegistry);
  const currentPageId = useHomeShellStore(selectHomeShellCurrentPageId);
  const fullFeaturePageId = useHomeShellStore(selectHomeShellFullFeaturePageId);
  const isFullFeatureOpen = useHomeShellStore(selectHomeShellIsFullFeatureOpen);
  const isOverlayOpen = useHomeShellStore(selectHomeShellIsOverlayOpen);
  const overlayTitle = useHomeShellStore(selectHomeShellOverlayTitle);

  const registeredPages = useMemo<HomePageRegistration[]>(
    () => [
      {
        id: "home",
        title: "Home",
        component: HomePage,
      },
      {
        id: "item-scan-history",
        title: "Scan history",
        component: ItemScanHistoryPage,
        bottomMenu: {
          label: "History",
          slot: "left",
          order: 0,
          visible: true,
        },
      },
      {
        id: "scanner",
        title: "Scanner",
        component: ScannerFeature,
        bottomMenu: {
          label: "Scanner",
          slot: "center",
          order: 10,
          visible: true,
        },
        presentation: "full-overlay",
      },
      {
        id: "settings",
        title: "Settings",
        component: () => <SettingsFeature onLogout={onLogout} />,
        bottomMenu: {
          label: "Settings",
          slot: "right",
          order: 20,
          visible: true,
        },
      },
      {
        id: "settings-shopify",
        title: "Shopify integration",
        component: ShopifySettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-location-options",
        title: "Location options",
        component: LocationOptionsSettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-users",
        title: "Users",
        component: UsersSettingsPage,
        presentation: "full-overlay",
      },
    ],
    [onLogout],
  );

  useHomeShellFlow({
    pages: registeredPages,
    defaultPageId: HOME_DEFAULT_PAGE_ID,
  });

  const activePage =
    (currentPageId && registry[currentPageId]) ||
    registry[HOME_DEFAULT_PAGE_ID];

  if (!activePage) {
    return null;
  }

  const activeNavPageId = fullFeaturePageId ?? activePage.id;
  const navItems = getVisibleBottomMenuItems(registry, activeNavPageId);
  const activeFullFeaturePage =
    (fullFeaturePageId && registry[fullFeaturePageId]) || null;

  return (
    <HomeLayout
      activePageTitle={activePage.title}
      ActivePageComponent={activePage.component}
      activeFullFeatureTitle={activeFullFeaturePage?.title ?? "Feature"}
      ActiveFullFeatureComponent={activeFullFeaturePage?.component ?? null}
      isFullFeatureOpen={isFullFeatureOpen}
      navItems={navItems}
      isOverlayOpen={isOverlayOpen}
      overlayTitle={overlayTitle}
      overlayContent={
        <ScannerOverlayHost onClose={homeShellActions.closeOverlayPage} />
      }
      onSelectPage={homeShellActions.selectNavigationPage}
    />
  );
}
