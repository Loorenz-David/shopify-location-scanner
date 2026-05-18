export const settingsOptionSubscriptions = [
    {
        id: "settings-shopify",
        label: "Shopify integration",
    },
    {
        id: "settings-locations",
        label: "Locations",
    },
    {
        id: "settings-users",
        label: "Users",
    },
    {
        id: "settings-store-map",
        label: "Store map",
    },
];
export function getInitialsFromUsername(username) {
    return (username
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("") || "U");
}
export function formatBootstrapSyncLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}
