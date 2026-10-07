import type {
  LogisticTaskFilterKey,
  RoleCapabilities,
  UserRole,
} from "../types/role-context.types";

const ALL_FILTER_KEYS: LogisticTaskFilterKey[] = [
  "fixItem",
  "isItemFixed",
  "lastLogisticEventType",
  "zoneType",
  "intention",
  "orderId",
  "noIntention",
];

const WORKER_ALLOWED_FILTER_KEYS: LogisticTaskFilterKey[] = [
  "fixItem",
  "lastLogisticEventType",
  "zoneType",
  "orderId",
];

export function buildRoleCapabilities(role: UserRole): RoleCapabilities {
  switch (role) {
    case "manager":
      return {
        can_create_users: true,
        creatable_user_roles: ["worker", "seller"],
        can_change_user_roles: false,
        can_display_main_stats: true,
        can_manage_logistic_locations: true,
        can_mark_scan_history_completion: true,
        can_clear_logistic_tasks: true,
        task_page_default_filters: [
          { key: "lastLogisticEventType", value: "marked_intention" },
        ],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };

    case "seller":
      return {
        can_create_users: false,
        creatable_user_roles: [],
        can_change_user_roles: false,
        can_display_main_stats: true,
        can_manage_logistic_locations: false,
        can_mark_scan_history_completion: true,
        can_clear_logistic_tasks: false,
        task_page_default_filters: [{ key: "noIntention", value: true }],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: false,
        task_intention_card_action: "markItemIntention",
      };

    case "worker":
      return {
        can_create_users: false,
        creatable_user_roles: [],
        can_change_user_roles: false,
        can_display_main_stats: false,
        can_manage_logistic_locations: false,
        can_mark_scan_history_completion: false,
        can_clear_logistic_tasks: false,
        task_page_default_filters: [
          { key: "lastLogisticEventType", value: "marked_intention" },
        ],
        task_page_allowed_filters: WORKER_ALLOWED_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };

    case "admin":
    default:
      return {
        can_create_users: role === "admin",
        creatable_user_roles:
          role === "admin" ? ["admin", "manager", "worker", "seller"] : [],
        can_change_user_roles: role === "admin",
        can_display_main_stats: true,
        can_manage_logistic_locations: true,
        can_mark_scan_history_completion: true,
        can_clear_logistic_tasks: true,
        task_page_default_filters: [
          { key: "lastLogisticEventType", value: "marked_intention" },
        ],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };
  }
}
