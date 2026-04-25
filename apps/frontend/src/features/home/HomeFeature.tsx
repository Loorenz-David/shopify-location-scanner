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
import { useItemScanHistoryRealtimeFlow } from "../item-scan-history/flows/use-item-scan-history.flow";
import { ItemScanHistoryPage } from "../item-scan-history/ui/ItemScanHistoryPage";
import { ItemScanHistoryOverlayHost } from "../item-scan-history/ItemScanHistoryOverlayHost";
import { PlacementItemFixedPopup } from "../scanner/ui/PlacementItemFixedPopup";
import { PlacementZoneMismatchPopup } from "../scanner/ui/PlacementZoneMismatchPopup";
import { UnifiedScannerFeature } from "../unified-scanner/UnifiedScannerFeature";
import { UnifiedFixCheckPopup } from "../unified-scanner/ui/UnifiedFixCheckPopup";
import { UnifiedZoneMismatchPopup } from "../unified-scanner/ui/UnifiedZoneMismatchPopup";
import { LogisticTasksOverlayHost } from "../logistic-tasks/LogisticTasksOverlayHost";
import { useLogisticTasksRealtimeFlow } from "../logistic-tasks/flows/use-logistic-tasks-realtime.flow";
import { useTaskCountFlow } from "../logistic-tasks/flows/use-task-count.flow";
import {
  selectTaskCount,
  useTaskCountStore,
} from "../logistic-tasks/stores/task-count.store";
import { LogisticTasksPage } from "../logistic-tasks/ui/LogisticTasksPage";
import { useRoleCapabilities } from "../role-context/hooks/use-role-capabilities";
import { SettingsFeature } from "../settings/SettingsFeature";
import {
  LazyAnalyticsPage,
  LazyLocationsSettingsPage,
  LazyScannerLogisticPlacementPage,
  LazyShopifySettingsPage,
  LazyStoreMapSettingsPage,
  LazyUsersSettingsPage,
} from "./lazy-pages";
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
  useTaskCountFlow();

  const taskCount = useTaskCountStore(selectTaskCount);

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
        component: LazyAnalyticsPage,
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
        id: "unified-scanner",
        title: "Scanner",
        component: UnifiedScannerFeature,
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
        component: LazyShopifySettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-locations",
        title: "Locations",
        component: LazyLocationsSettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "scanner-logistic-placement",
        title: "Logistic Placement",
        component: LazyScannerLogisticPlacementPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-users",
        title: "Users",
        component: LazyUsersSettingsPage,
        presentation: "full-overlay",
      },
      {
        id: "settings-store-map",
        title: "Store Map",
        component: LazyStoreMapSettingsPage,
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
  const navItems = getVisibleBottomMenuItems(registry, activeNavPageId).map(
    (item) =>
      item.id === "logistic-tasks" && taskCount > 0
        ? { ...item, count: taskCount }
        : item,
  );
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
          {popupPageId === "unified-scanner-fix-check" && (
            <UnifiedFixCheckPopup />
          )}
          {popupPageId === "unified-scanner-zone-mismatch" && (
            <UnifiedZoneMismatchPopup />
          )}
        </>
      }
      onClosePopup={homeShellActions.closePopupPage}
      onSelectPage={homeShellActions.selectNavigationPage}
    />
  );
}
