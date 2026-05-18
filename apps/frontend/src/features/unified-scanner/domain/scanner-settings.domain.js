const SCANNER_SETTINGS_STORAGE_KEY = "scanner-settings";
const defaultScannerSettings = {
    onScanAsk: false,
};
function getLocalStorage() {
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}
export function readScannerSettings() {
    const storage = getLocalStorage();
    if (!storage) {
        return defaultScannerSettings;
    }
    const rawValue = storage.getItem(SCANNER_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
        return defaultScannerSettings;
    }
    try {
        const parsed = JSON.parse(rawValue);
        return {
            onScanAsk: typeof parsed.onScanAsk === "boolean"
                ? parsed.onScanAsk
                : defaultScannerSettings.onScanAsk,
        };
    }
    catch {
        return defaultScannerSettings;
    }
}
function writeScannerSettings(settings) {
    const storage = getLocalStorage();
    if (!storage) {
        return;
    }
    storage.setItem(SCANNER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
export function saveScannerOnScanAskSetting(onScanAsk) {
    const current = readScannerSettings();
    writeScannerSettings({
        ...current,
        onScanAsk,
    });
}
