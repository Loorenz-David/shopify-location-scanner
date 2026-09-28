import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { getActiveTaskIdsApi } from "../api/get-active-task-ids.api";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import { useTaskCountStore } from "../stores/task-count.store";

export async function refreshTaskQueue(): Promise<void> {
  const { hasLoaded, filters } = useLogisticTasksStore.getState();
  const list = hasLoaded ? logisticTasksActions.loadTasks(filters) : Promise.resolve();
  const badge = getActiveTaskIdsApi()
    .then(({ ids }) => useTaskCountStore.getState().setIds(ids))
    .catch(() => undefined);
  await Promise.all([list, badge]);
}
