import { useCallback, useEffect } from "react";

import { createFloorPlanApi } from "../apis/create-floor-plan.api";
import { listFloorPlansApi } from "../apis/list-floor-plans.api";
import { useFloorPlanStore } from "../stores/floor-plan.store";
import type { CreateFloorPlanInput, FloorPlan } from "../types/analytics.types";

export function useFloorPlansFlow() {
  const setFloorPlans = useFloorPlanStore((state) => state.setFloorPlans);
  const upsertFloorPlan = useFloorPlanStore((state) => state.upsertFloorPlan);
  const removeFloorPlan = useFloorPlanStore((state) => state.removeFloorPlan);
  const setSelectedFloorPlanId = useFloorPlanStore(
    (state) => state.setSelectedFloorPlanId,
  );

  useEffect(() => {
    let isDisposed = false;

    const load = async () => {
      const plans = await listFloorPlansApi();

      if (isDisposed) {
        return;
      }

      setFloorPlans(plans);
      const currentSelected =
        useFloorPlanStore.getState().selectedFloorPlanId;
      if (!currentSelected && plans.length > 0) {
        setSelectedFloorPlanId(plans[0].id);
      }
    };

    void load();

    return () => {
      isDisposed = true;
    };
  }, [setFloorPlans, setSelectedFloorPlanId]);

  const createFloorPlan = useCallback(
    async (input: CreateFloorPlanInput) => {
      const tempPlan: FloorPlan = {
        id: "__draft-floor__",
        shopId: "",
        name: input.name,
        widthCm: input.widthCm,
        depthCm: input.depthCm,
        shape: input.shape ?? null,
        sortOrder: input.sortOrder ?? 0,
      };

      upsertFloorPlan(tempPlan);
      setSelectedFloorPlanId(tempPlan.id);

      const created = await createFloorPlanApi(input);
      removeFloorPlan(tempPlan.id);
      upsertFloorPlan(created);
      setSelectedFloorPlanId(created.id);
    },
    [removeFloorPlan, setSelectedFloorPlanId, upsertFloorPlan],
  );

  return { createFloorPlan };
}
