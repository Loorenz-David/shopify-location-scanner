import {
  LOGISTIC_ZONE_TYPE_LABELS,
  LOGISTIC_ZONE_TYPES,
} from "../../logistic-locations/domain/logistic-locations.domain";
import type { LocationCreationPickerOption } from "../types/locations-settings.types";

const ZONE_COLORS: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  for_delivery: {
    border: "border-teal-400",
    bg: "bg-teal-50",
    text: "text-teal-800",
  },
  for_pickup: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-800",
  },
  for_fixing: {
    border: "border-rose-400",
    bg: "bg-rose-50",
    text: "text-rose-800",
  },
};

const SHOP_COLORS = {
  border: "border-emerald-400",
  bg: "bg-emerald-50",
  text: "text-emerald-800",
};

interface LocationTypePickerProps {
  onSelect: (option: LocationCreationPickerOption) => void;
  isSubmitting: boolean;
}

export function LocationTypePicker({
  onSelect,
  isSubmitting,
}: LocationTypePickerProps) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-sm font-medium text-slate-600">
        Select location type to create:
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          className={`rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${SHOP_COLORS.border} ${SHOP_COLORS.bg} ${SHOP_COLORS.text}`}
          onClick={() => onSelect({ kind: "shop" })}
        >
          Shop Location
        </button>

        {LOGISTIC_ZONE_TYPES.map((zone) => {
          const colors = ZONE_COLORS[zone];
          return (
            <button
              key={zone}
              type="button"
              disabled={isSubmitting}
              className={`rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${colors.border} ${colors.bg} ${colors.text}`}
              onClick={() => onSelect({ kind: "logistic", zoneType: zone })}
            >
              {LOGISTIC_ZONE_TYPE_LABELS[zone]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
