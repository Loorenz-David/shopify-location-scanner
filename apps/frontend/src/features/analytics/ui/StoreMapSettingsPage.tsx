import { useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import { BackArrowIcon, CloseIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { useFloorMapFlow } from "../flows/use-floor-map.flow";
import { useMapTouchControlsFlow } from "../flows/use-map-touch-controls.flow";
import {
  useZoneEditorFlow,
  type EditorViewportTransform,
} from "../flows/use-zone-editor.flow";
import {
  selectFloorMapIsEditorMode,
  selectFloorMapStageHeight,
  selectFloorMapStageWidth,
  selectFloorMapZones,
  useFloorMapStore,
} from "../stores/floor-map.store";
import {
  selectShapeEditCanUndo,
  useShapeEditHistoryStore,
} from "../stores/shape-edit-history.store";
import type { StoreZone } from "../types/analytics.types";

function pct(value: number, axisPx: number): number {
  return (value / 100) * axisPx;
}

export function StoreMapSettingsPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isEditorMode = useFloorMapStore(selectFloorMapIsEditorMode);
  useFloorMapFlow(containerRef, isEditorMode);
  const zones = useFloorMapStore(selectFloorMapZones);
  const stageWidth = useFloorMapStore(selectFloorMapStageWidth);
  const stageHeight = useFloorMapStore(selectFloorMapStageHeight);
  const setEditorMode = useFloorMapStore((state) => state.setEditorMode);
  const canUndoShapeEdit = useShapeEditHistoryStore(selectShapeEditCanUndo);
  const pushShapeSnapshot = useShapeEditHistoryStore(
    (state) => state.pushSnapshot,
  );
  const undoShapeEdit = useShapeEditHistoryStore((state) => state.undo);
  const resetShapeEditHistory = useShapeEditHistoryStore(
    (state) => state.reset,
  );
  const [selectedZone, setSelectedZone] = useState<StoreZone | null>(null);
  const [activeZoneEditorMode, setActiveZoneEditorMode] = useState<
    "menu" | "rename" | "shape" | null
  >(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [shapeDraft, setShapeDraft] = useState<StoreZone | null>(null);
  const [isShapeHandleActive, setIsShapeHandleActive] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [editorBaseTransform, setEditorBaseTransform] =
    useState<EditorViewportTransform | null>(null);
  const viewportTransform = isEditorMode ? editorBaseTransform : null;
  const {
    viewportTransform: interactiveViewportTransform,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouchTransform,
    consumeLastTouchTapIntent,
  } = useMapTouchControlsFlow(
    isEditorMode && !isShapeHandleActive,
    viewportTransform,
  );
  const {
    moveZone,
    normalizeSortOrder,
    removeZoneById,
    renameZone,
    saveZoneLabel,
    saveZoneShape,
    createZone,
  } = useZoneEditorFlow(interactiveViewportTransform);
  useEffect(() => {
    if (!isEditorMode) {
      return;
    }

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isEditorMode]);

  useEffect(() => {
    if (isEditorMode) {
      resetTouchTransform();
    }
  }, [isEditorMode, resetTouchTransform]);

  useEffect(() => {
    if (!isEditorMode) {
      setSelectedZone(null);
      setActiveZoneEditorMode(null);
      setLabelDraft("");
      setIsShapeHandleActive(false);
      setIsCreateMenuOpen(false);
      setEditorBaseTransform(null);
      resetShapeEditHistory();
    }
  }, [isEditorMode, resetShapeEditHistory]);

  useEffect(() => {
    if (!isEditorMode || stageWidth <= 0 || stageHeight <= 0) {
      return;
    }

    setEditorBaseTransform((current) => {
      if (current) {
        return current;
      }

      return buildEditorViewportTransform(zones, stageWidth, stageHeight);
    });
  }, [isEditorMode, stageHeight, stageWidth, zones]);

  useEffect(() => {
    setLabelDraft(selectedZone?.label ?? "");
    setActiveZoneEditorMode((current) =>
      selectedZone ? (current ?? "menu") : null,
    );
    setShapeDraft(selectedZone ? { ...selectedZone } : null);
  }, [selectedZone]);

  useEffect(() => {
    if (selectedZone || activeZoneEditorMode) {
      setIsCreateMenuOpen(false);
    }
  }, [activeZoneEditorMode, selectedZone]);

  useEffect(() => {
    resetShapeEditHistory();
  }, [activeZoneEditorMode, resetShapeEditHistory, selectedZone?.id]);

  const isDraftZone = selectedZone?.id === "__draft-zone__";
  const editorZones =
    isDraftZone && selectedZone ? [...zones, selectedZone] : zones;
  const hasPendingShapeChanges =
    !!selectedZone &&
    !!shapeDraft &&
    (selectedZone.xPct !== shapeDraft.xPct ||
      selectedZone.yPct !== shapeDraft.yPct ||
      selectedZone.widthPct !== shapeDraft.widthPct ||
      selectedZone.heightPct !== shapeDraft.heightPct);

  const beginCreateZone = () => {
    const defaultWidthPct = 18;
    const defaultHeightPct = 18;
    const scale = interactiveViewportTransform.scale || 1;
    const centerWorldX =
      (stageWidth / 2 - interactiveViewportTransform.offsetX) / scale;
    const centerWorldY =
      (stageHeight / 2 - interactiveViewportTransform.offsetY) / scale;
    const zoneWidthPx = pct(defaultWidthPct, stageWidth);
    const zoneHeightPx = pct(defaultHeightPct, stageHeight);
    const centerXPct = pxToPercent(centerWorldX - zoneWidthPx / 2, stageWidth);
    const centerYPct = pxToPercent(
      centerWorldY - zoneHeightPx / 2,
      stageHeight,
    );

    const draftZone: StoreZone = {
      id: "__draft-zone__",
      label: "",
      type: "zone",
      xPct: Math.min(centerXPct, 100 - defaultWidthPct),
      yPct: Math.min(centerYPct, 100 - defaultHeightPct),
      widthPct: defaultWidthPct,
      heightPct: defaultHeightPct,
      sortOrder: zones.length,
    };

    setIsCreateMenuOpen(false);
    setSelectedZone(draftZone);
    setLabelDraft("");
    setShapeDraft(draftZone);
    setActiveZoneEditorMode("rename");
  };

  useEffect(() => () => setEditorMode(false), [setEditorMode]);

  return (
    <section className="mx-auto flex h-full min-h-full w-full max-w-[1040px] flex-col gap-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)] px-4 pb-10 pt-6 text-slate-900">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 flex-shrink-0 place-items-center"
          onClick={() => homeShellActions.selectNavigationPage("settings")}
          aria-label="Back to settings"
        >
          <BackArrowIcon
            className="h-4 w-4 text-green-700"
            aria-hidden="true"
          />
        </button>
        <h1 className="m-0 text-2xl font-black text-slate-900">
          Store Map Editor
        </h1>
      </header>

      <div className="rounded-2xl border border-slate-900/10 bg-white/85 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <p className="m-0 text-sm font-medium text-slate-600">
          Tap edit to pan and zoom the map in fullscreen.
        </p>
      </div>

      <div
        ref={isEditorMode ? undefined : containerRef}
        className="relative rounded-[24px] border border-slate-900/10 bg-slate-900/90 p-3 shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-full border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          onClick={() => setEditorMode(true)}
        >
          Edit
        </button>
        <MapEditorStage
          zones={zones}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          isInteractive={false}
          moveZone={moveZone}
          renameZone={renameZone}
          viewportTransform={null}
        />
        {/* Transparent overlay prevents Konva canvas from swallowing scroll touch events */}
        <div className="absolute inset-0 z-[5] [touch-action:pan-y]" aria-hidden="true" />
      </div>

      <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-sm font-semibold text-slate-900">Zones</p>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            onClick={() => void normalizeSortOrder()}
          >
            Normalize order
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {zones.map((zone) => (
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
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                onClick={() => void removeZoneById(zone)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {isEditorMode ? (
        <div className="fixed inset-0 z-70 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)]">
          <div
            ref={isEditorMode ? containerRef : undefined}
            className="relative h-svh w-full bg-slate-950"
          >
            <MapEditorStage
              zones={editorZones}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              isInteractive
              moveZone={moveZone}
              renameZone={renameZone}
              viewportTransform={interactiveViewportTransform}
              onStageTouchStart={handleTouchStart}
              onStageTouchMove={handleTouchMove}
              onStageTouchEnd={handleTouchEnd}
              onSelectZone={setSelectedZone}
              consumeLastTouchTapIntent={consumeLastTouchTapIntent}
              shapeDraft={activeZoneEditorMode === "shape" ? shapeDraft : null}
              onShapeDraftChange={setShapeDraft}
              onShapeHandleActiveChange={setIsShapeHandleActive}
              onShapeInteractionStart={pushShapeSnapshot}
            />

            {!selectedZone && !activeZoneEditorMode ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full border border-white/15 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.22)] backdrop-blur"
                    onClick={() => setEditorMode(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}

            {!selectedZone && !activeZoneEditorMode ? (
              <div className="pointer-events-none absolute bottom-5 right-5 z-30">
                <div className="relative h-28 w-28">
                  <button
                    type="button"
                    aria-label={
                      isCreateMenuOpen
                        ? "Close create actions"
                        : "Open create actions"
                    }
                    className="pointer-events-auto absolute bottom-0 right-0 grid h-16 w-16 place-items-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.32)] transition-transform"
                    onClick={() => setIsCreateMenuOpen((current) => !current)}
                  >
                    <span
                      className={`text-4xl font-light leading-none transition-transform duration-200 ${
                        isCreateMenuOpen ? "rotate-45" : "rotate-0"
                      }`}
                    >
                      +
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label="Create zone block"
                    className={`pointer-events-auto absolute bottom-[4.2rem] right-[4.2rem] flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition-all duration-200 ${
                      isCreateMenuOpen
                        ? "translate-x-0 translate-y-0 opacity-100"
                        : "translate-x-3 translate-y-3 opacity-0 pointer-events-none"
                    }`}
                    onClick={beginCreateZone}
                  >
                    <span className="relative block h-6 w-6 rounded-md border-2 border-slate-700">
                      <span className="absolute left-1/2 top-[2px] h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-slate-700" />
                      <span className="absolute left-[2px] top-1/2 h-[2px] w-[14px] -translate-y-1/2 rounded-full bg-slate-700" />
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {selectedZone && activeZoneEditorMode === "rename" ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
                <div className="pointer-events-auto relative mx-auto max-w-[520px]">
                  <button
                    type="button"
                    className="absolute -right-4 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
                    onClick={() => {
                      setLabelDraft(selectedZone.label);
                      if (isDraftZone) {
                        setShapeDraft(null);
                        setActiveZoneEditorMode(null);
                        setSelectedZone(null);
                        return;
                      }

                      setActiveZoneEditorMode(null);
                      setSelectedZone(null);
                    }}
                    aria-label="Cancel rename"
                  >
                    <CloseIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-3 pr-4 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
                    <input
                      type="text"
                      value={labelDraft}
                      onChange={(event) => setLabelDraft(event.target.value)}
                      placeholder="Zone label"
                      autoFocus
                      className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/95 px-3 text-sm text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!labelDraft.trim()}
                      onClick={async () => {
                        if (isDraftZone) {
                          const nextLabel = labelDraft.trim();
                          setSelectedZone((current) =>
                            current
                              ? { ...current, label: nextLabel }
                              : current,
                          );
                          setShapeDraft((current) =>
                            current
                              ? { ...current, label: nextLabel }
                              : current,
                          );
                          setActiveZoneEditorMode("shape");
                          return;
                        }

                        await saveZoneLabel(selectedZone, labelDraft);
                        setSelectedZone((current) =>
                          current
                            ? { ...current, label: labelDraft.trim() }
                            : current,
                        );
                        setActiveZoneEditorMode("menu");
                      }}
                      aria-label="Save zone label"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedZone && activeZoneEditorMode === "shape" ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
                <div className="pointer-events-auto relative mx-auto max-w-[320px]">
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
                    onClick={() => {
                      if (
                        hasPendingShapeChanges &&
                        !window.confirm("Discard the current shape changes?")
                      ) {
                        return;
                      }

                      resetShapeEditHistory();
                      if (isDraftZone) {
                        setShapeDraft(selectedZone);
                        setLabelDraft(selectedZone.label);
                        setActiveZoneEditorMode("rename");
                        return;
                      }

                      setShapeDraft(selectedZone);
                      setActiveZoneEditorMode(null);
                      setSelectedZone(null);
                    }}
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
                              {formatShapeMetric(
                                shapeDraft?.xPct ?? selectedZone.xPct,
                              )}
                            </span>
                          </span>
                          <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                            <span className="text-slate-300">Y</span>
                            <span className="inline-block w-[3.6rem] text-right">
                              {formatShapeMetric(
                                shapeDraft?.yPct ?? selectedZone.yPct,
                              )}
                            </span>
                          </span>
                        </p>
                        <p className="m-0 flex items-center gap-2">
                          <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                            <span className="text-slate-300">W</span>
                            <span className="inline-block w-[3.6rem] text-right">
                              {formatShapeMetric(
                                shapeDraft?.widthPct ?? selectedZone.widthPct,
                              )}
                            </span>
                          </span>
                          <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                            <span className="text-slate-300">H</span>
                            <span className="inline-block w-[3.6rem] text-right">
                              {formatShapeMetric(
                                shapeDraft?.heightPct ?? selectedZone.heightPct,
                              )}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-2 self-center">
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white disabled:cursor-not-allowed disabled:opacity-35"
                        disabled={!canUndoShapeEdit}
                        onClick={() => {
                          const previousShape = undoShapeEdit();
                          if (!previousShape) {
                            return;
                          }

                          setShapeDraft((current) =>
                            current
                              ? { ...current, ...previousShape }
                              : previousShape,
                          );
                        }}
                        aria-label="Undo previous shape change"
                      >
                        <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!shapeDraft}
                        onClick={async () => {
                          if (!selectedZone || !shapeDraft) {
                            return;
                          }

                          if (isDraftZone) {
                            await createZone({
                              label: shapeDraft.label.trim() || "Zone",
                              type: shapeDraft.type,
                              xPct: shapeDraft.xPct,
                              yPct: shapeDraft.yPct,
                              widthPct: shapeDraft.widthPct,
                              heightPct: shapeDraft.heightPct,
                              sortOrder: zones.length,
                            });
                            resetShapeEditHistory();
                            setShapeDraft(null);
                            setSelectedZone(null);
                            setActiveZoneEditorMode(null);
                            return;
                          }

                          await saveZoneShape(selectedZone, {
                            xPct: shapeDraft.xPct,
                            yPct: shapeDraft.yPct,
                            widthPct: shapeDraft.widthPct,
                            heightPct: shapeDraft.heightPct,
                          });
                          resetShapeEditHistory();
                          setSelectedZone(null);
                          setActiveZoneEditorMode(null);
                        }}
                        aria-label="Save zone shape"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedZone && activeZoneEditorMode === "menu" ? (
              <div className="pointer-events-none absolute inset-0 z-25">
                <button
                  type="button"
                  className="pointer-events-auto absolute inset-0 bg-transparent"
                  aria-label="Close zone options"
                  onClick={() => setSelectedZone(null)}
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-[280px] -translate-x-1/2 -translate-y-1/2 px-4">
                  <div className="pointer-events-auto rounded-3xl border border-white/15 bg-slate-950/88 p-3 text-white shadow-[0_22px_48px_rgba(15,23,42,0.34)] backdrop-blur-md">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                          Zone block
                        </p>
                        <p className="m-0 mt-1 truncate text-base font-semibold text-white">
                          {selectedZone.label}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10 text-white"
                        onClick={() => setSelectedZone(null)}
                        aria-label="Close zone options"
                      >
                        <CloseIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {[
                        {
                          id: "edit-name",
                          label: "Edit name",
                          onClick: () => setActiveZoneEditorMode("rename"),
                          disabled: false,
                        },
                        {
                          id: "edit-shape",
                          label: "Edit shape",
                          onClick: () => {
                            setShapeDraft(selectedZone);
                            setActiveZoneEditorMode("shape");
                          },
                          disabled: false,
                        },
                        {
                          id: "delete-zone",
                          label: "Delete zone block",
                          onClick: async () => {
                            await removeZoneById(selectedZone);
                            setSelectedZone(null);
                          },
                          disabled: false,
                        },
                      ].map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors disabled:opacity-45 ${
                            action.id === "delete-zone"
                              ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                              : "border-white/15 bg-white/10 text-white"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface MapEditorStageProps {
  zones: StoreZone[];
  stageWidth: number;
  stageHeight: number;
  isInteractive: boolean;
  moveZone: ReturnType<typeof useZoneEditorFlow>["moveZone"];
  renameZone: ReturnType<typeof useZoneEditorFlow>["renameZone"];
  viewportTransform: EditorViewportTransform | null;
  onStageTouchStart?: (event: KonvaEventObject<TouchEvent>) => void;
  onStageTouchMove?: (event: KonvaEventObject<TouchEvent>) => void;
  onStageTouchEnd?: (event: KonvaEventObject<TouchEvent>) => void;
  onSelectZone?: (zone: StoreZone) => void;
  consumeLastTouchTapIntent?: () => boolean;
  shapeDraft?: StoreZone | null;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  onShapeInteractionStart?: (zone: StoreZone) => void;
}

function MapEditorStage({
  zones,
  stageWidth,
  stageHeight,
  isInteractive,
  moveZone,
  renameZone,
  viewportTransform,
  onStageTouchStart,
  onStageTouchMove,
  onStageTouchEnd,
  onSelectZone,
  consumeLastTouchTapIntent,
  shapeDraft,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  onShapeInteractionStart,
}: MapEditorStageProps) {
  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      style={{ background: "#0f172a", touchAction: "none" }}
      onTouchStart={isInteractive ? onStageTouchStart : undefined}
      onTouchMove={isInteractive ? onStageTouchMove : undefined}
      onTouchEnd={isInteractive ? onStageTouchEnd : undefined}
    >
      <Layer>
        <Group
          x={viewportTransform?.offsetX ?? 0}
          y={viewportTransform?.offsetY ?? 0}
          scaleX={viewportTransform?.scale ?? 1}
          scaleY={viewportTransform?.scale ?? 1}
        >
          {zones.map((zone) => (
            <EditableZone
              key={zone.id}
              zone={shapeDraft?.id === zone.id ? shapeDraft : zone}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              onDragEnd={moveZone}
              onRename={renameZone}
              isInteractive={isInteractive}
              onSelectZone={onSelectZone}
              consumeLastTouchTapIntent={consumeLastTouchTapIntent}
              shapeDraftMode={shapeDraft?.id === zone.id}
              onShapeDraftChange={onShapeDraftChange}
              onShapeHandleActiveChange={onShapeHandleActiveChange}
              viewportTransform={viewportTransform}
              onShapeInteractionStart={onShapeInteractionStart}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}

function buildEditorViewportTransform(
  zones: StoreZone[],
  stageWidth: number,
  stageHeight: number,
): EditorViewportTransform | null {
  if (zones.length === 0 || stageWidth <= 0 || stageHeight <= 0) {
    return null;
  }

  const bounds = zones.reduce(
    (current, zone) => {
      const x = pct(zone.xPct, stageWidth);
      const y = pct(zone.yPct, stageHeight);
      const width = pct(zone.widthPct, stageWidth);
      const height = pct(zone.heightPct, stageHeight);

      return {
        minX: Math.min(current.minX, x),
        minY: Math.min(current.minY, y),
        maxX: Math.max(current.maxX, x + width),
        maxY: Math.max(current.maxY, y + height),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const padding = 32;
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const availableWidth = Math.max(stageWidth - padding * 2, 1);
  const availableHeight = Math.max(stageHeight - padding * 2, 1);
  const scale = Math.max(
    1,
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  );

  return {
    scale,
    offsetX:
      padding +
      (availableWidth - contentWidth * scale) / 2 -
      bounds.minX * scale,
    offsetY:
      padding +
      (availableHeight - contentHeight * scale) / 2 -
      bounds.minY * scale,
  };
}

interface EditableZoneProps {
  zone: StoreZone;
  stageWidth: number;
  stageHeight: number;
  onDragEnd: (zone: StoreZone, xPx: number, yPx: number) => Promise<void>;
  onRename: (zone: StoreZone) => Promise<void>;
  isInteractive: boolean;
  onSelectZone?: (zone: StoreZone) => void;
  consumeLastTouchTapIntent?: () => boolean;
  shapeDraftMode?: boolean;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  viewportTransform?: EditorViewportTransform | null;
  onShapeInteractionStart?: (zone: StoreZone) => void;
}

function EditableZone({
  zone,
  stageWidth,
  stageHeight,
  onDragEnd,
  onRename,
  isInteractive,
  onSelectZone,
  consumeLastTouchTapIntent,
  shapeDraftMode = false,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  viewportTransform,
  onShapeInteractionStart,
}: EditableZoneProps) {
  const x = pct(zone.xPct, stageWidth);
  const y = pct(zone.yPct, stageHeight);
  const width = pct(zone.widthPct, stageWidth);
  const height = pct(zone.heightPct, stageHeight);
  const fill = zone.type === "corridor" ? "#475569" : "#0ea5e9";
  const wasDraggedRef = useRef(false);
  const [dragGhostRect, setDragGhostRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressDragRef = useRef<{
    active: boolean;
    startTouchX: number;
    startTouchY: number;
    startZoneXPx: number;
    startZoneYPx: number;
  } | null>(null);

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        opacity={0.55}
        stroke="#ffffff"
        strokeWidth={1}
        cornerRadius={6}
        draggable={isInteractive && !shapeDraftMode}
        onDragStart={(event) => {
          wasDraggedRef.current = true;
          if (event.evt.type.startsWith("touch")) {
            event.target.stopDrag();
            wasDraggedRef.current = false;
          }
        }}
        onDragEnd={
          isInteractive
            ? (event) => {
                void onDragEnd(zone, event.target.x(), event.target.y());
                window.setTimeout(() => {
                  wasDraggedRef.current = false;
                }, 0);
              }
            : undefined
        }
        onDblClick={
          isInteractive && !shapeDraftMode
            ? () => void onRename(zone)
            : undefined
        }
        onClick={
          isInteractive && onSelectZone && !shapeDraftMode
            ? () => {
                if (wasDraggedRef.current) {
                  wasDraggedRef.current = false;
                  return;
                }

                onSelectZone(zone);
              }
            : undefined
        }
        onTap={
          isInteractive && onSelectZone && !shapeDraftMode
            ? () => {
                if (wasDraggedRef.current) {
                  wasDraggedRef.current = false;
                  return;
                }

                if (consumeLastTouchTapIntent && !consumeLastTouchTapIntent()) {
                  return;
                }

                onSelectZone(zone);
              }
            : undefined
        }
        onTouchStart={
          shapeDraftMode
            ? (event) => {
                const stage = event.target.getStage();
                const touch = event.evt.touches[0];
                if (!stage || !touch) {
                  return;
                }

                const rect = stage.container().getBoundingClientRect();
                longPressDragRef.current = {
                  active: false,
                  startTouchX: touch.clientX - rect.left,
                  startTouchY: touch.clientY - rect.top,
                  startZoneXPx: x,
                  startZoneYPx: y,
                };

                longPressTimeoutRef.current = window.setTimeout(() => {
                  if (!longPressDragRef.current) {
                    return;
                  }

                  longPressDragRef.current.active = true;
                  onShapeInteractionStart?.(zone);
                  setDragGhostRect({
                    x: longPressDragRef.current.startZoneXPx,
                    y: longPressDragRef.current.startZoneYPx,
                    width,
                    height,
                  });
                  onShapeHandleActiveChange?.(true);
                  if (
                    typeof navigator !== "undefined" &&
                    "vibrate" in navigator
                  ) {
                    navigator.vibrate(45);
                  }
                }, 350);
              }
            : undefined
        }
        onTouchMove={
          shapeDraftMode
            ? (event) => {
                const dragState = longPressDragRef.current;
                const stage = event.target.getStage();
                const touch = event.evt.touches[0];

                if (!dragState || !stage || !touch) {
                  return;
                }

                const rect = stage.container().getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;

                if (!dragState.active) {
                  const deltaX = Math.abs(touchX - dragState.startTouchX);
                  const deltaY = Math.abs(touchY - dragState.startTouchY);

                  if (deltaX > 8 || deltaY > 8) {
                    if (longPressTimeoutRef.current !== null) {
                      window.clearTimeout(longPressTimeoutRef.current);
                      longPressTimeoutRef.current = null;
                    }
                    setDragGhostRect(null);
                    longPressDragRef.current = null;
                  }
                  return;
                }

                event.cancelBubble = true;
                const scale = viewportTransform?.scale ?? 1;
                const deltaWorldX = (touchX - dragState.startTouchX) / scale;
                const deltaWorldY = (touchY - dragState.startTouchY) / scale;

                onShapeDraftChange?.({
                  ...zone,
                  xPct: pxToPercent(
                    dragState.startZoneXPx + deltaWorldX,
                    stageWidth,
                  ),
                  yPct: pxToPercent(
                    dragState.startZoneYPx + deltaWorldY,
                    stageHeight,
                  ),
                });
              }
            : undefined
        }
        onTouchEnd={
          shapeDraftMode
            ? (event) => {
                if (longPressTimeoutRef.current !== null) {
                  window.clearTimeout(longPressTimeoutRef.current);
                  longPressTimeoutRef.current = null;
                }

                if (longPressDragRef.current?.active) {
                  event.cancelBubble = true;
                  onShapeHandleActiveChange?.(false);
                }

                setDragGhostRect(null);
                longPressDragRef.current = null;
              }
            : undefined
        }
        onTouchCancel={
          shapeDraftMode
            ? (event: KonvaEventObject<TouchEvent>) => {
                if (longPressTimeoutRef.current !== null) {
                  window.clearTimeout(longPressTimeoutRef.current);
                  longPressTimeoutRef.current = null;
                }

                if (longPressDragRef.current?.active) {
                  event.cancelBubble = true;
                  onShapeHandleActiveChange?.(false);
                }

                setDragGhostRect(null);
                longPressDragRef.current = null;
              }
            : undefined
        }
      />
      {shapeDraftMode && dragGhostRect ? (
        <Rect
          x={dragGhostRect.x}
          y={dragGhostRect.y}
          width={dragGhostRect.width}
          height={dragGhostRect.height}
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.48)"
          strokeWidth={1.5}
          dash={[7, 5]}
          cornerRadius={6}
          listening={false}
        />
      ) : null}
      {shapeDraftMode ? (
        <ShapeHandles
          zone={zone}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          onShapeDraftChange={onShapeDraftChange}
          onShapeHandleActiveChange={onShapeHandleActiveChange}
          onShapeInteractionStart={onShapeInteractionStart}
        />
      ) : null}
      <Text
        x={x + 6}
        y={y + 6}
        text={zone.label}
        fontSize={11}
        fontStyle="bold"
        fill="#ffffff"
      />
    </>
  );
}

interface ShapeHandlesProps {
  zone: StoreZone;
  stageWidth: number;
  stageHeight: number;
  onShapeDraftChange?: (zone: StoreZone | null) => void;
  onShapeHandleActiveChange?: (value: boolean) => void;
  onShapeInteractionStart?: (zone: StoreZone) => void;
}

function ShapeHandles({
  zone,
  stageWidth,
  stageHeight,
  onShapeDraftChange,
  onShapeHandleActiveChange,
  onShapeInteractionStart,
}: ShapeHandlesProps) {
  const x = pct(zone.xPct, stageWidth);
  const y = pct(zone.yPct, stageHeight);
  const width = pct(zone.widthPct, stageWidth);
  const height = pct(zone.heightPct, stageHeight);
  const handleSize = 14;

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#ffffff"
        strokeWidth={2}
        dash={[8, 5]}
        cornerRadius={6}
        listening={false}
      />
      {(
        [
          { key: "nw", x, y },
          { key: "ne", x: x + width, y },
          { key: "sw", x, y: y + height },
          { key: "se", x: x + width, y: y + height },
        ] as const
      ).map((handle) => (
        <Rect
          key={handle.key}
          x={handle.x - handleSize / 2}
          y={handle.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke="#0ea5e9"
          strokeWidth={2}
          cornerRadius={4}
          draggable
          onTouchStart={(event) => {
            event.cancelBubble = true;
            onShapeHandleActiveChange?.(true);
          }}
          onTouchMove={(event) => {
            event.cancelBubble = true;
          }}
          onTouchEnd={(event) => {
            event.cancelBubble = true;
            onShapeHandleActiveChange?.(false);
          }}
          onDragStart={() => {
            onShapeInteractionStart?.(zone);
            onShapeHandleActiveChange?.(true);
          }}
          onDragMove={(event) => {
            event.cancelBubble = true;
            const nextHandleCenterX = event.target.x() + handleSize / 2;
            const nextHandleCenterY = event.target.y() + handleSize / 2;
            const minSizePx = 24;

            let nextX = x;
            let nextY = y;
            let nextWidth = width;
            let nextHeight = height;

            if (handle.key === "nw") {
              const clampedX = Math.min(
                nextHandleCenterX,
                x + width - minSizePx,
              );
              const clampedY = Math.min(
                nextHandleCenterY,
                y + height - minSizePx,
              );
              nextX = clampedX;
              nextY = clampedY;
              nextWidth = x + width - clampedX;
              nextHeight = y + height - clampedY;
            }

            if (handle.key === "ne") {
              const clampedX = Math.max(nextHandleCenterX, x + minSizePx);
              const clampedY = Math.min(
                nextHandleCenterY,
                y + height - minSizePx,
              );
              nextY = clampedY;
              nextWidth = clampedX - x;
              nextHeight = y + height - clampedY;
            }

            if (handle.key === "sw") {
              const clampedX = Math.min(
                nextHandleCenterX,
                x + width - minSizePx,
              );
              const clampedY = Math.max(nextHandleCenterY, y + minSizePx);
              nextX = clampedX;
              nextWidth = x + width - clampedX;
              nextHeight = clampedY - y;
            }

            if (handle.key === "se") {
              const clampedX = Math.max(nextHandleCenterX, x + minSizePx);
              const clampedY = Math.max(nextHandleCenterY, y + minSizePx);
              nextWidth = clampedX - x;
              nextHeight = clampedY - y;
            }

            onShapeDraftChange?.({
              ...zone,
              xPct: pxToPercent(nextX, stageWidth),
              yPct: pxToPercent(nextY, stageHeight),
              widthPct: pxToPercent(nextWidth, stageWidth),
              heightPct: pxToPercent(nextHeight, stageHeight),
            });
          }}
          onDragEnd={(event) => {
            onShapeHandleActiveChange?.(false);
            event.target.position({
              x: handle.x - handleSize / 2,
              y: handle.y - handleSize / 2,
            });
          }}
        />
      ))}
    </>
  );
}

function pxToPercent(valuePx: number, axisPx: number): number {
  if (axisPx <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (valuePx / axisPx) * 100));
}

function formatShapeMetric(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}
