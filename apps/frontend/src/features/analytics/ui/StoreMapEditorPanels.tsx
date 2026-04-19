import { BackArrowIcon, CloseIcon } from "../../../assets/icons";

interface EditorDoneButtonOverlayProps {
  onDone: () => void;
}

export function EditorDoneButtonOverlay({
  onDone,
}: EditorDoneButtonOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-white/15 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.22)] backdrop-blur"
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface EditorFloatingActionsProps {
  isOpen: boolean;
  onToggle: () => void;
  onCreateZone: () => void;
  onEditFloorBoundary: () => void;
}

export function EditorFloatingActions({
  isOpen,
  onToggle,
  onCreateZone,
  onEditFloorBoundary,
}: EditorFloatingActionsProps) {
  return (
    <div className="pointer-events-none absolute bottom-5 right-5 z-30">
      <div className="relative h-28 w-28">
        <button
          type="button"
          aria-label={isOpen ? "Close create actions" : "Open create actions"}
          className="pointer-events-auto absolute bottom-0 right-0 grid h-16 w-16 place-items-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.32)] transition-transform"
          onClick={onToggle}
        >
          <span
            className={`text-4xl font-light leading-none transition-transform duration-200 ${
              isOpen ? "rotate-45" : "rotate-0"
            }`}
          >
            +
          </span>
        </button>

        <button
          type="button"
          aria-label="Create zone block"
          className={`pointer-events-auto absolute bottom-[4.2rem] right-[4.2rem] flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition-all duration-200 ${
            isOpen
              ? "translate-x-0 translate-y-0 opacity-100"
              : "translate-x-3 translate-y-3 opacity-0 pointer-events-none"
          }`}
          onClick={onCreateZone}
        >
          <span className="relative block h-6 w-6 rounded-md border-2 border-slate-700">
            <span className="absolute left-1/2 top-[2px] h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-slate-700" />
            <span className="absolute left-[2px] top-1/2 h-[2px] w-[14px] -translate-y-1/2 rounded-full bg-slate-700" />
          </span>
        </button>

        <button
          type="button"
          aria-label="Edit floor boundary"
          className={`pointer-events-auto absolute bottom-[4.9rem] right-0 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition-all duration-200 ${
            isOpen
              ? "translate-x-0 translate-y-0 opacity-100"
              : "translate-x-3 translate-y-3 opacity-0 pointer-events-none"
          }`}
          onClick={onEditFloorBoundary}
        >
          <span className="block h-5 w-5 rounded-sm border-2 border-slate-700" />
        </button>
      </div>
    </div>
  );
}

interface ZoneRenameOverlayProps {
  labelDraft: string;
  suggestions: string[];
  saveDisabled: boolean;
  onLabelChange: (value: string) => void;
  onSuggestionSelect: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function ZoneRenameOverlay({
  labelDraft,
  suggestions,
  saveDisabled,
  onLabelChange,
  onSuggestionSelect,
  onCancel,
  onSave,
}: ZoneRenameOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
      <div className="pointer-events-auto relative mx-auto max-w-[520px]">
        <button
          type="button"
          className="absolute -right-4 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
          onClick={onCancel}
          aria-label="Cancel rename"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-3 pr-4 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={labelDraft}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder="Zone label"
              autoFocus
              className="h-10 min-w-0 w-full rounded-xl border border-white/10 bg-white/95 px-3 text-sm text-slate-900 outline-none"
            />
            {suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-2xl border border-white/15 bg-slate-950/94 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => onSuggestionSelect(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saveDisabled}
            onClick={onSave}
            aria-label="Save zone label"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

interface ZoneShapeOverlayProps {
  xText: string;
  yText: string;
  wText: string;
  hText: string;
  canUndo: boolean;
  saveDisabled: boolean;
  onCancel: () => void;
  onUndo: () => void;
  onSave: () => void;
}

export function ZoneShapeOverlay({
  xText,
  yText,
  wText,
  hText,
  canUndo,
  saveDisabled,
  onCancel,
  onUndo,
  onSave,
}: ZoneShapeOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
      <div className="pointer-events-auto relative mx-auto max-w-[320px]">
        <button
          type="button"
          className="absolute -right-2 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
          onClick={onCancel}
          aria-label="Cancel shape editing"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex items-start gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-3 pr-4 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
          <div className="min-w-0 flex-1 text-white">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
              Edit shape
            </p>
            <div className="mt-1 flex flex-col gap-1 text-sm text-slate-100 [font-variant-numeric:tabular-nums]">
              <p className="m-0 flex items-center gap-2">
                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-slate-300">X</span>
                  <span className="inline-block w-[3.6rem] text-right">
                    {xText}
                  </span>
                </span>
                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-slate-300">Y</span>
                  <span className="inline-block w-[3.6rem] text-right">
                    {yText}
                  </span>
                </span>
              </p>
              <p className="m-0 flex items-center gap-2">
                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-slate-300">W</span>
                  <span className="inline-block w-[3.6rem] text-right">
                    {wText}
                  </span>
                </span>
                <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-slate-300">H</span>
                  <span className="inline-block w-[3.6rem] text-right">
                    {hText}
                  </span>
                </span>
              </p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 self-center">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!canUndo}
              onClick={onUndo}
              aria-label="Undo previous shape change"
            >
              <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saveDisabled}
              onClick={onSave}
              aria-label="Save zone shape"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ZoneMenuOverlayProps {
  label: string;
  onClose: () => void;
  onEditName: () => void;
  onEditShape: () => void;
  onDelete: () => void;
}

export function ZoneMenuOverlay({
  label,
  onClose,
  onEditName,
  onEditShape,
  onDelete,
}: ZoneMenuOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-25">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-transparent"
        aria-label="Close zone options"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-[280px] -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="pointer-events-auto rounded-3xl border border-white/15 bg-slate-950/88 p-3 text-white shadow-[0_22px_48px_rgba(15,23,42,0.34)] backdrop-blur-md">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                Zone block
              </p>
              <p className="m-0 mt-1 truncate text-base font-semibold text-white">
                {label}
              </p>
            </div>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10 text-white"
              onClick={onClose}
              aria-label="Close zone options"
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onEditName}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition-colors"
            >
              Edit name
            </button>
            <button
              type="button"
              onClick={onEditShape}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition-colors"
            >
              Edit shape
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-left text-sm font-semibold text-rose-100 transition-colors"
            >
              Delete zone block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FloorBoundaryOverlayProps {
  widthText: string;
  heightText: string;
  onCancel: () => void;
  onSave: () => void;
}

export function FloorBoundaryOverlay({
  widthText,
  heightText,
  onCancel,
  onSave,
}: FloorBoundaryOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
      <div className="pointer-events-auto relative mx-auto max-w-[320px]">
        <button
          type="button"
          className="absolute -right-2 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
          onClick={onCancel}
          aria-label="Cancel boundary editing"
        >
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex items-start gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-3 pr-4 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
          <div className="min-w-0 flex-1 text-white">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
              Floor boundary
            </p>
            <div className="mt-1 flex gap-4 text-sm [font-variant-numeric:tabular-nums] text-slate-100">
              <span>W {widthText}</span>
              <span>H {heightText}</span>
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white"
            onClick={onSave}
            aria-label="Save floor boundary"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateFloorPlanModalProps {
  isOpen: boolean;
  name: string;
  width: string;
  depth: string;
  canCreate: boolean;
  onNameChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  onDepthChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function CreateFloorPlanModal({
  isOpen,
  name,
  width,
  depth,
  canCreate,
  onNameChange,
  onWidthChange,
  onDepthChange,
  onClose,
  onCreate,
}: CreateFloorPlanModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-900/10 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Store Map
            </p>
            <h2 className="m-0 mt-1 text-lg font-bold text-slate-900">
              Create floor
            </h2>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500"
            onClick={onClose}
            aria-label="Close floor creation"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Name
            </p>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Ground floor"
              className="mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Width (m)
              </p>
              <input
                type="number"
                min="0"
                step="0.1"
                value={width}
                onChange={(event) => onWidthChange(event.target.value)}
                className="mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
              />
            </label>
            <label className="rounded-2xl border border-slate-900/10 bg-slate-50/80 px-3 py-3">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Depth (m)
              </p>
              <input
                type="number"
                min="0"
                step="0.1"
                value={depth}
                onChange={(event) => onDepthChange(event.target.value)}
                className="mt-2 h-10 w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canCreate}
            onClick={onCreate}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
