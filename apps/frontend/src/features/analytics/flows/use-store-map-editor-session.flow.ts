import { useCallback, useEffect, useMemo, useState } from "react";

import { homeShellActions } from "../../home/actions/home-shell.actions";
import {
  areFloorBoundaryVerticesEqual,
  buildCenteredDraftZone,
  buildDefaultFloorBoundaryVertices,
  buildEditorViewportTransform,
  hasShapeDraftChanges,
  hasUnsavedEditorChanges,
  type StoreMapEditorViewportTransform,
} from "../domain/store-map-editor.domain";
import { useFloorMapStore } from "../stores/floor-map.store";
import type {
  FloorPlan,
  FloorPlanVertex,
  StoreZone,
} from "../types/analytics.types";

interface UseStoreMapEditorSessionFlowParams {
  zones: StoreZone[];
  floorPlansCount: number;
  activeFloorPlan: FloorPlan | null;
  selectedFloorPlanId: string | null;
  isEditorMode: boolean;
  isFloorBoundaryEditMode: boolean;
  floorBoundaryDraft: FloorPlanVertex[] | null;
  stageWidth: number;
  stageHeight: number;
  floorBoundaryVerticesWorld: Array<{ xPx: number; yPx: number }>;
  setEditorMode: (value: boolean) => void;
  setFloorBoundaryDraft: (value: FloorPlanVertex[] | null) => void;
  setFloorBoundaryEditMode: (value: boolean) => void;
  resetShapeEditHistory: () => void;
  cancelBoundaryEdit: () => void;
  createFloorPlan: (input: {
    name: string;
    widthCm: number;
    depthCm: number;
    sortOrder: number;
  }) => Promise<void>;
}

export function useStoreMapEditorSessionFlow({
  zones,
  floorPlansCount,
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
}: UseStoreMapEditorSessionFlowParams) {
  const [selectedZone, setSelectedZone] = useState<StoreZone | null>(null);
  const [activeZoneEditorMode, setActiveZoneEditorMode] = useState<
    "menu" | "rename" | "shape" | "floor-boundary" | null
  >(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [shapeDraft, setShapeDraft] = useState<StoreZone | null>(null);
  const [isShapeHandleActive, setIsShapeHandleActive] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isCreateFloorPlanOpen, setIsCreateFloorPlanOpen] = useState(false);
  const [floorPlanNameDraft, setFloorPlanNameDraft] = useState("");
  const [floorPlanWidthDraft, setFloorPlanWidthDraft] = useState("12");
  const [floorPlanDepthDraft, setFloorPlanDepthDraft] = useState("8");
  const [editorBaseTransform, setEditorBaseTransform] =
    useState<StoreMapEditorViewportTransform | null>(null);

  const stableViewportTransform = isEditorMode ? editorBaseTransform : null;

  const boundarySizeCm = useMemo(() => {
    if (!floorBoundaryDraft || floorBoundaryDraft.length < 4) {
      return null;
    }

    return {
      widthCm: Math.max(
        0,
        floorBoundaryDraft[1].xCm - floorBoundaryDraft[0].xCm,
      ),
      depthCm: Math.max(
        0,
        floorBoundaryDraft[3].yCm - floorBoundaryDraft[0].yCm,
      ),
    };
  }, [floorBoundaryDraft]);

  const hasPendingBoundaryChanges = useMemo(() => {
    if (!activeFloorPlan || !floorBoundaryDraft) {
      return false;
    }

    const persistedBoundary =
      activeFloorPlan.shape ??
      buildDefaultFloorBoundaryVertices(
        activeFloorPlan.widthCm,
        activeFloorPlan.depthCm,
      );

    return !areFloorBoundaryVerticesEqual(floorBoundaryDraft, persistedBoundary);
  }, [activeFloorPlan, floorBoundaryDraft]);

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

  const resetSessionState = useCallback(() => {
    setSelectedZone(null);
    setActiveZoneEditorMode(null);
    setLabelDraft("");
    setShapeDraft(null);
    setIsShapeHandleActive(false);
    setIsCreateMenuOpen(false);
    setEditorBaseTransform(null);
    setFloorBoundaryDraft(null);
    setFloorBoundaryEditMode(false);
    resetShapeEditHistory();
  }, [
    resetShapeEditHistory,
    setFloorBoundaryDraft,
    setFloorBoundaryEditMode,
  ]);

  useEffect(() => {
    if (!isEditorMode) {
      resetSessionState();
    }
  }, [isEditorMode, resetSessionState]);

  useEffect(() => {
    if (!isEditorMode || stageWidth <= 0 || stageHeight <= 0) {
      return;
    }

    setEditorBaseTransform(
      buildEditorViewportTransform({
        zones,
        stageWidth,
        stageHeight,
        boundaryWorldVertices: floorBoundaryVerticesWorld,
      }),
    );
  }, [
    floorBoundaryVerticesWorld,
    isEditorMode,
    stageHeight,
    stageWidth,
    zones,
  ]);

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

  useEffect(() => {
    resetSessionState();
  }, [resetSessionState, selectedFloorPlanId]);

  const isDraftZone = selectedZone?.id === "__draft-zone__";
  const editorZones =
    isDraftZone && selectedZone ? [...zones, selectedZone] : zones;
  const hasPendingShapeChanges = hasShapeDraftChanges(selectedZone, shapeDraft);
  const hasUnsavedChanges = hasUnsavedEditorChanges({
    hasPendingShapeChanges,
    hasPendingBoundaryChanges,
    isDraftZone,
  });

  const closeEditor = useCallback(() => {
    setSelectedZone(null);
    setActiveZoneEditorMode(null);
    setLabelDraft("");
    setShapeDraft(null);
    setIsCreateMenuOpen(false);
    setEditorMode(false);
  }, [setEditorMode]);

  const confirmDiscardChanges = useCallback(
    (message = "Discard the current editor changes?") => {
      if (!hasUnsavedChanges) {
        return true;
      }

      return window.confirm(message);
    },
    [hasUnsavedChanges],
  );

  const handleExitEditor = useCallback(() => {
    if (!confirmDiscardChanges()) {
      return;
    }

    if (isFloorBoundaryEditMode) {
      cancelBoundaryEdit();
    }

    closeEditor();
  }, [
    cancelBoundaryEdit,
    closeEditor,
    confirmDiscardChanges,
    isFloorBoundaryEditMode,
  ]);

  const handleNavigateBack = useCallback(() => {
    if (isEditorMode) {
      handleExitEditor();
      if (useFloorMapStore.getState().isEditorMode) {
        return;
      }
    }

    homeShellActions.selectNavigationPage("settings");
  }, [handleExitEditor, isEditorMode]);

  const beginCreateZone = useCallback(
    (viewportTransform: StoreMapEditorViewportTransform | null) => {
    const nextDraft = buildCenteredDraftZone({
      stageWidth,
      stageHeight,
      scale: viewportTransform?.scale ?? 1,
      offsetX: viewportTransform?.offsetX ?? 0,
      offsetY: viewportTransform?.offsetY ?? 0,
      zonesLength: zones.length,
      floorPlanId: activeFloorPlan?.id ?? null,
    });

    setIsCreateMenuOpen(false);
    setSelectedZone(nextDraft);
    setLabelDraft("");
    setShapeDraft(nextDraft);
    setActiveZoneEditorMode("rename");
    },
    [activeFloorPlan?.id, stageHeight, stageWidth, zones.length],
  );

  useEffect(() => () => setEditorMode(false), [setEditorMode]);

  const handleCreateFloorPlan = useCallback(async () => {
    const widthMeters = Number(floorPlanWidthDraft);
    const depthMeters = Number(floorPlanDepthDraft);
    if (
      !floorPlanNameDraft.trim() ||
      !Number.isFinite(widthMeters) ||
      !Number.isFinite(depthMeters) ||
      widthMeters <= 0 ||
      depthMeters <= 0
    ) {
      return;
    }

    await createFloorPlan({
      name: floorPlanNameDraft.trim(),
      widthCm: Math.round(widthMeters * 100),
      depthCm: Math.round(depthMeters * 100),
      sortOrder: floorPlansCount,
    });
    setIsCreateFloorPlanOpen(false);
    setFloorPlanNameDraft("");
    setFloorPlanWidthDraft("12");
    setFloorPlanDepthDraft("8");
  }, [
    createFloorPlan,
    floorPlanDepthDraft,
    floorPlanNameDraft,
    floorPlanWidthDraft,
    floorPlansCount,
  ]);

  const handleRenameCancel = useCallback(() => {
    setLabelDraft(selectedZone?.label ?? "");
    if (isDraftZone) {
      setShapeDraft(null);
      setActiveZoneEditorMode(null);
      setSelectedZone(null);
      return;
    }

    setActiveZoneEditorMode("menu");
  }, [isDraftZone, selectedZone?.label]);

  const handleShapeCancel = useCallback(() => {
    if (
      hasPendingShapeChanges &&
      !window.confirm("Discard the current shape changes?")
    ) {
      return false;
    }

    resetShapeEditHistory();
    if (isDraftZone) {
      setShapeDraft(selectedZone);
      setLabelDraft(selectedZone?.label ?? "");
      setActiveZoneEditorMode("rename");
      return true;
    }

    setShapeDraft(selectedZone);
    setActiveZoneEditorMode("menu");
    return true;
  }, [
    hasPendingShapeChanges,
    isDraftZone,
    resetShapeEditHistory,
    selectedZone,
  ]);

  const handleBoundaryCancel = useCallback(() => {
    if (
      hasPendingBoundaryChanges &&
      !window.confirm("Discard the current boundary changes?")
    ) {
      return false;
    }

    cancelBoundaryEdit();
    setActiveZoneEditorMode(null);
    return true;
  }, [cancelBoundaryEdit, hasPendingBoundaryChanges]);

  return {
    selectedZone,
    setSelectedZone,
    activeZoneEditorMode,
    setActiveZoneEditorMode,
    labelDraft,
    setLabelDraft,
    shapeDraft,
    setShapeDraft,
    isShapeHandleActive,
    setIsShapeHandleActive,
    isCreateMenuOpen,
    setIsCreateMenuOpen,
    isCreateFloorPlanOpen,
    setIsCreateFloorPlanOpen,
    floorPlanNameDraft,
    setFloorPlanNameDraft,
    floorPlanWidthDraft,
    setFloorPlanWidthDraft,
    floorPlanDepthDraft,
    setFloorPlanDepthDraft,
    stableViewportTransform,
    boundarySizeCm,
    hasPendingBoundaryChanges,
    hasPendingShapeChanges,
    hasUnsavedChanges,
    isDraftZone,
    editorZones,
    handleExitEditor,
    handleNavigateBack,
    beginCreateZone,
    handleCreateFloorPlan,
    handleRenameCancel,
    handleShapeCancel,
    handleBoundaryCancel,
    confirmDiscardChanges,
  };
}
