import type { SettingsOptionSubscription } from "../types/settings.types";

export const settingsOptionSubscriptions: SettingsOptionSubscription[] = [
  {
    id: "settings-shopify",
    label: "Shopify integration",
  },
  {
    id: "settings-location-options",
    label: "Location options",
  },
  {
    id: "settings-users",
    label: "Users",
  },
];

export function getInitialsFromUsername(username: string): string {
  return (
    username
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "U"
  );
}

export function formatBootstrapSyncLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
