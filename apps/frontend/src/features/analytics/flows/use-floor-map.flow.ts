import { useEffect, type RefObject } from "react";

import { listZonesApi } from "../apis/list-zones.api";
import {
  selectFloorPlans,
  selectSelectedFloorPlanId,
  useFloorPlanStore,
} from "../stores/floor-plan.store";
import { useFloorMapStore } from "../stores/floor-map.store";

export function useFloorMapFlow(
  containerRef: RefObject<HTMLDivElement | null>,
  resizeKey?: unknown,
) {
  const store = useFloorMapStore();
  const setZones = useFloorMapStore((state) => state.setZones);
  const setStageSize = useFloorMapStore((state) => state.setStageSize);
  const selectedFloorPlanId = useFloorPlanStore(selectSelectedFloorPlanId);
  const floorPlans = useFloorPlanStore(selectFloorPlans);

  useEffect(() => {
    const shouldWaitForFloorSelection =
      floorPlans.length > 0 && selectedFloorPlanId === null;
    if (shouldWaitForFloorSelection) {
      return;
    }

    let isDisposed = false;

    const loadZones = async () => {
      const zones = selectedFloorPlanId
        ? await listZonesApi({ floorPlanId: selectedFloorPlanId })
        : await listZonesApi();

      if (!isDisposed) {
        setZones(zones);
      }
    };

    void loadZones();

    return () => {
      isDisposed = true;
    };
  }, [floorPlans.length, selectedFloorPlanId, setZones]);

  useEffect(() => {
    const resizeStage = () => {
      const container = containerRef.current;
      const nextWidth = container?.offsetWidth;
      const nextHeight = container?.offsetHeight;

      if (!nextWidth) {
        return;
      }

      setStageSize(nextWidth, Math.max(nextWidth * 0.6, nextHeight ?? 0));
    };

    resizeStage();
    const container = containerRef.current;
    const resizeObserver =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeStage();
          })
        : null;
    if (resizeObserver && container) {
      resizeObserver.observe(container);
    }
    window.addEventListener("resize", resizeStage);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeStage);
    };
  }, [containerRef, resizeKey, setStageSize]);

  return store;
}
