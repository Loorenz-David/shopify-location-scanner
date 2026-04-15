export type UserRole = "admin" | "manager" | "worker" | "seller";

export type LogisticTaskFilterKey =
  | "fixItem"
  | "isItemFixed"
  | "lastLogisticEventType"
  | "zoneType"
  | "intention"
  | "orderId"
  | "noIntention";

export interface LogisticTaskDefaultFilter {
  key: LogisticTaskFilterKey;
  value: string | boolean | null;
}

export type LogisticTaskCardAction = "markItemIntention" | "markItemPlacement";

export interface RoleCapabilities {
  can_display_main_stats: boolean;
  can_manage_logistic_locations: boolean;
  task_page_default_filters: LogisticTaskDefaultFilter[];
  task_page_allowed_filters: LogisticTaskFilterKey[];
  task_intention_tab_menu: boolean;
  task_intention_card_action: LogisticTaskCardAction;
}
