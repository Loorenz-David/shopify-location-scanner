import type { LocationOption } from "../../location-options/types/location-options.types";
import type {
  LogisticLocationRecord,
  LogisticZoneType,
} from "../../logistic-locations/types/logistic-locations.types";

export type LocationCreationPickerOption =
  | { kind: "shop" }
  | { kind: "logistic"; zoneType: LogisticZoneType };

export type UnifiedLocationItem =
  | { kind: "shop"; label: string; value: string }
  | {
      kind: "logistic";
      id: string;
      location: string;
      zoneType: LogisticZoneType;
    };

export interface LocationsSettingsContextValue {
  combinedList: UnifiedLocationItem[];
  showPickerCondition: boolean;
  shopIsLoading: boolean;
  logisticIsLoading: boolean;
  shopIsSubmitting: boolean;
  logisticIsSubmitting: boolean;
  shopError: string | null;
  logisticError: string | null;
  query: string;
  showPicker: boolean;
  setQuery: (query: string) => void;
  setShowPicker: (show: boolean) => void;
  onSelect: (option: LocationCreationPickerOption) => Promise<void>;
  onDeleteShop: (value: string) => Promise<void>;
  onDeleteLogistic: (id: string) => Promise<void>;
  onBack: () => void;
}

export type { LocationOption, LogisticLocationRecord };
