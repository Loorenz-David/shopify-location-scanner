import type { ComponentType } from "react";

export type HomePageId = "home" | "scanner" | (string & {});
export type OverlayPageId =
  | "item-scan-history-filters"
  | (string & {});

export type PopupPageId =
  | "placement-item-fixed-check"
  | "placement-zone-mismatch"
  | (string & {});

export type BottomMenuSlot = "left" | "center" | "right";
export type HomePagePresentation = "inline" | "full-overlay";

export interface BottomMenuConfig {
  label: string;
  slot: BottomMenuSlot;
  icon?: ComponentType<any>;
  order: number;
  visible?: boolean;
}

export interface HomePageRegistration {
  id: HomePageId;
  title: string;
  component: ComponentType;
  bottomMenu?: BottomMenuConfig;
  presentation?: HomePagePresentation;
}

export interface BottomMenuItem {
  id: HomePageId;
  label: string;
  icon?: ComponentType<any>;
  slot: BottomMenuSlot;
  isActive: boolean;
  isHidden: boolean;
  count?: number;
}

export interface OverlayState {
  isOpen: boolean;
  pageId: OverlayPageId | null;
  title: string;
}
