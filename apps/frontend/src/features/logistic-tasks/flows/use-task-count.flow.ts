import { useEffect } from "react";
import { getActiveTaskIdsApi } from "../api/get-active-task-ids.api";
import { useTaskCountStore } from "../stores/task-count.store";

export function useTaskCountFlow(): void {
  useEffect(() => {
    getActiveTaskIdsApi()
      .then(({ ids }) => useTaskCountStore.getState().setIds(ids))
      .catch(() => {
        // non-critical: badge stays at 0 if fetch fails
      });
  }, []);
}
