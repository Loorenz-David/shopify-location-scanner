import {
  LOGISTIC_ZONE_TYPE_LABELS,
  LOGISTIC_ZONE_TYPES,
} from "../domain/logistic-locations.domain";
import type { LogisticZoneType } from "../types/logistic-locations.types";

const ZONE_COLORS: Record<
  LogisticZoneType,
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

interface LogisticZoneTypePickerProps {
  selectedZoneType: LogisticZoneType | null;
  onSelect: (zone: LogisticZoneType) => void;
  onCreate: (zoneType: LogisticZoneType) => void;
  isSubmitting: boolean;
}

export function LogisticZoneTypePicker({
  selectedZoneType,
  onSelect,
  onCreate,
  isSubmitting,
}: LogisticZoneTypePickerProps) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-sm font-medium text-slate-600">
        Select zone type to add this location:
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LOGISTIC_ZONE_TYPES.map((zone) => {
          const colors = ZONE_COLORS[zone];
          const isSelected = selectedZoneType === zone;
          return (
            <button
              key={zone}
              type="button"
              disabled={isSubmitting}
              className={`rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${
                isSelected
                  ? `${colors.border} ${colors.bg} ${colors.text}`
                  : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300"
              }`}
              onClick={() => {
                onSelect(zone);
                onCreate(zone);
              }}
            >
              {LOGISTIC_ZONE_TYPE_LABELS[zone]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
