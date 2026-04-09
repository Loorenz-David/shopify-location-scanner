import { useCallback, useRef } from "react";
import type { KonvaEventObject } from "konva/lib/Node";

import { createZoneApi } from "../apis/create-zone.api";
import { deleteZoneApi } from "../apis/delete-zone.api";
import { reorderZonesApi } from "../apis/reorder-zones.api";
import { updateZoneApi } from "../apis/update-zone.api";
import { useFloorMapStore } from "../stores/floor-map.store";
import type {
  CreateStoreZoneInput,
  StoreZone,
  StoreZoneType,
} from "../types/analytics.types";

export interface EditorViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function pxToPct(valuePx: number, axisPx: number): number {
  if (axisPx <= 0) {
    return 0;
  }

  return clampPercent((valuePx / axisPx) * 100);
}

function getPointerPosition(
  event: KonvaEventObject<MouseEvent | TouchEvent>,
  viewportTransform?: EditorViewportTransform | null,
) {
  const stage = event.target.getStage();
  if (!stage) {
    return null;
  }

  const pointer = stage.getPointerPosition();
  if (!pointer) {
    return null;
  }

  if (!viewportTransform) {
    return pointer;
  }

  return {
    x: (pointer.x - viewportTransform.offsetX) / viewportTransform.scale,
    y: (pointer.y - viewportTransform.offsetY) / viewportTransform.scale,
  };
}

export function useZoneEditorFlow(viewportTransform?: EditorViewportTransform | null) {
  const stageWidth = useFloorMapStore((state) => state.stageWidth);
  const stageHeight = useFloorMapStore((state) => state.stageHeight);
  const draftZonePx = useFloorMapStore((state) => state.draftZonePx);
  const setDraftZonePx = useFloorMapStore((state) => state.setDraftZonePx);
  const upsertZone = useFloorMapStore((state) => state.upsertZone);
  const removeZone = useFloorMapStore((state) => state.removeZone);
  const setZones = useFloorMapStore((state) => state.setZones);
  const zones = useFloorMapStore((state) => state.zones);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const beginDraftZone = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = event.target.getStage();
      if (!stage || event.target !== stage) {
        return;
      }

      const pointer = getPointerPosition(event, viewportTransform);
      if (!pointer) {
        return;
      }

      dragStartRef.current = { x: pointer.x, y: pointer.y };
      setDraftZonePx({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
    },
    [setDraftZonePx, viewportTransform],
  );

  const updateDraftZone = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = event.target.getStage();
      const start = dragStartRef.current;

      if (!stage || !start) {
        return;
      }

      const pointer = getPointerPosition(event, viewportTransform);
      if (!pointer) {
        return;
      }

      const x = Math.min(start.x, pointer.x);
      const y = Math.min(start.y, pointer.y);
      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);

      setDraftZonePx({ x, y, width, height });
    },
    [setDraftZonePx, viewportTransform],
  );

  const commitDraftZone = useCallback(async () => {
    const draft = useFloorMapStore.getState().draftZonePx;
    dragStartRef.current = null;
    setDraftZonePx(null);

    if (!draft || draft.width < 16 || draft.height < 16) {
      return;
    }

    const label = window.prompt("Zone label");
    if (!label?.trim()) {
      return;
    }

    const zoneTypeInput = window.prompt(
      'Zone type: "zone" or "corridor"',
      "zone",
    );
    const type: StoreZoneType =
      zoneTypeInput?.trim().toLowerCase() === "corridor" ? "corridor" : "zone";

    const payload: CreateStoreZoneInput = {
      label: label.trim(),
      type,
      xPct: pxToPct(draft.x, stageWidth),
      yPct: pxToPct(draft.y, stageHeight),
      widthPct: pxToPct(draft.width, stageWidth),
      heightPct: pxToPct(draft.height, stageHeight),
      sortOrder: zones.length,
    };

    const createdZone = await createZoneApi(payload);
    upsertZone(createdZone);
  }, [setDraftZonePx, stageHeight, stageWidth, upsertZone, zones.length]);

  const renameZone = useCallback(async (zone: StoreZone) => {
    const nextLabel = window.prompt("Rename zone", zone.label)?.trim();
    if (!nextLabel || nextLabel === zone.label) {
      return;
    }

    await updateZoneApi(zone.id, { label: nextLabel });
    upsertZone({ ...zone, label: nextLabel });
  }, [upsertZone]);

  const saveZoneLabel = useCallback(async (zone: StoreZone, label: string) => {
    const nextLabel = label.trim();
    if (!nextLabel || nextLabel === zone.label) {
      return;
    }

    await updateZoneApi(zone.id, { label: nextLabel });
    upsertZone({ ...zone, label: nextLabel });
  }, [upsertZone]);

  const saveZoneShape = useCallback(
    async (zone: StoreZone, shape: Pick<StoreZone, "xPct" | "yPct" | "widthPct" | "heightPct">) => {
      await updateZoneApi(zone.id, shape);
      upsertZone({ ...zone, ...shape });
    },
    [upsertZone],
  );

  const createZone = useCallback(async (input: CreateStoreZoneInput) => {
    const createdZone = await createZoneApi(input);
    upsertZone(createdZone);
    return createdZone;
  }, [upsertZone]);

  const moveZone = useCallback(async (zone: StoreZone, xPx: number, yPx: number) => {
    const nextZone: StoreZone = {
      ...zone,
      xPct: pxToPct(xPx, stageWidth),
      yPct: pxToPct(yPx, stageHeight),
    };

    await updateZoneApi(zone.id, {
      xPct: nextZone.xPct,
      yPct: nextZone.yPct,
    });

    upsertZone(nextZone);
  }, [stageHeight, stageWidth, upsertZone]);

  const removeZoneById = useCallback(async (zone: StoreZone) => {
    const confirmed = window.confirm(`Delete zone "${zone.label}"?`);
    if (!confirmed) {
      return;
    }

    await deleteZoneApi(zone.id);
    removeZone(zone.id);
  }, [removeZone]);

  const normalizeSortOrder = useCallback(async () => {
    const reorderedZones = [...useFloorMapStore.getState().zones]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((zone, index) => ({
        ...zone,
        sortOrder: index,
      }));

    setZones(reorderedZones);
    await reorderZonesApi(
      reorderedZones.map((zone) => ({
        id: zone.id,
        sortOrder: zone.sortOrder,
      })),
    );
  }, [setZones]);

  return {
    draftZonePx,
    beginDraftZone,
    updateDraftZone,
    commitDraftZone,
    renameZone,
    saveZoneLabel,
    saveZoneShape,
    createZone,
    moveZone,
    removeZoneById,
    normalizeSortOrder,
  };
}
