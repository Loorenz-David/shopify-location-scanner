import type { ComponentType } from "react";

export type HomePageId = "home" | "scanner" | (string & {});
export type OverlayPageId =
  | "scanner-item-manual"
  | "scanner-location-manual"
  | "scanner-error-detail"
  | (string & {});

export type BottomMenuSlot = "left" | "center" | "right";
export type HomePagePresentation = "inline" | "full-overlay";

export interface BottomMenuConfig {
  label: string;
  slot: BottomMenuSlot;
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
  slot: BottomMenuSlot;
  isActive: boolean;
}

export interface OverlayState {
  isOpen: boolean;
  pageId: OverlayPageId | null;
  title: string;
}
