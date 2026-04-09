import { useEffect, type RefObject } from "react";

import { listZonesApi } from "../apis/list-zones.api";
import { useFloorMapStore } from "../stores/floor-map.store";

export function useFloorMapFlow(
  containerRef: RefObject<HTMLDivElement | null>,
  resizeKey?: unknown,
) {
  const store = useFloorMapStore();
  const setZones = useFloorMapStore((state) => state.setZones);
  const setStageSize = useFloorMapStore((state) => state.setStageSize);

  useEffect(() => {
    let isDisposed = false;

    const loadZones = async () => {
      const zones = await listZonesApi();

      if (!isDisposed) {
        setZones(zones);
      }
    };

    void loadZones();

    return () => {
      isDisposed = true;
    };
  }, [setZones]);

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
    window.addEventListener("resize", resizeStage);

    return () => {
      window.removeEventListener("resize", resizeStage);
    };
  }, [containerRef, resizeKey, setStageSize]);

  return store;
}
