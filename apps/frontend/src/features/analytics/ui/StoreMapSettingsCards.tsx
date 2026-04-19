import { formatCm } from "../utils/cm-format";

interface FloorSelectorCardProps {
  floorNames: Array<{ id: string; name: string }>;
  selectedFloorPlanId: string | null;
  activeFloorSizeText?: string | null;
  isEditorMode: boolean;
  onSelectFloor: (id: string) => void;
  onCreateFloor: () => void;
}

export function FloorSelectorCard({
  floorNames,
  selectedFloorPlanId,
  activeFloorSizeText,
  isEditorMode,
  onSelectFloor,
  onCreateFloor,
}: FloorSelectorCardProps) {
  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Floor
        </p>
        <button
          type="button"
          className="rounded-full border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          onClick={onCreateFloor}
          disabled={isEditorMode}
        >
          + floor
        </button>
      </div>

      {floorNames.length > 0 ? (
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {floorNames.map((floorPlan) => (
                <button
                  key={floorPlan.id}
                  type="button"
                  onClick={() => onSelectFloor(floorPlan.id)}
                  disabled={isEditorMode}
                  className={`min-w-0 max-w-full px-1 py-1 text-left text-sm font-semibold leading-tight transition-colors ${
                    selectedFloorPlanId === floorPlan.id
                      ? "text-slate-900"
                      : "text-slate-500"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="break-words">{floorPlan.name}</span>
                </button>
              ))}
            </div>
          </div>
          {activeFloorSizeText ? (
            <p className="m-0 shrink-0 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {activeFloorSizeText}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 pt-3">
          <p className="m-0 text-sm font-semibold text-slate-900">
            No floor plans yet
          </p>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Create your first floor to start building the map.
          </p>
        </div>
      )}
    </div>
  );
}

interface PreviewHelpCardProps {
  hasActiveFloor: boolean;
}

export function PreviewHelpCard({ hasActiveFloor }: PreviewHelpCardProps) {
  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white/85 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <p className="m-0 text-sm font-medium text-slate-600">
        {hasActiveFloor
          ? "Tap edit to pan and zoom the selected floor in fullscreen."
          : "Create a floor plan first, then edit zones on that floor."}
      </p>
    </div>
  );
}

interface EmptyFloorPreviewCardProps {
  onCreateFloor: () => void;
}

export function EmptyFloorPreviewCard({
  onCreateFloor,
}: EmptyFloorPreviewCardProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <p className="m-0 text-base font-semibold text-slate-900">
        No floor selected
      </p>
      <p className="m-0 mt-2 text-sm text-slate-500">
        Create a floor plan to start drawing zones and editing the map.
      </p>
      <button
        type="button"
        className="mt-4 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
        onClick={onCreateFloor}
      >
        Create floor
      </button>
    </div>
  );
}

interface ZonesListCardProps {
  zones: Array<{
    id: string;
    label: string;
    type: string;
    xPct: number;
    yPct: number;
    widthCm: number | null;
    depthCm: number | null;
  }>;
  hasActiveFloor: boolean;
  onNormalize: () => void;
  onDelete: (id: string) => void;
}

export function ZonesListCard({
  zones,
  hasActiveFloor,
  onNormalize,
  onDelete,
}: ZonesListCardProps) {
  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-slate-900">Zones</p>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
          onClick={onNormalize}
        >
          Normalize order
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {zones.length > 0 ? (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between rounded-xl border border-slate-900/10 bg-slate-50/70 px-3 py-2"
            >
              <div>
                <p className="m-0 text-sm font-semibold text-slate-900">
                  {zone.label}
                </p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {zone.type} · {zone.xPct.toFixed(1)}%, {zone.yPct.toFixed(1)}%
                  {zone.widthCm && zone.depthCm
                    ? ` · ${formatCm(zone.widthCm)} × ${formatCm(zone.depthCm)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                onClick={() => onDelete(zone.id)}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <p className="m-0 text-sm text-slate-500">
            {hasActiveFloor
              ? "No zones on this floor yet."
              : "Create a floor first to manage zones."}
          </p>
        )}
      </div>
    </div>
  );
}
