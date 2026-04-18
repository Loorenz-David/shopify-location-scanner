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
  selectHomeShellIsPopupOpen,
  selectHomeShellOverlayTitle,
  selectHomeShellPopupPageId,
  selectHomeShellRegistry,
  useHomeShellStore,
} from "./stores/home-shell.store";
import type { HomePageRegistration } from "./types/home-shell.types";
import { HomeLayout } from "./ui/HomeLayout";
import { HomePage } from "./ui/HomePage";
import { AnalyticsPage } from "../analytics/pages/AnalyticsPage";
import { StoreMapSettingsPage } from "../analytics/ui/StoreMapSettingsPage";
import { useItemScanHistoryRealtimeFlow } from "../item-scan-history/flows/use-item-scan-history.flow";
import { ItemScanHistoryPage } from "../item-scan-history/ui/ItemScanHistoryPage";
import { ItemScanHistoryOverlayHost } from "../item-scan-history/ItemScanHistoryOverlayHost";
import { ScannerFeature } from "../scanner/ScannerFeature";
import { ScannerOverlayHost } from "../scanner/ScannerOverlayHost";
import { PlacementItemFixedPopup } from "../scanner/ui/PlacementItemFixedPopup";
import { PlacementZoneMismatchPopup } from "../scanner/ui/PlacementZoneMismatchPopup";
import { LocationsSettingsPage } from "../locations-settings/ui/LocationsSettingsPage";
import { LogisticTasksOverlayHost } from "../logistic-tasks/LogisticTasksOverlayHost";
import { useLogisticTasksRealtimeFlow } from "../logistic-tasks/flows/use-logistic-tasks-realtime.flow";
import { LogisticTasksPage } from "../logistic-tasks/ui/LogisticTasksPage";
import { useRoleCapabilities } from "../role-context/hooks/use-role-capabilities";
import { ScannerLogisticPlacementPage } from "../scanner/ui/ScannerLogisticPlacementPage";
import { SettingsFeature } from "../settings/SettingsFeature";
import { ShopifySettingsPage } from "../shopify/ui/ShopifySettingsPage";
import { UsersSettingsPage } from "../users/ui/UsersSettingsPage";
import {
  HomeIcon,
  SettingsIcon,
  StatsIcon,
  TaskIcon,
} from "../../assets/icons";

interface HomeFeatureProps {
  onLogout: () => void;
}

export function HomeFeature({ onLogout }: HomeFeatureProps) {
  useItemScanHistoryRealtimeFlow();
  useLogisticTasksRealtimeFlow();

  const { can_display_main_stats } = useRoleCapabilities();

  const registry = useHomeShellStore(selectHomeShellRegistry);
  const currentPageId = useHomeShellStore(selectHomeShellCurrentPageId);
  const fullFeaturePageId = useHomeShellStore(selectHomeShellFullFeaturePageId);
  const isFullFeatureOpen = useHomeShellStore(selectHomeShellIsFullFeatureOpen);
  const isOverlayOpen = useHomeShellStore(selectHomeShellIsOverlayOpen);
  const overlayTitle = useHomeShellStore(selectHomeShellOverlayTitle);
  const isPopupOpen = useHomeShellStore(selectHomeShellIsPopupOpen);
  const popupPageId = useHomeShellStore(selectHomeShellPopupPageId);

  const registeredPages = useMemo<HomePageRegistration[]>(
    () => [
      {
        id: "logistic-tasks",
        title: "Tasks",
        component: LogisticTasksPage,
        bottomMenu: {
          label: "Tasks",
          icon: TaskIcon,
          slot: "left",
          order: 5,
          visible: true,
        },
      },
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
          icon: HomeIcon,
          slot: "left",
          order: 0,
          visible: true,
        },
      },
      {
        id: "analytics",
        title: "Stats",
        component: AnalyticsPage,
        bottomMenu: {
          label: "Stats",
          icon: StatsIcon,
          slot: "right",
          order: 15,
          visible: can_display_main_stats,
        },
        presentation: "full-overlay",
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
          icon: SettingsIcon,
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
        id: "settings-locations",
        title: "Locations",
        component: LocationsSettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "scanner-logistic-placement",
        title: "Logistic Placement",
        component: ScannerLogisticPlacementPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-users",
        title: "Users",
        component: UsersSettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-store-map",
        title: "Store Map",
        component: StoreMapSettingsPage,
        presentation: "full-overlay",
      },
    ],
    [onLogout, can_display_main_stats],
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
        <>
          <ScannerOverlayHost onClose={homeShellActions.closeOverlayPage} />
          <ItemScanHistoryOverlayHost
            onClose={homeShellActions.closeOverlayPage}
          />
          <LogisticTasksOverlayHost
            onClose={homeShellActions.closeOverlayPage}
          />
        </>
      }
      isPopupOpen={isPopupOpen}
      popupContent={
        <>
          {popupPageId === "placement-item-fixed-check" && (
            <PlacementItemFixedPopup />
          )}
          {popupPageId === "placement-zone-mismatch" && (
            <PlacementZoneMismatchPopup />
          )}
        </>
      }
      onClosePopup={homeShellActions.closePopupPage}
      onSelectPage={homeShellActions.selectNavigationPage}
    />
  );
}
