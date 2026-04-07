export interface ScannerSettings {
  onScanAsk: boolean;
}

const SCANNER_SETTINGS_STORAGE_KEY = "scanner-settings";

const defaultScannerSettings: ScannerSettings = {
  onScanAsk: false,
};

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readScannerSettings(): ScannerSettings {
  const storage = getLocalStorage();
  if (!storage) {
    return defaultScannerSettings;
  }

  const rawValue = storage.getItem(SCANNER_SETTINGS_STORAGE_KEY);
  if (!rawValue) {
    return defaultScannerSettings;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ScannerSettings>;
    return {
      onScanAsk:
        typeof parsed.onScanAsk === "boolean"
          ? parsed.onScanAsk
          : defaultScannerSettings.onScanAsk,
    };
  } catch {
    return defaultScannerSettings;
  }
}

function writeScannerSettings(settings: ScannerSettings): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SCANNER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function saveScannerOnScanAskSetting(onScanAsk: boolean): void {
  const current = readScannerSettings();
  writeScannerSettings({
    ...current,
    onScanAsk,
  });
}
