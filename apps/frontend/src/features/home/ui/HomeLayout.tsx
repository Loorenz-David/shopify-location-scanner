import type { ComponentType, ReactNode } from "react";

import type { BottomMenuItem, HomePageId } from "../types/home-shell.types";
import { BottomNav } from "./BottomNav";
import { FullFeatureOverlayContainer } from "./FullFeatureOverlayContainer";
import { PageOutlet } from "./PageOutlet";
import { PopupContainer } from "./PopupContainer";
import { SlidingOverlayContainer } from "./SlidingOverlayContainer";

interface HomeLayoutProps {
  activePageTitle: string;
  ActivePageComponent: ComponentType;
  activeFullFeatureTitle: string;
  ActiveFullFeatureComponent: ComponentType | null;
  isFullFeatureOpen: boolean;
  navItems: BottomMenuItem[];
  isOverlayOpen: boolean;
  overlayTitle: string;
  overlayContent?: ReactNode;
  isPopupOpen: boolean;
  popupContent?: ReactNode;
  onClosePopup: () => void;
  onSelectPage: (pageId: HomePageId) => void;
}

export function HomeLayout({
  activePageTitle,
  ActivePageComponent,
  activeFullFeatureTitle,
  ActiveFullFeatureComponent,
  isFullFeatureOpen,
  navItems,
  isOverlayOpen,
  overlayTitle,
  overlayContent,
  isPopupOpen,
  popupContent,
  onClosePopup,
  onSelectPage,
}: HomeLayoutProps) {
  return (
    <main className="relative min-h-svh bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)]">
      <PageOutlet
        activePageTitle={activePageTitle}
        ActivePageComponent={ActivePageComponent}
      />

      <BottomNav items={navItems} onSelectPage={onSelectPage} />

      <SlidingOverlayContainer isOpen={isOverlayOpen} title={overlayTitle}>
        {overlayContent}
      </SlidingOverlayContainer>

      <FullFeatureOverlayContainer
        isOpen={isFullFeatureOpen}
        title={activeFullFeatureTitle}
        ActiveFeatureComponent={ActiveFullFeatureComponent}
      />

      <PopupContainer isOpen={isPopupOpen} onClose={onClosePopup}>
        {popupContent}
      </PopupContainer>
    </main>
  );
}
