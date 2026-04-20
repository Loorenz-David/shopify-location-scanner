import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BackArrowIcon } from "../../../assets/icons";
import {
  buildEditorViewportTransform,
  clampZoneShapeToBounds,
  findNearestNonOverlappingZoneShape,
  formatShapeMetric,
  hasZoneOverlap,
  resolveCollisionAwareDraft,
} from "../domain/store-map-editor.domain";
import { useFloorBoundaryEditorFlow } from "../flows/use-floor-boundary-editor.flow";
import { useFloorMapFlow } from "../flows/use-floor-map.flow";
import { useFloorPlansFlow } from "../flows/use-floor-plans.flow";
import { useMapTouchControlsFlow } from "../flows/use-map-touch-controls.flow";
import { useStoreMapEditorSessionFlow } from "../flows/use-store-map-editor-session.flow";
import { useZoneEditorFlow } from "../flows/use-zone-editor.flow";
import { useZoneLabelSuggestions } from "../flows/use-zone-label-suggestions.flow";
import {
  selectActiveFloorPlan,
  selectFloorPlans,
  selectSelectedFloorPlanId,
  useFloorPlanStore,
} from "../stores/floor-plan.store";
import {
  selectFloorBoundaryDraft,
  selectFloorBoundaryEditMode,
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
import { formatCm } from "../utils/cm-format";
import {
  cmVerticesToWorldPx,
  computeGridSpacingCm,
  gridStepPx,
  worldPxToCm,
} from "../utils/grid-utils";
import {
  CreateFloorPlanModal,
  EditorDoneButtonOverlay,
  EditorFloatingActions,
  FloorBoundaryOverlay,
  ZoneMenuOverlay,
  ZoneRenameOverlay,
  ZoneShapeOverlay,
} from "./StoreMapEditorPanels";
import { StoreMapEditorStage } from "./StoreMapEditorStage";
import {
  EmptyFloorPreviewCard,
  FloorSelectorCard,
} from "./StoreMapSettingsCards";

const MAP_PREVIEW_HEIGHT_PX = 600;

export function StoreMapSettingsPage() {
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewStageSize, setPreviewStageSize] = useState({
    width: 400,
    height: MAP_PREVIEW_HEIGHT_PX,
  });
  const isEditorMode = useFloorMapStore(selectFloorMapIsEditorMode);
  const isFloorBoundaryEditMode = useFloorMapStore(selectFloorBoundaryEditMode);
  const floorBoundaryDraft = useFloorMapStore(selectFloorBoundaryDraft);
  const zones = useFloorMapStore(selectFloorMapZones);
  const stageWidth = useFloorMapStore(selectFloorMapStageWidth);
  const stageHeight = useFloorMapStore(selectFloorMapStageHeight);
  const setEditorMode = useFloorMapStore((state) => state.setEditorMode);
  const setFloorBoundaryDraft = useFloorMapStore(
    (state) => state.setFloorBoundaryDraft,
  );
  const setFloorBoundaryEditMode = useFloorMapStore(
    (state) => state.setFloorBoundaryEditMode,
  );
  const floorPlans = useFloorPlanStore(selectFloorPlans);
  const selectedFloorPlanId = useFloorPlanStore(selectSelectedFloorPlanId);
  const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
  const setSelectedFloorPlanId = useFloorPlanStore(
    (state) => state.setSelectedFloorPlanId,
  );
  const canUndoShapeEdit = useShapeEditHistoryStore(selectShapeEditCanUndo);
  const pushShapeSnapshot = useShapeEditHistoryStore(
    (state) => state.pushSnapshot,
  );
  const undoShapeEdit = useShapeEditHistoryStore((state) => state.undo);
  const resetShapeEditHistory = useShapeEditHistoryStore(
    (state) => state.reset,
  );

  const { createFloorPlan } = useFloorPlansFlow();
  const { beginBoundaryEdit, cancelBoundaryEdit, saveBoundary } =
    useFloorBoundaryEditorFlow();

  useFloorMapFlow(editorContainerRef, isEditorMode);

  useEffect(() => {
    const previewElement = previewContainerRef.current;
    if (!previewElement) {
      return;
    }

    const updatePreviewStageSize = () => {
      const nextWidth = previewElement.offsetWidth;
      if (!nextWidth) {
        return;
      }

      setPreviewStageSize({
        width: nextWidth,
        height: MAP_PREVIEW_HEIGHT_PX,
      });
    };

    updatePreviewStageSize();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updatePreviewStageSize();
          })
        : null;

    resizeObserver?.observe(previewElement);

    return () => {
      resizeObserver?.disconnect();
    };
  }, [activeFloorPlan?.id]);

  const floorBoundaryVerticesWorld = useMemo(() => {
    if (!activeFloorPlan) {
      return [];
    }

    const sourceVertices = floorBoundaryDraft ??
      activeFloorPlan.shape ?? [
        { xCm: 0, yCm: 0 },
        { xCm: activeFloorPlan.widthCm, yCm: 0 },
        { xCm: activeFloorPlan.widthCm, yCm: activeFloorPlan.depthCm },
        { xCm: 0, yCm: activeFloorPlan.depthCm },
      ];

    return cmVerticesToWorldPx(
      sourceVertices,
      stageWidth,
      stageHeight,
      activeFloorPlan.widthCm,
      activeFloorPlan.depthCm,
    ).map((vertex) => ({
      xPx: vertex.xPx,
      yPx: vertex.yPx,
    }));
  }, [activeFloorPlan, floorBoundaryDraft, stageHeight, stageWidth]);
  const previewFloorBoundaryVerticesWorld = useMemo(() => {
    if (!activeFloorPlan) {
      return [];
    }

    const sourceVertices = floorBoundaryDraft ??
      activeFloorPlan.shape ?? [
        { xCm: 0, yCm: 0 },
        { xCm: activeFloorPlan.widthCm, yCm: 0 },
        { xCm: activeFloorPlan.widthCm, yCm: activeFloorPlan.depthCm },
        { xCm: 0, yCm: activeFloorPlan.depthCm },
      ];

    return cmVerticesToWorldPx(
      sourceVertices,
      previewStageSize.width,
      previewStageSize.height,
      activeFloorPlan.widthCm,
      activeFloorPlan.depthCm,
    ).map((vertex) => ({
      xPx: vertex.xPx,
      yPx: vertex.yPx,
    }));
  }, [
    activeFloorPlan,
    floorBoundaryDraft,
    previewStageSize.height,
    previewStageSize.width,
  ]);

  const session = useStoreMapEditorSessionFlow({
    zones,
    floorPlansCount: floorPlans.length,
    activeFloorPlan,
    selectedFloorPlanId,
    isEditorMode,
    isFloorBoundaryEditMode,
    floorBoundaryDraft,
    stageWidth,
    stageHeight,
    floorBoundaryVerticesWorld,
    setEditorMode,
    setFloorBoundaryDraft,
    setFloorBoundaryEditMode,
    resetShapeEditHistory,
    cancelBoundaryEdit,
    createFloorPlan,
  });

  const {
    viewportTransform: interactiveViewportTransform,
    isGestureActive,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouchTransform,
    consumeLastTouchTapIntent,
  } = useMapTouchControlsFlow(
    isEditorMode && !session.isShapeHandleActive,
    session.stableViewportTransform,
  );

  useEffect(() => {
    if (isEditorMode) {
      resetTouchTransform();
    }
  }, [isEditorMode, resetTouchTransform]);

  const labelSuggestions = useZoneLabelSuggestions(session.labelDraft);
  const {
    removeZoneById,
    renameZone,
    saveZoneLabel,
    saveZoneShapesBatch,
    createZone,
  } = useZoneEditorFlow(interactiveViewportTransform);

  const gridSpacingCm = useMemo(() => {
    if (!activeFloorPlan || !interactiveViewportTransform || !isEditorMode) {
      return 100;
    }

    return computeGridSpacingCm(
      interactiveViewportTransform.scale,
      stageWidth,
      activeFloorPlan.widthCm,
    );
  }, [
    activeFloorPlan,
    interactiveViewportTransform?.scale,
    isEditorMode,
    stageWidth,
  ]);

  const gridStepPxX = activeFloorPlan
    ? gridStepPx(gridSpacingCm, stageWidth, activeFloorPlan.widthCm)
    : 0;
  const gridStepPxY = activeFloorPlan
    ? gridStepPx(gridSpacingCm, stageHeight, activeFloorPlan.depthCm)
    : 0;
  const previewViewportTransform = useMemo(
    () =>
      buildEditorViewportTransform({
        zones,
        stageWidth: previewStageSize.width,
        stageHeight: previewStageSize.height,
        boundaryWorldVertices: previewFloorBoundaryVerticesWorld,
      }),
    [
      previewFloorBoundaryVerticesWorld,
      previewStageSize.height,
      previewStageSize.width,
      zones,
    ],
  );
  const hasShapeDraftCollision = useMemo(() => {
    if (!session.shapeDraft) {
      return false;
    }

    return hasZoneOverlap(
      session.shapeDraft,
      zones,
      session.shapeDraft.id,
    );
  }, [session.shapeDraft, zones]);

  const handleShapeDraftChange = useCallback(
    (
      nextShapeDraft:
        | StoreZone
        | null
        | ((current: StoreZone | null) => StoreZone | null),
    ) => {
      session.setShapeDraft((current) => {
        const resolvedDraft =
          typeof nextShapeDraft === "function"
            ? nextShapeDraft(current)
            : nextShapeDraft;

        if (!resolvedDraft) {
          return null;
        }

        const boundedDraft = clampZoneShapeToBounds(resolvedDraft);
        return resolveCollisionAwareDraft(current, boundedDraft, zones);
      });
    },
    [session, zones],
  );

  return (
    <section className="mx-auto flex h-full min-h-full w-full max-w-[1040px] flex-col gap-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)] px-4 pb-10 pt-6 text-slate-900">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 flex-shrink-0 place-items-center"
          onClick={session.handleNavigateBack}
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

      {/* <PreviewHelpCard hasActiveFloor={!!activeFloorPlan} /> */}

      {!isEditorMode && activeFloorPlan ? (
        <div
          ref={previewContainerRef}
          className="relative mx-auto h-[600px] w-full max-w-[400px] shrink-0 overflow-hidden rounded-[24px] border border-slate-900/10 bg-slate-900/90 shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-full border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            onClick={() => setEditorMode(true)}
          >
            Edit
          </button>
          <div className="pointer-events-none h-full w-full">
            <StoreMapEditorStage
              zones={zones}
              stageWidth={previewStageSize.width}
              stageHeight={previewStageSize.height}
              isInteractive={false}
              renameZone={renameZone}
              viewportTransform={previewViewportTransform}
              floorBoundaryVertices={previewFloorBoundaryVerticesWorld}
              isFloorBoundaryEditMode={false}
              showGrid={false}
              gridStepPxX={gridStepPxX}
              gridStepPxY={gridStepPxY}
              labelRenderMode="full"
            />
          </div>
        </div>
      ) : !isEditorMode ? (
        <EmptyFloorPreviewCard
          onCreateFloor={() => session.setIsCreateFloorPlanOpen(true)}
        />
      ) : null}

      {!isEditorMode ? (
        <FloorSelectorCard
          floorNames={floorPlans.map((floorPlan) => ({
            id: floorPlan.id,
            name: floorPlan.name,
          }))}
          selectedFloorPlanId={selectedFloorPlanId}
          activeFloorSizeText={
            activeFloorPlan
              ? `${formatCm(activeFloorPlan.widthCm)} × ${formatCm(activeFloorPlan.depthCm)}`
              : null
          }
          isEditorMode={isEditorMode}
          onSelectFloor={setSelectedFloorPlanId}
          onCreateFloor={() => session.setIsCreateFloorPlanOpen(true)}
        />
      ) : null}

      {isEditorMode ? (
        <div className="fixed inset-0 z-70 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_55%,#eef2f7_100%)]">
          <div
            ref={isEditorMode ? editorContainerRef : undefined}
            className="relative h-svh w-full bg-slate-950"
          >
            <StoreMapEditorStage
              zones={session.editorZones}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              isInteractive
              renameZone={renameZone}
              viewportTransform={interactiveViewportTransform}
              onStageTouchStart={handleTouchStart}
              onStageTouchMove={handleTouchMove}
              onStageTouchEnd={handleTouchEnd}
              onSelectZone={session.handleSelectZone}
              consumeLastTouchTapIntent={consumeLastTouchTapIntent}
              shapeDraft={
                session.activeZoneEditorMode === "shape"
                  ? session.shapeDraft
                  : null
              }
              onShapeDraftChange={handleShapeDraftChange}
              onShapeHandleActiveChange={session.setIsShapeHandleActive}
              onShapeInteractionStart={pushShapeSnapshot}
              floorBoundaryVertices={floorBoundaryVerticesWorld}
              isFloorBoundaryEditMode={isFloorBoundaryEditMode}
              showGrid={!!activeFloorPlan && !isGestureActive}
              gridStepPxX={gridStepPxX}
              gridStepPxY={gridStepPxY}
              labelRenderMode={isGestureActive ? "gesture-lite" : "full"}
              onFloorBoundaryDraftChange={(vertices) => {
                if (!activeFloorPlan) {
                  return;
                }

                setFloorBoundaryDraft(
                  vertices.map((vertex) =>
                    worldPxToCm(
                      vertex.xPx,
                      vertex.yPx,
                      stageWidth,
                      stageHeight,
                      activeFloorPlan.widthCm,
                      activeFloorPlan.depthCm,
                    ),
                  ),
                );
              }}
            />

            {activeFloorPlan ? (
              <div className="pointer-events-none absolute bottom-20 left-4 z-20">
                <div className="rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 backdrop-blur">
                  <p className="m-0 text-[10px] font-medium text-slate-300">
                    ■ {formatCm(gridSpacingCm)}
                  </p>
                </div>
              </div>
            ) : null}

            {!session.selectedZone && !session.activeZoneEditorMode ? (
              <EditorDoneButtonOverlay onDone={session.handleExitEditor} />
            ) : null}

            {!session.selectedZone && !session.activeZoneEditorMode ? (
              <EditorFloatingActions
                isOpen={session.isCreateMenuOpen}
                onToggle={() =>
                  session.setIsCreateMenuOpen((current) => !current)
                }
                onCreateZone={() =>
                  session.beginCreateZone(interactiveViewportTransform)
                }
                onEditFloorBoundary={() => {
                  beginBoundaryEdit();
                  session.setActiveZoneEditorMode("floor-boundary");
                  session.setIsCreateMenuOpen(false);
                }}
              />
            ) : null}

            {session.selectedZone &&
            session.activeZoneEditorMode === "rename" ? (
              <ZoneRenameOverlay
                labelDraft={session.labelDraft}
                suggestions={labelSuggestions}
                saveDisabled={!session.labelDraft.trim()}
                onLabelChange={session.setLabelDraft}
                onSuggestionSelect={session.setLabelDraft}
                onCancel={session.handleRenameCancel}
                onSave={() => {
                  void (async () => {
                    const selectedZone = session.selectedZone;
                    if (!selectedZone) {
                      return;
                    }

                    if (session.isDraftZone) {
                      const nextLabel = session.labelDraft.trim();
                      session.setSelectedZone((current) =>
                        current ? { ...current, label: nextLabel } : current,
                      );
                      session.setShapeDraft((current) =>
                        current ? { ...current, label: nextLabel } : current,
                      );
                      session.setActiveZoneEditorMode("shape");
                      return;
                    }

                    await saveZoneLabel(selectedZone, session.labelDraft);
                    session.setSelectedZone((current) =>
                      current
                        ? {
                            ...current,
                            label: session.labelDraft.trim(),
                          }
                        : current,
                    );
                    session.setActiveZoneEditorMode("menu");
                  })();
                }}
              />
            ) : null}

            {session.selectedZone &&
            session.activeZoneEditorMode === "shape" ? (
              <ZoneShapeOverlay
                xText={formatCm(
                  formatShapeMetric(
                    session.shapeDraft?.xPct ?? session.selectedZone.xPct,
                    activeFloorPlan?.widthCm,
                  ),
                )}
                yText={formatCm(
                  formatShapeMetric(
                    session.shapeDraft?.yPct ?? session.selectedZone.yPct,
                    activeFloorPlan?.depthCm,
                  ),
                )}
                wText={formatCm(
                  formatShapeMetric(
                    session.shapeDraft?.widthPct ??
                      session.selectedZone.widthPct,
                    activeFloorPlan?.widthCm,
                  ),
                )}
                hText={formatCm(
                  formatShapeMetric(
                    session.shapeDraft?.heightPct ??
                      session.selectedZone.heightPct,
                    activeFloorPlan?.depthCm,
                  ),
                )}
                canUndo={canUndoShapeEdit}
                saveDisabled={!session.shapeDraft || hasShapeDraftCollision}
                onCancel={session.handleShapeCancel}
                onUndo={() => {
                  const previousShape = undoShapeEdit();
                  if (!previousShape) {
                    return;
                  }

                  session.setShapeDraft((current) =>
                    current ? { ...current, ...previousShape } : previousShape,
                  );
                }}
                onSave={() => {
                  void (async () => {
                    const selectedZone = session.selectedZone;
                    const shapeDraft = session.shapeDraft;
                    if (!selectedZone || !shapeDraft) {
                      return;
                    }

                    const resolvedShapeDraft = hasZoneOverlap(
                      shapeDraft,
                      zones,
                      shapeDraft.id,
                    )
                      ? findNearestNonOverlappingZoneShape(shapeDraft, zones)
                      : shapeDraft;
                    if (!resolvedShapeDraft) {
                      window.alert("Zone blocks cannot overlap.");
                      return;
                    }

                    if (session.isDraftZone) {
                      await createZone({
                        label: resolvedShapeDraft.label.trim() || "Zone",
                        type: resolvedShapeDraft.type,
                        xPct: resolvedShapeDraft.xPct,
                        yPct: resolvedShapeDraft.yPct,
                        widthPct: resolvedShapeDraft.widthPct,
                        heightPct: resolvedShapeDraft.heightPct,
                        sortOrder: zones.length,
                        floorPlanId: resolvedShapeDraft.floorPlanId,
                        widthCm: resolvedShapeDraft.widthCm,
                        depthCm: resolvedShapeDraft.depthCm,
                      });
                      resetShapeEditHistory();
                      session.setShapeDraft(null);
                      session.setSelectedZone(null);
                      session.setActiveZoneEditorMode(null);
                      return;
                    }

                    const stagedExistingShapes = Object.values(
                      session.stagedZoneEdits,
                    ).filter((zone) => zone.id !== selectedZone.id);
                    const batchItems = [
                      ...stagedExistingShapes.map((stagedZone) => {
                        const resolvedStagedZone = hasZoneOverlap(
                          stagedZone,
                          zones,
                          stagedZone.id,
                        )
                          ? findNearestNonOverlappingZoneShape(stagedZone, zones)
                          : stagedZone;

                        if (!resolvedStagedZone) {
                          return null;
                        }

                        return {
                          zone:
                            zones.find((zone) => zone.id === stagedZone.id) ??
                            stagedZone,
                          shape: {
                            xPct: resolvedStagedZone.xPct,
                            yPct: resolvedStagedZone.yPct,
                            widthPct: resolvedStagedZone.widthPct,
                            heightPct: resolvedStagedZone.heightPct,
                          },
                        };
                      }),
                      {
                        zone: selectedZone,
                        shape: {
                          xPct: resolvedShapeDraft.xPct,
                          yPct: resolvedShapeDraft.yPct,
                          widthPct: resolvedShapeDraft.widthPct,
                          heightPct: resolvedShapeDraft.heightPct,
                        },
                      },
                    ].filter(
                      (
                        item,
                      ): item is {
                        zone: StoreZone;
                        shape: Pick<
                          StoreZone,
                          "xPct" | "yPct" | "widthPct" | "heightPct"
                        >;
                      } => item !== null,
                    );

                    if (
                      batchItems.length !== stagedExistingShapes.length + 1
                    ) {
                      window.alert("Zone blocks cannot overlap.");
                      return;
                    }

                    await saveZoneShapesBatch(batchItems);
                    for (const item of batchItems) {
                      session.clearStagedZoneEdit(item.zone.id);
                    }
                    resetShapeEditHistory();
                    session.setSelectedZone(null);
                    session.setActiveZoneEditorMode(null);
                  })();
                }}
              />
            ) : null}

            {session.selectedZone && session.activeZoneEditorMode === "menu" ? (
              <ZoneMenuOverlay
                label={session.selectedZone.label}
                onClose={() => session.setSelectedZone(null)}
                onEditName={() => session.setActiveZoneEditorMode("rename")}
                onEditShape={() => {
                  session.setShapeDraft(session.selectedZone);
                  session.setActiveZoneEditorMode("shape");
                }}
                onDelete={() => {
                  void (async () => {
                    await removeZoneById(session.selectedZone!);
                    session.setSelectedZone(null);
                  })();
                }}
              />
            ) : null}

            {session.activeZoneEditorMode === "floor-boundary" &&
            floorBoundaryDraft &&
            session.boundarySizeCm ? (
              <FloorBoundaryOverlay
                widthText={formatCm(session.boundarySizeCm.widthCm)}
                heightText={formatCm(session.boundarySizeCm.depthCm)}
                onCancel={session.handleBoundaryCancel}
                onSave={() => {
                  void saveBoundary(floorBoundaryDraft);
                  session.setActiveZoneEditorMode(null);
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <CreateFloorPlanModal
        isOpen={session.isCreateFloorPlanOpen}
        name={session.floorPlanNameDraft}
        width={session.floorPlanWidthDraft}
        depth={session.floorPlanDepthDraft}
        canCreate={
          !!session.floorPlanNameDraft.trim() &&
          Number(session.floorPlanWidthDraft) > 0 &&
          Number(session.floorPlanDepthDraft) > 0
        }
        onNameChange={session.setFloorPlanNameDraft}
        onWidthChange={session.setFloorPlanWidthDraft}
        onDepthChange={session.setFloorPlanDepthDraft}
        onClose={() => session.setIsCreateFloorPlanOpen(false)}
        onCreate={() => void session.handleCreateFloorPlan()}
      />
    </section>
  );
}
